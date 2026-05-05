import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import {
  defaultCategoryForType,
  incomeLabelForType,
  INCOME_SOURCE_TYPES,
  projectNextDates,
  todayIso,
} from "@cvc/domain";
import { upsertIncomeEvent } from "@cvc/api-client";
import type { Cadence, IncomeSourceType } from "@cvc/types";
import { fonts, type Palette, type ThemeMode } from "@cvc/ui";
import { supabase } from "../lib/supabase";
import { IncomeIcon } from "./income/IncomeIcon";
import { Num, fmtMoneyShort } from "./income/Num";

type Step = 1 | 2 | 3;
type AmountMode = "fixed" | "range";

interface AccountLite {
  id: string;
  name: string;
  display_name: string | null;
  mask: string | null;
}

interface Props {
  visible: boolean;
  spaceId: string | null;
  ownerUserId: string | null;
  accounts: AccountLite[];
  /** Optional: prefill source type when launched from an empty-state quick-start. */
  initialSourceType?: IncomeSourceType;
  onClose: () => void;
  onSaved: () => void;
  palette: Palette;
  mode: ThemeMode;
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
  visible,
  spaceId,
  ownerUserId,
  accounts,
  initialSourceType,
  onClose,
  onSaved,
  palette,
  mode,
}: Props) {
  const [step, setStep] = useState<Step>(1);
  const [sourceType, setSourceType] = useState<IncomeSourceType>("paycheck");
  const [name, setName] = useState("");
  const [amountMode, setAmountMode] = useState<AmountMode>("fixed");
  const [fixedStr, setFixedStr] = useState("");
  const [lowStr, setLowStr] = useState("");
  const [highStr, setHighStr] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);
  const [cadence, setCadence] = useState<Cadence>("biweekly");
  const [nextDueAt, setNextDueAt] = useState(todayIso());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset when reopened.
  useEffect(() => {
    if (!visible) return;
    setStep(1);
    setSourceType(initialSourceType ?? "paycheck");
    setName("");
    setAmountMode("fixed");
    setFixedStr("");
    setLowStr("");
    setHighStr("");
    setAccountId(accounts[0]?.id ?? null);
    setAccountPickerOpen(false);
    setCadence(initialSourceType === "one_time" ? "once" : "biweekly");
    setNextDueAt(todayIso());
    setSaving(false);
    setError(null);
  }, [visible, initialSourceType, accounts]);

  // When source type changes, set sensible default cadence.
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
      // Type chosen. Default the name to the type label if empty.
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
    if (step === 1) onClose();
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
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "Could not save income.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: palette.canvas, paddingTop: 50 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable
            onPress={back}
            style={{ width: 36, height: 36, borderRadius: 999, backgroundColor: palette.tinted, alignItems: "center", justifyContent: "center" }}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24">
              {step === 1 ? (
                <Path d="M6 6l12 12M18 6L6 18" fill="none" stroke={palette.ink2} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <Path d="M15 6l-6 6 6 6" fill="none" stroke={palette.ink2} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              )}
            </Svg>
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontFamily: fonts.num, fontSize: 10, color: palette.ink3, letterSpacing: 1 }}>
              STEP {step} OF 3
            </Text>
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14, fontWeight: "500", color: palette.ink1 }}>
              Add income
            </Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 4, flexDirection: "row", gap: 5 }}>
          {[1, 2, 3].map((n) => (
            <View
              key={n}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                backgroundColor: n <= step ? palette.pos : palette.tinted,
              }}
            />
          ))}
        </View>

        <ScrollView contentContainerStyle={{ paddingTop: 24, paddingBottom: 28 }} keyboardShouldPersistTaps="handled">
          {step === 1 ? (
            <Step1
              sourceType={sourceType}
              name={name}
              onPickType={setSourceType}
              onChangeName={setName}
              palette={palette}
              mode={mode}
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
              accountPickerOpen={accountPickerOpen}
              onChangeMode={setAmountMode}
              onChangeFixed={setFixedStr}
              onChangeLow={setLowStr}
              onChangeHigh={setHighStr}
              onTogglePicker={() => setAccountPickerOpen((o) => !o)}
              onPickAccount={(id) => {
                setAccountId(id);
                setAccountPickerOpen(false);
              }}
              palette={palette}
              mode={mode}
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
              palette={palette}
              mode={mode}
            />
          ) : null}
        </ScrollView>

        {error ? (
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: palette.neg }}>{error}</Text>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: 16, paddingBottom: 28 }}>
          <Pressable
            onPress={next}
            disabled={saving}
            style={({ pressed }) => ({
              height: 50,
              borderRadius: 12,
              backgroundColor: saving ? palette.lineFirm : palette.brand,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14.5, fontWeight: "500", color: palette.brandOn }}>
              {step === 3 ? (saving ? "Saving…" : "Add income") : "Continue"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Step1({
  sourceType,
  name,
  onPickType,
  onChangeName,
  palette,
  mode,
}: {
  sourceType: IncomeSourceType;
  name: string;
  onPickType: (t: IncomeSourceType) => void;
  onChangeName: (n: string) => void;
  palette: Palette;
  mode: ThemeMode;
}) {
  return (
    <View style={{ paddingHorizontal: 24 }}>
      <Text style={{ fontFamily: fonts.uiMedium, fontSize: 22, fontWeight: "500", color: palette.ink1, letterSpacing: -0.4, lineHeight: 26 }}>
        What kind of income?
      </Text>
      <Text style={{ marginTop: 8, fontFamily: fonts.ui, fontSize: 13.5, color: palette.ink2, lineHeight: 20 }}>
        We&apos;ll set sensible defaults — you can fine-tune anything next.
      </Text>

      <View style={{ marginTop: 16, gap: 8 }}>
        {TYPE_OPTIONS.map((o) => {
          const selected = sourceType === o.type;
          return (
            <Pressable
              key={o.type}
              onPress={() => onPickType(o.type)}
              style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: 14,
                backgroundColor: selected ? palette.posTint : palette.surface,
                borderWidth: selected ? 1.5 : 1,
                borderColor: selected ? palette.pos : palette.line,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <IncomeIcon sourceType={o.type} mode={mode} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14, fontWeight: "500", color: palette.ink1 }}>{o.title}</Text>
                <Text style={{ marginTop: 2, fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink3 }}>{o.sub}</Text>
              </View>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  borderWidth: 2,
                  borderColor: selected ? palette.pos : palette.lineFirm,
                  backgroundColor: selected ? palette.pos : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {selected ? <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: palette.surface }} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={{ marginTop: 16 }}>
        <Text
          style={{
            fontFamily: fonts.uiMedium,
            fontSize: 11,
            fontWeight: "600",
            color: palette.ink2,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 6,
          }}
        >
          Source name
        </Text>
        <TextInput
          value={name}
          onChangeText={onChangeName}
          placeholder={`e.g. ${incomeLabelForType(sourceType)}`}
          placeholderTextColor={palette.ink4}
          style={{
            paddingHorizontal: 14,
            height: 48,
            borderRadius: 12,
            backgroundColor: palette.surface,
            borderWidth: 1,
            borderColor: palette.lineFirm,
            fontFamily: fonts.ui,
            fontSize: 14,
            color: palette.ink1,
          }}
        />
      </View>

      <View
        style={{
          marginTop: 16,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: palette.sunken,
        }}
      >
        <Text style={{ fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink3, lineHeight: 18 }}>
          We use this only to label and group sources. Your taxes don&apos;t change either way.
        </Text>
      </View>
    </View>
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
  accountPickerOpen,
  onChangeMode,
  onChangeFixed,
  onChangeLow,
  onChangeHigh,
  onTogglePicker,
  onPickAccount,
  palette,
  mode,
}: {
  amountMode: AmountMode;
  fixedStr: string;
  lowStr: string;
  highStr: string;
  sourceType: IncomeSourceType;
  name: string;
  accounts: AccountLite[];
  selectedAccount: AccountLite | null;
  accountPickerOpen: boolean;
  onChangeMode: (m: AmountMode) => void;
  onChangeFixed: (s: string) => void;
  onChangeLow: (s: string) => void;
  onChangeHigh: (s: string) => void;
  onTogglePicker: () => void;
  onPickAccount: (id: string) => void;
  palette: Palette;
  mode: ThemeMode;
}) {
  return (
    <View style={{ paddingHorizontal: 24 }}>
      <Text style={{ fontFamily: fonts.uiMedium, fontSize: 22, fontWeight: "500", color: palette.ink1, letterSpacing: -0.4, lineHeight: 26 }}>
        How much, on average?
      </Text>
      <Text style={{ marginTop: 8, fontFamily: fonts.ui, fontSize: 13.5, color: palette.ink2, lineHeight: 20 }}>
        If it varies, give a range — we&apos;ll show both in your forecast.
      </Text>

      <View
        style={{
          marginTop: 16,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 12,
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: palette.line,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <IncomeIcon sourceType={sourceType} mode={mode} size={36} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: palette.ink1 }}>
            {name || incomeLabelForType(sourceType)}
          </Text>
          <Text style={{ marginTop: 1, fontFamily: fonts.ui, fontSize: 11, color: palette.ink3 }}>
            {incomeLabelForType(sourceType)}
          </Text>
        </View>
      </View>

      <View
        style={{
          marginTop: 16,
          alignSelf: "flex-start",
          flexDirection: "row",
          padding: 3,
          borderRadius: 999,
          backgroundColor: palette.tinted,
          gap: 2,
        }}
      >
        {(["fixed", "range"] as const).map((m) => {
          const active = amountMode === m;
          return (
            <Pressable
              key={m}
              onPress={() => onChangeMode(m)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 999,
                backgroundColor: active ? palette.surface : "transparent",
              }}
            >
              <Text style={{ fontFamily: fonts.uiMedium, fontSize: 12.5, fontWeight: "500", color: active ? palette.ink1 : palette.ink2 }}>
                {m === "fixed" ? "Fixed amount" : "Range"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {amountMode === "fixed" ? (
        <View style={{ marginTop: 14 }}>
          <Text
            style={{
              fontFamily: fonts.uiMedium,
              fontSize: 11,
              fontWeight: "600",
              color: palette.ink2,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 6,
            }}
          >
            Amount
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              height: 52,
              borderRadius: 12,
              backgroundColor: palette.surface,
              borderWidth: 1.5,
              borderColor: fixedStr ? palette.pos : palette.lineFirm,
            }}
          >
            <Text style={{ fontFamily: fonts.num, fontSize: 18, color: palette.ink3 }}>$</Text>
            <TextInput
              value={fixedStr}
              onChangeText={onChangeFixed}
              placeholder="0"
              placeholderTextColor={palette.ink4}
              keyboardType="decimal-pad"
              style={{
                flex: 1,
                textAlign: "right",
                fontFamily: fonts.num,
                fontSize: 18,
                fontWeight: "600",
                color: palette.ink1,
              }}
            />
          </View>
        </View>
      ) : (
        <View style={{ marginTop: 14, flexDirection: "row", gap: 10 }}>
          {(["low", "high"] as const).map((kind) => {
            const val = kind === "low" ? lowStr : highStr;
            const set = kind === "low" ? onChangeLow : onChangeHigh;
            return (
              <View key={kind} style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: fonts.uiMedium,
                    fontSize: 11,
                    fontWeight: "600",
                    color: palette.ink2,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginBottom: 6,
                  }}
                >
                  {kind === "low" ? "Low (typical)" : "High (typical)"}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 12,
                    height: 52,
                    borderRadius: 12,
                    backgroundColor: palette.surface,
                    borderWidth: 1.5,
                    borderColor: val ? palette.pos : palette.lineFirm,
                  }}
                >
                  <Text style={{ fontFamily: fonts.num, fontSize: 18, color: palette.ink3 }}>$</Text>
                  <TextInput
                    value={val}
                    onChangeText={set}
                    placeholder="0"
                    placeholderTextColor={palette.ink4}
                    keyboardType="decimal-pad"
                    style={{
                      flex: 1,
                      textAlign: "right",
                      fontFamily: fonts.num,
                      fontSize: 18,
                      fontWeight: "600",
                      color: palette.ink1,
                    }}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {amountMode === "range" ? (
        <View
          style={{
            marginTop: 14,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: palette.sunken,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <View
            style={{
              width: 16,
              height: 16,
              borderRadius: 999,
              backgroundColor: palette.posTint,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Svg width={11} height={11} viewBox="0 0 24 24">
              <Path d="M5 12l4 4 10-10" fill="none" stroke={palette.pos} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
          <Text style={{ flex: 1, fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink2, lineHeight: 16 }}>
            We&apos;ll forecast with the average — and surface the range when it matters.
          </Text>
        </View>
      ) : null}

      {accounts.length > 0 ? (
        <View style={{ marginTop: 16 }}>
          <Text
            style={{
              fontFamily: fonts.uiMedium,
              fontSize: 11,
              fontWeight: "600",
              color: palette.ink2,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 6,
            }}
          >
            Lands in
          </Text>
          <Pressable
            onPress={onTogglePicker}
            style={({ pressed }) => ({
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: palette.surface,
              borderWidth: 1,
              borderColor: palette.lineFirm,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: palette.tinted, alignItems: "center", justifyContent: "center" }}>
              <Svg width={14} height={14} viewBox="0 0 24 24">
                <Path d="M3 6h18a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V7a1 1 0 011-1z" fill="none" stroke={palette.ink2} strokeWidth={1.6} />
                <Path d="M2 11h20" fill="none" stroke={palette.ink2} strokeWidth={1.6} />
              </Svg>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13.5, fontWeight: "500", color: palette.ink1 }}>
                {selectedAccount ? (selectedAccount.display_name ?? selectedAccount.name) : "Pick an account"}
              </Text>
              {selectedAccount?.mask ? (
                <Text style={{ marginTop: 1, fontFamily: fonts.ui, fontSize: 11, color: palette.ink3 }}>
                  ··{selectedAccount.mask}
                </Text>
              ) : null}
            </View>
            <Svg width={12} height={12} viewBox="0 0 24 24">
              <Path d="M6 9l6 6 6-6" fill="none" stroke={palette.ink3} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
          {accountPickerOpen ? (
            <View
              style={{
                marginTop: 6,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: palette.line,
                backgroundColor: palette.surface,
                overflow: "hidden",
              }}
            >
              {accounts.map((a, i) => (
                <Pressable
                  key={a.id}
                  onPress={() => onPickAccount(a.id)}
                  android_ripple={{ color: palette.tinted }}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: palette.line,
                  }}
                >
                  <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13.5, fontWeight: "500", color: palette.ink1 }}>
                    {a.display_name ?? a.name}{a.mask ? ` ··${a.mask}` : ""}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Step3({
  cadence,
  nextDueAt,
  previewDates,
  previewAmount,
  onPickCadence,
  onChangeNextDue,
  palette,
  mode,
}: {
  cadence: Cadence;
  nextDueAt: string;
  previewDates: string[];
  previewAmount: string;
  onPickCadence: (c: Cadence) => void;
  onChangeNextDue: (s: string) => void;
  palette: Palette;
  mode: ThemeMode;
}) {
  const heroBg = mode === "dark" ? "#1a2c20" : "#e6f1ea";
  const heroBorder = mode === "dark" ? "#264a35" : "#cfe5d6";
  return (
    <View style={{ paddingHorizontal: 24 }}>
      <Text style={{ fontFamily: fonts.uiMedium, fontSize: 22, fontWeight: "500", color: palette.ink1, letterSpacing: -0.4, lineHeight: 26 }}>
        How often?
      </Text>
      <Text style={{ marginTop: 8, fontFamily: fonts.ui, fontSize: 13.5, color: palette.ink2, lineHeight: 20 }}>
        We&apos;ll show countdowns and roll this into your forecast.
      </Text>

      <View style={{ marginTop: 16, gap: 8 }}>
        {CADENCE_OPTIONS.map((o) => {
          const selected = cadence === o.id;
          return (
            <Pressable
              key={o.id}
              onPress={() => onPickCadence(o.id)}
              style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: selected ? palette.posTint : palette.surface,
                borderWidth: selected ? 1.5 : 1,
                borderColor: selected ? palette.pos : palette.line,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14, fontWeight: "500", color: palette.ink1 }}>{o.title}</Text>
                <Text style={{ marginTop: 2, fontFamily: fonts.ui, fontSize: 12, color: palette.ink3 }}>{o.sub}</Text>
              </View>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  borderWidth: 2,
                  borderColor: selected ? palette.pos : palette.lineFirm,
                  backgroundColor: selected ? palette.pos : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {selected ? <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: palette.surface }} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={{ marginTop: 16 }}>
        <Text
          style={{
            fontFamily: fonts.uiMedium,
            fontSize: 11,
            fontWeight: "600",
            color: palette.ink2,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 6,
          }}
        >
          {cadence === "once" ? "Date received expected" : "First / next expected"}
        </Text>
        <TextInput
          value={nextDueAt}
          onChangeText={onChangeNextDue}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={palette.ink4}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            paddingHorizontal: 14,
            height: 48,
            borderRadius: 12,
            backgroundColor: palette.surface,
            borderWidth: 1,
            borderColor: palette.lineFirm,
            fontFamily: fonts.num,
            fontSize: 14,
            color: palette.ink1,
          }}
        />
      </View>

      {previewDates.length > 0 && cadence !== "custom" ? (
        <View
          style={{
            marginTop: 18,
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderRadius: 14,
            backgroundColor: heroBg,
            borderWidth: 1,
            borderColor: heroBorder,
          }}
        >
          <Text style={{ fontFamily: fonts.num, fontSize: 10, fontWeight: "600", letterSpacing: 1, color: palette.pos }}>
            {cadence === "once" ? "EXPECTED" : "NEXT 3"}
          </Text>
          <View style={{ marginTop: 6, gap: 4 }}>
            {previewDates.map((iso, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontFamily: fonts.ui, fontSize: 13, color: palette.ink1 }}>{formatDate(iso)}</Text>
                <Num style={{ fontFamily: fonts.num, fontWeight: "600", color: palette.ink1 }}>{previewAmount}</Num>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
