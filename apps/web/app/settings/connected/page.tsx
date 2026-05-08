"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import { Group, PageHeader, Row, SectionLabel } from "../_components/SettingsAtoms";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

interface Item {
  id: string;
  institution_name: string | null;
  status: string;
}

export default function ConnectedPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("plaid_items")
        .select("id, institution_name, status")
        .order("institution_name", { ascending: true });
      if (!cancelled) setItems((data ?? []) as Item[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", paddingBottom: 60 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <PageHeader title="Connected Services" backHref="/settings" onBack={() => router.push("/settings")} />

        <div style={{ padding: "4px 18px 12px", fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
          Plaid connections to your financial institutions. Click one to manage accounts or disconnect.
        </div>

        <SectionLabel>INSTITUTIONS</SectionLabel>
        <Group>
          {items.length === 0 ? (
            <Row title="No connected services" sub="Link a bank from the Accounts page." right={null} last />
          ) : (
            items.map((i, idx) => (
              <Row
                key={i.id}
                title={i.institution_name ?? "Unknown bank"}
                sub={i.status === "good" ? "Syncing normally" : "Needs reauth"}
                value={i.status === "good" ? "Healthy" : "Issue"}
                right={null}
                onPress={() => router.push(`/settings/connected/${i.id}`)}
                last={idx === items.length - 1}
              />
            ))
          )}
        </Group>
      </div>
    </main>
  );
}
