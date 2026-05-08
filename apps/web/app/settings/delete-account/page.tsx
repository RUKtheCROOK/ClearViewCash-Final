"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import { Group, PageHeader, SectionLabel } from "../_components/SettingsAtoms";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

export default function DeleteAccountPage() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function performDelete() {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? body.error ?? `HTTP ${res.status}`);
      }
      await supabase.auth.signOut();
      router.replace("/sign-in");
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", paddingBottom: 60 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <PageHeader title="Delete account" backHref="/settings/privacy" onBack={() => router.push("/settings/privacy")} />

        <SectionLabel>WHAT THIS DOES</SectionLabel>
        <Group>
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 500, color: "var(--ink-1)" }}>
              This permanently deletes your account.
            </div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>
              All linked institutions, all transactions, and all spaces you own will be removed. Members of shared spaces you co-own will lose access. There is no recovery.
            </div>
          </div>
        </Group>

        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {error ? (
            <div style={{ padding: 12, borderRadius: 12, background: "var(--neg-tint)", color: "var(--neg)", fontSize: 13 }}>{error}</div>
          ) : null}
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              style={{
                height: 48,
                borderRadius: 12,
                background: "var(--bg-surface)",
                border: "1px solid var(--line-soft)",
                color: "var(--neg)",
                cursor: "pointer",
                fontFamily: "var(--font-ui)",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              I understand, continue
            </button>
          ) : (
            <>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--neg)" }}>
                Final confirmation. There is no recovery after this.
              </div>
              <button
                type="button"
                onClick={performDelete}
                disabled={loading}
                style={{
                  height: 48,
                  borderRadius: 12,
                  background: "var(--neg)",
                  color: "white",
                  border: 0,
                  cursor: loading ? "wait" : "pointer",
                  fontFamily: "var(--font-ui)",
                  fontSize: 14,
                  fontWeight: 500,
                  opacity: loading ? 0.5 : 1,
                }}
              >
                {loading ? "Deleting…" : "Delete my account"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                style={{ height: 48, background: "transparent", border: 0, cursor: "pointer", color: "var(--ink-2)", fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 500 }}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
