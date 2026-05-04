import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { adminClient, getUserFromAuthHeader } from "../_shared/supabase-admin.ts";
import { plaidClient } from "../_shared/plaid.ts";

// Removes a single Plaid item: revokes access at Plaid, then deletes the row.
// The DB has ON DELETE CASCADE from accounts.plaid_item_id, so all child
// accounts (and downstream transactions, etc.) disappear with the item.
//
// Plaid's itemRemove call needs the encrypted access_token which is hidden
// from the authenticated client by RLS. Same shape as delete-account/index.ts
// but scoped to a single item the caller owns.

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const user = await getUserFromAuthHeader(req);
  if (!user) return jsonResponse({ error: "unauthorized" }, { status: 401 });

  let body: { plaid_item_row_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_body" }, { status: 400 });
  }
  const itemRowId = body.plaid_item_row_id;
  if (!itemRowId) return jsonResponse({ error: "missing_plaid_item_row_id" }, { status: 400 });

  const supa = adminClient();

  const { data: item, error: lookupErr } = await supa
    .from("plaid_items")
    .select("id, access_token, owner_user_id")
    .eq("id", itemRowId)
    .maybeSingle();
  if (lookupErr) return jsonResponse({ error: "lookup_failed", detail: lookupErr.message }, { status: 500 });
  if (!item || item.owner_user_id !== user.id) {
    return jsonResponse({ error: "not_found" }, { status: 404 });
  }

  const { count: removedCount } = await supa
    .from("accounts")
    .select("id", { count: "exact", head: true })
    .eq("plaid_item_id", item.id);

  const errors: Array<{ step: string; detail: string }> = [];

  try {
    await plaidClient().itemRemove({ access_token: item.access_token });
  } catch (e) {
    // Don't block the local delete on Plaid errors — item may already be gone
    // upstream. Mirrors delete-account/index.ts behavior.
    errors.push({ step: "plaid_remove", detail: (e as Error).message });
  }

  const { error: delErr } = await supa.from("plaid_items").delete().eq("id", item.id);
  if (delErr) {
    return jsonResponse(
      { error: "delete_failed", detail: delErr.message, partial_errors: errors },
      { status: 500 },
    );
  }

  return jsonResponse({ ok: true, removed_account_count: removedCount ?? 0, partial_errors: errors });
});
