import type { Database } from "@cvc/types/supabase.generated";
import { nextDueFromCadence } from "@cvc/domain";
import type { Cadence } from "@cvc/types";
import type { CvcSupabaseClient } from "./supabase-client";

type Tables = Database["public"]["Tables"];
type BillUpsert = Tables["bills"]["Insert"];
type IncomeUpsert = Tables["income_events"]["Insert"];
type BudgetUpsert = Tables["budgets"]["Insert"];
type GoalUpsert = Tables["goals"]["Insert"];

export async function createSpace(client: CvcSupabaseClient, args: { name: string; tint: string }) {
  const { data: user } = await client.auth.getUser();
  if (!user.user) throw new Error("Not authenticated");
  const { data, error } = await client
    .from("spaces")
    .insert({ owner_user_id: user.user.id, name: args.name, tint: args.tint, kind: "shared" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function inviteToSpace(client: CvcSupabaseClient, args: { space_id: string; email: string }) {
  const { data, error } = await client
    .from("invitations")
    .insert({ space_id: args.space_id, email: args.email })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function claimInvitation(client: CvcSupabaseClient, token: string) {
  const { data, error } = await client.rpc("claim_invitation", { p_token: token });
  if (error) throw error;
  return data as unknown as { space_id: string; already?: boolean };
}

export async function revokeInvitation(client: CvcSupabaseClient, invitationId: string) {
  const { error } = await client.from("invitations").delete().eq("id", invitationId);
  if (error) throw error;
}

export async function markNotificationRead(client: CvcSupabaseClient, id: string) {
  const { error } = await client
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  if (error) throw error;
}

export async function markAllNotificationsRead(client: CvcSupabaseClient) {
  const { error } = await client
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) throw error;
}

export async function setAccountShare(
  client: CvcSupabaseClient,
  args: { account_id: string; space_id: string; share_balances: boolean; share_transactions: boolean },
) {
  const { data, error } = await client
    .from("account_shares")
    .upsert(args, { onConflict: "account_id,space_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeAccountShare(
  client: CvcSupabaseClient,
  args: { account_id: string; space_id: string },
) {
  const { error } = await client
    .from("account_shares")
    .delete()
    .eq("account_id", args.account_id)
    .eq("space_id", args.space_id);
  if (error) throw error;
}

export async function setTransactionShare(
  client: CvcSupabaseClient,
  args: { transaction_id: string; space_id: string; hidden: boolean },
) {
  const { data, error } = await client
    .from("transaction_shares")
    .upsert(args, { onConflict: "transaction_id,space_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTransactionCategory(
  client: CvcSupabaseClient,
  args: { id: string; category: string | null; subcategory?: string | null },
) {
  const patch: { category: string | null; subcategory?: string | null } = {
    category: args.category,
  };
  if (args.subcategory !== undefined) patch.subcategory = args.subcategory;
  const { data, error } = await client
    .from("transactions")
    .update(patch)
    .eq("id", args.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setTransactionNote(
  client: CvcSupabaseClient,
  args: { id: string; note: string | null },
) {
  const { data, error } = await client
    .from("transactions")
    .update({ note: args.note })
    .eq("id", args.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function tagTransactionsRecurring(
  client: CvcSupabaseClient,
  args: { ids: string[]; recurring_group_id?: string | null },
) {
  if (args.ids.length === 0) return;
  const patch: { is_recurring: boolean; recurring_group_id?: string | null } = {
    is_recurring: true,
  };
  if (args.recurring_group_id !== undefined) patch.recurring_group_id = args.recurring_group_id;
  const { error } = await client.from("transactions").update(patch).in("id", args.ids);
  if (error) throw error;
}

export async function setTransactionRecurring(
  client: CvcSupabaseClient,
  args: { id: string; is_recurring: boolean; recurring_group_id?: string | null },
) {
  const patch: { is_recurring: boolean; recurring_group_id?: string | null } = {
    is_recurring: args.is_recurring,
  };
  if (args.recurring_group_id !== undefined) patch.recurring_group_id = args.recurring_group_id;
  if (!args.is_recurring) patch.recurring_group_id = null;
  const { data, error } = await client
    .from("transactions")
    .update(patch)
    .eq("id", args.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function clearTransactionSplits(client: CvcSupabaseClient, transactionId: string) {
  const { error } = await client
    .from("transaction_splits")
    .delete()
    .eq("transaction_id", transactionId);
  if (error) throw error;
}

/**
 * Replace the splits for a transaction. Caller is responsible for ensuring the
 * sum of split amounts equals the transaction amount; we do not enforce here
 * because the schema does not include a deferred trigger for this.
 */
export async function upsertTransactionSplits(
  client: CvcSupabaseClient,
  args: {
    transaction_id: string;
    space_id: string;
    splits: Array<{ category: string; amount: number }>;
  },
) {
  await clearTransactionSplits(client, args.transaction_id);
  if (args.splits.length === 0) return;
  const rows = args.splits.map((s) => ({
    transaction_id: args.transaction_id,
    space_id: args.space_id,
    category: s.category,
    amount: s.amount,
  }));
  const { error } = await client.from("transaction_splits").insert(rows);
  if (error) throw error;
}

export async function upsertBill(client: CvcSupabaseClient, bill: BillUpsert) {
  const { data, error } = await client.from("bills").upsert(bill).select().single();
  if (error) throw error;
  return data;
}

export async function deleteBill(client: CvcSupabaseClient, id: string) {
  const { error } = await client.from("bills").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteAccount(client: CvcSupabaseClient, accountId: string) {
  const { error } = await client.from("accounts").delete().eq("id", accountId);
  if (error) throw error;
}

export async function deleteAccounts(client: CvcSupabaseClient, accountIds: string[]) {
  if (accountIds.length === 0) return;
  const { error } = await client.from("accounts").delete().in("id", accountIds);
  if (error) throw error;
}

/**
 * Record a payment against a bill and roll the bill's `next_due_at` forward
 * by one cadence cycle. Pass `advanceCycle: false` to log a payment without
 * advancing (e.g. partial / out-of-cycle payments).
 *
 * Two writes — insert the payment row, then update the bill. PostgREST runs
 * these as separate transactions, so a network failure between them can
 * leave a payment row without an advanced due date; callers should refetch
 * after the await to reconcile.
 */
export async function recordBillPayment(
  client: CvcSupabaseClient,
  args: {
    bill_id: string;
    amount: number;
    paid_at: string;
    cadence: Cadence;
    current_next_due_at: string;
    transaction_id?: string | null;
    advanceCycle?: boolean;
  },
) {
  const { error: insErr } = await client.from("bill_payments").insert({
    bill_id: args.bill_id,
    amount: args.amount,
    paid_at: args.paid_at,
    transaction_id: args.transaction_id ?? null,
    status: "paid",
  });
  if (insErr) throw insErr;
  if (args.advanceCycle === false) return null;
  const advanced = nextDueFromCadence(args.current_next_due_at, args.cadence);
  const { data, error: updErr } = await client
    .from("bills")
    .update({ next_due_at: advanced })
    .eq("id", args.bill_id)
    .select()
    .single();
  if (updErr) throw updErr;
  return data;
}

export async function upsertIncomeEvent(client: CvcSupabaseClient, evt: IncomeUpsert) {
  const { data, error } = await client.from("income_events").upsert(evt).select().single();
  if (error) throw error;
  return data;
}

export async function deleteIncomeEvent(client: CvcSupabaseClient, id: string) {
  const { error } = await client.from("income_events").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Record receipt of an income event. For one-time ("once") cadence we just
 * stamp received_at + actual_amount. For recurring cadences we additionally
 * advance next_due_at to the next cycle, mirroring the bill payment flow.
 *
 * Two writes — stamp the receipt fields, then (if recurring) advance the
 * cycle. PostgREST runs these as separate transactions; callers should
 * refetch after the await to reconcile if either side fails.
 */
export async function markIncomeReceived(
  client: CvcSupabaseClient,
  args: {
    id: string;
    actual_amount: number;
    received_at: string;
    cadence: Cadence;
    current_next_due_at: string;
  },
) {
  const patch: { actual_amount: number; received_at: string; next_due_at?: string } = {
    actual_amount: args.actual_amount,
    received_at: args.received_at,
  };
  if (args.cadence !== "once") {
    patch.next_due_at = nextDueFromCadence(args.current_next_due_at, args.cadence);
  }
  const { data, error } = await client
    .from("income_events")
    .update(patch)
    .eq("id", args.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function upsertBudget(client: CvcSupabaseClient, budget: BudgetUpsert) {
  const { data, error } = await client.from("budgets").upsert(budget).select().single();
  if (error) throw error;
  return data;
}

export async function deleteBudget(client: CvcSupabaseClient, id: string) {
  const { error } = await client.from("budgets").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertGoal(client: CvcSupabaseClient, goal: GoalUpsert) {
  const { data, error } = await client.from("goals").upsert(goal).select().single();
  if (error) throw error;
  return data;
}

export async function deleteGoal(client: CvcSupabaseClient, id: string) {
  const { error } = await client.from("goals").delete().eq("id", id);
  if (error) throw error;
}

export async function createPaymentLink(
  client: CvcSupabaseClient,
  args: {
    funding_account_id: string;
    name: string;
    cross_space?: boolean;
    cards: Array<{ card_account_id: string; split_pct: number }>;
  },
) {
  const { data: user } = await client.auth.getUser();
  if (!user.user) throw new Error("Not authenticated");
  const { data: link, error } = await client
    .from("payment_links")
    .insert({
      owner_user_id: user.user.id,
      funding_account_id: args.funding_account_id,
      name: args.name,
      cross_space: args.cross_space ?? false,
    })
    .select()
    .single();
  if (error) throw error;
  if (args.cards.length) {
    const rows = args.cards.map((c) => ({ payment_link_id: link.id, ...c }));
    const { error: cardErr } = await client.from("payment_link_cards").insert(rows);
    if (cardErr) throw cardErr;
  }
  return link;
}

export async function updatePaymentLink(
  client: CvcSupabaseClient,
  args: { id: string; name?: string; funding_account_id?: string; cross_space?: boolean },
) {
  const patch: { name?: string; funding_account_id?: string; cross_space?: boolean } = {};
  if (args.name !== undefined) patch.name = args.name;
  if (args.funding_account_id !== undefined) patch.funding_account_id = args.funding_account_id;
  if (args.cross_space !== undefined) patch.cross_space = args.cross_space;
  const { data, error } = await client
    .from("payment_links")
    .update(patch)
    .eq("id", args.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePaymentLink(client: CvcSupabaseClient, id: string) {
  const { error } = await client.from("payment_links").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Replace the set of cards a payment link points at.
 *
 * The split_pct trigger is `deferrable initially deferred`, so the
 * delete-then-insert pair only checks the per-card sum at end-of-transaction.
 * PostgREST runs each call in its own transaction, so we delete first, then
 * insert — no momentary >100% violation is observed.
 */
export async function replacePaymentLinkCards(
  client: CvcSupabaseClient,
  args: {
    payment_link_id: string;
    cards: Array<{ card_account_id: string; split_pct: number }>;
  },
) {
  const del = await client
    .from("payment_link_cards")
    .delete()
    .eq("payment_link_id", args.payment_link_id);
  if (del.error) throw del.error;
  if (args.cards.length === 0) return;
  const rows = args.cards.map((c) => ({ payment_link_id: args.payment_link_id, ...c }));
  const { error } = await client.from("payment_link_cards").insert(rows);
  if (error) throw error;
}
