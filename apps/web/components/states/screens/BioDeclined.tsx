"use client";

import { StateHeader } from "../StateHeader";
import { StateMono } from "../StateMono";
import { StateScreen } from "../StateScreen";
import { IlloFace } from "../illustrations";

interface Props {
  onEnable?: () => void;
  onKeepPassword?: () => void;
  passwordSeconds?: number;
  biometricSeconds?: string;
}

export function BioDeclined({
  onEnable,
  onKeepPassword,
  passwordSeconds = 8,
  biometricSeconds = "<1",
}: Props) {
  return (
    <StateScreen>
      <StateHeader title="Security" sub="Passkey / Face ID skipped" />

      <div style={{ padding: "4px 16px 0" }}>
        <div
          style={{
            padding: 18,
            borderRadius: 18,
            background: "var(--bg-surface)",
            border: "1px solid var(--line-soft)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <IlloFace />
          <StateMono
            style={{ marginTop: 12, fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.10em", fontWeight: 700 }}
          >
            PASSKEY · NOT SET UP
          </StateMono>
          <div
            style={{
              marginTop: 8,
              fontFamily: "var(--font-ui)",
              fontSize: 18,
              fontWeight: 500,
              color: "var(--ink-1)",
              textWrap: "balance",
              maxWidth: 280,
              lineHeight: 1.3,
            }}
          >
            Sign in with a tap instead of a password
          </div>
          <div
            style={{
              marginTop: 8,
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-3)",
              lineHeight: 1.5,
              maxWidth: 280,
            }}
          >
            We never store your biometrics — your device does. We just ask it to confirm it&apos;s you.
          </div>
          <button
            type="button"
            onClick={onEnable}
            style={{
              marginTop: 18,
              width: "100%",
              height: 46,
              borderRadius: 12,
              border: 0,
              cursor: "pointer",
              background: "var(--brand)",
              color: "var(--brand-on)",
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Turn on passkey
          </button>
          <button
            type="button"
            onClick={onKeepPassword}
            style={{
              marginTop: 8,
              width: "100%",
              height: 42,
              borderRadius: 12,
              cursor: "pointer",
              background: "transparent",
              border: "1px solid var(--line-firm)",
              color: "var(--ink-1)",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Keep using password
          </button>
        </div>
      </div>

      <div style={{ padding: "14px 16px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              background: "var(--bg-surface)",
              border: "1px solid var(--line-soft)",
            }}
          >
            <StateMono style={{ fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.08em", fontWeight: 700 }}>
              PASSWORD
            </StateMono>
            <div style={{ marginTop: 6, display: "flex", alignItems: "baseline", gap: 4 }}>
              <StateMono style={{ fontSize: 18, fontWeight: 500, color: "var(--ink-1)" }}>
                {passwordSeconds}
              </StateMono>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, color: "var(--ink-3)" }}>sec / sign-in</span>
            </div>
          </div>
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              background: "var(--brand-tint)",
              border: "1px solid var(--brand-soft)",
            }}
          >
            <StateMono style={{ fontSize: 9, color: "var(--brand)", letterSpacing: "0.08em", fontWeight: 700 }}>
              PASSKEY
            </StateMono>
            <div style={{ marginTop: 6, display: "flex", alignItems: "baseline", gap: 4 }}>
              <StateMono style={{ fontSize: 18, fontWeight: 500, color: "var(--brand)" }}>{biometricSeconds}</StateMono>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, color: "var(--ink-2)" }}>sec / sign-in</span>
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 10,
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--ink-3)",
            textAlign: "center",
            lineHeight: 1.55,
          }}
        >
          You can change this anytime in <span style={{ color: "var(--ink-2)", fontWeight: 500 }}>Settings → Security</span>.
        </div>
      </div>
    </StateScreen>
  );
}
