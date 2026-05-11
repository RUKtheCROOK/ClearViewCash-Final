"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import { useTheme } from "../../../lib/theme-provider";
import { Group, PageHeader, Row, SectionLabel } from "../_components/SettingsAtoms";
import { Si } from "../_components/settingsGlyphs";
import { BioDeclined } from "../../../components/states";

const PASSKEYS_ENABLED = process.env.NEXT_PUBLIC_FEATURE_PASSKEYS === "1";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

export default function SecurityPage() {
  const router = useRouter();
  const { resolved } = useTheme();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [otpUri, setOtpUri] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [has2fa, setHas2fa] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    const { data, error: err } = await supabase.auth.mfa.listFactors();
    if (err || !data) {
      setHas2fa(false);
      return;
    }
    setHas2fa((data.totp ?? []).some((f) => f.status === "verified"));
  }

  async function startEnroll() {
    setBusy(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (err || !data) throw new Error(err?.message ?? "Failed to start 2FA");
      setOtpUri(data.totp.uri);
      setFactorId(data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    if (!factorId || !code) return;
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (err) throw err;
      setOtpUri(null);
      setFactorId(null);
      setCode("");
      setInfo("2FA enabled. Future sign-ins will require a code from your authenticator.");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function disable2fa() {
    const ok = window.confirm("Disable two-factor auth? Sign-ins will only require your password.");
    if (!ok) return;
    const { data } = await supabase.auth.mfa.listFactors();
    const totp = (data?.totp ?? [])[0];
    if (!totp) return;
    const { error: err } = await supabase.auth.mfa.unenroll({ factorId: totp.id });
    if (err) {
      setError(err.message);
      return;
    }
    setInfo("2FA disabled.");
    await refresh();
  }

  return (
    <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", paddingBottom: 60 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <PageHeader title="Security" backHref="/settings" onBack={() => router.push("/settings")} />

        {PASSKEYS_ENABLED ? (
          <BioDeclined
            onEnable={() => setInfo("Passkey setup is coming soon.")}
            onKeepPassword={() => setInfo("No worries — your password still signs you in.")}
          />
        ) : null}

        {has2fa === false && !otpUri ? (
          <div style={{ padding: "8px 16px 0" }}>
            <div
              style={{
                padding: 14,
                borderRadius: 14,
                background: "var(--warn-tint)",
                border: `1px solid ${resolved === "dark" ? "oklch(40% 0.080 65)" : "oklch(88% 0.040 65)"}`,
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: 12,
                alignItems: "center",
              }}
            >
              <span style={{ width: 36, height: 36, borderRadius: 10, background: "var(--bg-surface)", display: "grid", placeItems: "center" }}>
                {Si.shield("var(--warn)")}
              </span>
              <div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 500, color: "var(--ink-1)" }}>
                  Add a second check at login
                </div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-2)", marginTop: 2, lineHeight: 1.4 }}>
                  Use an authenticator app like 1Password, Authy, or Google Authenticator.
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {error ? (
          <div style={{ padding: "0 16px 8px" }}>
            <div style={{ padding: 12, borderRadius: 12, background: "var(--neg-tint)", color: "var(--neg)", fontSize: 13 }}>{error}</div>
          </div>
        ) : null}
        {info ? (
          <div style={{ padding: "0 16px 8px" }}>
            <div style={{ padding: 12, borderRadius: 12, background: "var(--pos-tint)", color: "var(--pos)", fontSize: 13 }}>{info}</div>
          </div>
        ) : null}

        <SectionLabel>TWO-FACTOR AUTH</SectionLabel>
        <Group>
          {has2fa === null ? (
            <Row title="Loading…" right={null} last />
          ) : has2fa ? (
            <>
              <Row title="Status" value="Enabled" right={null} />
              <Row title="Disable two-factor auth" sub="Drops back to password-only sign-in." danger onPress={disable2fa} last />
            </>
          ) : !otpUri ? (
            <Row title="Enable two-factor auth" sub="Set up a TOTP code in your authenticator." onPress={startEnroll} last />
          ) : (
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 500, color: "var(--ink-1)" }}>Scan in your authenticator</div>
              <div style={{ padding: 12, borderRadius: 10, background: "var(--bg-sunken)", border: "1px solid var(--line-soft)" }}>
                <code style={{ fontFamily: "var(--font-num)", fontSize: 11, color: "var(--ink-2)", wordBreak: "break-all", lineHeight: 1.5 }}>{otpUri}</code>
              </div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-3)" }}>Enter the 6-digit code:</div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "var(--bg-surface)",
                  border: "1px solid var(--line-soft)",
                  fontFamily: "var(--font-num)",
                  fontSize: 18,
                  color: "var(--ink-1)",
                  letterSpacing: 4,
                  textAlign: "center",
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setOtpUri(null);
                    setFactorId(null);
                    setCode("");
                  }}
                  style={{ flex: 1, height: 42, borderRadius: 10, border: "1px solid var(--line-firm)", background: "transparent", color: "var(--ink-2)", cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={verifyOtp}
                  disabled={busy || code.length < 6}
                  style={{ flex: 1, height: 42, borderRadius: 10, background: "var(--brand)", color: "var(--brand-on)", border: 0, cursor: busy ? "wait" : "pointer", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500, opacity: busy || code.length < 6 ? 0.5 : 1 }}
                >
                  {busy ? "Verifying…" : "Verify"}
                </button>
              </div>
            </div>
          )}
        </Group>

        <SectionLabel>BIOMETRICS</SectionLabel>
        <Group>
          <Row title="Device biometrics" sub="Available in the mobile app — Face ID / Touch ID at sign-in." value="Mobile only" right={null} last />
        </Group>
      </div>
    </main>
  );
}
