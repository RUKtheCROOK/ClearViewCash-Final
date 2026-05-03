import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { cors, corsPreflight } from "../../_lib/cors";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-02-24.acacia",
});

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: Request) {
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

  const { plan } = (await req.json()) as { plan: "pro" | "household" };
  const price = plan === "household" ? process.env.STRIPE_PRICE_HOUSEHOLD : process.env.STRIPE_PRICE_PRO;
  if (!price) return cors({ error: "price_not_configured" }, { status: 500 });

  const { data: row } = await supa.from("users").select("stripe_customer_id").maybeSingle();

  let customerId = row?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email ?? undefined, metadata: { user_id: user.id } });
    customerId = customer.id;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price, quantity: 1 }],
    success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pricing`,
    allow_promotion_codes: true,
  });

  return cors({ url: session.url });
}
