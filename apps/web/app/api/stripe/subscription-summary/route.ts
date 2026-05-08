import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { cors, corsPreflight } from "../../_lib/cors";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-02-24.acacia",
});

export async function OPTIONS() {
  return corsPreflight();
}

// Returns a small, UI-only summary of the current subscription so the redesigned
// settings page can show next-charge date + masked payment method without round-
// tripping through the full Stripe portal. Falls back to nulls when the user has
// no subscription yet.
export async function GET(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return cors({ error: "unauthorized" }, { status: 401 });
  }
  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    { global: { headers: { Authorization: auth } }, auth: { persistSession: false } },
  );
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return cors({ error: "unauthorized" }, { status: 401 });

  const { data: row } = await supa.from("users").select("stripe_customer_id, tier").maybeSingle();
  if (!row?.stripe_customer_id) {
    return cors({
      tier: row?.tier ?? "starter",
      next_charge: null,
      next_charge_amount_cents: null,
      payment_method_last4: null,
      payment_method_brand: null,
      cancel_at_period_end: false,
    });
  }

  try {
    const subs = await stripe.subscriptions.list({
      customer: row.stripe_customer_id,
      status: "all",
      limit: 1,
      expand: ["data.default_payment_method"],
    });
    const sub = subs.data[0];
    if (!sub) {
      return cors({
        tier: row.tier ?? "starter",
        next_charge: null,
        next_charge_amount_cents: null,
        payment_method_last4: null,
        payment_method_brand: null,
        cancel_at_period_end: false,
      });
    }
    const pm = sub.default_payment_method as Stripe.PaymentMethod | null;
    const card = pm?.card ?? null;
    const item = sub.items.data[0];
    const amount = item?.price?.unit_amount ?? null;
    return cors({
      tier: row.tier ?? "starter",
      next_charge: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
      next_charge_amount_cents: amount,
      payment_method_last4: card?.last4 ?? null,
      payment_method_brand: card?.brand ?? null,
      cancel_at_period_end: !!sub.cancel_at_period_end,
    });
  } catch (e) {
    return cors({
      tier: row.tier ?? "starter",
      next_charge: null,
      next_charge_amount_cents: null,
      payment_method_last4: null,
      payment_method_brand: null,
      cancel_at_period_end: false,
      error: e instanceof Error ? e.message : "stripe_lookup_failed",
    });
  }
}
