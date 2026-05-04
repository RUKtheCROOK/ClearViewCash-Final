import { CountryCode, Products } from "npm:plaid@^29.0.0";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { adminClient, getUserFromAuthHeader } from "../_shared/supabase-admin.ts";
import { plaidClient } from "../_shared/plaid.ts";

/**
 * Create a Plaid Link token.
 *
 *  - First-time link: send no body. Returns a token with Products.Transactions.
 *  - Update mode (re-auth a broken item): POST { plaid_item_row_id }. We
 *    look up the item's access_token server-side, verify it belongs to the
 *    caller, and create an update-mode link token. Update-mode tokens MUST
 *    NOT include `products`.
 */
Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const user = await getUserFromAuthHeader(req);
  if (!user) return jsonResponse({ error: "unauthorized" }, { status: 401 });

  let plaidItemRowId: string | undefined;
  if (req.headers.get("content-type")?.includes("application/json")) {
    try {
      const body = await req.json();
      if (typeof body?.plaid_item_row_id === "string") {
        plaidItemRowId = body.plaid_item_row_id;
      }
    } catch {
      // No body or invalid JSON: treat as first-time link.
    }
  }

  try {
    if (plaidItemRowId) {
      const { data: item, error } = await adminClient()
        .from("plaid_items")
        .select("id, owner_user_id, access_token")
        .eq("id", plaidItemRowId)
        .maybeSingle();
      if (error || !item) return jsonResponse({ error: "item_not_found" }, { status: 404 });
      if (item.owner_user_id !== user.id) {
        return jsonResponse({ error: "forbidden" }, { status: 403 });
      }
      const res = await plaidClient().linkTokenCreate({
        user: { client_user_id: user.id },
        client_name: "ClearViewCash",
        country_codes: [CountryCode.Us],
        language: "en",
        access_token: item.access_token,
        webhook: `${Deno.env.get("SUPABASE_URL")}/functions/v1/plaid-webhook`,
      });
      return jsonResponse({
        link_token: res.data.link_token,
        expiration: res.data.expiration,
        update_mode: true,
      });
    }

    const res = await plaidClient().linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: "ClearViewCash",
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: "en",
      webhook: `${Deno.env.get("SUPABASE_URL")}/functions/v1/plaid-webhook`,
    });
    return jsonResponse({ link_token: res.data.link_token, expiration: res.data.expiration });
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, { status: 500 });
  }
});
