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

  const { data: row } = await supa.from("users").select("stripe_customer_id").maybeSingle();
  if (!row?.stripe_customer_id) return cors({ error: "no_customer" }, { status: 400 });

  const session = await stripe.billingPortal.sessions.create({
    customer: row.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/billing`,
  });
  return cors({ url: session.url });
}
