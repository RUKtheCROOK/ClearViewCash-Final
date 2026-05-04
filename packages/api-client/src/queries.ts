import type { CvcSupabaseClient } from "./supabase-client";

export async function getMyProfile(client: CvcSupabaseClient) {
  const { data, error } = await client.from("users").select("*").maybeSingle();
  if (error) throw error;
  return data;
}

export async function getMySpaces(client: CvcSupabaseClient) {
  const { data, error } = await client
    .from("spaces")
    .select("*, members:space_members(role, user_id, accepted_at)")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getAccountsForSpace(client: CvcSupabaseClient, spaceId: string) {
  // Inner-joined to account_shares, restricted to share_balances=true.
  const { data, error } = await client
    .from("accounts")
    .select("*, account_shares!inner(space_id, share_balances, share_transactions)")
    .eq("account_shares.space_id", spaceId)
    .eq("account_shares.share_balances", true);
  if (error) throw error;
  return data ?? [];
}

/**
 * Resolve the set of accounts to render for the active view.
 *
 * - sharedView=false: every account the caller can see (RLS does ownership).
 * - sharedView=true and a space is active: only accounts shared into that
 *   space with share_balances=true.
 */
export async function getAccountsForView(
  client: CvcSupabaseClient,
  opts: { spaceId: string | null; sharedView: boolean },
) {
  if (opts.sharedView && opts.spaceId) {
    return getAccountsForSpace(client, opts.spaceId);
  }
  const { data, error } = await client.from("accounts").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function getTransactionsForSpace(
  client: CvcSupabaseClient,
  spaceId: string,
  opts: { since?: string; limit?: number } = {},
) {
  let q = client
    .from("transactions")
    .select("*")
    .order("posted_at", { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.since) q = q.gte("posted_at", opts.since);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/**
 * Resolve transactions for the active view.
 *
 * Shared view requires two cheap reads: `account_shares` (which accounts feed
 * the space) and `transaction_shares.hidden` (per-txn opt-outs). RLS would
 * surface a transaction that is hidden in *this* space if it remains visible
 * via *another* space, so we filter explicitly here rather than relying on RLS.
 */
export async function getTransactionsForView(
  client: CvcSupabaseClient,
  opts: {
    spaceId: string | null;
    sharedView: boolean;
    limit?: number;
    since?: string;
    fields?: string;
    accountIds?: string[];
    categories?: string[];
    ownerUserIds?: string[];
  },
) {
  const fields =
    opts.fields ??
    "id, merchant_name, amount, posted_at, category, pending, is_recurring, account_id, owner_user_id, note";
  const limit = opts.limit ?? 100;

  if (opts.sharedView && opts.spaceId) {
    const [{ data: shares }, { data: hidden }] = await Promise.all([
      client
        .from("account_shares")
        .select("account_id")
        .eq("space_id", opts.spaceId)
        .eq("share_transactions", true),
      client
        .from("transaction_shares")
        .select("transaction_id")
        .eq("space_id", opts.spaceId)
        .eq("hidden", true),
    ]);
    let accountIds = (shares ?? []).map((s: { account_id: string }) => s.account_id);
    if (opts.accountIds?.length) {
      const allow = new Set(opts.accountIds);
      accountIds = accountIds.filter((id) => allow.has(id));
    }
    if (accountIds.length === 0) return [];
    const hiddenIds = (hidden ?? []).map((h: { transaction_id: string }) => h.transaction_id);
    let q = client
      .from("transactions")
      .select(fields)
      .in("account_id", accountIds)
      .order("posted_at", { ascending: false })
      .limit(limit);
    if (opts.since) q = q.gte("posted_at", opts.since);
    if (opts.categories?.length) q = q.in("category", opts.categories);
    if (opts.ownerUserIds?.length) q = q.in("owner_user_id", opts.ownerUserIds);
    if (hiddenIds.length) q = q.not("id", "in", `(${hiddenIds.join(",")})`);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  }

  let q = client
    .from("transactions")
    .select(fields)
    .order("posted_at", { ascending: false })
    .limit(limit);
  if (opts.since) q = q.gte("posted_at", opts.since);
  if (opts.accountIds?.length) q = q.in("account_id", opts.accountIds);
  if (opts.categories?.length) q = q.in("category", opts.categories);
  if (opts.ownerUserIds?.length) q = q.in("owner_user_id", opts.ownerUserIds);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function listSplitsForTransaction(
  client: CvcSupabaseClient,
  transactionId: string,
) {
  const { data, error } = await client
    .from("transaction_splits")
    .select("id, transaction_id, space_id, category, amount, created_at")
    .eq("transaction_id", transactionId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getInvitationsForSpace(client: CvcSupabaseClient, spaceId: string) {
  const { data, error } = await client
    .from("invitations")
    .select("id, email, token, expires_at, accepted_user_id, created_at")
    .eq("space_id", spaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getMembersForSpace(client: CvcSupabaseClient, spaceId: string) {
  const { data, error } = await client
    .from("space_members")
    .select("user_id, role, invited_email, accepted_at, created_at")
    .eq("space_id", spaceId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getMembersWithProfilesForSpace(
  client: CvcSupabaseClient,
  spaceId: string,
) {
  const members = await getMembersForSpace(client, spaceId);
  const userIds = members
    .map((m: { user_id: string | null }) => m.user_id)
    .filter((id): id is string => !!id);
  if (userIds.length === 0) return members.map((m) => ({ ...m, display_name: null }));
  const { data, error } = await client
    .from("users")
    .select("id, display_name")
    .in("id", userIds);
  if (error) throw error;
  const byId = new Map((data ?? []).map((u: { id: string; display_name: string | null }) => [u.id, u.display_name]));
  return members.map((m: { user_id: string | null }) => ({
    ...m,
    display_name: m.user_id ? byId.get(m.user_id) ?? null : null,
  }));
}

export async function getSharesForAccount(client: CvcSupabaseClient, accountId: string) {
  const { data, error } = await client
    .from("account_shares")
    .select("space_id, share_balances, share_transactions")
    .eq("account_id", accountId);
  if (error) throw error;
  return data ?? [];
}

export async function getAccount(client: CvcSupabaseClient, accountId: string) {
  const { data, error } = await client
    .from("accounts")
    .select("id, name, mask, type, current_balance, owner_user_id, plaid_item_id")
    .eq("id", accountId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getAccountsForPlaidItem(client: CvcSupabaseClient, plaidItemRowId: string) {
  const { data, error } = await client
    .from("accounts")
    .select("id, name, mask, type, current_balance, plaid_item_id")
    .eq("plaid_item_id", plaidItemRowId)
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getPlaidItem(client: CvcSupabaseClient, plaidItemRowId: string) {
  const { data, error } = await client
    .from("plaid_items")
    .select("id, institution_name, status")
    .eq("id", plaidItemRowId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getBills(client: CvcSupabaseClient, spaceId: string) {
  const { data, error } = await client
    .from("bills")
    .select("*")
    .eq("space_id", spaceId)
    .order("next_due_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export interface BillPaymentRow {
  id: string;
  bill_id: string;
  amount: number;
  paid_at: string;
  status: "paid" | "overdue" | "skipped";
  transaction_id: string | null;
}

/**
 * Returns bills for the space joined with their most-recent payment row
 * (ordered by paid_at desc). `latest_payment` is null when no payment has
 * ever been recorded for the bill.
 */
export async function getBillsWithLatestPayment(client: CvcSupabaseClient, spaceId: string) {
  const bills = await getBills(client, spaceId);
  if (bills.length === 0) return [];
  const billIds = bills.map((b: { id: string }) => b.id);
  const { data: payments, error } = await client
    .from("bill_payments")
    .select("id, bill_id, amount, paid_at, status, transaction_id")
    .in("bill_id", billIds)
    .order("paid_at", { ascending: false });
  if (error) throw error;
  const latestByBill = new Map<string, BillPaymentRow>();
  for (const p of (payments ?? []) as BillPaymentRow[]) {
    if (!latestByBill.has(p.bill_id)) latestByBill.set(p.bill_id, p);
  }
  return bills.map((b: { id: string }) => ({
    ...b,
    latest_payment: latestByBill.get(b.id) ?? null,
  }));
}

export async function getBillPayments(client: CvcSupabaseClient, billId: string) {
  const { data, error } = await client
    .from("bill_payments")
    .select("id, bill_id, amount, paid_at, status, transaction_id")
    .eq("bill_id", billId)
    .order("paid_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getTransactionsByRecurringGroup(
  client: CvcSupabaseClient,
  recurringGroupId: string,
  opts: { limit?: number } = {},
) {
  const { data, error } = await client
    .from("transactions")
    .select("id, merchant_name, amount, posted_at, account_id, category")
    .eq("recurring_group_id", recurringGroupId)
    .order("posted_at", { ascending: false })
    .limit(opts.limit ?? 12);
  if (error) throw error;
  return data ?? [];
}

export async function getIncomeEvents(client: CvcSupabaseClient, spaceId: string) {
  const { data, error } = await client
    .from("income_events")
    .select("*")
    .eq("space_id", spaceId)
    .order("next_due_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export interface NotificationRow {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export async function getMyNotifications(
  client: CvcSupabaseClient,
  opts: { limit?: number } = {},
) {
  const { data, error } = await client
    .from("notifications")
    .select("id, kind, payload, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 50);
  if (error) throw error;
  return (data ?? []) as NotificationRow[];
}

export async function getUnreadNotificationCount(client: CvcSupabaseClient): Promise<number> {
  const { count, error } = await client
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function getPlaidItemsStatus(client: CvcSupabaseClient) {
  const { data, error } = await client
    .from("plaid_items")
    .select("id, status, institution_name");
  if (error) throw error;
  return (data ?? []) as Array<{
    id: string;
    status: string;
    institution_name: string | null;
  }>;
}

export async function getPaymentLinks(client: CvcSupabaseClient) {
  const { data, error } = await client
    .from("payment_links")
    .select("*, cards:payment_link_cards(*)");
  if (error) throw error;
  return data ?? [];
}

export async function getBudgets(client: CvcSupabaseClient, spaceId: string) {
  const { data, error } = await client.from("budgets").select("*").eq("space_id", spaceId);
  if (error) throw error;
  return data ?? [];
}

export async function getGoals(client: CvcSupabaseClient, spaceId: string) {
  const { data, error } = await client.from("goals").select("*").eq("space_id", spaceId);
  if (error) throw error;
  return data ?? [];
}

/**
 * Returns the accounts and dated transactions used by the Net-Worth-Over-Time
 * report. The report walks each account's stored `current_balance` backward
 * through these transactions to reconstruct historical balances. Honors the
 * same shared-view rules as `getTransactionsForView`.
 */
export async function getAccountBalanceHistory(
  client: CvcSupabaseClient,
  opts: { spaceId: string | null; sharedView: boolean; since: string },
) {
  const accounts = await getAccountsForView(client, {
    spaceId: opts.spaceId,
    sharedView: opts.sharedView,
  });
  const accountIds = (accounts as Array<{ id: string }>).map((a) => a.id);
  if (accountIds.length === 0) {
    return {
      accounts,
      txns: [] as Array<{ posted_at: string; amount: number; account_id: string }>,
    };
  }
  const txns = (await getTransactionsForView(client, {
    spaceId: opts.spaceId,
    sharedView: opts.sharedView,
    since: opts.since,
    fields: "posted_at, amount, account_id",
    accountIds,
    limit: 10000,
  })) as unknown as Array<{ posted_at: string; amount: number; account_id: string }>;
  return { accounts, txns };
}
