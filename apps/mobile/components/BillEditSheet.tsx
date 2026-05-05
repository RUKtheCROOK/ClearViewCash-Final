import { useEffect, useMemo, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import {
  POPULAR_PAYEES,
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
import type { Cadence, EditableBill } from "@cvc/types";
import { fonts, type Palette } from "@cvc/ui";
import { useTheme } from "../lib/theme";
import { supabase } from "../lib/supabase";
import { BillIcon } from "./bills/BillIcon";
import { Num } from "./bills/Num";
import { SwitchRow } from "./bills/SwitchRow";

export type { EditableBill };

interface Props {
  visible: boolean;
  bill: EditableBill | null;
  spaceId: string | null;
  ownerUserId: string | null;
  onClose: () => void;
  onSaved: (id: string) => void;
}

interface AccountLite {
  id: string;
  name: string;
  display_name: string | null;
  mask: string | null;
  current_balance: number | null;
}

interface DraftPayee {
  name: string;
  category: string | null;
  hue: number;
  glyph: BillGlyphKey;
}

type Step = 1 | 2 | 3;

function parseAmount(s: string): number {
  if (!s.trim()) return Number.NaN;
  const n = Number(s.replace(/,/g, ""));
  if (!Number.isFinite(n)) return Number.NaN;
  return Math.round(n * 100);
}

function dayOfMonth(iso: string): number {
  const m = iso.match(/^\d{4}-\d{2}-(\d{2})$/);
  if (!m) return 1;
  const day = Number(m[1]);
  return Number.isFinite(day) && day >= 1 && day <= 31 ? day : 1;
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

export function BillEditSheet({ visible, bill, spaceId, ownerUserId, onClose, onSaved }: Props) {
  const { palette, mode } = useTheme();
  const isEdit = !!bill?.id;
  const [step, setStep] = useState<Step>(1);
  const [payee, setPayee] = useState<DraftPayee | null>(null);
  const [search, setSearch] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [dueDate, setDueDate] = useState(todayIso());
  const [accountId, setAccountId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountLite[]>([]);
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const [autopay, setAutopay] = useState(true);
  const [reminderBefore, setReminderBefore] = useState(true);
  const [reminderOnDue, setReminderOnDue] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate when sheet opens
  useEffect(() => {
    if (!visible) return;
    setError(null);
    setStep(isEdit ? 2 : 1);
    setSearch("");
    if (bill) {
      const branding = resolveBillBranding(bill);
      setPayee({
        name: bill.name,
        category: bill.category,
        hue: branding.hue,
        glyph: branding.glyph,
      });
      setAmountStr((bill.amount / 100).toFixed(2));
      setDueDate(bill.next_due_at);
      setCadence(bill.cadence);
      setAutopay(bill.autopay);
      setAccountId(bill.linked_account_id ?? null);
    } else {
      setPayee(null);
      setAmountStr("");
      setDueDate(todayIso());
      setCadence("monthly");
      setAutopay(true);
      setAccountId(null);
    }
  }, [visible, bill, isEdit]);

  // Load accounts when sheet opens
  useEffect(() => {
    if (!visible || !spaceId) return;
    getAccountsForView(supabase, { spaceId, sharedView: false }).then((rows) => {
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
  }, [visible, spaceId]);

  // Load reminders for edit
  useEffect(() => {
    if (!visible || !isEdit || !bill?.id) return;
    getBillReminders(supabase, bill.id).then((rems) => {
      const before3 = rems.find((r) => r.kind === "days_before" && r.days_before === 3);
      const due = rems.find((r) => r.kind === "on_due_date");
      setReminderBefore(!!before3?.enabled);
      setReminderOnDue(!!due?.enabled);
    });
  }, [visible, isEdit, bill?.id]);

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
    if (step === 1) onClose();
    else setStep(((step - 1) as Step));
  }

  function next() {
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
    if (!payee || !spaceId || !ownerUserId) return;
    const cents = parseAmount(amountStr);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Enter a valid amount.");
      setStep(2);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await upsertBill(supabase, {
        id: bill?.id,
        space_id: spaceId,
        owner_user_id: ownerUserId,
        name: payee.name,
        amount: cents,
        cadence,
        next_due_at: dueDate,
        due_day: dayOfMonth(dueDate),
        autopay,
        linked_account_id: accountId,
        source: bill?.id ? undefined : "manual",
        category: payee.category,
        payee_hue: payee.hue,
        payee_glyph: payee.glyph,
        notes: null,
      });
      const newId = (result as { id: string }).id;
      await Promise.all([
        setBillReminder(supabase, {
          bill_id: newId,
          kind: "days_before",
          days_before: 3,
          enabled: reminderBefore,
        }),
        setBillReminder(supabase, {
          bill_id: newId,
          kind: "on_due_date",
          days_before: null,
          enabled: reminderOnDue,
        }),
      ]);
      onSaved(newId);
    } catch (e) {
      setError((e as Error).message ?? "Could not save bill.");
    } finally {
      setBusy(false);
    }
  }

  const account = accounts.find((a) => a.id === accountId) ?? null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="formSheet">
      <View style={{ flex: 1, backgroundColor: palette.canvas }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingTop: Platform.OS === "ios" ? 8 : 14, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable
            onPress={back}
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              backgroundColor: palette.tinted,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {step === 1 ? <CloseIcon color={palette.ink2} /> : <BackIcon color={palette.ink2} />}
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontFamily: fonts.num, fontSize: 10, color: palette.ink3, letterSpacing: 0.6 }}>
              STEP {step} OF 3
            </Text>
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14, fontWeight: "500", color: palette.ink1, marginTop: 1 }}>
              {isEdit ? "Edit bill" : "Add bill"}
            </Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* Step bar */}
        <View style={{ paddingHorizontal: 16, flexDirection: "row", gap: 5 }}>
          {[1, 2, 3].map((n) => (
            <View
              key={n}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                backgroundColor: n <= step ? palette.brand : palette.tinted,
              }}
            />
          ))}
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
            {step === 1 ? (
              <>
                <Text style={titleStyle(palette)}>Who are you paying?</Text>
                <Text style={subStyle(palette)}>Pick a suggestion or type a custom name. We&apos;ll use this on reminders.</Text>
              </>
            ) : null}
            {step === 2 ? (
              <>
                <Text style={titleStyle(palette)}>Amount and due date</Text>
                <Text style={subStyle(palette)}>You can set this as variable later — useful for utilities.</Text>
              </>
            ) : null}
            {step === 3 ? (
              <>
                <Text style={titleStyle(palette)}>How often?</Text>
                <Text style={subStyle(palette)}>
                  Recurring bills go on autopilot — we&apos;ll create the next one as soon as this one&apos;s paid.
                </Text>
              </>
            ) : null}
          </View>

          <View style={{ paddingTop: 16 }}>
            {step === 1 ? (
              <Step1
                palette={palette}
                mode={mode}
                search={search}
                onSearch={setSearch}
                popular={filteredPopular}
                onPick={pickPopular}
                onCustom={pickCustom}
              />
            ) : null}
            {step === 2 ? (
              <Step2
                palette={palette}
                mode={mode}
                payee={payee}
                onChangePayee={() => setStep(1)}
                amountStr={amountStr}
                onAmount={setAmountStr}
                dueDate={dueDate}
                onDueDate={setDueDate}
                accounts={accounts}
                accountId={accountId}
                onAccount={setAccountId}
              />
            ) : null}
            {step === 3 ? (
              <Step3
                palette={palette}
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
          </View>

          {error ? (
            <Text style={{ color: palette.neg, paddingHorizontal: 16, fontSize: 12, marginTop: 4 }}>{error}</Text>
          ) : null}
        </ScrollView>

        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 8, borderTopWidth: 1, borderTopColor: palette.line }}>
          {step < 3 ? (
            <Pressable
              disabled={step === 1 ? !payee : false}
              onPress={next}
              style={primaryBtnStyle(palette, step === 1 ? !payee : false)}
            >
              <Text style={primaryBtnText(palette)}>Continue</Text>
            </Pressable>
          ) : (
            <Pressable disabled={busy} onPress={submit} style={primaryBtnStyle(palette, busy)}>
              <Text style={primaryBtnText(palette)}>{busy ? "Saving…" : isEdit ? "Save bill" : "Add bill"}</Text>
            </Pressable>
          )}
          <Pressable onPress={onClose} style={secondaryBtnStyle(palette)}>
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14.5, color: palette.ink2 }}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Step1({
  palette,
  mode,
  search,
  onSearch,
  popular,
  onPick,
  onCustom,
}: {
  palette: Palette;
  mode: "light" | "dark";
  search: string;
  onSearch: (v: string) => void;
  popular: typeof POPULAR_PAYEES;
  onPick: (p: typeof POPULAR_PAYEES[number]) => void;
  onCustom: (name: string) => void;
}) {
  return (
    <>
      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 14,
            height: 48,
            borderRadius: 12,
            backgroundColor: palette.surface,
            borderWidth: 1,
            borderColor: palette.lineFirm,
          }}
        >
          <SearchIcon color={palette.ink3} />
          <TextInput
            value={search}
            onChangeText={onSearch}
            placeholder="Payee name or custom…"
            placeholderTextColor={palette.ink3}
            returnKeyType="done"
            onSubmitEditing={() => search.trim() && onCustom(search)}
            style={{ flex: 1, fontFamily: fonts.ui, fontSize: 14, color: palette.ink1 }}
          />
          {search.trim() ? (
            <Pressable onPress={() => onCustom(search)}>
              <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: palette.brand }}>Use “{search.trim()}”</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <Text
        style={{
          paddingHorizontal: 24,
          paddingBottom: 6,
          fontFamily: fonts.uiMedium,
          fontSize: 11,
          fontWeight: "600",
          color: palette.ink2,
          textTransform: "uppercase",
          letterSpacing: 0.6,
        }}
      >
        Popular
      </Text>
      <View style={{ paddingHorizontal: 16, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {popular.map((p) => (
          <Pressable
            key={p.name}
            onPress={() => onPick(p)}
            style={{
              width: "48%",
              backgroundColor: palette.surface,
              borderWidth: 1,
              borderColor: palette.line,
              borderRadius: 12,
              padding: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <BillIcon hue={p.branding.hue} glyph={p.branding.glyph} mode={mode} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: palette.ink1 }}>
                {p.name}
              </Text>
              <Text style={{ fontFamily: fonts.ui, fontSize: 10.5, color: palette.ink3, marginTop: 1 }}>
                {p.category}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </>
  );
}

function Step2({
  palette,
  mode,
  payee,
  onChangePayee,
  amountStr,
  onAmount,
  dueDate,
  onDueDate,
  accounts,
  accountId,
  onAccount,
}: {
  palette: Palette;
  mode: "light" | "dark";
  payee: DraftPayee | null;
  onChangePayee: () => void;
  amountStr: string;
  onAmount: (v: string) => void;
  dueDate: string;
  onDueDate: (v: string) => void;
  accounts: AccountLite[];
  accountId: string | null;
  onAccount: (id: string) => void;
}) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
      {payee ? (
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: palette.surface,
            borderWidth: 1,
            borderColor: palette.line,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <BillIcon hue={payee.hue} glyph={payee.glyph} mode={mode} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: palette.ink1 }}>{payee.name}</Text>
            <Text style={{ fontFamily: fonts.ui, fontSize: 11, color: palette.ink3 }}>{payee.category ?? "Custom"}</Text>
          </View>
          <Pressable onPress={onChangePayee}>
            <Text style={{ fontFamily: fonts.ui, fontSize: 11.5, color: palette.brand }}>Change</Text>
          </Pressable>
        </View>
      ) : null}

      <Label palette={palette}>Amount</Label>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 14,
          height: 56,
          borderRadius: 12,
          backgroundColor: palette.surface,
          borderWidth: 1.5,
          borderColor: palette.brand,
          marginBottom: 16,
        }}
      >
        <Text style={{ fontFamily: fonts.num, fontSize: 22, color: palette.ink3 }}>$</Text>
        <TextInput
          value={amountStr}
          onChangeText={onAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={palette.ink3}
          style={{
            flex: 1,
            fontFamily: fonts.numMedium,
            fontSize: 22,
            fontWeight: "600",
            color: palette.ink1,
            paddingLeft: 6,
          }}
        />
      </View>

      <Label palette={palette}>Due date (YYYY-MM-DD)</Label>
      <TextInput
        value={dueDate}
        onChangeText={onDueDate}
        placeholder="2026-05-04"
        placeholderTextColor={palette.ink3}
        autoCapitalize="none"
        style={{
          paddingHorizontal: 14,
          height: 50,
          borderRadius: 12,
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: palette.lineFirm,
          fontFamily: fonts.ui,
          fontSize: 14,
          color: palette.ink1,
          marginBottom: 16,
        }}
      />

      <Label palette={palette}>Pay from</Label>
      {accounts.length === 0 ? (
        <View
          style={{
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: palette.surface,
            borderWidth: 1,
            borderColor: palette.lineFirm,
            borderStyle: "dashed",
          }}
        >
          <Text style={{ color: palette.ink3, fontSize: 12.5, fontFamily: fonts.ui }}>
            No accounts in this space yet — link one from Accounts.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 6, paddingBottom: 8 }}>
          {accounts.map((a) => {
            const active = accountId === a.id;
            return (
              <Pressable
                key={a.id}
                onPress={() => onAccount(a.id)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: active ? palette.brandTint : palette.surface,
                  borderWidth: active ? 1.5 : 1,
                  borderColor: active ? palette.brand : palette.lineFirm,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: palette.tinted,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CardIcon color={palette.ink2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13.5, fontWeight: "500", color: palette.ink1 }}>
                    {a.display_name ?? a.name}
                  </Text>
                  <Text style={{ fontFamily: fonts.ui, fontSize: 11, color: palette.ink3 }}>
                    {a.mask ? `··${a.mask} · ` : ""}
                    {a.current_balance != null ? (
                      <Num style={{ fontSize: 11, color: palette.ink3 }}>${(a.current_balance / 100).toFixed(2)}</Num>
                    ) : null}
                  </Text>
                </View>
                {active ? (
                  <View style={{ width: 22, height: 22, borderRadius: 999, backgroundColor: palette.brand, alignItems: "center", justifyContent: "center" }}>
                    <Svg width={12} height={12} viewBox="0 0 24 24"><Path d="M5 12l4 4 10-10" fill="none" stroke={palette.brandOn} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /></Svg>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function Step3({
  palette,
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
  palette: Palette;
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
    { id: "custom", label: "Custom", sub: "Treat as monthly" },
  ];
  return (
    <>
      <View style={{ paddingHorizontal: 16, gap: 8 }}>
        {opts.map((o) => {
          const sel = o.id === cadence;
          return (
            <Pressable
              key={o.id}
              onPress={() => onCadence(o.id)}
              style={{
                padding: 14,
                borderRadius: 12,
                backgroundColor: sel ? palette.brandTint : palette.surface,
                borderWidth: sel ? 1.5 : 1,
                borderColor: sel ? palette.brand : palette.line,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14, fontWeight: "500", color: palette.ink1 }}>
                  {o.label}
                </Text>
                <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: palette.ink3, marginTop: 2 }}>{o.sub}</Text>
              </View>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  borderWidth: 2,
                  borderColor: sel ? palette.brand : palette.lineFirm,
                  backgroundColor: sel ? palette.brand : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {sel ? <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: palette.surface }} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 24 }}>
        <View
          style={{
            backgroundColor: palette.surface,
            borderWidth: 1,
            borderColor: palette.line,
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <SwitchRow
            palette={palette}
            icon={<BoltIcon color={palette.brand} />}
            title="Autopay this bill"
            subtitle={`Pay automatically from ${accountText} on the due date.`}
            on={autopay}
            onToggle={onAutopay}
          />
          <SwitchRow
            palette={palette}
            icon={<BellIcon color={palette.ink2} />}
            title="Remind me 1 day before"
            subtitle="Push notification at 9:00 AM"
            on={reminderBefore}
            onToggle={onReminderBefore}
          />
          <SwitchRow
            palette={palette}
            icon={<BellIcon color={palette.ink2} />}
            title="Remind me on due date"
            subtitle="Push notification at 9:00 AM"
            on={reminderOnDue}
            onToggle={onReminderOnDue}
            last
          />
        </View>
      </View>
    </>
  );
}

function Label({ children, palette }: { children: React.ReactNode; palette: Palette }) {
  return (
    <Text
      style={{
        fontFamily: fonts.uiMedium,
        fontSize: 11,
        fontWeight: "600",
        color: palette.ink2,
        textTransform: "uppercase",
        letterSpacing: 0.6,
        marginBottom: 8,
      }}
    >
      {children}
    </Text>
  );
}

function titleStyle(palette: Palette) {
  return {
    fontFamily: fonts.uiMedium,
    fontSize: 22,
    fontWeight: "500" as const,
    letterSpacing: -0.4,
    color: palette.ink1,
    lineHeight: 26,
  };
}

function subStyle(palette: Palette) {
  return {
    fontFamily: fonts.ui,
    fontSize: 13.5,
    color: palette.ink2,
    lineHeight: 21,
    marginTop: 8,
  };
}

function primaryBtnStyle(palette: Palette, disabled?: boolean) {
  return {
    height: 50,
    borderRadius: 12,
    backgroundColor: palette.brand,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    opacity: disabled ? 0.6 : 1,
  };
}

function primaryBtnText(palette: Palette) {
  return { fontFamily: fonts.uiMedium, fontSize: 14.5, fontWeight: "500" as const, color: palette.brandOn };
}

function secondaryBtnStyle(palette: Palette) {
  return {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.lineFirm,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };
}

function CloseIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6L6 18" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" /></Svg>
  );
}
function BackIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M15 6l-6 6 6 6" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>
  );
}
function SearchIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24">
      <Path d="M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-4.3-4.3" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function CardIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Rect x={3} y={6} width={18} height={13} rx={2} fill="none" stroke={color} strokeWidth={1.6} />
      <Path d="M3 11h18" fill="none" stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}
function BoltIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill={color} /></Svg>
  );
}
function BellIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M6 8a6 6 0 1112 0v5l2 3H4l2-3V8z M10 19a2 2 0 004 0" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></Svg>
  );
}
