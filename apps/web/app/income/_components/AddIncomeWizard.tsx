"use client";

import { useEffect, useMemo, useState } from "react";
import {
  defaultCategoryForType,
  incomeLabelForType,
  projectNextDates,
  todayIso,
} from "@cvc/domain";
import { upsertIncomeEvent } from "@cvc/api-client";
import type { Cadence, IncomeSourceType } from "@cvc/types";
import type { CvcSupabaseClient } from "@cvc/api-client";
import { IncomeIcon } from "./IncomeIcon";
import { Num, fmtMoneyShort } from "./Num";

type Step = 1 | 2 | 3;
type AmountMode = "fixed" | "range";

interface AccountLite {
  id: string;
  name: string;
  display_name: string | null;
  mask: string | null;
}

interface Props {
  supabase: CvcSupabaseClient;
  spaceId: string | null;
  ownerUserId: string | null;
  accounts: AccountLite[];
  initialSourceType?: IncomeSourceType;
  onCancel: () => void;
  onSaved: () => void;
}

const TYPE_OPTIONS: { type: IncomeSourceType; title: string; sub: string }[] = [
  { type: "paycheck",   title: "Paycheck",             sub: "Salary or hourly · regular cadence" },
  { type: "freelance",  title: "Freelance / contract", sub: "Variable amounts, one or many clients" },
  { type: "rental",     title: "Rental income",        sub: "Tenant, sublet, Airbnb" },
  { type: "investment", title: "Investment",           sub: "Dividends, interest, distributions" },
  { type: "one_time",   title: "One-time",             sub: "Refund, gift, sale, bonus" },
];

const CADENCE_OPTIONS: { id: Cadence; title: string; sub: string }[] = [
  { id: "once",     title: "One-time",   sub: "Just this once" },
  { id: "weekly",   title: "Weekly",     sub: "Every week" },
  { id: "biweekly", title: "Bi-weekly",  sub: "Every other week" },
  { id: "monthly",  title: "Monthly",    sub: "On the same day each month" },
  { id: "yearly",   title: "Yearly",     sub: "Once a year" },
  { id: "custom",   title: "Custom…",    sub: "Set your own pattern" },
];

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

function dollarsToCents(s: string): number {
  if (!s.trim()) return 0;
  const n = Number(s);
  if (!Number.isFinite(n)) return Number.NaN;
  return Math.round(n * 100);
}

function dayOfMonth(iso: string): number {
  const m = iso.match(/^\d{4}-\d{2}-(\d{2})$/);
  if (!m) return 1;
  const day = Number(m[1]);
  return Number.isFinite(day) && day >= 1 && day <= 31 ? day : 1;
}

function isValidIso(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function AddIncomeWizard({
  supabase,
  spaceId,
  ownerUserId,
  accounts,
  initialSourceType,
  onCancel,
  onSaved,
}: Props) {
  const [step, setStep] = useState<Step>(1);
  const [sourceType, setSourceType] = useState<IncomeSourceType>(initialSourceType ?? "paycheck");
  const [name, setName] = useState("");
  const [amountMode, setAmountMode] = useState<AmountMode>("fixed");
  const [fixedStr, setFixedStr] = useState("");
  const [lowStr, setLowStr] = useState("");
  const [highStr, setHighStr] = useState("");
  const [accountId, setAccountId] = useState<string | null>(accounts[0]?.id ?? null);
  const [cadence, setCadence] = useState<Cadence>(initialSourceType === "one_time" ? "once" : "biweekly");
  const [nextDueAt, setNextDueAt] = useState(todayIso());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sourceType === "one_time") setCadence("once");
    else if (sourceType === "investment") setCadence("monthly");
    else if (sourceType === "paycheck") setCadence("biweekly");
    else if (sourceType === "freelance") setCadence("monthly");
    else if (sourceType === "rental") setCadence("monthly");
  }, [sourceType]);

  const selectedAccount = useMemo(() => accounts.find((a) => a.id === accountId) ?? null, [accounts, accountId]);

  const previewDates = useMemo(() => {
    if (!isValidIso(nextDueAt)) return [];
    return projectNextDates(nextDueAt, cadence, 3);
  }, [nextDueAt, cadence]);

  const previewAmount = useMemo(() => {
    if (amountMode === "range") {
      const lo = dollarsToCents(lowStr);
      const hi = dollarsToCents(highStr);
      if (Number.isFinite(lo) && Number.isFinite(hi) && lo > 0 && hi > 0) {
        return `${fmtMoneyShort(lo)}–${fmtMoneyShort(hi)}`;
      }
      return "—";
    }
    const c = dollarsToCents(fixedStr);
    return Number.isFinite(c) && c > 0 ? fmtMoneyShort(c) : "—";
  }, [amountMode, fixedStr, lowStr, highStr]);

  function next() {
    setError(null);
    if (step === 1) {
      if (!name.trim()) setName(incomeLabelForType(sourceType));
      setStep(2);
    } else if (step === 2) {
      if (amountMode === "fixed") {
        const c = dollarsToCents(fixedStr);
        if (!Number.isFinite(c) || c <= 0) {
          setError("Enter a valid amount.");
          return;
        }
      } else {
        const lo = dollarsToCents(lowStr);
        const hi = dollarsToCents(highStr);
        if (!Number.isFinite(lo) || lo <= 0 || !Number.isFinite(hi) || hi <= 0) {
          setError("Enter a valid range.");
          return;
        }
        if (lo > hi) {
          setError("Low must be ≤ high.");
          return;
        }
      }
      setStep(3);
    } else {
      void save();
    }
  }

  function back() {
    setError(null);
    if (step === 1) onCancel();
    else setStep((s) => (s - 1) as Step);
  }

  async function save() {
    if (!spaceId || !ownerUserId) {
      setError("Switch to a space first.");
      return;
    }
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!isValidIso(nextDueAt)) {
      setError("Date must be YYYY-MM-DD.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const amountCents = amountMode === "fixed"
        ? dollarsToCents(fixedStr)
        : Math.round((dollarsToCents(lowStr) + dollarsToCents(highStr)) / 2);
      await upsertIncomeEvent(supabase, {
        space_id: spaceId,
        owner_user_id: ownerUserId,
        name: name.trim(),
        amount: amountCents,
        amount_low: amountMode === "range" ? dollarsToCents(lowStr) : null,
        amount_high: amountMode === "range" ? dollarsToCents(highStr) : null,
        source_type: sourceType,
        cadence,
        next_due_at: nextDueAt,
        autopay: false,
        due_day: dayOfMonth(nextDueAt),
        source: "manual",
        category: defaultCategoryForType(sourceType),
        linked_account_id: accountId,
      });
      onSaved();
    } catch (e) {
      setError((e as Error).message ?? "Could not save income.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ background: "var(--bg-canvas)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ maxWidth: 460, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", flex: 1 }}>
        {/* Header */}
        <div style={{ padding: "14px 16px 8px", display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={back}
            style={{
              width: 36, height: 36, borderRadius: 999, background: "var(--bg-tinted)", border: 0,
              display: "grid", placeItems: "center", cursor: "pointer",
            }}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              {step === 1 ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M15 6l-6 6 6 6" />}
            </svg>
          </button>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-num)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.08em" }}>
              STEP {step} OF 3
            </div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 500, color: "var(--ink-1)" }}>
              Add income
            </div>
          </div>
          <div style={{ width: 36 }} />
        </div>

        <div style={{ padding: "4px 16px 0", display: "flex", gap: 5 }}>
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: n <= step ? "var(--pos)" : "var(--bg-tinted)",
              }}
            />
          ))}
        </div>

        <div style={{ padding: "24px 24px 0", flex: 1 }}>
          {step === 1 ? (
            <Step1
              sourceType={sourceType}
              name={name}
              onPickType={setSourceType}
              onChangeName={setName}
            />
          ) : null}
          {step === 2 ? (
            <Step2
              amountMode={amountMode}
              fixedStr={fixedStr}
              lowStr={lowStr}
              highStr={highStr}
              sourceType={sourceType}
              name={name}
              accounts={accounts}
              selectedAccount={selectedAccount}
              accountId={accountId}
              onChangeMode={setAmountMode}
              onChangeFixed={setFixedStr}
              onChangeLow={setLowStr}
              onChangeHigh={setHighStr}
              onPickAccount={setAccountId}
            />
          ) : null}
          {step === 3 ? (
            <Step3
              cadence={cadence}
              nextDueAt={nextDueAt}
              previewDates={previewDates}
              previewAmount={previewAmount}
              onPickCadence={setCadence}
              onChangeNextDue={setNextDueAt}
            />
          ) : null}
        </div>

        {error ? (
          <div style={{ padding: "0 16px 8px", color: "var(--neg)", fontFamily: "var(--font-ui)", fontSize: 12 }}>
            {error}
          </div>
        ) : null}

        <div style={{ padding: "12px 16px 28px" }}>
          <button
            type="button"
            onClick={next}
            disabled={saving}
            style={{
              width: "100%",
              height: 50,
              borderRadius: 12,
              border: 0,
              cursor: saving ? "not-allowed" : "pointer",
              background: saving ? "var(--line-firm)" : "var(--brand)",
              color: "var(--brand-on)",
              fontFamily: "var(--font-ui)",
              fontSize: 14.5,
              fontWeight: 500,
            }}
          >
            {step === 3 ? (saving ? "Saving…" : "Add income") : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Step1({
  sourceType,
  name,
  onPickType,
  onChangeName,
}: {
  sourceType: IncomeSourceType;
  name: string;
  onPickType: (t: IncomeSourceType) => void;
  onChangeName: (n: string) => void;
}) {
  return (
    <>
      <h2 style={{ margin: 0, fontFamily: "var(--font-ui)", fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink-1)", lineHeight: 1.2 }}>
        What kind of income?
      </h2>
      <p style={{ margin: "8px 0 0", fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
        We&apos;ll set sensible defaults — you can fine-tune anything next.
      </p>

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {TYPE_OPTIONS.map((o) => {
          const selected = sourceType === o.type;
          return (
            <button
              key={o.type}
              type="button"
              onClick={() => onPickType(o.type)}
              style={{
                appearance: "none",
                cursor: "pointer",
                textAlign: "left",
                padding: "12px 14px",
                borderRadius: 14,
                background: selected ? "var(--pos-tint)" : "var(--bg-surface)",
                border: `${selected ? 1.5 : 1}px solid ${selected ? "var(--pos)" : "var(--line-soft)"}`,
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: 12,
                alignItems: "center",
              }}
            >
              <IncomeIcon sourceType={o.type} />
              <div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 500, color: "var(--ink-1)" }}>{o.title}</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{o.sub}</div>
              </div>
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  border: `2px solid ${selected ? "var(--pos)" : "var(--line-firm)"}`,
                  background: selected ? "var(--pos)" : "transparent",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {selected ? <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--bg-surface)" }} /> : null}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 16 }}>
        <label
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--ink-2)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            display: "block",
            marginBottom: 6,
          }}
        >
          Source name
        </label>
        <input
          value={name}
          onChange={(e) => onChangeName(e.target.value)}
          placeholder={`e.g. ${incomeLabelForType(sourceType)}`}
          style={{
            width: "100%",
            padding: "0 14px",
            height: 48,
            borderRadius: 12,
            background: "var(--bg-surface)",
            border: "1px solid var(--line-firm)",
            fontFamily: "var(--font-ui)",
            fontSize: 14,
            color: "var(--ink-1)",
            outline: "none",
          }}
        />
      </div>

      <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 12, background: "var(--bg-sunken)" }}>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.55 }}>
          We use this only to label and group sources. Your taxes don&apos;t change either way.
        </div>
      </div>
    </>
  );
}

function Step2({
  amountMode,
  fixedStr,
  lowStr,
  highStr,
  sourceType,
  name,
  accounts,
  selectedAccount,
  accountId,
  onChangeMode,
  onChangeFixed,
  onChangeLow,
  onChangeHigh,
  onPickAccount,
}: {
  amountMode: AmountMode;
  fixedStr: string;
  lowStr: string;
  highStr: string;
  sourceType: IncomeSourceType;
  name: string;
  accounts: AccountLite[];
  selectedAccount: AccountLite | null;
  accountId: string | null;
  onChangeMode: (m: AmountMode) => void;
  onChangeFixed: (s: string) => void;
  onChangeLow: (s: string) => void;
  onChangeHigh: (s: string) => void;
  onPickAccount: (id: string) => void;
}) {
  return (
    <>
      <h2 style={{ margin: 0, fontFamily: "var(--font-ui)", fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink-1)", lineHeight: 1.2 }}>
        How much, on average?
      </h2>
      <p style={{ margin: "8px 0 0", fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
        If it varies, give a range — we&apos;ll show both in your forecast.
      </p>

      <div
        style={{
          marginTop: 16,
          padding: "10px 12px",
          borderRadius: 12,
          background: "var(--bg-surface)",
          border: "1px solid var(--line-soft)",
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 10,
          alignItems: "center",
        }}
      >
        <IncomeIcon sourceType={sourceType} size={36} />
        <div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500, color: "var(--ink-1)" }}>
            {name || incomeLabelForType(sourceType)}
          </div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)" }}>
            {incomeLabelForType(sourceType)}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          display: "inline-flex",
          padding: 3,
          background: "var(--bg-tinted)",
          borderRadius: 999,
          gap: 2,
        }}
      >
        {(["fixed", "range"] as const).map((m) => {
          const active = amountMode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onChangeMode(m)}
              style={{
                padding: "7px 14px",
                borderRadius: 999,
                border: 0,
                cursor: "pointer",
                background: active ? "var(--bg-surface)" : "transparent",
                color: active ? "var(--ink-1)" : "var(--ink-2)",
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                fontWeight: 500,
              }}
            >
              {m === "fixed" ? "Fixed amount" : "Range"}
            </button>
          );
        })}
      </div>

      {amountMode === "fixed" ? (
        <div style={{ marginTop: 14 }}>
          <Label>Amount</Label>
          <CurrencyInput value={fixedStr} onChange={onChangeFixed} />
        </div>
      ) : (
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <Label>Low (typical)</Label>
            <CurrencyInput value={lowStr} onChange={onChangeLow} />
          </div>
          <div>
            <Label>High (typical)</Label>
            <CurrencyInput value={highStr} onChange={onChangeHigh} />
          </div>
        </div>
      )}

      {accounts.length > 0 ? (
        <div style={{ marginTop: 16 }}>
          <Label>Lands in</Label>
          <select
            value={accountId ?? ""}
            onChange={(e) => onPickAccount(e.target.value)}
            style={{
              width: "100%",
              padding: "0 12px",
              height: 48,
              borderRadius: 12,
              background: "var(--bg-surface)",
              border: "1px solid var(--line-firm)",
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              color: "var(--ink-1)",
              outline: "none",
            }}
          >
            <option value="">Pick an account</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {(a.display_name ?? a.name) + (a.mask ? ` ··${a.mask}` : "")}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </>
  );
}

function Step3({
  cadence,
  nextDueAt,
  previewDates,
  previewAmount,
  onPickCadence,
  onChangeNextDue,
}: {
  cadence: Cadence;
  nextDueAt: string;
  previewDates: string[];
  previewAmount: string;
  onPickCadence: (c: Cadence) => void;
  onChangeNextDue: (s: string) => void;
}) {
  return (
    <>
      <h2 style={{ margin: 0, fontFamily: "var(--font-ui)", fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink-1)", lineHeight: 1.2 }}>
        How often?
      </h2>
      <p style={{ margin: "8px 0 0", fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
        We&apos;ll show countdowns and roll this into your forecast.
      </p>

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {CADENCE_OPTIONS.map((o) => {
          const selected = cadence === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onPickCadence(o.id)}
              style={{
                appearance: "none",
                cursor: "pointer",
                textAlign: "left",
                padding: 14,
                borderRadius: 12,
                background: selected ? "var(--pos-tint)" : "var(--bg-surface)",
                border: `${selected ? 1.5 : 1}px solid ${selected ? "var(--pos)" : "var(--line-soft)"}`,
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 8,
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 500, color: "var(--ink-1)" }}>{o.title}</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{o.sub}</div>
              </div>
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  border: `2px solid ${selected ? "var(--pos)" : "var(--line-firm)"}`,
                  background: selected ? "var(--pos)" : "transparent",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {selected ? <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--bg-surface)" }} /> : null}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 16 }}>
        <Label>{cadence === "once" ? "Date received expected" : "First / next expected"}</Label>
        <input
          value={nextDueAt}
          onChange={(e) => onChangeNextDue(e.target.value)}
          placeholder="YYYY-MM-DD"
          style={{
            width: "100%",
            padding: "0 14px",
            height: 48,
            borderRadius: 12,
            background: "var(--bg-surface)",
            border: "1px solid var(--line-firm)",
            fontFamily: "var(--font-num)",
            fontSize: 14,
            color: "var(--ink-1)",
            outline: "none",
          }}
        />
      </div>

      {previewDates.length > 0 && cadence !== "custom" ? (
        <div
          style={{
            marginTop: 18,
            padding: "14px 16px",
            borderRadius: 14,
          }}
          className="cvc-income-hero"
        >
          <div style={{ fontFamily: "var(--font-num)", fontSize: 10, color: "var(--pos)", letterSpacing: "0.07em", fontWeight: 600 }}>
            {cadence === "once" ? "EXPECTED" : "NEXT 3"}
          </div>
          <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
            {previewDates.map((iso, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  color: "var(--ink-1)",
                }}
              >
                <span>{formatDate(iso)}</span>
                <Num style={{ fontFamily: "var(--font-num)", fontWeight: 600 }}>{previewAmount}</Num>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        fontFamily: "var(--font-ui)",
        fontSize: 11,
        fontWeight: 600,
        color: "var(--ink-2)",
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        display: "block",
        marginBottom: 6,
      }}
    >
      {children}
    </label>
  );
}

function CurrencyInput({ value, onChange }: { value: string; onChange: (s: string) => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        height: 52,
        borderRadius: 12,
        background: "var(--bg-surface)",
        border: `1.5px solid ${value ? "var(--pos)" : "var(--line-firm)"}`,
      }}
    >
      <span style={{ fontFamily: "var(--font-num)", fontSize: 18, color: "var(--ink-3)" }}>$</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        style={{
          flex: 1,
          border: 0,
          outline: 0,
          background: "transparent",
          textAlign: "right",
          fontFamily: "var(--font-num)",
          fontSize: 18,
          fontWeight: 600,
          color: "var(--ink-1)",
        }}
      />
    </div>
  );
}
