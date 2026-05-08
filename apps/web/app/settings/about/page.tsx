"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "../../../lib/theme-provider";
import { Group, PageHeader, Row, SectionLabel } from "../_components/SettingsAtoms";

const VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "2.4.1";

export default function AboutHubPage() {
  const router = useRouter();
  const { mode, resolved, setMode } = useTheme();

  return (
    <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", paddingBottom: 60 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <PageHeader title="About" backHref="/settings" onBack={() => router.push("/settings")} />

        <SectionLabel>APP</SectionLabel>
        <Group>
          <Row title="Version" value={`v${VERSION}`} right={null} />
          <Row title="Resolved theme" value={resolved === "dark" ? "Dark" : "Light"} right={null} last />
        </Group>

        <SectionLabel>APPEARANCE</SectionLabel>
        <Group>
          <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 500, color: "var(--ink-1)" }}>Theme</div>
            <div style={{ display: "flex", gap: 6 }}>
              {(["system", "light", "dark"] as const).map((m) => {
                const active = mode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    style={{
                      flex: 1,
                      height: 38,
                      borderRadius: 10,
                      background: active ? "var(--brand)" : "var(--bg-tinted)",
                      color: active ? "var(--brand-on)" : "var(--ink-2)",
                      border: 0,
                      cursor: "pointer",
                      fontFamily: "var(--font-ui)",
                      fontSize: 12.5,
                      fontWeight: 500,
                      textTransform: "capitalize",
                    }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        </Group>

        <SectionLabel>LEGAL</SectionLabel>
        <Group>
          <Row title="Terms of Service" onPress={() => window.open("https://clearviewcash.com/terms", "_blank")} />
          <Row title="Privacy Policy" onPress={() => window.open("/privacy", "_blank")} />
          <Row title="Open source licenses" sub="Coming soon." right={null} last />
        </Group>

        <div style={{ padding: "18px 16px 0", textAlign: "center" }}>
          <span style={{ fontFamily: "var(--font-num)", fontSize: 10, color: "var(--ink-4)", letterSpacing: "0.06em" }}>
            CLEAR VIEW CASH · v{VERSION}
          </span>
        </div>
      </div>
    </main>
  );
}
