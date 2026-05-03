import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase-admin.ts";
import { PlaidWebhookSchema } from "../_shared/plaid-types.ts";

/**
 * Plaid webhook receiver. No JWT required (Plaid signs separately, but for
 * V1 we accept any payload from configured webhook URL — Plaid recommends
 * verifying via JWT signature for production: TODO add `Plaid-Verification` header check.
 */
Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const raw = await req.json().catch(() => null);
  const parsed = PlaidWebhookSchema.safeParse(raw);
  if (!parsed.success) return jsonResponse({ error: "bad_payload" }, { status: 400 });
  const wh = parsed.data;

  const supa = adminClient();

  // ITEM lifecycle: flip status so the Accounts page can prompt reconnect.
  if (wh.webhook_type === "ITEM") {
    if (wh.webhook_code === "ERROR" || wh.webhook_code === "PENDING_EXPIRATION" || wh.webhook_code === "USER_PERMISSION_REVOKED") {
      await supa.from("plaid_items").update({ status: "error" }).eq("plaid_item_id", wh.item_id);
    }
    return jsonResponse({ ok: true });
  }

  // TRANSACTIONS: trigger sync.
  if (wh.webhook_type === "TRANSACTIONS") {
    if (wh.webhook_code === "SYNC_UPDATES_AVAILABLE") {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/plaid-sync`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ plaid_item_id: wh.item_id }),
      });
    }
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ ok: true, ignored: true });
});
