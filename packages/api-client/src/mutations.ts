import type { Database } from "@cvc/types/supabase.generated";
import { nextDueFromCadence, normalizeMerchant } from "@cvc/domain";
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
    .insert({ owner_user_id: user.user.id, name: args.name, tint: args.tint })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSpace(client: CvcSupabaseClient, spaceId: string) {
  const { error } = await client.from("spaces").delete().eq("id", spaceId);
  if (error) throw error;
}

export async function updateSpace(
  client: CvcSupabaseClient,
  args: { space_id: string; name?: string; tint?: string },
) {
  const update: { name?: string; tint?: string } = {};
  if (args.name !== undefined) update.name = args.name;
  if (args.tint !== undefined) update.tint = args.tint;
  const { data, error } = await client
    .from("spaces")
    .update(update)
    .eq("id", args.space_id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMemberPermissions(
  client: CvcSupabaseClient,
  args: {
    space_id: string;
    user_id: string;
    can_invite?: boolean;
    can_rename?: boolean;
    can_delete?: boolean;
  },
) {
  const update: { can_invite?: boolean; can_rename?: boolean; can_delete?: boolean } = {};
  if (args.can_invite !== undefined) update.can_invite = args.can_invite;
  if (args.can_rename !== undefined) update.can_rename = args.can_rename;
  if (args.can_delete !== undefined) update.can_delete = args.can_delete;
  const { error } = await client
    .from("space_members")
    .update(update)
    .eq("space_id", args.space_id)
    .eq("user_id", args.user_id);
  if (error) throw error;
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

/**
 * Replace the per-member visibility allowlist for a (account, space) share.
 *
 * `user_ids` empty/null = everyone in the space sees the share (deletes all
 * rows). Non-empty = only those users + the account owner see it.
 *
 * Two writes — delete then insert, in the caller's session. PostgREST runs
 * each as its own transaction, so a network failure between them can leave
 * the allowlist empty (i.e. visible to everyone). Callers should refetch
 * via `getShareVisibility` after the await.
 */
export async function setShareVisibility(
  client: CvcSupabaseClient,
  args: { account_id: string; space_id: string; user_ids: string[] | null },
) {
  const del = await client
    .from("account_share_visibilities")
    .delete()
    .eq("account_id", args.account_id)
    .eq("space_id", args.space_id);
  if (del.error) throw del.error;
  const ids = args.user_ids ?? [];
  if (ids.length === 0) return;
  const rows = ids.map((user_id) => ({
    account_id: args.account_id,
    space_id: args.space_id,
    user_id,
  }));
  const { error } = await client.from("account_share_visibilities").insert(rows);
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

export async function setTransactionDisplayName(
  client: CvcSupabaseClient,
  args: { id: string; display_name: string | null },
) {
  const { data, error } = await client
    .from("transactions")
    .update({ display_name: args.display_name })
    .eq("id", args.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Apply (or clear) a per-vendor display-name rule for the current user.
 *
 * Pass `display_name: null` to remove the rule and revert all matching rows
 * back to Plaid's `merchant_name`. Vendor identity is matched on the same
 * normalized key used by recurring detection (lowercased, punctuation- and
 * trailing-digit-stripped via `normalizeMerchant`).
 *
 * Two writes — upsert/delete the rule, then bulk-update matching transactions.
 * RLS scopes the transactions read+update to the caller; we filter by
 * normalized key in JS to keep the regex logic in one place.
 */
export async function renameVendor(
  client: CvcSupabaseClient,
  args: { merchant_name: string; display_name: string | null },
) {
  const { data: user } = await client.auth.getUser();
  if (!user.user) throw new Error("Not authenticated");
  const key = normalizeMerchant(args.merchant_name);
  if (!key) throw new Error("Cannot create a rule for an empty vendor name");

  if (args.display_name == null) {
    const { error: delErr } = await client
      .from("merchant_renames")
      .delete()
      .eq("owner_user_id", user.user.id)
      .eq("normalized_merchant", key);
    if (delErr) throw delErr;
  } else {
    const { error: upErr } = await client
      .from("merchant_renames")
      .upsert(
        {
          owner_user_id: user.user.id,
          normalized_merchant: key,
          display_name: args.display_name,
        },
        { onConflict: "owner_user_id,normalized_merchant" },
      );
    if (upErr) throw upErr;
  }

  const { data: rows, error: fetchErr } = await client
    .from("transactions")
    .select("id, merchant_name")
    .not("merchant_name", "is", null);
  if (fetchErr) throw fetchErr;
  const matching = (rows ?? [])
    .filter((r) => r.merchant_name && normalizeMerchant(r.merchant_name) === key)
    .map((r) => r.id);
  if (matching.length === 0) return { updated: 0 };

  const { error: updErr } = await client
    .from("transactions")
    .update({ display_name: args.display_name })
    .in("id", matching);
  if (updErr) throw updErr;
  return { updated: matching.length };
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

/**
 * Update per-user presentation overrides on an account. Patches only the
 * keys present in `args` so callers can change one field without disturbing
 * the other. Pass `null` for either field to clear it back to default.
 */
export async function updateAccountSettings(
  client: CvcSupabaseClient,
  args: { id: string; display_name?: string | null; color?: string | null },
) {
  const patch: { display_name?: string | null; color?: string | null } = {};
  if (args.display_name !== undefined) patch.display_name = args.display_name;
  if (args.color !== undefined) patch.color = args.color;
  if (Object.keys(patch).length === 0) return null;
  const { data, error } = await client
    .from("accounts")
    .update(patch)
    .eq("id", args.id)
    .select()
    .single();
  if (error) throw error;
  return data;
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
 * Record receipt of an income event. Three side-effects:
 *   1. Append a row to income_receipts (history; powers detail screen + YTD).
 *   2. Update income_events with the latest (actual_amount, received_at) so
 *      the row-level pair stays in sync with the most recent receipt.
 *   3. For recurring cadences, advance next_due_at to the next cycle.
 *
 * Three writes; callers should refetch after the await.
 */
export async function markIncomeReceived(
  client: CvcSupabaseClient,
  args: {
    id: string;
    actual_amount: number;
    received_at: string;
    cadence: Cadence;
    current_next_due_at: string;
    transaction_id?: string | null;
  },
) {
  const { error: insErr } = await client.from("income_receipts").insert({
    income_event_id: args.id,
    amount: args.actual_amount,
    received_at: args.received_at,
    transaction_id: args.transaction_id ?? null,
  });
  if (insErr) throw insErr;

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

/** Pause an income source — flips paused_at to now(); excludes from forecast. */
export async function pauseIncomeEvent(client: CvcSupabaseClient, id: string) {
  const { data, error } = await client
    .from("income_events")
    .update({ paused_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Resume a paused income source — clears paused_at. */
export async function resumeIncomeEvent(client: CvcSupabaseClient, id: string) {
  const { data, error } = await client
    .from("income_events")
    .update({ paused_at: null })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Delete a single receipt (used by detail screen "delete history entry"). */
export async function deleteIncomeReceipt(client: CvcSupabaseClient, id: string) {
  const { error } = await client.from("income_receipts").delete().eq("id", id);
  if (error) throw error;
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

export async function setGoalShare(
  client: CvcSupabaseClient,
  args: { goal_id: string; space_id: string },
) {
  const { data, error } = await client
    .from("goal_shares")
    .upsert(args, { onConflict: "goal_id,space_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeGoalShare(
  client: CvcSupabaseClient,
  args: { goal_id: string; space_id: string },
) {
  const { error } = await client
    .from("goal_shares")
    .delete()
    .eq("goal_id", args.goal_id)
    .eq("space_id", args.space_id);
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

type BillReminderUpsert = Tables['bill_reminders']['Insert'];

export async function upsertBillReminder(
  client: CvcSupabaseClient,
  reminder: BillReminderUpsert,
) {
  const { data, error } = await client
    .from('bill_reminders')
    .upsert(reminder, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Upsert a single reminder rule for a bill, keyed by (kind, days_before).
 * Looks up the matching row first; passes its id to upsert so the unique
 * index doesn't fire a duplicate insert.
 */
export async function setBillReminder(
  client: CvcSupabaseClient,
  args: {
    bill_id: string;
    kind: 'days_before' | 'on_due_date' | 'mute_all';
    days_before?: number | null;
    enabled: boolean;
    time_of_day?: string;
  },
) {
  let q = client
    .from('bill_reminders')
    .select('id')
    .eq('bill_id', args.bill_id)
    .eq('kind', args.kind);
  q = args.days_before == null ? q.is('days_before', null) : q.eq('days_before', args.days_before);
  const { data: existing, error: lookupErr } = await q;
  if (lookupErr) throw lookupErr;
  const id = existing?.[0]?.id ?? undefined;
  const row = {
    id,
    bill_id: args.bill_id,
    kind: args.kind,
    days_before: args.days_before ?? null,
    time_of_day: args.time_of_day ?? '09:00',
    enabled: args.enabled,
  };
  const { data, error } = await client.from('bill_reminders').upsert(row).select().single();
  if (error) throw error;
  return data;
}

export async function deleteBillReminder(client: CvcSupabaseClient, id: string) {
  const { error } = await client.from('bill_reminders').delete().eq('id', id);
  if (error) throw error;
}

