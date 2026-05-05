"use client";

import Link from "next/link";
import { useTheme } from "../../lib/theme-provider";

export default function SettingsPage() {
  const { mode, resolved, setMode } = useTheme();
  return (
    <main
      className="space space-personal"
      style={{
        minHeight: "100vh",
        background: "var(--bg-canvas)",
        color: "var(--ink-1)",
        padding: "32px 16px",
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <Link
          href="/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "var(--ink-2)",
            fontSize: 14,
          }}
        >
          ← Back to dashboard
        </Link>
        <h1 style={{ marginTop: 16, fontSize: 28, fontWeight: 500, letterSpacing: "-0.01em" }}>
          Settings
        </h1>
        <p className="muted" style={{ marginTop: 4 }}>
          Most settings live in the mobile app right now. Theme is wired here so dark mode is
          flippable on the web.
        </p>

        <section
          style={{
            marginTop: 24,
            background: "var(--bg-surface)",
            border: "1px solid var(--line-soft)",
            borderRadius: 16,
            padding: 16,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Theme
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
            Currently rendering in <strong>{resolved}</strong> mode (preference: {mode}).
          </p>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            {(["system", "light", "dark"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className="btn"
                style={{
                  background: mode === m ? "var(--brand-tint)" : "var(--bg-surface)",
                  color: mode === m ? "var(--brand)" : "var(--ink-1)",
                  borderColor: mode === m ? "var(--brand)" : "var(--line-soft)",
                  borderStyle: "solid",
                  borderWidth: 1,
                }}
              >
                {`${m.charAt(0).toUpperCase()}${m.slice(1)}`}
              </button>
            ))}
          </div>
        </section>

        <section
          style={{
            marginTop: 16,
            background: "var(--bg-surface)",
            border: "1px solid var(--line-soft)",
            borderRadius: 16,
            padding: 16,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Web settings — coming soon
          </div>
          <ul className="muted" style={{ fontSize: 13, paddingLeft: 18, marginTop: 8, lineHeight: 1.6 }}>
            <li>Profile, security, and notification preferences</li>
            <li>Spaces &amp; members management</li>
            <li>Connected banks and payment links</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
