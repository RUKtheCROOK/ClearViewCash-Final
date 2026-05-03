import type { Database } from "@cvc/types/supabase.generated";
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

export async function upsertBill(client: CvcSupabaseClient, bill: BillUpsert) {
  const { data, error } = await client.from("bills").upsert(bill).select().single();
  if (error) throw error;
  return data;
}

export async function upsertIncomeEvent(client: CvcSupabaseClient, evt: IncomeUpsert) {
  const { data, error } = await client.from("income_events").upsert(evt).select().single();
  if (error) throw error;
  return data;
}

export async function upsertBudget(client: CvcSupabaseClient, budget: BudgetUpsert) {
  const { data, error } = await client.from("budgets").upsert(budget).select().single();
  if (error) throw error;
  return data;
}

export async function upsertGoal(client: CvcSupabaseClient, goal: GoalUpsert) {
  const { data, error } = await client.from("goals").upsert(goal).select().single();
  if (error) throw error;
  return data;
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
