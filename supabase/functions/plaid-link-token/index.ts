import { CountryCode, Products } from "npm:plaid@^29.0.0";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { getUserFromAuthHeader } from "../_shared/supabase-admin.ts";
import { plaidClient } from "../_shared/plaid.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const user = await getUserFromAuthHeader(req);
  if (!user) return jsonResponse({ error: "unauthorized" }, { status: 401 });

  try {
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
