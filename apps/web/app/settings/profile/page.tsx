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

export default function ProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (cancelled) return;
      setEmail(u.user?.email ?? "");
      const { data } = await supabase.from("users").select("display_name").maybeSingle();
      if (cancelled) return;
      setName(data?.display_name ?? "");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveName() {
    if (!editValue.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      const { error: updErr } = await supabase.from("users").update({ display_name: editValue.trim() }).eq("id", u.user.id);
      if (updErr) throw updErr;
      setName(editValue.trim());
      setEditOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!email) return;
    setError(null);
    setInfo(null);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email);
      if (err) throw err;
      setInfo(`We emailed a reset link to ${email}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", paddingBottom: 60 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <PageHeader title="Profile" backHref="/settings" onBack={() => router.push("/settings")} />

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

        <SectionLabel>YOUR DETAILS</SectionLabel>
        <Group>
          <Row title="Email" value={email || "—"} right={null} />
          <Row
            title="Display name"
            value={name || "Set a name"}
            onPress={() => {
              setEditValue(name);
              setEditOpen(true);
            }}
          />
          <Row
            title="Profile photo"
            sub="Coming soon — upload an image to use across the app."
            value="Add"
            right={null}
            last
          />
        </Group>

        <SectionLabel>PASSWORD</SectionLabel>
        <Group>
          <Row title="Change password" sub="We'll email you a reset link." onPress={resetPassword} last />
        </Group>
      </div>

      {editOpen ? (
        <div onClick={() => setEditOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "grid", placeItems: "center", padding: 24, zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, width: "100%", background: "var(--bg-surface)", borderRadius: 18, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ margin: 0, fontFamily: "var(--font-ui)", fontSize: 18, fontWeight: 500, color: "var(--ink-1)" }}>Display name</h2>
            <input
              type="text"
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              style={{ padding: "10px 12px", borderRadius: 10, background: "var(--bg-surface)", border: "1px solid var(--line-soft)", fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink-1)" }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setEditOpen(false)} style={{ flex: 1, height: 42, borderRadius: 10, border: "1px solid var(--line-firm)", background: "transparent", color: "var(--ink-2)", cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500 }}>
                Cancel
              </button>
              <button
                type="button"
                onClick={saveName}
                disabled={busy || !editValue.trim()}
                style={{ flex: 1, height: 42, borderRadius: 10, background: "var(--brand)", color: "var(--brand-on)", border: 0, cursor: busy ? "wait" : "pointer", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500, opacity: busy || !editValue.trim() ? 0.5 : 1 }}
              >
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
