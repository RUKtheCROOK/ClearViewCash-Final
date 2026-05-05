"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import {
  POPULAR_PAYEES,
  brandingForCategory,
  formatLongDate,
  resolveBillBranding,
  todayIso,
  type BillGlyphKey,
} from "@cvc/domain";
import {
  getAccountsForView,
  getBillReminders,
  setBillReminder,
  upsertBill,
} from "@cvc/api-client";
import type { Cadence } from "@cvc/types";
import { BillIcon } from "./glyphs";
import { Num } from "./Num";
import { SwitchRow } from "./SwitchRow";

interface AccountLite {
  id: string;
  name: string;
  display_name: string | null;
  mask: string | null;
  current_balance: number | null;
}

export interface InitialBill {
  id?: string;
  name: string;
  amount: number;
  next_due_at: string;
  cadence: Cadence;
  autopay: boolean;
  category: string | null;
  payee_hue: number | null;
  payee_glyph: string | null;
  notes: string | null;
  linked_account_id: string | null;
}

interface Props {
  client: SupabaseClient<Database>;
  spaceId: string;
  ownerUserId: string;
  initial?: InitialBill;
  onDone: (billId: string) => void;
  onCancel: () => void;
}

type Step = 1 | 2 | 3;

interface DraftPayee {
  name: string;
  category: string | null;
  hue: number;
  glyph: BillGlyphKey;
}

function parseAmount(s: string): number {
  if (!s.trim()) return Number.NaN;
  const n = Number(s.replace(/,/g, ""));
  if (!Number.isFinite(n)) return Number.NaN;
  return Math.round(n * 100);
}

function dollarStr(cents: number): string {
  return (cents / 100).toFixed(2);
}

function dayOfMonth(iso: string): number {
  const m = iso.match(/^\d{4}-\d{2}-(\d{2})$/);
  if (!m) return 1;
  const day = Number(m[1]);
  return Number.isFinite(day) && day >= 1 && day <= 31 ? day : 1;
}

export function AddBillWizard({ client, spaceId, ownerUserId, initial, onDone, onCancel }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [payee, setPayee] = useState<DraftPayee | null>(() => {
    if (!initial) return null;
    const branding = resolveBillBranding(initial);
    return {
      name: initial.name,
      category: initial.category,
      hue: branding.hue,
      glyph: branding.glyph,
    };
  });
  const [search, setSearch] = useState("");
  const [amountStr, setAmountStr] = useState(initial ? dollarStr(initial.amount) : "");
  const [variable, setVariable] = useState(false);
  const [dueDate, setDueDate] = useState(initial?.next_due_at ?? todayIso());
  const [accountId, setAccountId] = useState<string | null>(initial?.linked_account_id ?? null);
  const [accounts, setAccounts] = useState<AccountLite[]>([]);
  const [cadence, setCadence] = useState<Cadence>(initial?.cadence ?? "monthly");
  const [autopay, setAutopay] = useState<boolean>(initial?.autopay ?? true);
  const [reminderBefore, setReminderBefore] = useState(true);
  const [reminderOnDue, setReminderOnDue] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!initial?.id;

  useEffect(() => {
    getAccountsForView(client, { spaceId, sharedView: false }).then((rows) => {
      const list = (rows as Array<{
        id: string;
        name: string;
        display_name: string | null;
        mask: string | null;
        current_balance: number | null;
      }>).map((a) => ({
        id: a.id,
        name: a.name,
        display_name: a.display_name,
        mask: a.mask,
        current_balance: a.current_balance,
      }));
      setAccounts(list);
      if (!accountId && list[0]) setAccountId(list[0].id);
    });
  }, [client, spaceId]);

  useEffect(() => {
    if (!isEdit || !initial?.id) return;
    getBillReminders(client, initial.id).then((rems) => {
      const before3 = rems.find((r) => r.kind === "days_before" && r.days_before === 3);
      const due = rems.find((r) => r.kind === "on_due_date");
      setReminderBefore(!!before3?.enabled);
      setReminderOnDue(!!due?.enabled);
    });
  }, [client, initial?.id, isEdit]);

  const filteredPopular = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return POPULAR_PAYEES;
    return POPULAR_PAYEES.filter((p) => p.name.toLowerCase().includes(q));
  }, [search]);

  function pickPopular(p: typeof POPULAR_PAYEES[number]) {
    setPayee({ name: p.name, category: p.category, hue: p.branding.hue, glyph: p.branding.glyph });
    setStep(2);
  }

  function pickCustom(name: string) {
    if (!name.trim()) return;
    const branding = resolveBillBranding({ name, category: null, payee_hue: null, payee_glyph: null });
    setPayee({ name: name.trim(), category: null, hue: branding.hue, glyph: branding.glyph });
    setStep(2);
  }

  function back() {
    if (step === 1) onCancel();
    else setStep(((step - 1) as Step));
  }

  function nextStep() {
    setError(null);
    if (step === 2) {
      const cents = parseAmount(amountStr);
      if (!Number.isFinite(cents) || cents <= 0) {
        setError("Enter a valid amount.");
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
        setError("Pick a due date.");
        return;
      }
    }
    setStep(((step + 1) as Step));
  }

  async function submit() {
    if (!payee) {
      setStep(1);
      return;
    }
    const cents = parseAmount(amountStr);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Enter a valid amount.");
      setStep(2);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await upsertBill(client, {
        id: initial?.id,
        space_id: spaceId,
        owner_user_id: ownerUserId,
        name: payee.name,
        amount: cents,
        cadence,
        next_due_at: dueDate,
        due_day: dayOfMonth(dueDate),
        autopay,
        linked_account_id: accountId,
        source: initial?.id ? undefined : "manual",
        category: payee.category,
        payee_hue: payee.hue,
        payee_glyph: payee.glyph,
        notes: initial?.notes ?? null,
      });
      const newId = (result as { id: string }).id;
      // Persist reminder choices.
      await Promise.all([
        setBillReminder(client, {
          bill_id: newId,
          kind: "days_before",
          days_before: 3,
          enabled: reminderBefore,
        }),
        setBillReminder(client, {
          bill_id: newId,
          kind: "on_due_date",
          days_before: null,
          enabled: reminderOnDue,
        }),
      ]);
      onDone(newId);
    } catch (e) {
      setError((e as Error).message ?? "Could not save bill.");
    } finally {
      setBusy(false);
    }
  }

  const account = accounts.find((a) => a.id === accountId) ?? null;

  return (
    <main
      style={{
        background: "var(--bg-canvas)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", flex: 1 }}>
        {/* Header */}
        <div style={{ padding: "14px 16px 8px", display: "flex", alignItems: "center", gap: 10 }}>
          <button type="button" onClick={back} style={topBtn} aria-label={step === 1 ? "Cancel" : "Back"}>
            {step === 1 ? <CloseIcon /> : <BackIcon />}
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
              STEP {step} OF 3
            </div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 500, color: "var(--ink-1)" }}>
              {isEdit ? "Edit bill" : "Add bill"}
            </div>
          </div>
          <div style={{ width: 36 }} />
        </div>

        {/* Step bar */}
        <div style={{ padding: "4px 16px 0", display: "flex", gap: 5 }}>
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: n <= step ? "var(--brand)" : "var(--bg-tinted)",
              }}
            />
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: "24px 24px 0" }}>
          {step === 1 ? (
            <>
              <h2 style={titleStyle}>Who are you paying?</h2>
              <p style={subStyle}>Pick from suggestions or type a custom name. We&apos;ll use this on reminders.</p>
            </>
          ) : null}
          {step === 2 ? (
            <>
              <h2 style={titleStyle}>Amount and due date</h2>
              <p style={subStyle}>You can mark this as variable later — useful for utilities.</p>
            </>
          ) : null}
          {step === 3 ? (
            <>
              <h2 style={titleStyle}>How often?</h2>
              <p style={subStyle}>
                Recurring bills go on autopilot — we&apos;ll create the next one as soon as this one&apos;s paid.
              </p>
            </>
          ) : null}
        </div>

        <div style={{ flex: 1, padding: "16px 0 0" }}>
          {step === 1 ? (
            <Step1
              search={search}
              onSearch={setSearch}
              popular={filteredPopular}
              onPick={pickPopular}
              onCustom={pickCustom}
            />
          ) : null}
          {step === 2 ? (
            <Step2
              payee={payee}
              onChangePayee={() => setStep(1)}
              amountStr={amountStr}
              onAmount={setAmountStr}
              variable={variable}
              onVariable={setVariable}
              dueDate={dueDate}
              onDueDate={setDueDate}
              accounts={accounts}
              accountId={accountId}
              onAccount={setAccountId}
              account={account}
            />
          ) : null}
          {step === 3 ? (
            <Step3
              cadence={cadence}
              onCadence={setCadence}
              autopay={autopay}
              onAutopay={setAutopay}
              reminderBefore={reminderBefore}
              onReminderBefore={setReminderBefore}
              reminderOnDue={reminderOnDue}
              onReminderOnDue={setReminderOnDue}
              accountText={
                account
                  ? `${(account.display_name ?? account.name).split(/\s+/).slice(0, 2).join(" ")}${account.mask ? ` ··${account.mask}` : ""}`
                  : "the linked account"
              }
              dueDate={dueDate}
            />
          ) : null}
        </div>

        {error ? (
          <p style={{ color: "var(--neg)", padding: "0 16px", fontSize: 12 }}>{error}</p>
        ) : null}

        {/* Footer buttons */}
        <div style={{ padding: "12px 16px 28px", display: "flex", flexDirection: "column", gap: 8 }}>
          {step < 3 ? (
            <button
              type="button"
              disabled={step === 1 ? !payee : false}
              onClick={nextStep}
              style={primaryBtn(step === 1 ? !payee : false)}
            >
              Continue
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={busy} style={primaryBtn(busy)}>
              {busy ? "Saving…" : isEdit ? "Save bill" : "Add bill"}
            </button>
          )}
          <button type="button" onClick={onCancel} style={secondaryBtn}>
            Cancel
          </button>
        </div>
      </div>
    </main>
  );
}

function Step1({
  search,
  onSearch,
  popular,
  onPick,
  onCustom,
}: {
  search: string;
  onSearch: (v: string) => void;
  popular: typeof POPULAR_PAYEES;
  onPick: (p: typeof POPULAR_PAYEES[number]) => void;
  onCustom: (name: string) => void;
}) {
  return (
    <>
      <div style={{ padding: "0 16px 14px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 14px",
            height: 48,
            borderRadius: 12,
            background: "var(--bg-surface)",
            border: "1px solid var(--line-firm)",
          }}
        >
          <SearchIcon color="var(--ink-3)" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && search.trim()) onCustom(search);
            }}
            placeholder="Payee name or custom…"
            style={{
              flex: 1,
              border: 0,
              outline: 0,
              background: "transparent",
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              color: "var(--ink-1)",
            }}
          />
          {search.trim() ? (
            <button
              type="button"
              onClick={() => onCustom(search)}
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--brand)",
                background: "transparent",
                border: 0,
                cursor: "pointer",
              }}
            >
              Use “{search.trim()}”
            </button>
          ) : null}
        </div>
      </div>

      <div style={{ padding: "0 24px 6px", fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
        Popular
      </div>
      <div style={{ padding: "0 16px 80px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {popular.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => onPick(p)}
            style={{
              appearance: "none",
              cursor: "pointer",
              textAlign: "left",
              background: "var(--bg-surface)",
              border: "1px solid var(--line-soft)",
              borderRadius: 12,
              padding: 12,
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: 10,
              alignItems: "center",
            }}
          >
            <BillIcon hue={p.branding.hue} glyph={p.branding.glyph} />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--ink-1)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {p.name}
              </div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, color: "var(--ink-3)", marginTop: 1 }}>
                {p.category}
              </div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function Step2({
  payee,
  onChangePayee,
  amountStr,
  onAmount,
  variable,
  onVariable,
  dueDate,
  onDueDate,
  accounts,
  accountId,
  onAccount,
  account,
}: {
  payee: DraftPayee | null;
  onChangePayee: () => void;
  amountStr: string;
  onAmount: (v: string) => void;
  variable: boolean;
  onVariable: (v: boolean) => void;
  dueDate: string;
  onDueDate: (v: string) => void;
  accounts: AccountLite[];
  accountId: string | null;
  onAccount: (id: string) => void;
  account: AccountLite | null;
}) {
  return (
    <div style={{ padding: "8px 16px" }}>
      {payee ? (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            background: "var(--bg-surface)",
            border: "1px solid var(--line-soft)",
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            gap: 10,
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <BillIcon hue={payee.hue} glyph={payee.glyph} />
          <div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500, color: "var(--ink-1)" }}>
              {payee.name}
            </div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)" }}>
              {payee.category ?? "Custom"}
            </div>
          </div>
          <button
            type="button"
            onClick={onChangePayee}
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--brand)",
              background: "transparent",
              border: 0,
              cursor: "pointer",
            }}
          >
            Change
          </button>
        </div>
      ) : null}

      <Label>Amount</Label>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          height: 56,
          borderRadius: 12,
          background: "var(--bg-surface)",
          border: "1.5px solid var(--brand)",
          marginBottom: 6,
        }}
      >
        <span style={{ fontFamily: "var(--font-num)", fontSize: 22, color: "var(--ink-3)" }}>$</span>
        <input
          autoFocus
          value={amountStr}
          inputMode="decimal"
          onChange={(e) => onAmount(e.target.value)}
          placeholder="0.00"
          style={{
            flex: 1,
            border: 0,
            outline: 0,
            background: "transparent",
            fontFamily: "var(--font-num)",
            fontSize: 22,
            fontWeight: 600,
            color: "var(--ink-1)",
            paddingLeft: 6,
          }}
        />
      </div>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 16,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <input
          type="checkbox"
          checked={variable}
          onChange={(e) => onVariable(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: "var(--brand)" }}
        />
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-2)" }}>
          Variable amount (estimate based on history)
        </span>
      </label>

      <Label>Due date</Label>
      <input
        type="date"
        value={dueDate}
        onChange={(e) => onDueDate(e.target.value)}
        style={{
          width: "100%",
          padding: "0 14px",
          height: 50,
          borderRadius: 12,
          background: "var(--bg-surface)",
          border: "1px solid var(--line-firm)",
          fontFamily: "var(--font-ui)",
          fontSize: 14,
          color: "var(--ink-1)",
          marginBottom: 4,
        }}
      />
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-3)", marginBottom: 16 }}>
        {/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? formatLongDate(dueDate) : "Pick a date."}
      </div>

      <Label>Pay from</Label>
      {accounts.length === 0 ? (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            background: "var(--bg-surface)",
            border: "1px dashed var(--line-firm)",
            color: "var(--ink-3)",
            fontSize: 12.5,
          }}
        >
          No accounts in this space yet — link one from Accounts.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: 80 }}>
          {accounts.map((a) => {
            const active = accountId === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onAccount(a.id)}
                style={{
                  appearance: "none",
                  cursor: "pointer",
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: active ? "var(--brand-tint)" : "var(--bg-surface)",
                  border: `${active ? 1.5 : 1}px solid ${active ? "var(--brand)" : "var(--line-firm)"}`,
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: 10,
                  alignItems: "center",
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "var(--bg-tinted)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <CardIcon color="var(--ink-2)" />
                </span>
                <div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 500, color: "var(--ink-1)" }}>
                    {a.display_name ?? a.name}
                  </div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)" }}>
                    {a.mask ? `··${a.mask} · ` : ""}
                    {a.current_balance != null ? (
                      <Num style={{ fontSize: 11 }}>${(a.current_balance / 100).toFixed(2)}</Num>
                    ) : null}
                  </div>
                </div>
                {active ? <CheckBox color="var(--brand)" /> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Step3({
  cadence,
  onCadence,
  autopay,
  onAutopay,
  reminderBefore,
  onReminderBefore,
  reminderOnDue,
  onReminderOnDue,
  accountText,
  dueDate,
}: {
  cadence: Cadence;
  onCadence: (c: Cadence) => void;
  autopay: boolean;
  onAutopay: (v: boolean) => void;
  reminderBefore: boolean;
  onReminderBefore: (v: boolean) => void;
  reminderOnDue: boolean;
  onReminderOnDue: (v: boolean) => void;
  accountText: string;
  dueDate: string;
}) {
  const day = (() => {
    const m = dueDate.match(/^\d{4}-\d{2}-(\d{2})$/);
    return m ? Number(m[1]) : 1;
  })();

  const opts: Array<{ id: Cadence; label: string; sub: string }> = [
    { id: "once", label: "One-time", sub: "Just this once" },
    { id: "weekly", label: "Weekly", sub: "Every week" },
    { id: "biweekly", label: "Biweekly", sub: "Every two weeks" },
    { id: "monthly", label: "Monthly", sub: `On the ${day}${ordinalSuffix(day)}` },
    { id: "yearly", label: "Yearly", sub: "Once a year" },
    { id: "custom", label: "Custom", sub: "Treat as monthly for now" },
  ];

  return (
    <>
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {opts.map((o) => {
          const sel = o.id === cadence;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onCadence(o.id)}
              style={{
                appearance: "none",
                cursor: "pointer",
                textAlign: "left",
                padding: 14,
                borderRadius: 12,
                background: sel ? "var(--brand-tint)" : "var(--bg-surface)",
                border: `${sel ? 1.5 : 1}px solid ${sel ? "var(--brand)" : "var(--line-soft)"}`,
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 8,
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 500, color: "var(--ink-1)" }}>
                  {o.label}
                </div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
                  {o.sub}
                </div>
              </div>
              <Radio active={sel} />
            </button>
          );
        })}
      </div>

      <div style={{ padding: "18px 16px 80px" }}>
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--line-soft)",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <SwitchRow
            icon={<BoltIcon color="var(--brand)" />}
            title="Autopay this bill"
            subtitle={`Pay automatically from ${accountText} on the due date.`}
            on={autopay}
            onToggle={onAutopay}
          />
          <SwitchRow
            icon={<BellIcon color="var(--ink-2)" />}
            title="Remind me 1 day before"
            subtitle="Push notification at 9:00 AM"
            on={reminderBefore}
            onToggle={onReminderBefore}
          />
          <SwitchRow
            icon={<BellIcon color="var(--ink-2)" />}
            title="Remind me on due date"
            subtitle="Push notification at 9:00 AM"
            on={reminderOnDue}
            onToggle={onReminderOnDue}
            last
          />
        </div>
      </div>
    </>
  );
}

function ordinalSuffix(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-ui)",
        fontSize: 11,
        fontWeight: 600,
        color: "var(--ink-2)",
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function Radio({ active }: { active: boolean }) {
  return (
    <span
      style={{
        width: 22,
        height: 22,
        borderRadius: 999,
        border: `2px solid ${active ? "var(--brand)" : "var(--line-firm)"}`,
        background: active ? "var(--brand)" : "transparent",
        display: "grid",
        placeItems: "center",
      }}
    >
      {active ? <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--bg-surface)" }} /> : null}
    </span>
  );
}

function CheckBox({ color }: { color: string }) {
  return (
    <span
      style={{
        width: 22,
        height: 22,
        borderRadius: 999,
        background: color,
        display: "grid",
        placeItems: "center",
      }}
    >
      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="var(--brand-on)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12l4 4 10-10" />
      </svg>
    </span>
  );
}

function primaryBtn(disabled?: boolean): React.CSSProperties {
  return {
    height: 50,
    borderRadius: 12,
    border: 0,
    cursor: disabled ? "wait" : "pointer",
    background: "var(--brand)",
    color: "var(--brand-on)",
    fontFamily: "var(--font-ui)",
    fontSize: 14.5,
    fontWeight: 500,
    opacity: disabled ? 0.6 : 1,
  };
}

const secondaryBtn: React.CSSProperties = {
  height: 50,
  borderRadius: 12,
  cursor: "pointer",
  background: "transparent",
  border: "1px solid var(--line-firm)",
  color: "var(--ink-2)",
  fontFamily: "var(--font-ui)",
  fontSize: 14.5,
};

const topBtn: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 999,
  background: "var(--bg-tinted)",
  border: 0,
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  color: "var(--ink-2)",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-ui)",
  fontSize: 22,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: "var(--ink-1)",
  lineHeight: 1.2,
};

const subStyle: React.CSSProperties = {
  margin: "8px 0 0",
  fontFamily: "var(--font-ui)",
  fontSize: 13.5,
  color: "var(--ink-2)",
  lineHeight: 1.55,
};

function CloseIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function SearchIcon({ color }: { color: string }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={11} cy={11} r={7} />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function CardIcon({ color }: { color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x={3} y={6} width={18} height={13} rx={2} />
      <path d="M3 11h18" />
    </svg>
  );
}

function BoltIcon({ color }: { color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill={color}>
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  );
}

function BellIcon({ color }: { color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 1112 0v5l2 3H4l2-3V8z" />
      <path d="M10 19a2 2 0 004 0" />
    </svg>
  );
}
