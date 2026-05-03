import Stripe from "npm:stripe@^17.4.0";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase-admin.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-10-28.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const PRICE_PRO = Deno.env.get("STRIPE_PRICE_PRO") ?? "";
const PRICE_HOUSEHOLD = Deno.env.get("STRIPE_PRICE_HOUSEHOLD") ?? "";

function tierFromPriceId(priceId: string | null | undefined): "starter" | "pro" | "household" {
  if (priceId === PRICE_PRO) return "pro";
  if (priceId === PRICE_HOUSEHOLD) return "household";
  return "starter";
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const sig = req.headers.get("stripe-signature");
  if (!sig) return jsonResponse({ error: "missing_signature" }, { status: 400 });
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (e) {
    return jsonResponse({ error: "invalid_signature", detail: (e as Error).message }, { status: 400 });
  }

  const supa = adminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const userId = s.client_reference_id;
      const subId = typeof s.subscription === "string" ? s.subscription : s.subscription?.id;
      if (userId && subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        const priceId = sub.items.data[0]?.price.id;
        const tier = tierFromPriceId(priceId);
        await supa.from("subscriptions").upsert({
          user_id: userId,
          stripe_subscription_id: sub.id,
          tier,
          status: sub.status,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
        });
        await supa.from("users").update({ tier, stripe_customer_id: s.customer as string }).eq("id", userId);
      }
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const priceId = sub.items.data[0]?.price.id;
      const tier = tierFromPriceId(priceId);
      const { data: row } = await supa
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_subscription_id", sub.id)
        .maybeSingle();
      if (row) {
        await supa.from("subscriptions").update({
          tier,
          status: sub.status,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
        }).eq("stripe_subscription_id", sub.id);
        if (sub.status === "active" || sub.status === "trialing") {
          await supa.from("users").update({ tier }).eq("id", row.user_id);
        }
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const { data: row } = await supa
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_subscription_id", sub.id)
        .maybeSingle();
      if (row) {
        await supa.from("users").update({ tier: "starter" }).eq("id", row.user_id);
        await supa.from("subscriptions").update({ status: "canceled", tier: "starter" }).eq("stripe_subscription_id", sub.id);
      }
      break;
    }
    case "invoice.payment_failed": {
      const inv = event.data.object as Stripe.Invoice;
      if (inv.customer) {
        await supa.from("users").select("id").eq("stripe_customer_id", inv.customer as string).maybeSingle().then(({ data }) => {
          if (data) {
            return supa.from("notifications").insert({
              user_id: data.id,
              kind: "payment_failed",
              payload: { invoice_id: inv.id, amount_due: inv.amount_due },
            });
          }
        });
      }
      break;
    }
    default:
      break;
  }

  return jsonResponse({ received: true });
});
