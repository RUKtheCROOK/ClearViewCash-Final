// Shared Plaid sync logic — called inline by both plaid-exchange (after a
// successful Link flow) and plaid-sync (HTTP endpoint, also invoked by the
// plaid-webhook function on SYNC_UPDATES_AVAILABLE).
//
// Inlining (vs HTTP fan-out) ensures the parent caller actually awaits sync
// completion and surfaces errors instead of silently dropping them.

import { adminClient } from "./supabase-admin.ts";
import { plaidAmountToCents, plaidClient } from "./plaid.ts";
import { detectRecurring, normalizeMerchant } from "./recurring.ts";
import { resolveCategoryIdForPlaid } from "./categorize.ts";

export interface SyncResult {
  added: number;
  modified: number;
  removed: number;
  cursor: string | null;
}

export async function syncPlaidItem(itemRowId: string): Promise<SyncResult> {
  const supa = adminClient();
  const plaid = plaidClient();

  const { data: item, error: itemErr } = await supa
    .from("plaid_items")
    .select("*")
    .eq("id", itemRowId)
    .maybeSingle();
  if (itemErr || !item) throw new Error(`item_not_found: ${itemErr?.message ?? itemRowId}`);

  let cursor = item.cursor as string | null;
  let added = 0, modified = 0, removed = 0;
  let hasMore = true;

  // Per-call cache of the owner's category seed_key→row map, keyed by user id.
  // First lookup hits the DB; subsequent rows in the same sync are free.
  const categoryCache = new Map<string, Map<string, { id: string; name: string; seed_key: string | null }>>();

  try {
    while (hasMore) {
      const res = await plaid.transactionsSync({
        access_token: item.access_token,
        cursor: cursor ?? undefined,
      });
      hasMore = res.data.has_more;
      cursor = res.data.next_cursor;

      const accountIdMap = await mapPlaidAccountIds(item.id);

      const upserts = await Promise.all(
        [...res.data.added, ...res.data.modified].map(async (t) => {
          const { categoryId, categoryName } = await resolveCategoryIdForPlaid(
            supa,
            item.owner_user_id,
            t.personal_finance_category?.primary ?? null,
            categoryCache,
          );
          return {
            account_id: accountIdMap.get(t.account_id) ?? null,
            owner_user_id: item.owner_user_id,
            plaid_transaction_id: t.transaction_id,
            posted_at: t.date,
            amount: plaidAmountToCents(t.amount),
            merchant_name: t.merchant_name ?? t.name ?? null,
            category: categoryName,
            category_id: categoryId,
            subcategory: t.personal_finance_category?.detailed ?? null,
            pending: t.pending,
          };
        }),
      );
      const filtered = upserts.filter((u) => u.account_id);

      if (filtered.length) {
        const { error } = await supa
          .from("transactions")
          .upsert(filtered, { onConflict: "plaid_transaction_id" });
        if (error) throw error;
        await applyRenameRules(item.owner_user_id, filtered.map((u) => u.plaid_transaction_id));
      }

      if (res.data.removed.length) {
        const ids = res.data.removed.map((r) => r.transaction_id);
        await supa.from("transactions").delete().in("plaid_transaction_id", ids);
      }

      added += res.data.added.length;
      modified += res.data.modified.length;
      removed += res.data.removed.length;
    }

    await supa.from("plaid_items").update({ cursor, status: "good" }).eq("id", item.id);
    await supa
      .from("accounts")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("plaid_item_id", item.id);
    await runRecurringDetection(item.owner_user_id);
    return { added, modified, removed, cursor };
  } catch (e) {
    await supa.from("plaid_items").update({ status: "error" }).eq("id", item.id);
    throw e;
  }
}

async function mapPlaidAccountIds(itemRowId: string): Promise<Map<string, string>> {
  const { data } = await adminClient()
    .from("accounts")
    .select("id, plaid_account_id")
    .eq("plaid_item_id", itemRowId);
  const m = new Map<string, string>();
  for (const a of data ?? []) m.set(a.plaid_account_id, a.id);
  return m;
}

/**
 * Apply the user's saved vendor-rename rules to the rows we just synced.
 * Scoped to the freshly upserted plaid_transaction_ids so we never rewrite
 * the whole table on every sync. New rows whose merchant_name normalizes
 * to a stored rule key inherit that rule's display_name.
 */
async function applyRenameRules(ownerUserId: string, plaidTxnIds: string[]): Promise<void> {
  if (plaidTxnIds.length === 0) return;
  const supa = adminClient();
  const { data: rules } = await supa
    .from("merchant_renames")
    .select("normalized_merchant, display_name")
    .eq("owner_user_id", ownerUserId);
  if (!rules || rules.length === 0) return;
  const ruleMap = new Map<string, string>();
  for (const r of rules) ruleMap.set(r.normalized_merchant, r.display_name);

  const { data: rows } = await supa
    .from("transactions")
    .select("id, merchant_name")
    .in("plaid_transaction_id", plaidTxnIds);
  if (!rows) return;

  const updates = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.merchant_name) continue;
    const display = ruleMap.get(normalizeMerchant(row.merchant_name));
    if (!display) continue;
    const ids = updates.get(display) ?? [];
    ids.push(row.id);
    updates.set(display, ids);
  }

  for (const [display, ids] of updates) {
    await supa.from("transactions").update({ display_name: display }).in("id", ids);
  }
}

async function runRecurringDetection(ownerUserId: string): Promise<void> {
  const supa = adminClient();
  const { data: txns } = await supa
    .from("transactions")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .gte("posted_at", isoMonthsAgo(6));
  if (!txns) return;
  const groups = detectRecurring(txns as never);
  for (const g of groups) {
    await supa
      .from("transactions")
      .update({ is_recurring: true, recurring_group_id: g.id })
      .in("id", g.transaction_ids);
  }
}

function isoMonthsAgo(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}
