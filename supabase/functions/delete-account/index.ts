import Stripe from "npm:stripe@^17.4.0";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { adminClient, getUserFromAuthHeader } from "../_shared/supabase-admin.ts";
import { plaidClient } from "../_shared/plaid.ts";

// Required by Apple App Store guideline 5.1.1(v): an in-app account-deletion
// path that fully removes the account and associated data. Cascade FKs on
// public.users -> auth.users handle most rows; this function exists to
// (1) revoke external resources Postgres can't reach (Plaid items, Stripe
// subscriptions) and (2) call auth.admin.deleteUser, which only the
// service role can do.

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-10-28.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const user = await getUserFromAuthHeader(req);
  if (!user) return jsonResponse({ error: "unauthorized" }, { status: 401 });

  const supa = adminClient();
  const errors: Array<{ step: string; detail: string }> = [];

  // 1. Revoke Plaid items. We pull access_token via the service-role client
  //    because column-level revokes hide it from authenticated.
  const { data: items } = await supa
    .from("plaid_items")
    .select("id, access_token")
    .eq("owner_user_id", user.id);
  if (items?.length) {
    const plaid = plaidClient();
    await Promise.all(
      items.map(async (it) => {
        try {
          await plaid.itemRemove({ access_token: it.access_token });
        } catch (e) {
          // Don't block deletion on Plaid errors (item may already be gone).
          errors.push({ step: `plaid_remove:${it.id}`, detail: (e as Error).message });
        }
      }),
    );
  }

  // 2. Cancel any live Stripe subscription. We only cancel statuses that
  //    bill — canceled/incomplete_expired are no-ops at Stripe.
  const { data: sub } = await supa
    .from("subscriptions")
    .select("stripe_subscription_id, status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (sub?.stripe_subscription_id && sub.status !== "canceled") {
    try {
      await stripe.subscriptions.cancel(sub.stripe_subscription_id);
    } catch (e) {
      errors.push({ step: "stripe_cancel", detail: (e as Error).message });
    }
  }

  // 3. Delete the auth user. Cascades to public.users and from there to
  //    every owned row (spaces, accounts, transactions, etc).
  const { error: delErr } = await supa.auth.admin.deleteUser(user.id);
  if (delErr) {
    return jsonResponse(
      { error: "delete_failed", detail: delErr.message, partial_errors: errors },
      { status: 500 },
    );
  }

  return jsonResponse({ ok: true, partial_errors: errors });
});
