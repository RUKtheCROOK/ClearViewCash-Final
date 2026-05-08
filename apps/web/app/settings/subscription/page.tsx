"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import type { Tier } from "@cvc/types";
import { useTheme } from "../../../lib/theme-provider";
import { Group, PageHeader, Row, SectionLabel } from "../_components/SettingsAtoms";
import { PlanCard } from "../_components/PlanCard";
import { Si } from "../_components/settingsGlyphs";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

interface SubscriptionSummary {
  tier: string;
  next_charge: string | null;
  next_charge_amount_cents: number | null;
  payment_method_last4: string | null;
  payment_method_brand: string | null;
  cancel_at_period_end: boolean;
}

function tierTitle(tier: string): string {
  if (tier === "pro") return "Clear Pro";
  if (tier === "household") return "Clear Household";
  return "Free";
}

function tierMonthlyPrice(tier: string): string {
  if (tier === "pro") return "$9.99";
  if (tier === "household") return "$14.99";
  return "$0";
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function SubscriptionPage() {
  const router = useRouter();
  const { resolved } = useTheme();
  const [tier, setTier] = useState<Tier>("starter");
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("users").select("tier").maybeSingle();
      if (cancelled) return;
      setTier(((data?.tier as Tier) ?? "starter") as Tier);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${APP_URL}/api/stripe/subscription-summary`, {
          headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
        });
        if (!cancelled) setSummary(((await res.json()) as SubscriptionSummary) ?? null);
      } catch {
        if (!cancelled) setSummary(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function startCheckout(plan: "pro" | "household") {
    setLoading(plan);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${APP_URL}/api/stripe/checkout`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify({ plan }),
    });
    const json = await res.json();
    setLoading(null);
    if (json.url) window.location.assign(json.url);
  }

  async function openPortal() {
    setLoading("portal");
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${APP_URL}/api/stripe/portal`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
    });
    const json = await res.json();
    setLoading(null);
    if (json.url) window.location.assign(json.url);
  }

  const isPaid = tier !== "starter";
  const pmLine = summary?.payment_method_last4
    ? `${summary.payment_method_brand?.toUpperCase() ?? "Card"} ··${summary.payment_method_last4}`
    : "Set in portal";

  return (
    <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", paddingBottom: 60 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <PageHeader title="Subscription & Billing" backHref="/settings" onBack={() => router.push("/settings")} />

        {/* Hero card */}
        <div style={{ padding: "8px 16px 4px" }}>
          <div
            style={{
              padding: 18,
              borderRadius: 18,
              background: "var(--brand)",
              color: "var(--brand-on)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <svg width={120} height={120} viewBox="0 0 120 120" style={{ position: "absolute", right: -20, top: -20, opacity: 0.18 }}>
              <circle cx={60} cy={60} r={50} fill="none" stroke="var(--brand-on)" strokeWidth={0.6} />
              <circle cx={60} cy={60} r={30} fill="none" stroke="var(--brand-on)" strokeWidth={0.6} />
              <circle cx={60} cy={60} r={10} fill="var(--brand-on)" />
            </svg>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--pos)" }} />
              <span
                style={{
                  fontFamily: "var(--font-num)",
                  fontSize: 10,
                  letterSpacing: "0.10em",
                  fontWeight: 600,
                  opacity: 0.85,
                }}
              >
                CURRENT PLAN · {isPaid ? "ACTIVE" : "FREE"}
              </span>
            </div>
            <h2 style={{ margin: "10px 0 4px", fontFamily: "var(--font-ui)", fontSize: 30, fontWeight: 500, letterSpacing: "-0.02em" }}>
              {tierTitle(tier)}
            </h2>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontFamily: "var(--font-num)", fontSize: 22, fontWeight: 600 }}>{tierMonthlyPrice(tier)}</span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, opacity: 0.85 }}>
                / month{isPaid ? " · billed monthly" : ""}
              </span>
            </div>
            {isPaid ? (
              <>
                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 14,
                    borderTop: "1px solid rgba(255,255,255,0.18)",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ fontFamily: "var(--font-num)", fontSize: 9, opacity: 0.7, letterSpacing: "0.08em", fontWeight: 600 }}>
                      NEXT CHARGE
                    </div>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500, marginTop: 2 }}>{fmtDate(summary?.next_charge ?? null)}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-num)", fontSize: 9, opacity: 0.7, letterSpacing: "0.08em", fontWeight: 600 }}>METHOD</div>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500, marginTop: 2 }}>{pmLine}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openPortal}
                  disabled={loading === "portal"}
                  style={{
                    marginTop: 14,
                    width: "100%",
                    height: 40,
                    borderRadius: 10,
                    background: "var(--brand-on)",
                    color: "var(--brand)",
                    border: 0,
                    cursor: loading === "portal" ? "wait" : "pointer",
                    fontFamily: "var(--font-ui)",
                    fontSize: 13,
                    fontWeight: 500,
                    opacity: loading === "portal" ? 0.85 : 1,
                  }}
                >
                  {loading === "portal" ? "Opening…" : "Manage plan"}
                </button>
              </>
            ) : (
              <p style={{ marginTop: 12, fontFamily: "var(--font-ui)", fontSize: 12, opacity: 0.85 }}>
                Pick a plan below to unlock everything.
              </p>
            )}
          </div>
        </div>

        {/* Compare plans */}
        <SectionLabel>COMPARE PLANS</SectionLabel>
        <div style={{ padding: "0 16px", display: "flex", gap: 10, overflowX: "auto" }}>
          <PlanCard
            name="Free"
            price="$0"
            cadence="/mo"
            features={["1 space", "2 connected accounts", "Basic bills + budgets"]}
            outline
            cta={isPaid ? "Downgrade" : "Current"}
            disabled={!isPaid}
            onPress={isPaid ? openPortal : undefined}
          />
          <PlanCard
            name="Pro"
            price="$9.99"
            cadence="/mo"
            current={tier === "pro"}
            features={["Unlimited spaces", "Unlimited accounts", "Forecast + Reports", "Goals + Plaid"]}
            cta={loading === "pro" ? "Opening…" : "Upgrade to Pro"}
            disabled={loading === "pro"}
            onPress={() => startCheckout("pro")}
          />
          <PlanCard
            name="Household"
            price="$14.99"
            cadence="/mo"
            current={tier === "household"}
            upsell={tier !== "household"}
            features={["Everything in Pro", "Up to 5 members per space", "Advanced sharing", "Priority support"]}
            cta={loading === "household" ? "Opening…" : "Switch to Household"}
            disabled={loading === "household"}
            onPress={() => startCheckout("household")}
          />
        </div>

        {/* Payment method */}
        <SectionLabel>PAYMENT METHOD</SectionLabel>
        <Group>
          <div
            style={{
              padding: "14px 18px",
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gap: 12,
              alignItems: "center",
              borderBottom: "1px solid var(--line-soft)",
            }}
          >
            <span
              style={{
                width: 44,
                height: 30,
                borderRadius: 6,
                background: "oklch(28% 0.080 260)",
                color: "white",
                display: "grid",
                placeItems: "center",
                fontFamily: "var(--font-ui)",
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              {summary?.payment_method_brand?.toUpperCase().slice(0, 4) ?? "CARD"}
            </span>
            <div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 500, color: "var(--ink-1)" }}>
                {summary?.payment_method_last4 ? `${summary.payment_method_brand ?? "Card"} ending in ${summary.payment_method_last4}` : "No payment method"}
              </div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>
                {summary?.payment_method_last4 ? "default" : "Add one in the billing portal"}
              </div>
            </div>
            <button
              type="button"
              onClick={openPortal}
              style={{
                padding: "5px 10px",
                borderRadius: 999,
                background: "var(--bg-tinted)",
                color: "var(--ink-2)",
                border: 0,
                cursor: "pointer",
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              Edit
            </button>
          </div>
          <Row mode={resolved} title="Add payment method" right={Si.plus("var(--ink-2)")} onPress={openPortal} last />
        </Group>

        {/* Invoices */}
        <SectionLabel>INVOICES</SectionLabel>
        <Group>
          <Row
            mode={resolved}
            title="View invoices in billing portal"
            sub="Stripe lists every charge with downloadable PDFs."
            onPress={openPortal}
            last
          />
        </Group>

        {/* Plan changes */}
        {isPaid ? (
          <>
            <SectionLabel>PLAN CHANGES</SectionLabel>
            <Group>
              <Row
                mode={resolved}
                title="Cancel subscription"
                sub={summary?.next_charge ? `You'll keep ${tierTitle(tier)} until ${fmtDate(summary.next_charge)}, then move to Free.` : "Manage cancellation in the billing portal."}
                danger
                onPress={openPortal}
                last
              />
            </Group>
          </>
        ) : null}

        <div style={{ padding: "18px 16px 0", textAlign: "center", fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)", lineHeight: 1.55 }}>
          Need a receipt for your accountant? Tap any invoice to download a PDF.
        </div>
      </div>
    </main>
  );
}
