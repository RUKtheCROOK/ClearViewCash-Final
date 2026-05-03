import { z } from "npm:zod@^3.23.8";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { adminClient, getUserFromAuthHeader } from "../_shared/supabase-admin.ts";
import { plaidClient } from "../_shared/plaid.ts";
import { syncPlaidItem } from "../_shared/sync-logic.ts";

const Body = z.object({
  public_token: z.string().min(10),
});

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const user = await getUserFromAuthHeader(req);
  if (!user) return jsonResponse({ error: "unauthorized" }, { status: 401 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return jsonResponse({ error: "bad_request", detail: (e as Error).message }, { status: 400 });
  }

  const plaid = plaidClient();
  const supa = adminClient();

  try {
    const exchange = await plaid.itemPublicTokenExchange({ public_token: body.public_token });
    const accessToken = exchange.data.access_token;
    const itemId = exchange.data.item_id;

    const itemRes = await plaid.itemGet({ access_token: accessToken });
    const institutionName = itemRes.data.item.institution_id ?? "Unknown";

    const { data: itemRow, error: itemErr } = await supa
      .from("plaid_items")
      .insert({
        owner_user_id: user.id,
        plaid_item_id: itemId,
        access_token: accessToken,
        institution_name: institutionName,
        status: "good",
      })
      .select()
      .single();
    if (itemErr) throw itemErr;

    const accountsRes = await plaid.accountsGet({ access_token: accessToken });
    const rows = accountsRes.data.accounts.map((a) => ({
      plaid_item_id: itemRow.id,
      owner_user_id: user.id,
      plaid_account_id: a.account_id,
      name: a.name,
      mask: a.mask ?? null,
      type: (["depository", "credit", "loan", "investment"] as const).includes(a.type as never)
        ? (a.type as "depository")
        : "other",
      subtype: a.subtype ?? null,
      current_balance: a.balances.current != null ? Math.round(a.balances.current * 100) : null,
      available_balance: a.balances.available != null ? Math.round(a.balances.available * 100) : null,
      currency: a.balances.iso_currency_code ?? "USD",
    }));
    if (rows.length) {
      const { error: accErr } = await supa.from("accounts").insert(rows);
      if (accErr) throw accErr;
    }

    // Auto-share into the user's personal/default space (balances + transactions on by default).
    const { data: userRow } = await supa.from("users").select("default_space_id").eq("id", user.id).maybeSingle();
    if (userRow?.default_space_id) {
      const { data: accs } = await supa.from("accounts").select("id").eq("plaid_item_id", itemRow.id);
      if (accs && accs.length) {
        await supa.from("account_shares").upsert(
          accs.map((a) => ({
            account_id: a.id,
            space_id: userRow.default_space_id,
            share_balances: true,
            share_transactions: true,
          })),
          { onConflict: "account_id,space_id" },
        );
      }
    }

    // Run initial sync inline so the response only returns once transactions
    // are loaded. Surfaces errors instead of dropping them silently like the
    // previous fetch-based approach did.
    let synced: { added: number; modified: number; removed: number } | null = null;
    try {
      synced = await syncPlaidItem(itemRow.id);
    } catch (e) {
      console.error("initial sync failed:", e);
      // Don't fail the exchange — accounts are linked and the user can re-trigger
      // sync from the Accounts page or the next webhook.
    }

    return jsonResponse({ ok: true, plaid_item_id: itemRow.id, accounts: rows.length, synced });
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, { status: 500 });
  }
});
