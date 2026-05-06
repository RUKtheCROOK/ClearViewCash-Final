"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import { deleteGoal, upsertGoal } from "@cvc/api-client";
import { requiredMonthlyPayment } from "@cvc/domain";
import { GoalIcon, GoalGlyph, resolveBranding, type GoalGlyphKey } from "./_components/goalGlyphs";
import { Num, fmtMoneyShort } from "./_components/Num";

export type GoalKind = "save" | "payoff";

export interface EditableGoal {
  id: string;
  space_id: string;
  kind: GoalKind;
  name: string;
  target_amount: number;
  starting_amount: number | null;
  target_date: string | null;
  monthly_contribution: number | null;
  linked_account_id: string | null;
  apr_bps: number | null;
  term_months: number | null;
}

export interface AccountOption {
  id: string;
  name: string;
  type: string;
  current_balance: number | null;
}

interface Props {
  client: SupabaseClient<Database>;
  open: boolean;
  spaceId: string | null;
  goal: EditableGoal | null;
  /** Optional pre-fill from a debt account when arriving via ?prefill=. */
  prefillAccount?: AccountOption | null;
  accounts: ReadonlyArray<AccountOption>;
  onClose: () => void;
  onSaved: () => void;
}

interface Template {
  key: string;
  label: string;
  glyph: GoalGlyphKey;
  hue: number;
  hint?: string;
}

const TEMPLATES: Template[] = [
  { key: "trip", label: "Trip", glyph: "plane", hue: 220 },
  { key: "emergency", label: "Emergency", glyph: "shield", hue: 145 },
  { key: "down", label: "Down payment", glyph: "home", hue: 240 },
  { key: "car", label: "New car", glyph: "car", hue: 75 },
  { key: "wedding", label: "Wedding", glyph: "cake", hue: 305 },
  { key: "custom", label: "Custom", glyph: "spark", hue: 195 },
];

const TEMPLATE_NAMES: Record<string, string> = {
  trip: "Trip fund",
  emergency: "Emergency fund",
  down: "Down payment",
  car: "New car",
  wedding: "Wedding",
  custom: "",
};

function dollarsToCents(s: string): number {
  const cleaned = s.replace(/,/g, "").trim();
  if (!cleaned) return 0;
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function centsToDollarString(c: number | null | undefined): string {
  if (c == null) return "";
  return (c / 100).toFixed(0);
}

function aprBpsToString(bps: number | null | undefined): string {
  if (bps == null) return "";
  return (bps / 100).toFixed(2);
}

function monthsBetween(from: Date, isoDate: string): number | null {
  const target = new Date(isoDate);
  if (Number.isNaN(target.getTime())) return null;
  const months =
    (target.getFullYear() - from.getFullYear()) * 12 + (target.getMonth() - from.getMonth());
  return months;
}

export function EditPanel({
  client,
  open,
  spaceId,
  goal,
  prefillAccount,
  accounts,
  onClose,
  onSaved,
}: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [kind, setKind] = useState<GoalKind>("save");
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [starting, setStarting] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [linkedAccountId, setLinkedAccountId] = useState<string | null>(null);
  const [apr, setApr] = useState("");
  const [termMonths, setTermMonths] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!goal;

  useEffect(() => {
    if (!open) return;
    if (goal) {
      setStep(2);
      setKind(goal.kind);
      setName(goal.name);
      setTarget(centsToDollarString(goal.target_amount));
      setStarting(centsToDollarString(goal.starting_amount));
      setTargetDate(goal.target_date ?? "");
      setMonthlyContribution(centsToDollarString(goal.monthly_contribution));
      setLinkedAccountId(goal.linked_account_id);
      setApr(aprBpsToString(goal.apr_bps));
      setTermMonths(goal.term_months != null ? String(goal.term_months) : "");
    } else if (prefillAccount) {
      setStep(2);
      setKind("payoff");
      setName(`Pay off ${prefillAccount.name}`);
      setTarget("0");
      setStarting(centsToDollarString(Math.abs(prefillAccount.current_balance ?? 0)));
      setTargetDate("");
      setMonthlyContribution("");
      setLinkedAccountId(prefillAccount.id);
      setApr("");
      setTermMonths("");
    } else {
      setStep(1);
      setKind("save");
      setName("");
      setTarget("");
      setStarting("");
      setTargetDate("");
      setMonthlyContribution("");
      setLinkedAccountId(null);
      setApr("");
      setTermMonths("");
    }
    setError(null);
  }, [open, goal, prefillAccount]);

  const debtAccounts = useMemo(
    () => accounts.filter((a) => a.type === "credit" || a.type === "loan"),
    [accounts],
  );
  const savingsAccounts = useMemo(
    () => accounts.filter((a) => a.type !== "credit" && a.type !== "loan"),
    [accounts],
  );

  const branding = useMemo(
    () => resolveBranding(kind, name || (kind === "payoff" ? "Pay off card" : "Custom")),
    [kind, name],
  );

  const targetCents = dollarsToCents(target);
  const startingCents = starting.trim() ? dollarsToCents(starting) : 0;

  const monthsToTarget = useMemo(() => {
    if (!targetDate) return null;
    return monthsBetween(new Date(), targetDate);
  }, [targetDate]);

  const previewMonthlyCents = useMemo(() => {
    if (!monthsToTarget || monthsToTarget <= 0) return null;
    if (kind === "save") {
      const remaining = Math.max(0, targetCents);
      return Math.ceil(remaining / monthsToTarget);
    }
    const balance = startingCents > 0 ? startingCents : 0;
    if (balance <= 0) return null;
    const aprBps = apr.trim() ? Math.round(parseFloat(apr) * 100) : 0;
    return requiredMonthlyPayment({
      balance,
      aprBps: Number.isFinite(aprBps) ? aprBps : 0,
      months: monthsToTarget,
      target: targetCents,
    });
  }, [monthsToTarget, kind, targetCents, startingCents, apr]);

  const interestSplit = useMemo(() => {
    if (kind !== "payoff" || previewMonthlyCents == null) return null;
    const balance = startingCents;
    const aprBps = apr.trim() ? Math.round(parseFloat(apr) * 100) : 0;
    if (!balance || aprBps <= 0) return null;
    const monthlyRate = aprBps / 10000 / 12;
    const interest = Math.round(balance * monthlyRate);
    const principal = Math.max(0, previewMonthlyCents - interest);
    return { interest, principal };
  }, [kind, previewMonthlyCents, startingCents, apr]);

  if (!open) return null;

  function chooseTemplate(tem: Template) {
    setKind("save");
    setName(TEMPLATE_NAMES[tem.key] ?? "");
    setStep(2);
  }

  function pickDebt(a: AccountOption) {
    setLinkedAccountId(a.id);
    if (!name.trim()) setName(`Pay off ${a.name}`);
    setStarting(centsToDollarString(Math.abs(a.current_balance ?? 0)));
    if (!target.trim()) setTarget("0");
  }

  async function save() {
    if (!spaceId) {
      setError("Switch to a space first.");
      return;
    }
    if (!name.trim()) {
      setError("Give the goal a name.");
      return;
    }
    const targetC = dollarsToCents(target);
    if (kind === "save" && targetC <= 0) {
      setError("Target amount must be greater than 0.");
      return;
    }
    let aprBps: number | null = null;
    if (kind === "payoff" && apr.trim()) {
      const aprPct = Number.parseFloat(apr);
      if (!Number.isFinite(aprPct) || aprPct < 0) {
        setError("APR must be a non-negative number.");
        return;
      }
      aprBps = Math.round(aprPct * 100);
    }
    let term: number | null = null;
    if (kind === "payoff" && termMonths.trim()) {
      const n = Number.parseInt(termMonths, 10);
      if (!Number.isFinite(n) || n <= 0) {
        setError("Term must be a positive number of months.");
        return;
      }
      term = n;
    }
    setSaving(true);
    setError(null);
    try {
      const startingC = starting.trim() ? dollarsToCents(starting) : null;
      const monthlyC = monthlyContribution.trim()
        ? dollarsToCents(monthlyContribution)
        : previewMonthlyCents != null
          ? previewMonthlyCents
          : null;
      await upsertGoal(client, {
        ...(goal ? { id: goal.id } : {}),
        space_id: spaceId,
        kind,
        name: name.trim(),
        target_amount: targetC,
        starting_amount: startingC,
        target_date: targetDate.trim() || null,
        monthly_contribution: monthlyC,
        linked_account_id: linkedAccountId,
        apr_bps: aprBps,
        term_months: term,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "Could not save the goal.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!goal) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteGoal(client, goal.id);
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "Could not delete.");
    } finally {
      setDeleting(false);
    }
  }

  const totalSteps = 2;

  return (
    <>
      <div onClick={onClose} style={overlayStyle} />
      <aside style={panelStyle}>
        {/* Top nav */}
        <div style={{ padding: "4px 0 12px", display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={() => (step === 1 || isEdit ? onClose() : setStep(1))}
            aria-label={step === 1 || isEdit ? "Close" : "Back"}
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              background: "var(--bg-tinted)",
              border: 0,
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
            }}
          >
            {step === 1 || isEdit ? <CloseIcon /> : <BackIcon />}
          </button>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div
              style={{
                fontFamily: "var(--font-num)",
                fontSize: 10,
                color: "var(--ink-3)",
                letterSpacing: "0.08em",
              }}
            >
              {isEdit ? "EDIT" : `STEP ${step} OF ${totalSteps}`}
            </div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 500, color: "var(--ink-1)" }}>
              {isEdit ? "Goal" : "New goal"}
            </div>
          </div>
          <div style={{ width: 36 }} />
        </div>

        {!isEdit ? (
          <div style={{ display: "flex", gap: 5, marginBottom: 18 }}>
            {Array.from({ length: totalSteps }, (_, n) => (
              <span
                key={n}
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  background: n < step ? "var(--brand)" : "var(--bg-tinted)",
                }}
              />
            ))}
          </div>
        ) : null}

        {step === 1 ? (
          <Step1
            kind={kind}
            onPickKind={(k) => setKind(k)}
            onPickTemplate={chooseTemplate}
          />
        ) : kind === "save" ? (
          <Step2Savings
            name={name}
            target={target}
            targetDate={targetDate}
            linkedAccountId={linkedAccountId}
            savingsAccounts={savingsAccounts}
            previewMonthly={previewMonthlyCents}
            monthsToTarget={monthsToTarget}
            branding={branding}
            onName={setName}
            onTarget={setTarget}
            onTargetDate={setTargetDate}
            onLink={(id) => setLinkedAccountId(id)}
          />
        ) : (
          <Step2Debt
            name={name}
            target={target}
            starting={starting}
            apr={apr}
            targetDate={targetDate}
            linkedAccountId={linkedAccountId}
            debtAccounts={debtAccounts}
            previewMonthly={previewMonthlyCents}
            interestSplit={interestSplit}
            monthsToTarget={monthsToTarget}
            onName={setName}
            onTarget={setTarget}
            onStarting={setStarting}
            onApr={setApr}
            onTargetDate={setTargetDate}
            onPickAccount={pickDebt}
            onLink={(id) => setLinkedAccountId(id)}
          />
        )}

        <div style={{ flex: 1 }} />

        {error ? (
          <p style={{ marginTop: 16, color: "var(--warn)", fontFamily: "var(--font-ui)", fontSize: 13 }}>
            {error}
          </p>
        ) : null}

        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 8 }}>
          {step === 1 && !isEdit ? (
            <button
              type="button"
              onClick={() => setStep(2)}
              style={primaryBtn}
            >
              Continue
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}
              >
                {saving ? "Saving…" : isEdit ? "Save changes" : "Create goal"}
              </button>
              {isEdit ? (
                <button
                  type="button"
                  onClick={remove}
                  disabled={deleting}
                  style={{
                    height: 48,
                    borderRadius: 12,
                    border: "1px solid var(--line-firm)",
                    background: "transparent",
                    color: "var(--warn)",
                    cursor: deleting ? "default" : "pointer",
                    fontFamily: "var(--font-ui)",
                    fontSize: 13.5,
                    fontWeight: 500,
                    opacity: deleting ? 0.6 : 1,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <TrashIcon /> {deleting ? "Removing…" : "Delete this goal"}
                </button>
              ) : null}
            </>
          )}
        </div>
      </aside>
    </>
  );
}

interface Step1Props {
  kind: GoalKind;
  onPickKind: (k: GoalKind) => void;
  onPickTemplate: (tem: Template) => void;
}

function Step1({ kind, onPickKind, onPickTemplate }: Step1Props) {
  return (
    <div>
      <h2
        style={{
          margin: 0,
          fontFamily: "var(--font-ui)",
          fontSize: 22,
          fontWeight: 500,
          letterSpacing: "-0.02em",
          color: "var(--ink-1)",
          lineHeight: 1.2,
        }}
      >
        What are you working toward?
      </h2>
      <p
        style={{
          margin: "8px 0 16px",
          fontFamily: "var(--font-ui)",
          fontSize: 13.5,
          color: "var(--ink-2)",
          lineHeight: 1.55,
        }}
      >
        Pick one. You can always change details later.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <KindOption
          selected={kind === "save"}
          onClick={() => onPickKind("save")}
          glyph="spark"
          hue={195}
          title="Save toward something"
          sub="A trip, a thing, a fund — set a target and a date."
        />
        <KindOption
          selected={kind === "payoff"}
          onClick={() => onPickKind("payoff")}
          glyph="card"
          hue={0}
          title="Pay down a debt"
          sub="Pick a card or loan — we'll calculate the monthly amount."
        />
      </div>

      <div style={{ marginTop: 24 }}>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            fontWeight: 600,
            color: "var(--ink-2)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            marginBottom: 8,
          }}
        >
          Common starts
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {TEMPLATES.map((tem) => (
            <button
              key={tem.key}
              type="button"
              onClick={() => onPickTemplate(tem)}
              style={{
                appearance: "none",
                cursor: "pointer",
                padding: "10px 8px",
                borderRadius: 12,
                background: "var(--bg-surface)",
                border: "1px solid var(--line-soft)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              <GoalIcon glyph={tem.glyph} hue={tem.hue} size={36} />
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  color: "var(--ink-2)",
                  fontWeight: 500,
                }}
              >
                {tem.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function KindOption({
  selected,
  onClick,
  glyph,
  hue,
  title,
  sub,
}: {
  selected: boolean;
  onClick: () => void;
  glyph: GoalGlyphKey;
  hue: number;
  title: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        appearance: "none",
        cursor: "pointer",
        textAlign: "left",
        padding: 18,
        borderRadius: 16,
        background: selected ? "var(--brand-tint)" : "var(--bg-surface)",
        border: `${selected ? 1.5 : 1}px solid ${selected ? "var(--brand)" : "var(--line-soft)"}`,
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 14,
        alignItems: "center",
        width: "100%",
      }}
    >
      <GoalIcon glyph={glyph} hue={hue} size={48} radius={14} />
      <div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 500, color: "var(--ink-1)" }}>
          {title}
        </div>
        <div style={{ marginTop: 2, fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-3)" }}>
          {sub}
        </div>
      </div>
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          border: `2px solid ${selected ? "var(--brand)" : "var(--line-firm)"}`,
          background: selected ? "var(--brand)" : "transparent",
          display: "grid",
          placeItems: "center",
        }}
      >
        {selected ? (
          <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--bg-surface)" }} />
        ) : null}
      </span>
    </button>
  );
}

function Field({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-num)",
          fontSize: 10,
          fontWeight: 600,
          color: "var(--ink-3)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {children}
      {sub ? (
        <div
          style={{
            marginTop: 6,
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--ink-3)",
            lineHeight: 1.5,
          }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
}

interface Step2SavingsProps {
  name: string;
  target: string;
  targetDate: string;
  linkedAccountId: string | null;
  savingsAccounts: ReadonlyArray<AccountOption>;
  previewMonthly: number | null;
  monthsToTarget: number | null;
  branding: { glyph: GoalGlyphKey; hue: number };
  onName: (v: string) => void;
  onTarget: (v: string) => void;
  onTargetDate: (v: string) => void;
  onLink: (id: string | null) => void;
}

function Step2Savings({
  name,
  target,
  targetDate,
  linkedAccountId,
  savingsAccounts,
  previewMonthly,
  monthsToTarget,
  branding,
  onName,
  onTarget,
  onTargetDate,
  onLink,
}: Step2SavingsProps) {
  const linked = savingsAccounts.find((a) => a.id === linkedAccountId) ?? null;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <GoalIcon glyph={branding.glyph} hue={branding.hue} size={48} />
        <div>
          <h2
            style={{
              margin: 0,
              fontFamily: "var(--font-ui)",
              fontSize: 20,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "var(--ink-1)",
            }}
          >
            What&apos;s the goal?
          </h2>
          <p style={{ margin: "4px 0 0", fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-3)" }}>
            Name, target, and when you&apos;d like to be there.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="NAME">
          <input
            value={name}
            onChange={(e) => onName(e.target.value)}
            placeholder="Custom guitar"
            style={inputStyle}
          />
        </Field>

        <Field label="TARGET AMOUNT">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              height: 64,
              padding: "0 16px",
              borderRadius: 14,
              background: "var(--bg-surface)",
              border: "1.5px solid var(--brand)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-num)",
                fontSize: 22,
                color: "var(--ink-3)",
                fontWeight: 600,
              }}
            >
              $
            </span>
            <input
              value={target}
              onChange={(e) => onTarget(e.target.value.replace(/[^0-9.,]/g, ""))}
              placeholder="0"
              inputMode="decimal"
              style={{
                flex: 1,
                border: 0,
                outline: 0,
                background: "transparent",
                textAlign: "right",
                fontFamily: "var(--font-num)",
                fontSize: 28,
                fontWeight: 600,
                color: "var(--ink-1)",
                letterSpacing: "-0.02em",
              }}
            />
          </div>
        </Field>

        <Field label="TARGET DATE">
          <input
            type="date"
            value={targetDate}
            onChange={(e) => onTargetDate(e.target.value)}
            style={{ ...inputStyle, height: 52 }}
          />
          {monthsToTarget != null && monthsToTarget > 0 ? (
            <div style={{ marginTop: 6, fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)" }}>
              · {monthsToTarget} month{monthsToTarget === 1 ? "" : "s"} out
            </div>
          ) : null}
        </Field>

        {savingsAccounts.length > 0 ? (
          <Field
            label="TRACK FROM (OPTIONAL)"
            sub="If you save into a specific account, link it and we'll show progress against it."
          >
            <select
              value={linkedAccountId ?? ""}
              onChange={(e) => onLink(e.target.value || null)}
              style={{ ...inputStyle, height: 52 }}
            >
              <option value="">No linked account</option>
              {savingsAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            {linked ? (
              <div style={{ marginTop: 6, fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)" }}>
                Currently {fmtMoneyShort(linked.current_balance ?? 0)} in {linked.name}
              </div>
            ) : null}
          </Field>
        ) : null}

        {previewMonthly != null ? (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              background: "var(--brand-tint)",
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-2)",
              lineHeight: 1.55,
            }}
          >
            <Num style={{ color: "var(--brand)", fontWeight: 600 }}>
              ~{fmtMoneyShort(previewMonthly)}/month
            </Num>{" "}
            from now until your target date gets you there. We&apos;ll suggest auto-transfers next.
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface Step2DebtProps {
  name: string;
  target: string;
  starting: string;
  apr: string;
  targetDate: string;
  linkedAccountId: string | null;
  debtAccounts: ReadonlyArray<AccountOption>;
  previewMonthly: number | null;
  interestSplit: { interest: number; principal: number } | null;
  monthsToTarget: number | null;
  onName: (v: string) => void;
  onTarget: (v: string) => void;
  onStarting: (v: string) => void;
  onApr: (v: string) => void;
  onTargetDate: (v: string) => void;
  onPickAccount: (a: AccountOption) => void;
  onLink: (id: string | null) => void;
}

function Step2Debt({
  name,
  target,
  starting,
  apr,
  targetDate,
  linkedAccountId,
  debtAccounts,
  previewMonthly,
  interestSplit,
  monthsToTarget,
  onName,
  onTarget,
  onStarting,
  onApr,
  onTargetDate,
  onPickAccount,
  onLink,
}: Step2DebtProps) {
  return (
    <div>
      <h2
        style={{
          margin: 0,
          fontFamily: "var(--font-ui)",
          fontSize: 20,
          fontWeight: 500,
          letterSpacing: "-0.02em",
          color: "var(--ink-1)",
        }}
      >
        Which debt?
      </h2>
      <p
        style={{
          margin: "4px 0 16px",
          fontFamily: "var(--font-ui)",
          fontSize: 12.5,
          color: "var(--ink-3)",
        }}
      >
        Pick the balance you want to clear. We&apos;ll do the math for you.
      </p>

      {debtAccounts.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {debtAccounts.map((a) => {
            const selected = a.id === linkedAccountId;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onPickAccount(a)}
                style={{
                  appearance: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  padding: 14,
                  borderRadius: 14,
                  background: selected ? "var(--brand-tint)" : "var(--bg-surface)",
                  border: `${selected ? 1.5 : 1}px solid ${selected ? "var(--brand)" : "var(--line-soft)"}`,
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto auto",
                  gap: 12,
                  alignItems: "center",
                  width: "100%",
                }}
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "var(--bg-tinted)",
                    color: "var(--ink-2)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <GoalGlyph glyph="card" size={18} />
                </span>
                <div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 500, color: "var(--ink-1)" }}>
                    {a.name}
                  </div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)" }}>
                    {a.type === "credit" ? "Credit card" : "Loan"}
                  </div>
                </div>
                <Num style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-1)" }}>
                  {fmtMoneyShort(Math.abs(a.current_balance ?? 0))}
                </Num>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    border: `2px solid ${selected ? "var(--brand)" : "var(--line-firm)"}`,
                    background: selected ? "var(--brand)" : "transparent",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {selected ? (
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--bg-surface)" }} />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="NAME">
          <input
            value={name}
            onChange={(e) => onName(e.target.value)}
            placeholder="Pay off Citi card"
            style={inputStyle}
          />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="STARTING BALANCE">
            <input
              value={starting}
              onChange={(e) => onStarting(e.target.value.replace(/[^0-9.,]/g, ""))}
              placeholder="0"
              inputMode="decimal"
              style={inputStyle}
            />
          </Field>
          <Field label="APR %">
            <input
              value={apr}
              onChange={(e) => onApr(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="21.49"
              inputMode="decimal"
              style={inputStyle}
            />
          </Field>
        </div>
        <Field label="TARGET BALANCE" sub="Usually 0 — leave as 0 to fully pay off.">
          <input
            value={target}
            onChange={(e) => onTarget(e.target.value.replace(/[^0-9.,]/g, ""))}
            placeholder="0"
            inputMode="decimal"
            style={inputStyle}
          />
        </Field>
        <Field label="PAYOFF BY">
          <input
            type="date"
            value={targetDate}
            onChange={(e) => onTargetDate(e.target.value)}
            style={{ ...inputStyle, height: 52 }}
          />
          {monthsToTarget != null && monthsToTarget > 0 ? (
            <div style={{ marginTop: 6, fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)" }}>
              · {monthsToTarget} month{monthsToTarget === 1 ? "" : "s"}
            </div>
          ) : null}
        </Field>

        {debtAccounts.length === 0 ? (
          <Field label="LINK ACCOUNT (OPTIONAL)">
            <select
              value={linkedAccountId ?? ""}
              onChange={(e) => onLink(e.target.value || null)}
              style={{ ...inputStyle, height: 52 }}
            >
              <option value="">No linked account</option>
            </select>
          </Field>
        ) : null}

        {previewMonthly != null ? (
          <div
            style={{
              padding: 18,
              borderRadius: 16,
              background: "var(--brand-tint)",
              border: "1px solid var(--brand-tint)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-num)",
                fontSize: 10,
                color: "var(--brand)",
                letterSpacing: "0.08em",
                fontWeight: 600,
              }}
            >
              YOU&apos;LL PAY
            </div>
            <div style={{ marginTop: 6, display: "flex", alignItems: "baseline", gap: 6 }}>
              <Num style={{ fontSize: 30, fontWeight: 600, color: "var(--ink-1)", letterSpacing: "-0.02em" }}>
                {fmtMoneyShort(previewMonthly)}
              </Num>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-2)" }}>/ month</span>
            </div>
            {interestSplit ? (
              <div
                style={{
                  marginTop: 4,
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  color: "var(--ink-2)",
                  lineHeight: 1.55,
                }}
              >
                Includes{" "}
                <Num style={{ color: "var(--ink-1)", fontWeight: 500 }}>
                  ~{fmtMoneyShort(interestSplit.principal)}/mo principal
                </Num>{" "}
                +{" "}
                <Num style={{ color: "var(--ink-1)", fontWeight: 500 }}>
                  ~{fmtMoneyShort(interestSplit.interest)}/mo interest
                </Num>{" "}
                {apr ? `at ${apr}% APR.` : ""}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 48,
  padding: "0 14px",
  borderRadius: 12,
  background: "var(--bg-surface)",
  border: "1px solid var(--line-soft)",
  outline: 0,
  fontFamily: "var(--font-ui)",
  fontSize: 15,
  color: "var(--ink-1)",
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  zIndex: 50,
};

const panelStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  right: 0,
  height: "100%",
  width: "min(100%, 460px)",
  background: "var(--bg-canvas)",
  borderLeft: "1px solid var(--line-soft)",
  padding: 20,
  overflowY: "auto",
  zIndex: 51,
  display: "flex",
  flexDirection: "column",
  boxShadow: "-8px 0 24px rgba(0,0,0,0.08)",
};

const primaryBtn: React.CSSProperties = {
  height: 50,
  borderRadius: 12,
  border: 0,
  background: "var(--brand)",
  color: "var(--brand-on)",
  cursor: "pointer",
  fontFamily: "var(--font-ui)",
  fontSize: 14.5,
  fontWeight: 500,
};

function CloseIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </svg>
  );
}
