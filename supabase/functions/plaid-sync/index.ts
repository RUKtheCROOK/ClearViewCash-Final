import { z } from "npm:zod@^3.23.8";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase-admin.ts";
import { syncPlaidItem } from "../_shared/sync-logic.ts";

const Body = z.object({
  plaid_item_row_id: z.string().uuid().optional(),
  plaid_item_id: z.string().optional(),
});

/**
 * Incremental transaction sync. Idempotent on plaid_transaction_id (unique).
 * Walks Plaid /transactions/sync from the per-item cursor until has_more=false.
 *
 * Two ways to identify the item:
 *   plaid_item_row_id  — our internal UUID (fastest path, used by exchange)
 *   plaid_item_id      — Plaid's external id (used by webhook)
 */
Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return jsonResponse({ error: "bad_request" }, { status: 400 });
  }

  let rowId = body.plaid_item_row_id;
  if (!rowId) {
    if (!body.plaid_item_id) return jsonResponse({ error: "missing_item" }, { status: 400 });
    const { data, error } = await adminClient()
      .from("plaid_items")
      .select("id")
      .eq("plaid_item_id", body.plaid_item_id)
      .maybeSingle();
    if (error || !data) return jsonResponse({ error: "item_not_found" }, { status: 404 });
    rowId = data.id;
  }

  try {
    const result = await syncPlaidItem(rowId);
    return jsonResponse(result);
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, { status: 500 });
  }
});
