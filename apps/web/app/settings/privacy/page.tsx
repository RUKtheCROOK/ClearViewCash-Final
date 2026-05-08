"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Group, PageHeader, Row, SectionLabel } from "../_components/SettingsAtoms";

export default function PrivacyHubPage() {
  const router = useRouter();
  const [info, setInfo] = useState<string | null>(null);

  return (
    <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", paddingBottom: 60 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <PageHeader title="Privacy & Data" backHref="/settings" onBack={() => router.push("/settings")} />

        {info ? (
          <div style={{ padding: "0 16px 8px" }}>
            <div style={{ padding: 12, borderRadius: 12, background: "var(--info-tint)", color: "var(--info)", fontSize: 13 }}>{info}</div>
          </div>
        ) : null}

        <SectionLabel sub="Control what we keep, what you can take with you, and how to leave.">YOUR DATA</SectionLabel>
        <Group>
          <Row
            title="Export your data"
            sub="We'll email you a JSON archive of accounts, transactions, budgets, goals, bills."
            onPress={() => setInfo("Data export will email you a JSON archive. Contact support@clearviewcash.com for an early export.")}
          />
          <Row
            title="Data retention"
            sub="We keep account history for as long as your account is open. Closed accounts retain 90 days for support."
            right={null}
            last
          />
        </Group>

        <SectionLabel>SHARING DEFAULTS</SectionLabel>
        <Group>
          <Row title="Per-space sharing rules" sub="Defaults for what new shares allow." href="/settings/spaces" last />
        </Group>

        <SectionLabel>DANGER ZONE</SectionLabel>
        <Group>
          <Row title="Delete account" sub="Permanently removes everything you own." danger href="/settings/delete-account" last />
        </Group>
      </div>
    </main>
  );
}
