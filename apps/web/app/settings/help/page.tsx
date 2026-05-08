"use client";

import { useRouter } from "next/navigation";
import { Group, PageHeader, Row, SectionLabel } from "../_components/SettingsAtoms";

const VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "2.4.1";

export default function HelpHubPage() {
  const router = useRouter();
  return (
    <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", paddingBottom: 60 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <PageHeader title="Help & Support" backHref="/settings" onBack={() => router.push("/settings")} />

        <SectionLabel>GET HELP</SectionLabel>
        <Group>
          <Row title="FAQ" sub="Common questions, answered." onPress={() => window.open("https://clearviewcash.com/faq", "_blank")} />
          <Row title="Contact support" sub="Email us — we usually reply within a business day." onPress={() => window.open("mailto:support@clearviewcash.com")} />
          <Row title="Send feedback" sub="Bugs, ideas, requests." onPress={() => window.open(`mailto:feedback@clearviewcash.com?subject=Feedback%20·%20v${VERSION}`)} last />
        </Group>
      </div>
    </main>
  );
}
