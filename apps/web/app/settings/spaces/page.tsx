"use client";

import Link from "next/link";

export default function SettingsSpacesStub() {
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
          href="/settings"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "var(--ink-2)",
            fontSize: 14,
          }}
        >
          ← Settings
        </Link>
        <h1 style={{ marginTop: 16, fontSize: 22, fontWeight: 500 }}>Spaces</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          Create and manage spaces from the mobile app for now. Coming to web soon.
        </p>
      </div>
    </main>
  );
}
