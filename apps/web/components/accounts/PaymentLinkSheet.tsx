"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  accountDisplayName,
  hueForCardId,
  tintForHue,
} from "@cvc/domain";
import { createPaymentLink } from "@cvc/api-client";
import type { Database } from "@cvc/types/supabase.generated";
import type { SupabaseClient } from "@supabase/supabase-js";
import { I } from "../../lib/icons";
import { useTheme } from "../../lib/theme-provider";
import { Money } from "../money";

export interface DraftAccount {
  id: string;
  name: string;
  display_name?: string | null;
  mask: string | null;
  current_balance: number | null;
}

type Scope = "single" | "cross";

interface Props {
  visible: boolean;
  cards: DraftAccount[];
  funders: DraftAccount[];
  spaceName: string;
  initialCardId?: string | null;
  supabase: SupabaseClient<Database>;
  onClose: () => void;
  onSaved: () => void;
}

export function PaymentLinkSheet({
  visible,
  cards,
  funders,
  spaceName,
  initialCardId,
  supabase,
  onClose,
  onSaved,
}: Props) {
  const skipPicker = cards.length === 1;
  const totalShown = skipPicker ? 3 : 4;
  const [step, setStep] = useState(1);
  const [card, setCard] = useState<DraftAccount | null>(null);
  const [funderIds, setFunderIds] = useState<string[]>([]);
  const [splits, setSplits] = useState<Record<string, number>>({});
  const [scope, setScope] = useState<Scope>("single");
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setCommitting(false);
    setSplits({});
    setFunderIds([]);
    setScope("single");
    if (initialCardId) {
      const c = cards.find((x) => x.id === initialCardId);
      if (c) {
        setCard(c);
        setStep(skipPicker ? 1 : 2);
        return;
      }
    }
    if (skipPicker && cards[0]) {
      setCard(cards[0]);
      setStep(1);
    } else {
      setCard(null);
      setStep(1);
    }
  }, [visible, initialCardId, skipPicker, cards]);

  function toggleFunder(id: string) {
    const isSelected = funderIds.includes(id);
    const next = isSelected ? funderIds.filter((x) => x !== id) : [...funderIds, id];
    setFunderIds(next);
    setSplits(evenSplit(next));
  }

  function setSplit(id: string, value: number) {
    const others = funderIds.filter((x) => x !== id);
    const v = clamp(value, 0, 100);
    if (others.length === 0) {
      setSplits({ [id]: 100 });
      return;
    }
    const remainder = 100 - v;
    const otherTotal = others.reduce((sum, oid) => sum + (splits[oid] ?? 0), 0);
    const next: Record<string, number> = { [id]: v };
    if (otherTotal > 0) {
      for (const oid of others) {
        next[oid] = Math.round(((splits[oid] ?? 0) / otherTotal) * remainder);
      }
    } else {
      const each = Math.floor(remainder / others.length);
      for (const oid of others) next[oid] = each;
    }
    const total = Object.values(next).reduce((a, b) => a + b, 0);
    if (total !== 100 && others.length > 0) {
      const lastId = others[others.length - 1]!;
      next[lastId] = (next[lastId] ?? 0) + (100 - total);
    }
    setSplits(next);
  }

  async function commit() {
    if (!card) return;
    if (funderIds.length === 0) {
      setError("Pick at least one funding account.");
      return;
    }
    const splitTotal = funderIds.reduce((s, id) => s + (splits[id] ?? 0), 0);
    if (splitTotal !== 100) {
      setError(`Splits must total 100% (currently ${splitTotal}%).`);
      return;
    }
    setCommitting(true);
    setError(null);
    try {
      for (const funderId of funderIds) {
        const funder = funders.find((f) => f.id === funderId);
        if (!funder) continue;
        await createPaymentLink(supabase, {
          funding_account_id: funderId,
          name: `${accountDisplayName(funder)} → ${accountDisplayName(card)}`,
          cross_space: scope === "cross",
          cards: [{ card_account_id: card.id, split_pct: splits[funderId] ?? 0 }],
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "Could not save link.");
    } finally {
      setCommitting(false);
    }
  }

  if (!visible) return null;

  const stepIdx = (() => {
    if (skipPicker) return step; // 1=funders, 2=split, 3=scope
    return step; // 1=picker, 2=funders, 3=split, 4=scope
  })();

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,18,21,0.45)",
        zIndex: 60,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "92vh",
          background: "var(--bg-surface)",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 -8px 30px rgba(0,0,0,0.18)",
        }}
      >
        <ShellHeader stepIdx={stepIdx} total={totalShown} onClose={onClose} />
        <div style={{ flex: 1, overflowY: "auto" }}>
          {!skipPicker && step === 1 ? (
            <CardPicker
              cards={cards}
              selectedId={card?.id ?? null}
              onSelect={setCard}
            />
          ) : null}
          {((!skipPicker && step === 2) || (skipPicker && step === 1)) && card ? (
            <FundersPicker
              card={card}
              funders={funders}
              selectedIds={funderIds}
              onToggle={toggleFunder}
            />
          ) : null}
          {((!skipPicker && step === 3) || (skipPicker && step === 2)) && card ? (
            <SplitEditor
              card={card}
              funders={funders.filter((f) => funderIds.includes(f.id))}
              splits={splits}
              onSetSplit={setSplit}
              onEvenSplit={() => setSplits(evenSplit(funderIds))}
            />
          ) : null}
          {((!skipPicker && step === 4) || (skipPicker && step === 3)) && card ? (
            <ScopeStep
              card={card}
              scope={scope}
              onSetScope={setScope}
              spaceName={spaceName}
            />
          ) : null}
        </div>
        {error ? (
          <div
            style={{
              padding: "10px 16px",
              color: "var(--neg)",
              fontSize: 12,
              fontFamily: "var(--font-ui)",
            }}
          >
            {error}
          </div>
        ) : null}
        <Footer
          step={stepIdx}
          total={totalShown}
          skipPicker={skipPicker}
          card={card}
          funderCount={funderIds.length}
          splitsValid={
            funderIds.length > 0 &&
            funderIds.reduce((s, id) => s + (splits[id] ?? 0), 0) === 100
          }
          committing={committing}
          onBack={() => setStep((s) => Math.max(1, s - 1))}
          onContinue={() => setStep((s) => s + 1)}
          onSave={commit}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}

function ShellHeader({
  stepIdx,
  total,
  onClose,
}: {
  stepIdx: number;
  total: number;
  onClose: () => void;
}) {
  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div
          style={{
            width: 36,
            height: 5,
            borderRadius: 3,
            background: "var(--line-firm)",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 18px 0",
        }}
      >
        <div style={{ width: 32 }} />
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 500, color: "var(--ink-1)" }}>
          Payment link
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            appearance: "none",
            border: 0,
            cursor: "pointer",
            background: "var(--bg-tinted)",
            color: "var(--ink-2)",
            width: 32,
            height: 32,
            borderRadius: 999,
            display: "grid",
            placeItems: "center",
          }}
        >
          <I.close color="var(--ink-2)" size={16} />
        </button>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          justifyContent: "center",
          padding: "14px 0 0",
        }}
      >
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            style={{
              width: i === stepIdx - 1 ? 22 : 6,
              height: 6,
              borderRadius: 3,
              background: i < stepIdx ? "var(--brand)" : "var(--bg-tinted)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function StepHeader({ step, total, title, subtitle }: { step: number; total: number; title: string; subtitle?: string }) {
  return (
    <div style={{ padding: "14px 22px 6px" }}>
      <div
        style={{
          fontFamily: "var(--font-num)",
          fontSize: 10.5,
          color: "var(--ink-3)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Step {step} of {total}
      </div>
      <h2
        style={{
          margin: "4px 0 0",
          fontFamily: "var(--font-ui)",
          fontSize: 22,
          fontWeight: 500,
          letterSpacing: "-0.02em",
          color: "var(--ink-1)",
          lineHeight: 1.18,
        }}
      >
        {title}
      </h2>
      {subtitle ? (
        <p
          style={{
            margin: "8px 0 0",
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            color: "var(--ink-2)",
            lineHeight: 1.55,
          }}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function CardPicker({
  cards,
  selectedId,
  onSelect,
}: {
  cards: DraftAccount[];
  selectedId: string | null;
  onSelect: (c: DraftAccount) => void;
}) {
  const { resolved } = useTheme();
  return (
    <>
      <StepHeader
        step={1}
        total={4}
        title="Pick a card to fund"
        subtitle="Choose the credit card whose balance you want covered by one or more cash accounts."
      />
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {cards.length === 0 ? (
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: "var(--bg-tinted)",
              color: "var(--ink-2)",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              lineHeight: 1.55,
            }}
          >
            No credit cards found in this space. Connect a card with the + Add bank
            button on the Accounts page first, then come back to set up funding.
          </div>
        ) : null}
        {cards.map((c) => {
          const sel = selectedId === c.id;
          const tint = tintForHue(hueForCardId(c.id), resolved);
          return (
            <button
              type="button"
              key={c.id}
              onClick={() => onSelect(c)}
              style={pickRowStyle(sel)}
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: tint.swatch,
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <I.card color="#fff" size={18} />
              </span>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 500, color: "var(--ink-1)" }}>
                  {accountDisplayName(c)}
                </div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-3)", marginTop: 1 }}>
                  {c.mask ? <span style={{ fontFamily: "var(--font-num)" }}>···{c.mask}</span> : null} · Balance{" "}
                  <Money cents={c.current_balance ?? 0} style={{ color: "var(--ink-3)", fontSize: 11.5 }} />
                </div>
              </div>
              <Radio sel={sel} />
            </button>
          );
        })}
      </div>
    </>
  );
}

function FundersPicker({
  card,
  funders,
  selectedIds,
  onToggle,
}: {
  card: DraftAccount;
  funders: DraftAccount[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const { resolved } = useTheme();
  const tint = tintForHue(hueForCardId(card.id), resolved);
  return (
    <>
      <StepHeader
        step={2}
        total={4}
        title={`Which accounts fund ${accountDisplayName(card)}${card.mask ? ` ${card.mask}` : ""}?`}
        subtitle="When the card balance changes, ClearView will deduct it from these accounts to compute Effective Available."
      />
      <div style={{ padding: "14px 16px 16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            borderRadius: 12,
            background: tint.pillBg,
            color: tint.pillFg,
            marginBottom: 14,
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: tint.swatch,
              display: "grid",
              placeItems: "center",
            }}
          >
            <I.card color="#fff" size={16} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500 }}>
              {accountDisplayName(card)}{" "}
              {card.mask ? (
                <span style={{ fontFamily: "var(--font-num)", fontSize: 11, opacity: 0.8 }}>···{card.mask}</span>
              ) : null}
            </div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, opacity: 0.85, marginTop: 1 }}>
              Statement balance{" "}
              <Money
                cents={card.current_balance ?? 0}
                style={{ fontWeight: 500, fontSize: 11, color: tint.pillFg }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {funders.length === 0 ? (
            <div
              style={{
                padding: 14,
                borderRadius: 12,
                background: "var(--bg-tinted)",
                color: "var(--ink-2)",
                fontFamily: "var(--font-ui)",
                fontSize: 13,
              }}
            >
              No cash accounts available. Connect a checking or savings account first.
            </div>
          ) : null}
          {funders.map((a) => {
            const sel = selectedIds.includes(a.id);
            return (
              <button
                type="button"
                key={a.id}
                onClick={() => onToggle(a.id)}
                style={pickRowStyle(sel)}
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 9,
                    background: "var(--bg-tinted)",
                    color: "var(--ink-2)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <I.bank color="var(--ink-2)" size={18} />
                </span>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 500, color: "var(--ink-1)" }}>
                    {accountDisplayName(a)}
                  </div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-3)", marginTop: 1 }}>
                    {a.mask ? <span style={{ fontFamily: "var(--font-num)" }}>···{a.mask}</span> : null} ·{" "}
                    <Money cents={a.current_balance ?? 0} style={{ color: "var(--ink-3)", fontSize: 11.5 }} /> available
                  </div>
                </div>
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    border: `2px solid ${sel ? "var(--brand)" : "var(--line-firm)"}`,
                    background: sel ? "var(--brand)" : "transparent",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {sel ? <I.check color="var(--brand-on)" size={14} /> : null}
                </span>
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            marginTop: 18,
            padding: 12,
            borderRadius: 12,
            background: "var(--bg-tinted)",
            color: "var(--ink-2)",
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            lineHeight: 1.55,
          }}
        >
          <I.info color="var(--ink-2)" size={13} />
          <span>
            Pick more than one if you split this card across funders. You&apos;ll set the
            split next.
          </span>
        </div>
      </div>
    </>
  );
}

function SplitEditor({
  card,
  funders,
  splits,
  onSetSplit,
  onEvenSplit,
}: {
  card: DraftAccount;
  funders: DraftAccount[];
  splits: Record<string, number>;
  onSetSplit: (id: string, value: number) => void;
  onEvenSplit: () => void;
}) {
  const { resolved } = useTheme();
  const cardBalance = Math.max(0, card.current_balance ?? 0);
  const splitTotal = funders.reduce((s, f) => s + (splits[f.id] ?? 0), 0);
  const valid = splitTotal === 100;
  return (
    <>
      <StepHeader
        step={3}
        total={4}
        title="How is it split?"
        subtitle="Allocates the card's balance across funders for Effective Available math."
      />
      <div style={{ padding: "14px 16px 16px" }}>
        <div
          style={{
            display: "flex",
            height: 14,
            borderRadius: 7,
            overflow: "hidden",
            border: "1px solid var(--line-soft)",
          }}
        >
          {funders.map((f, i) => {
            const tint = tintForHue(hueForCardId(card.id) + i * 35, resolved);
            const flex = Math.max(0, splits[f.id] ?? 0);
            if (flex === 0) return null;
            return (
              <div
                key={f.id}
                style={{ flex, background: i === 0 ? "var(--brand)" : tint.pillFg }}
              />
            );
          })}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--font-num)",
            fontSize: 11,
            color: "var(--ink-3)",
            marginTop: 6,
          }}
        >
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
          {funders.map((f, i) => {
            const tint = tintForHue(hueForCardId(card.id) + i * 35, resolved);
            const swatch = i === 0 ? "var(--brand)" : tint.pillFg;
            const pct = splits[f.id] ?? 0;
            const coverCents = Math.round((cardBalance * pct) / 100);
            return (
              <div
                key={f.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "var(--bg-surface)",
                  border: "1px solid var(--line-soft)",
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 32,
                    borderRadius: 3,
                    background: swatch,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 14,
                      fontWeight: 500,
                      color: "var(--ink-1)",
                    }}
                  >
                    {accountDisplayName(f)}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 11.5,
                      color: "var(--ink-3)",
                    }}
                  >
                    Covers <Money cents={coverCents} style={{ color: "var(--ink-2)", fontWeight: 500, fontSize: 11.5 }} /> of{" "}
                    <Money cents={cardBalance} style={{ color: "var(--ink-3)", fontSize: 11.5 }} />
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <PctButton
                    label="−"
                    onClick={() => onSetSplit(f.id, Math.max(0, pct - 5))}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-num)",
                      fontSize: 16,
                      fontWeight: 600,
                      color: "var(--ink-1)",
                      minWidth: 36,
                      textAlign: "center",
                    }}
                  >
                    {pct}%
                  </span>
                  <PctButton
                    label="+"
                    onClick={() => onSetSplit(f.id, Math.min(100, pct + 5))}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button
            type="button"
            onClick={onEvenSplit}
            style={{
              flex: 1,
              height: 36,
              borderRadius: 10,
              border: "1px solid var(--line-firm)",
              background: "transparent",
              color: "var(--ink-1)",
              fontWeight: 500,
              fontSize: 13,
              fontFamily: "var(--font-ui)",
              cursor: "pointer",
            }}
          >
            Even split
          </button>
          <div
            style={{
              flex: 1,
              height: 36,
              borderRadius: 10,
              background: valid ? "var(--pos-tint)" : "var(--warn-tint)",
              color: valid ? "var(--pos)" : "var(--warn)",
              fontFamily: "var(--font-num)",
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            Total · {splitTotal}%
          </div>
        </div>
      </div>
    </>
  );
}

function ScopeStep({
  card,
  scope,
  onSetScope,
  spaceName,
}: {
  card: DraftAccount;
  scope: Scope;
  onSetScope: (s: Scope) => void;
  spaceName: string;
}) {
  const { resolved } = useTheme();
  const cardTint = tintForHue(hueForCardId(card.id), resolved);
  const opts: Array<{ id: Scope; name: string; tag: string; desc: string; Icon: typeof I.lock }> = [
    {
      id: "single",
      name: "Single space",
      tag: "Recommended",
      desc: `Only ${spaceName} sees this link. Effective Available is computed per-space.`,
      Icon: I.lock,
    },
    {
      id: "cross",
      name: "Cross-space",
      tag: "Advanced",
      desc:
        "Visible in every space the card is shared with. Useful when one card serves both Personal and Household.",
      Icon: I.share,
    },
  ];
  return (
    <>
      <StepHeader
        step={4}
        total={4}
        title="Where does this link apply?"
        subtitle="Spaces are independent contexts. Choose how this funding link travels across them."
      />
      <div style={{ padding: "14px 16px 16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {opts.map((o) => {
            const sel = scope === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => onSetScope(o.id)}
                style={{
                  ...pickRowStyle(sel),
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: sel ? "var(--brand)" : "var(--bg-tinted)",
                    color: sel ? "var(--brand-on)" : "var(--ink-2)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <o.Icon color={sel ? "var(--brand-on)" : "var(--ink-2)"} size={14} />
                </span>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, fontWeight: 500, color: "var(--ink-1)" }}>
                      {o.name}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 10.5,
                        fontWeight: 500,
                        color: "var(--ink-3)",
                        background: "var(--bg-tinted)",
                        padding: "2px 7px",
                        borderRadius: 999,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {o.tag}
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 12.5,
                      color: "var(--ink-2)",
                      marginTop: 4,
                      lineHeight: 1.5,
                    }}
                  >
                    {o.desc}
                  </div>
                </div>
                <Radio sel={sel} />
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 18 }}>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-2)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 500,
              marginBottom: 8,
            }}
          >
            Preview
          </div>
          <div style={{ background: "var(--bg-sunken)", borderRadius: 12, padding: 14 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color: "var(--ink-2)",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: "var(--space-pill-bg)",
                  color: "var(--space-pill-fg)",
                  fontWeight: 500,
                  fontSize: 12,
                }}
              >
                {spaceName}
              </span>
              <I.arrowR color="var(--ink-3)" size={11} />
              <span
                style={{
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: cardTint.pillBg,
                  color: cardTint.pillFg,
                  fontWeight: 500,
                  fontSize: 12,
                }}
              >
                {accountDisplayName(card)}
              </span>
            </div>
            <div
              style={{
                marginTop: 10,
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-3)",
                lineHeight: 1.5,
              }}
            >
              {scope === "single"
                ? `Effective Available reduced in ${spaceName} only.`
                : "Effective Available reduced in any space the card is shared into."}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Footer({
  step,
  total,
  skipPicker,
  card,
  funderCount,
  splitsValid,
  committing,
  onBack,
  onContinue,
  onSave,
  onCancel,
}: {
  step: number;
  total: number;
  skipPicker: boolean;
  card: DraftAccount | null;
  funderCount: number;
  splitsValid: boolean;
  committing: boolean;
  onBack: () => void;
  onContinue: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const isLast = step === total;
  const continueDisabled = (() => {
    if (!skipPicker && step === 1) return !card;
    if ((!skipPicker && step === 2) || (skipPicker && step === 1)) return funderCount === 0;
    if ((!skipPicker && step === 3) || (skipPicker && step === 2)) return !splitsValid;
    return false;
  })();
  return (
    <div
      style={{
        borderTop: "1px solid var(--line-soft)",
        background: "var(--bg-surface)",
        padding: "12px 16px 22px",
        display: "flex",
        gap: 8,
      }}
    >
      <button
        type="button"
        onClick={step === 1 ? onCancel : onBack}
        style={{
          flex: 1,
          height: 50,
          borderRadius: 14,
          border: "1px solid var(--line-firm)",
          background: "transparent",
          color: "var(--ink-1)",
          fontWeight: 500,
          fontFamily: "var(--font-ui)",
          fontSize: 15,
          cursor: "pointer",
        }}
      >
        {step === 1 ? "Cancel" : "Back"}
      </button>
      <button
        type="button"
        disabled={isLast ? committing : continueDisabled}
        onClick={isLast ? onSave : onContinue}
        style={{
          flex: 1,
          height: 50,
          borderRadius: 14,
          border: 0,
          background: isLast
            ? committing
              ? "var(--ink-4)"
              : "var(--brand)"
            : continueDisabled
              ? "var(--ink-4)"
              : "var(--brand)",
          color: "var(--brand-on)",
          fontWeight: 500,
          fontFamily: "var(--font-ui)",
          fontSize: 15,
          cursor: isLast ? (committing ? "default" : "pointer") : continueDisabled ? "default" : "pointer",
        }}
      >
        {isLast
          ? committing
            ? "Saving…"
            : "Save link"
          : (() => {
              if ((!skipPicker && step === 2) || (skipPicker && step === 1)) {
                return funderCount > 0 ? `Continue · ${funderCount} selected` : "Continue";
              }
              return "Continue";
            })()}
      </button>
    </div>
  );
}

function Radio({ sel }: { sel: boolean }) {
  return (
    <span
      style={{
        width: 22,
        height: 22,
        borderRadius: 999,
        border: `2px solid ${sel ? "var(--brand)" : "var(--line-firm)"}`,
        background: sel ? "var(--brand)" : "transparent",
        display: "grid",
        placeItems: "center",
      }}
    >
      {sel ? (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: "var(--bg-surface)",
          }}
        />
      ) : null}
    </span>
  );
}

function PctButton({ label, onClick }: { label: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        appearance: "none",
        cursor: "pointer",
        width: 28,
        height: 28,
        borderRadius: 8,
        border: 0,
        background: "var(--bg-tinted)",
        color: "var(--ink-1)",
        fontWeight: 500,
        fontSize: 16,
        display: "grid",
        placeItems: "center",
        fontFamily: "var(--font-ui)",
      }}
    >
      {label}
    </button>
  );
}

function pickRowStyle(sel: boolean) {
  return {
    appearance: "none" as const,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    borderRadius: 12,
    background: sel ? "var(--brand-tint)" : "var(--bg-surface)",
    border: `1.5px solid ${sel ? "var(--brand)" : "var(--line-soft)"}`,
    width: "100%" as const,
    textAlign: "left" as const,
  };
}

function evenSplit(ids: string[]): Record<string, number> {
  if (ids.length === 0) return {};
  const each = Math.floor(100 / ids.length);
  const out: Record<string, number> = {};
  for (const id of ids) out[id] = each;
  const total = each * ids.length;
  if (total !== 100 && ids.length > 0) out[ids[0]!] = each + (100 - total);
  return out;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

// silence unused vars
useMemo;
