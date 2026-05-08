"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import type { Tier } from "@cvc/types";
import { getMySpaces, getPlaidItemsStatus } from "@cvc/api-client";
import { useTheme } from "../../lib/theme-provider";
import { Group, ProChip, Row, SectionLabel } from "./_components/SettingsAtoms";
import { Si } from "./_components/settingsGlyphs";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

const VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "2.4.1";

function initialsFor(name: string | null | undefined, email: string | null | undefined): string {
  const src = (name ?? "").trim() || (email ?? "").trim();
  if (!src) return "?";
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function tierLabel(tier: string): string {
  if (tier === "pro") return "Pro · $9.99/mo";
  if (tier === "household") return "Household · $14.99/mo";
  return "Free";
}

export default function SettingsHome() {
  const router = useRouter();
  const { resolved } = useTheme();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [tier, setTier] = useState<Tier>("starter");
  const [spaceCount, setSpaceCount] = useState<number>(0);
  const [plaidCount, setPlaidCount] = useState<number | null>(null);
  const [has2fa, setHas2fa] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (cancelled) return;
      setSignedIn(!!sess.session);
      setEmail(sess.session?.user?.email ?? "");
      const [profile, spaceRows, plaid, mfa] = await Promise.all([
        supabase.from("users").select("display_name, tier").maybeSingle(),
        getMySpaces(supabase).catch(() => []),
        getPlaidItemsStatus(supabase).catch(() => [] as Awaited<ReturnType<typeof getPlaidItemsStatus>>),
        supabase.auth.mfa.listFactors(),
      ]);
      if (cancelled) return;
      setDisplayName(profile.data?.display_name ?? "");
      setTier(((profile.data?.tier as Tier) ?? "starter") as Tier);
      setSpaceCount((spaceRows as unknown as Array<unknown>).length);
      setPlaidCount(plaid.length);
      setHas2fa(((mfa.data?.totp ?? []).some((f) => f.status === "verified")));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/sign-in");
  }

  if (signedIn === false) {
    return (
      <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", padding: "60px 16px" }}>
        <div style={{ maxWidth: 460, margin: "0 auto" }}>
          <h1 style={{ fontFamily: "var(--font-ui)", fontSize: 28, fontWeight: 500 }}>Settings</h1>
          <p className="muted" style={{ marginTop: 12 }}>Sign in to view your settings.</p>
          <Link href="/sign-in" className="btn btn-primary" style={{ marginTop: 16, display: "inline-flex" }}>
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  const initials = initialsFor(displayName, email);
  const securitySub = has2fa === null ? "Loading…" : `2FA ${has2fa ? "on" : "off"}`;
  const isPro = tier !== "starter";

  return (
    <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", paddingBottom: 60 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ padding: "20px 16px 8px" }}>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-ui)",
              fontSize: 28,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "var(--ink-1)",
              lineHeight: 1.1,
            }}
          >
            Settings
          </h1>
        </div>

        {/* Profile card */}
        <div style={{ padding: "8px 16px 4px" }}>
          <Link
            href="/settings/profile"
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gap: 12,
              alignItems: "center",
              padding: 14,
              borderRadius: 16,
              background: "var(--bg-surface)",
              border: "1px solid var(--line-soft)",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <span
              style={{
                width: 56,
                height: 56,
                borderRadius: 999,
                background: "oklch(85% 0.060 30)",
                color: "oklch(30% 0.060 30)",
                display: "grid",
                placeItems: "center",
                fontFamily: "var(--font-ui)",
                fontSize: 20,
                fontWeight: 500,
              }}
            >
              {initials}
            </span>
            <div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 16, fontWeight: 500, color: "var(--ink-1)" }}>
                {displayName || email || "Your profile"}
              </div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{email}</div>
              {isPro ? (
                <div style={{ marginTop: 6 }}>
                  <ProChip tone="brand">CLEAR PRO</ProChip>
                </div>
              ) : null}
            </div>
            {Si.chevR("var(--ink-3)")}
          </Link>
        </div>

        {/* Promoted: 2FA */}
        {has2fa === false ? (
          <div style={{ padding: "10px 16px 0" }}>
            <Link
              href="/settings/security"
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: 12,
                alignItems: "center",
                padding: 14,
                borderRadius: 14,
                background: "var(--warn-tint)",
                border: `1px solid ${resolved === "dark" ? "oklch(40% 0.080 65)" : "oklch(88% 0.040 65)"}`,
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "var(--bg-surface)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {Si.shield("var(--warn)")}
              </span>
              <div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 500, color: "var(--ink-1)" }}>
                  Turn on two-factor auth
                </div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-2)", marginTop: 2, lineHeight: 1.4 }}>
                  30 seconds. Adds a second check at login — strongly recommended.
                </div>
              </div>
              {Si.chevR("var(--ink-2)")}
            </Link>
          </div>
        ) : null}

        {/* ACCOUNT */}
        <SectionLabel>ACCOUNT</SectionLabel>
        <Group>
          <Row mode={resolved} glyph="user" hue={195} title="Profile" sub="Name, email, photo, password" href="/settings/profile" />
          <Row mode={resolved} glyph="spaces" hue={30} title="Spaces & Members" value={`${spaceCount} ${spaceCount === 1 ? "space" : "spaces"}`} href="/settings/spaces" />
          <Row mode={resolved} glyph="bell" hue={75} title="Notifications" value="Manage" href="/settings/notifications" />
          <Row mode={resolved} glyph="shield" hue={155} title="Security" sub={securitySub} href="/settings/security" />
          <Row mode={resolved} glyph="card" hue={35} title="Payment Links" sub="Auto-pay credit cards from depository" last href="/settings/payment-links" />
        </Group>

        {/* PLAN */}
        <SectionLabel>PLAN</SectionLabel>
        <Group>
          <Row mode={resolved} glyph="star" hue={45} title="Subscription & Billing" value={tierLabel(tier)} href="/settings/subscription" />
          <Row
            mode={resolved}
            glyph="plug"
            hue={220}
            title="Connected Services"
            sub={plaidCount === null ? "Loading…" : `Plaid · ${plaidCount} ${plaidCount === 1 ? "institution" : "institutions"}`}
            last
            href="/settings/connected"
          />
        </Group>

        {/* PRIVACY & DATA */}
        <SectionLabel>PRIVACY &amp; DATA</SectionLabel>
        <Group>
          <Row mode={resolved} glyph="lock" hue={240} title="Privacy & Data" sub="Export, retention, delete account" last href="/settings/privacy" />
        </Group>

        {/* SUPPORT */}
        <SectionLabel>SUPPORT</SectionLabel>
        <Group>
          <Row mode={resolved} glyph="help" hue={195} title="Help & Support" sub="FAQ, contact, feedback" href="/settings/help" />
          <Row mode={resolved} glyph="info" hue={220} title="About" sub={`Version ${VERSION} · Terms · Privacy`} last href="/settings/about" />
        </Group>

        {/* Sign out */}
        <div style={{ padding: "24px 16px 0" }}>
          <button
            type="button"
            onClick={signOut}
            style={{
              width: "100%",
              height: 48,
              borderRadius: 12,
              background: "var(--bg-surface)",
              border: "1px solid var(--line-soft)",
              cursor: "pointer",
              color: "var(--neg)",
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Sign out
          </button>
          <div
            style={{
              marginTop: 16,
              textAlign: "center",
              fontFamily: "var(--font-num)",
              fontSize: 10,
              color: "var(--ink-4)",
              letterSpacing: "0.06em",
            }}
          >
            CLEAR VIEW CASH · v{VERSION}
          </div>
        </div>
      </div>
    </main>
  );
}
