"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import {
  createPaymentLink,
  deletePaymentLink,
  replacePaymentLinkCards,
  updatePaymentLink,
} from "@cvc/api-client";
import { Group, PageHeader, Row, SectionLabel } from "../_components/SettingsAtoms";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

interface AccountRow {
  id: string;
  name: string;
  type: string;
  mask: string | null;
}

interface CardRow {
  card_account_id: string;
  split_pct: number;
  payment_link_id: string;
}

interface LinkRow {
  id: string;
  funding_account_id: string;
  name: string;
  cross_space: boolean;
  cards: CardRow[];
}

interface DraftLink {
  id?: string;
  funding_account_id: string;
  name: string;
  cross_space: boolean;
  cards: { card_account_id: string; split_pct: number }[];
}

const EMPTY_DRAFT: DraftLink = {
  funding_account_id: "",
  name: "",
  cross_space: false,
  cards: [{ card_account_id: "", split_pct: 100 }],
};

export default function PaymentLinksPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [draft, setDraft] = useState<DraftLink | null>(null);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: accs }, { data: rawLinks }, { data: cards }] = await Promise.all([
        supabase.from("accounts").select("id, name, type, mask"),
        supabase.from("payment_links").select("id, funding_account_id, name, cross_space"),
        supabase.from("payment_link_cards").select("*"),
      ]);
      if (cancelled) return;
      setAccounts(((accs ?? []) as AccountRow[]));
      const merged: LinkRow[] = (rawLinks ?? []).map((l: { id: string; funding_account_id: string; name: string; cross_space: boolean }) => ({
        ...l,
        cards: ((cards ?? []) as CardRow[]).filter((c) => c.payment_link_id === l.id),
      }));
      setLinks(merged);
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const fundingAccounts = useMemo(() => accounts.filter((a) => a.type === "depository"), [accounts]);
  const cardAccounts = useMemo(() => accounts.filter((a) => a.type === "credit"), [accounts]);
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  function startNew() {
    if (fundingAccounts.length === 0 || cardAccounts.length === 0) {
      setError("You need at least one depository and one credit account first.");
      return;
    }
    setError(null);
    setDraft({
      ...EMPTY_DRAFT,
      funding_account_id: fundingAccounts[0]!.id,
      name: `${fundingAccounts[0]!.name} pays cards`,
      cards: [{ card_account_id: cardAccounts[0]!.id, split_pct: 100 }],
    });
  }

  function startEdit(link: LinkRow) {
    setError(null);
    setDraft({
      id: link.id,
      funding_account_id: link.funding_account_id,
      name: link.name,
      cross_space: link.cross_space,
      cards: link.cards.length > 0 ? link.cards.map((c) => ({ card_account_id: c.card_account_id, split_pct: c.split_pct })) : [{ card_account_id: cardAccounts[0]?.id ?? "", split_pct: 100 }],
    });
  }

  async function save() {
    if (!draft) return;
    if (!draft.funding_account_id || !draft.name.trim()) {
      setError("Pick a funding account and give the link a name.");
      return;
    }
    const cards = draft.cards.filter((c) => c.card_account_id);
    if (cards.length === 0) {
      setError("Add at least one card.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      if (draft.id) {
        await updatePaymentLink(supabase, {
          id: draft.id,
          name: draft.name,
          funding_account_id: draft.funding_account_id,
          cross_space: draft.cross_space,
        });
        await replacePaymentLinkCards(supabase, { payment_link_id: draft.id, cards });
      } else {
        await createPaymentLink(supabase, {
          funding_account_id: draft.funding_account_id,
          name: draft.name,
          cross_space: draft.cross_space,
          cards,
        });
      }
      setDraft(null);
      setReload((r) => r + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function destroy(linkId: string, name: string) {
    const ok = window.confirm(`Delete "${name}"? Effective Available will stop subtracting these card balances.`);
    if (!ok) return;
    try {
      await deletePaymentLink(supabase, linkId);
      setReload((r) => r + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    }
  }

  function updateCard(idx: number, patch: Partial<{ card_account_id: string; split_pct: number }>) {
    if (!draft) return;
    setDraft({ ...draft, cards: draft.cards.map((c, i) => (i === idx ? { ...c, ...patch } : c)) });
  }

  function addCardRow() {
    if (!draft) return;
    const used = new Set(draft.cards.map((c) => c.card_account_id));
    const next = cardAccounts.find((a) => !used.has(a.id));
    if (!next) return;
    setDraft({ ...draft, cards: [...draft.cards, { card_account_id: next.id, split_pct: 100 }] });
  }

  function removeCardRow(idx: number) {
    if (!draft) return;
    setDraft({ ...draft, cards: draft.cards.filter((_, i) => i !== idx) });
  }

  return (
    <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", paddingBottom: 60 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <PageHeader title="Payment Links" backHref="/settings" onBack={() => router.push("/settings")} />

        <div style={{ padding: "4px 18px 12px", fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
          Mark which depository account pays each credit card. Effective Available subtracts linked card balances from the funding account in real time.
        </div>

        {error ? (
          <div style={{ padding: "0 16px 8px" }}>
            <div style={{ padding: 12, borderRadius: 12, background: "var(--neg-tint)", color: "var(--neg)", fontSize: 13 }}>{error}</div>
          </div>
        ) : null}

        <SectionLabel>YOUR LINKS</SectionLabel>
        <Group>
          {links.length === 0 ? (
            <Row title="No payment links yet" sub="Click the button below to set up your first." right={null} last />
          ) : (
            links.map((link, i) => {
              const funding = accountById.get(link.funding_account_id);
              const totalPct = link.cards.reduce((acc, c) => acc + c.split_pct, 0);
              return (
                <Row
                  key={link.id}
                  title={link.name}
                  sub={`Funded by ${funding?.name ?? "—"}${link.cross_space ? " · cross-space" : ""} · ${link.cards.length} ${link.cards.length === 1 ? "card" : "cards"}`}
                  value={`${totalPct}%`}
                  onPress={() => startEdit(link)}
                  last={i === links.length - 1}
                />
              );
            })
          )}
        </Group>

        <div style={{ padding: "12px 16px 0" }}>
          <button
            type="button"
            onClick={startNew}
            style={{
              width: "100%",
              height: 44,
              borderRadius: 10,
              background: "var(--brand)",
              color: "var(--brand-on)",
              border: 0,
              cursor: "pointer",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            + New payment link
          </button>
        </div>

        {links.length > 0 ? (
          <>
            <SectionLabel>MANAGE</SectionLabel>
            <Group>
              {links.map((link, i) => (
                <Row
                  key={`del-${link.id}`}
                  title={`Delete "${link.name}"`}
                  danger
                  onPress={() => destroy(link.id, link.name)}
                  last={i === links.length - 1}
                />
              ))}
            </Group>
          </>
        ) : null}
      </div>

      {/* Edit/Create modal */}
      {draft ? (
        <div onClick={() => setDraft(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "grid", placeItems: "center", padding: 24, zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520, width: "100%", maxHeight: "92vh", overflowY: "auto", background: "var(--bg-surface)", borderRadius: 18, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ margin: 0, fontFamily: "var(--font-ui)", fontSize: 18, fontWeight: 500, color: "var(--ink-1)" }}>
              {draft.id ? "Edit payment link" : "New payment link"}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontFamily: "var(--font-num)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.08em", fontWeight: 600, textTransform: "uppercase" }}>Name</span>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="e.g. Chase pays Amex"
                style={{ padding: "10px 12px", borderRadius: 10, background: "var(--bg-surface)", border: "1px solid var(--line-soft)", fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink-1)" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontFamily: "var(--font-num)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.08em", fontWeight: 600, textTransform: "uppercase" }}>Funding account</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {fundingAccounts.map((a) => {
                  const sel = draft.funding_account_id === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setDraft({ ...draft, funding_account_id: a.id })}
                      style={{
                        padding: "12px",
                        borderRadius: 10,
                        border: `1px solid ${sel ? "var(--brand)" : "var(--line-soft)"}`,
                        background: sel ? "var(--brand)" : "var(--bg-surface)",
                        color: sel ? "var(--brand-on)" : "var(--ink-1)",
                        cursor: "pointer",
                        fontFamily: "var(--font-ui)",
                        fontSize: 13.5,
                        fontWeight: 500,
                        textAlign: "left",
                      }}
                    >
                      {a.name} {a.mask ? `· •••${a.mask}` : ""}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontFamily: "var(--font-num)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.08em", fontWeight: 600, textTransform: "uppercase" }}>Cards covered</span>
              {draft.cards.map((c, idx) => (
                <div key={idx} style={{ padding: 12, borderRadius: 10, border: "1px solid var(--line-soft)", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {cardAccounts.map((a) => {
                      const sel = c.card_account_id === a.id;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => updateCard(idx, { card_account_id: a.id })}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 8,
                            border: 0,
                            background: sel ? "var(--brand)" : "transparent",
                            color: sel ? "var(--brand-on)" : "var(--ink-1)",
                            cursor: "pointer",
                            fontFamily: "var(--font-ui)",
                            fontSize: 13,
                            textAlign: "left",
                          }}
                        >
                          {a.name} {a.mask ? `· •••${a.mask}` : ""}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-3)" }}>Split %</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={String(c.split_pct)}
                      onChange={(e) => {
                        const n = Number(e.target.value.replace(/[^\d.]/g, ""));
                        updateCard(idx, { split_pct: Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0 });
                      }}
                      style={{ minWidth: 80, textAlign: "right", padding: "6px 8px", borderRadius: 8, border: "1px solid var(--line-soft)", background: "var(--bg-surface)", fontFamily: "var(--font-num)", fontSize: 13, color: "var(--ink-1)" }}
                    />
                  </div>
                  {draft.cards.length > 1 ? (
                    <button type="button" onClick={() => removeCardRow(idx)} style={{ alignSelf: "flex-start", background: "transparent", border: 0, cursor: "pointer", color: "var(--neg)", fontFamily: "var(--font-ui)", fontSize: 12, padding: 0 }}>
                      Remove card
                    </button>
                  ) : null}
                </div>
              ))}
              {draft.cards.length < cardAccounts.length ? (
                <button type="button" onClick={addCardRow} style={{ padding: "10px", borderRadius: 10, border: "1px solid var(--line-firm)", background: "transparent", cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 500, color: "var(--ink-2)" }}>
                  + Add another card
                </button>
              ) : null}
            </div>

            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 500, color: "var(--ink-1)" }}>Cross-space</span>
                <span style={{ display: "block", fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>
                  Show this link's effect in spaces where the funding account isn't shared.
                </span>
              </span>
              <input
                type="checkbox"
                checked={draft.cross_space}
                onChange={(e) => setDraft({ ...draft, cross_space: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: "var(--brand)" }}
              />
            </label>

            <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
              <button type="button" onClick={() => setDraft(null)} style={{ flex: 1, height: 44, borderRadius: 10, border: "1px solid var(--line-firm)", background: "transparent", color: "var(--ink-2)", cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500 }}>
                Cancel
              </button>
              <button type="button" onClick={save} disabled={busy} style={{ flex: 1, height: 44, borderRadius: 10, background: "var(--brand)", color: "var(--brand-on)", border: 0, cursor: busy ? "wait" : "pointer", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500, opacity: busy ? 0.5 : 1 }}>
                {busy ? "Saving…" : draft.id ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
