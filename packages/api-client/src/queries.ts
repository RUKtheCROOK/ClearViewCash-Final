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
  },
) {
  const fields =
    opts.fields ??
    "id, merchant_name, amount, posted_at, category, pending, is_recurring, account_id";
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
    const accountIds = (shares ?? []).map((s: { account_id: string }) => s.account_id);
    if (accountIds.length === 0) return [];
    const hiddenIds = (hidden ?? []).map((h: { transaction_id: string }) => h.transaction_id);
    let q = client
      .from("transactions")
      .select(fields)
      .in("account_id", accountIds)
      .order("posted_at", { ascending: false })
      .limit(limit);
    if (opts.since) q = q.gte("posted_at", opts.since);
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
  const { data, error } = await q;
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
    .select("id, name, mask, type, current_balance, owner_user_id")
    .eq("id", accountId)
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

export async function getIncomeEvents(client: CvcSupabaseClient, spaceId: string) {
  const { data, error } = await client
    .from("income_events")
    .select("*")
    .eq("space_id", spaceId)
    .order("next_due_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
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
