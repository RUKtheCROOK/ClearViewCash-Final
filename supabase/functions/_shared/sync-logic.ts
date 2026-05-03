// Shared Plaid sync logic — called inline by both plaid-exchange (after a
// successful Link flow) and plaid-sync (HTTP endpoint, also invoked by the
// plaid-webhook function on SYNC_UPDATES_AVAILABLE).
//
// Inlining (vs HTTP fan-out) ensures the parent caller actually awaits sync
// completion and surfaces errors instead of silently dropping them.

import { adminClient } from "./supabase-admin.ts";
import { plaidAmountToCents, plaidClient } from "./plaid.ts";
import { detectRecurring } from "./recurring.ts";
import { categorizeFromPlaid } from "./categorize.ts";

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

  try {
    while (hasMore) {
      const res = await plaid.transactionsSync({
        access_token: item.access_token,
        cursor: cursor ?? undefined,
      });
      hasMore = res.data.has_more;
      cursor = res.data.next_cursor;

      const accountIdMap = await mapPlaidAccountIds(item.id);

      const upserts = [...res.data.added, ...res.data.modified]
        .map((t) => ({
          account_id: accountIdMap.get(t.account_id) ?? null,
          owner_user_id: item.owner_user_id,
          plaid_transaction_id: t.transaction_id,
          posted_at: t.date,
          amount: plaidAmountToCents(t.amount),
          merchant_name: t.merchant_name ?? t.name ?? null,
          category: categorizeFromPlaid(t.personal_finance_category?.primary ?? null),
          subcategory: t.personal_finance_category?.detailed ?? null,
          pending: t.pending,
        }))
        .filter((u) => u.account_id);

      if (upserts.length) {
        const { error } = await supa
          .from("transactions")
          .upsert(upserts, { onConflict: "plaid_transaction_id" });
        if (error) throw error;
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
