import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { fonts, type Palette, type ThemeMode } from "@cvc/ui";
import { deleteGoal, upsertGoal } from "@cvc/api-client";
import { requiredMonthlyPayment } from "@cvc/domain";
import { haptics } from "../lib/haptics";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/theme";
import { GoalIcon } from "./goals/GoalIcon";
import { GoalGlyph, resolveBranding, type GoalGlyphKey } from "./goals/goalGlyphs";
import { Num, fmtMoneyShort } from "./goals/Num";

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
  visible: boolean;
  spaceId: string | null;
  goal: EditableGoal | null;
  prefillAccount?: AccountOption | null;
  accounts: ReadonlyArray<AccountOption>;
  shareableSpaces?: ReadonlyArray<{ id: string; name: string }>;
  currentShares?: Set<string>;
  onToggleShare?: (spaceId: string) => void | Promise<void>;
  onClose: () => void;
  onSaved: () => void;
}

interface FieldErrors {
  name?: string;
  target?: string;
  starting?: string;
  apr?: string;
  targetDate?: string;
}

function isoFromOffsetMonths(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  // First day of the resulting month — clean, predictable for the picker hint.
  d.setDate(1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function validateIsoDate(s: string): boolean {
  if (!s.trim()) return true; // optional
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.trim())) return false;
  const d = new Date(s.trim());
  return !Number.isNaN(d.getTime());
}

const DATE_QUICK_PICKS: ReadonlyArray<{ label: string; months: number }> = [
  { label: "3 mo", months: 3 },
  { label: "6 mo", months: 6 },
  { label: "1 yr", months: 12 },
  { label: "2 yr", months: 24 },
];

interface Template {
  key: string;
  label: string;
  glyph: GoalGlyphKey;
  hue: number;
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
  return (target.getFullYear() - from.getFullYear()) * 12 + (target.getMonth() - from.getMonth());
}

export function GoalEditSheet({
  visible,
  spaceId,
  goal,
  prefillAccount,
  accounts,
  shareableSpaces,
  currentShares,
  onToggleShare,
  onClose,
  onSaved,
}: Props) {
  const { palette, mode } = useTheme();
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const isEdit = !!goal;

  // Snapshot of initial form state, used to detect "dirty" before discard.
  const initialRef = useRef<string>("");
  const currentSnapshot = useMemo(
    () =>
      JSON.stringify({
        kind,
        name: name.trim(),
        target: target.trim(),
        starting: starting.trim(),
        targetDate: targetDate.trim(),
        monthlyContribution: monthlyContribution.trim(),
        linkedAccountId,
        apr: apr.trim(),
        termMonths: termMonths.trim(),
      }),
    [kind, name, target, starting, targetDate, monthlyContribution, linkedAccountId, apr, termMonths],
  );
  const isDirty = visible && currentSnapshot !== initialRef.current;

  function attemptClose() {
    if (!isDirty) {
      onClose();
      return;
    }
    Alert.alert(
      "Discard changes?",
      "Your edits won't be saved.",
      [
        { text: "Keep editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: onClose },
      ],
      { cancelable: true },
    );
  }

  function clearFieldError(key: keyof FieldErrors) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validateName() {
    if (!name.trim()) {
      setFieldErrors((p) => ({ ...p, name: "Give the goal a name." }));
      return false;
    }
    clearFieldError("name");
    return true;
  }

  function validateTarget() {
    if (kind === "save") {
      const tc = dollarsToCents(target);
      if (tc <= 0) {
        setFieldErrors((p) => ({ ...p, target: "Target must be greater than $0." }));
        return false;
      }
    }
    clearFieldError("target");
    return true;
  }

  function validateApr() {
    if (kind !== "payoff" || !apr.trim()) {
      clearFieldError("apr");
      return true;
    }
    const n = Number.parseFloat(apr);
    if (!Number.isFinite(n) || n < 0) {
      setFieldErrors((p) => ({ ...p, apr: "APR must be a non-negative number." }));
      return false;
    }
    clearFieldError("apr");
    return true;
  }

  function validateTargetDate() {
    if (!validateIsoDate(targetDate)) {
      setFieldErrors((p) => ({ ...p, targetDate: "Use YYYY-MM-DD." }));
      return false;
    }
    clearFieldError("targetDate");
    return true;
  }

  useEffect(() => {
    if (!visible) return;
    let seed: {
      kind: GoalKind;
      name: string;
      target: string;
      starting: string;
      targetDate: string;
      monthlyContribution: string;
      linkedAccountId: string | null;
      apr: string;
      termMonths: string;
    };
    if (goal) {
      setStep(2);
      seed = {
        kind: goal.kind,
        name: goal.name,
        target: centsToDollarString(goal.target_amount),
        starting: centsToDollarString(goal.starting_amount),
        targetDate: goal.target_date ?? "",
        monthlyContribution: centsToDollarString(goal.monthly_contribution),
        linkedAccountId: goal.linked_account_id,
        apr: aprBpsToString(goal.apr_bps),
        termMonths: goal.term_months != null ? String(goal.term_months) : "",
      };
    } else if (prefillAccount) {
      setStep(2);
      seed = {
        kind: "payoff",
        name: `Pay off ${prefillAccount.name}`,
        target: "0",
        starting: centsToDollarString(Math.abs(prefillAccount.current_balance ?? 0)),
        targetDate: "",
        monthlyContribution: "",
        linkedAccountId: prefillAccount.id,
        apr: "",
        termMonths: "",
      };
    } else {
      setStep(1);
      seed = {
        kind: "save",
        name: "",
        target: "",
        starting: "",
        targetDate: "",
        monthlyContribution: "",
        linkedAccountId: null,
        apr: "",
        termMonths: "",
      };
    }
    setKind(seed.kind);
    setName(seed.name);
    setTarget(seed.target);
    setStarting(seed.starting);
    setTargetDate(seed.targetDate);
    setMonthlyContribution(seed.monthlyContribution);
    setLinkedAccountId(seed.linkedAccountId);
    setApr(seed.apr);
    setTermMonths(seed.termMonths);
    setError(null);
    setFieldErrors({});
    initialRef.current = JSON.stringify({
      kind: seed.kind,
      name: seed.name.trim(),
      target: seed.target.trim(),
      starting: seed.starting.trim(),
      targetDate: seed.targetDate.trim(),
      monthlyContribution: seed.monthlyContribution.trim(),
      linkedAccountId: seed.linkedAccountId,
      apr: seed.apr.trim(),
      termMonths: seed.termMonths.trim(),
    });
  }, [visible, goal, prefillAccount]);

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
    const nameOk = validateName();
    const targetOk = validateTarget();
    const aprOk = validateApr();
    const dateOk = validateTargetDate();
    if (!nameOk || !targetOk || !aprOk || !dateOk) {
      setError(null); // field-level errors carry the message
      return;
    }
    const targetC = dollarsToCents(target);
    let aprBps: number | null = null;
    if (kind === "payoff" && apr.trim()) {
      const aprPct = Number.parseFloat(apr);
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
      await upsertGoal(supabase, {
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
      // Mark snapshot as clean so the post-save close doesn't prompt for discard.
      initialRef.current = currentSnapshot;
      haptics.success();
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
      await deleteGoal(supabase, goal.id);
      initialRef.current = currentSnapshot;
      haptics.warning();
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "Could not delete.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={attemptClose}>
      <Pressable
        onPress={attemptClose}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: palette.canvas,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: "92%",
          }}
        >
          <View style={{ alignItems: "center", paddingTop: 8, paddingBottom: 2 }}>
            <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: palette.lineFirm }} />
          </View>
          {/* Top nav */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: 8,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Pressable
              onPress={() => (step === 1 || isEdit ? attemptClose() : setStep(1))}
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                backgroundColor: palette.tinted,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {step === 1 || isEdit ? <CloseIcon color={palette.ink2} /> : <BackIcon color={palette.ink2} />}
            </Pressable>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontFamily: fonts.ui, fontSize: 11, color: palette.ink3 }}>
                {isEdit ? "Edit goal" : `Step ${step} of 2`}
              </Text>
              <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14, fontWeight: "500", color: palette.ink1 }}>
                {isEdit ? "Goal" : "New goal"}
              </Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          {!isEdit ? (
            <View style={{ flexDirection: "row", paddingHorizontal: 16, gap: 5, marginTop: 4, marginBottom: 14 }}>
              {[1, 2].map((n) => (
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
          ) : null}

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}
            keyboardShouldPersistTaps="handled"
          >
            {step === 1 ? (
              <Step1
                palette={palette}
                mode={mode}
                kind={kind}
                onPickKind={setKind}
                onPickTemplate={chooseTemplate}
              />
            ) : kind === "save" ? (
              <Step2Savings
                palette={palette}
                mode={mode}
                name={name}
                target={target}
                targetDate={targetDate}
                linkedAccountId={linkedAccountId}
                savingsAccounts={savingsAccounts}
                previewMonthly={previewMonthlyCents}
                monthsToTarget={monthsToTarget}
                branding={branding}
                fieldErrors={fieldErrors}
                shareableSpaces={shareableSpaces}
                currentShares={currentShares}
                showShareField={isEdit}
                onName={(v) => {
                  setName(v);
                  if (fieldErrors.name) clearFieldError("name");
                }}
                onTarget={(v) => {
                  setTarget(v);
                  if (fieldErrors.target) clearFieldError("target");
                }}
                onTargetDate={(v) => {
                  setTargetDate(v);
                  if (fieldErrors.targetDate) clearFieldError("targetDate");
                }}
                onLink={setLinkedAccountId}
                onValidateName={validateName}
                onValidateTarget={validateTarget}
                onValidateTargetDate={validateTargetDate}
                onToggleShare={onToggleShare}
              />
            ) : (
              <Step2Debt
                palette={palette}
                mode={mode}
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
                fieldErrors={fieldErrors}
                shareableSpaces={shareableSpaces}
                currentShares={currentShares}
                showShareField={isEdit}
                onName={(v) => {
                  setName(v);
                  if (fieldErrors.name) clearFieldError("name");
                }}
                onTarget={(v) => {
                  setTarget(v);
                  if (fieldErrors.target) clearFieldError("target");
                }}
                onStarting={setStarting}
                onApr={(v) => {
                  setApr(v);
                  if (fieldErrors.apr) clearFieldError("apr");
                }}
                onTargetDate={(v) => {
                  setTargetDate(v);
                  if (fieldErrors.targetDate) clearFieldError("targetDate");
                }}
                onPickAccount={pickDebt}
                onValidateName={validateName}
                onValidateTarget={validateTarget}
                onValidateApr={validateApr}
                onValidateTargetDate={validateTargetDate}
                onToggleShare={onToggleShare}
              />
            )}

            {error ? (
              <Text style={{ marginTop: 14, color: palette.warn, fontFamily: fonts.ui, fontSize: 13 }}>
                {error}
              </Text>
            ) : null}

            <View style={{ marginTop: 18, gap: 8 }}>
              {step === 1 && !isEdit ? (
                <PrimaryButton palette={palette} label="Continue" onPress={() => setStep(2)} />
              ) : (
                <>
                  <PrimaryButton
                    palette={palette}
                    label={saving ? "Saving…" : isEdit ? "Save changes" : "Create goal"}
                    onPress={save}
                    disabled={saving}
                  />
                  {isEdit ? (
                    <Pressable
                      onPress={remove}
                      disabled={deleting}
                      style={({ pressed }) => ({
                        height: 48,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: palette.lineFirm,
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "row",
                        gap: 8,
                        opacity: deleting ? 0.6 : pressed ? 0.85 : 1,
                      })}
                    >
                      <TrashIcon color={palette.warn} />
                      <Text
                        style={{
                          fontFamily: fonts.uiMedium,
                          fontSize: 13.5,
                          fontWeight: "500",
                          color: palette.warn,
                        }}
                      >
                        {deleting ? "Removing…" : "Delete this goal"}
                      </Text>
                    </Pressable>
                  ) : null}
                </>
              )}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface Step1Props {
  palette: Palette;
  mode: ThemeMode;
  kind: GoalKind;
  onPickKind: (k: GoalKind) => void;
  onPickTemplate: (tem: Template) => void;
}

function Step1({ palette, mode, kind, onPickKind, onPickTemplate }: Step1Props) {
  return (
    <View>
      <Text
        style={{
          fontFamily: fonts.uiMedium,
          fontSize: 22,
          fontWeight: "500",
          letterSpacing: -0.4,
          color: palette.ink1,
          lineHeight: 28,
        }}
      >
        What are you working toward?
      </Text>
      <Text style={{ marginTop: 8, fontFamily: fonts.ui, fontSize: 13.5, color: palette.ink2, lineHeight: 20 }}>
        Pick one. You can always change details later.
      </Text>

      <View style={{ marginTop: 16, gap: 10 }}>
        <KindOption
          palette={palette}
          mode={mode}
          selected={kind === "save"}
          onPress={() => onPickKind("save")}
          glyph="spark"
          hue={195}
          title="Save toward something"
          sub="A trip, a thing, a fund — set a target and a date."
        />
        <KindOption
          palette={palette}
          mode={mode}
          selected={kind === "payoff"}
          onPress={() => onPickKind("payoff")}
          glyph="card"
          hue={0}
          title="Pay down a debt"
          sub="Pick a card or loan — we'll calculate the monthly amount."
        />
      </View>

      <Text
        style={{
          marginTop: 24,
          marginBottom: 8,
          fontFamily: fonts.uiMedium,
          fontSize: 13,
          fontWeight: "500",
          color: palette.ink2,
        }}
      >
        Common starts
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {TEMPLATES.map((tem) => (
          <Pressable
            key={tem.key}
            onPress={() => onPickTemplate(tem)}
            style={({ pressed }) => ({
              flexBasis: "31%",
              flexGrow: 1,
              padding: 10,
              borderRadius: 12,
              backgroundColor: palette.surface,
              borderWidth: 1,
              borderColor: palette.line,
              alignItems: "center",
              gap: 6,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <GoalIcon glyph={tem.glyph} hue={tem.hue} mode={mode} size={36} />
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 11, color: palette.ink2, fontWeight: "500" }}>
              {tem.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function KindOption({
  palette,
  mode,
  selected,
  onPress,
  glyph,
  hue,
  title,
  sub,
}: {
  palette: Palette;
  mode: ThemeMode;
  selected: boolean;
  onPress: () => void;
  glyph: GoalGlyphKey;
  hue: number;
  title: string;
  sub: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        padding: 18,
        borderRadius: 16,
        backgroundColor: selected ? palette.brandTint : palette.surface,
        borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? palette.brand : palette.line,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <GoalIcon glyph={glyph} hue={hue} mode={mode} size={48} radius={14} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.uiMedium, fontSize: 15, fontWeight: "500", color: palette.ink1 }}>
          {title}
        </Text>
        <Text style={{ marginTop: 2, fontFamily: fonts.ui, fontSize: 12, color: palette.ink3 }}>{sub}</Text>
      </View>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          borderWidth: 2,
          borderColor: selected ? palette.brand : palette.lineFirm,
          backgroundColor: selected ? palette.brand : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected ? <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: palette.surface }} /> : null}
      </View>
    </Pressable>
  );
}

interface Step2SavingsProps {
  palette: Palette;
  mode: ThemeMode;
  name: string;
  target: string;
  targetDate: string;
  linkedAccountId: string | null;
  savingsAccounts: ReadonlyArray<AccountOption>;
  previewMonthly: number | null;
  monthsToTarget: number | null;
  branding: { glyph: GoalGlyphKey; hue: number };
  fieldErrors: FieldErrors;
  shareableSpaces?: ReadonlyArray<{ id: string; name: string }>;
  currentShares?: Set<string>;
  showShareField: boolean;
  onName: (v: string) => void;
  onTarget: (v: string) => void;
  onTargetDate: (v: string) => void;
  onLink: (id: string | null) => void;
  onValidateName: () => void;
  onValidateTarget: () => void;
  onValidateTargetDate: () => void;
  onToggleShare?: (spaceId: string) => void;
}

function Step2Savings({
  palette,
  mode,
  name,
  target,
  targetDate,
  linkedAccountId,
  savingsAccounts,
  previewMonthly,
  monthsToTarget,
  branding,
  fieldErrors,
  shareableSpaces,
  currentShares,
  showShareField,
  onName,
  onTarget,
  onTargetDate,
  onLink,
  onValidateName,
  onValidateTarget,
  onValidateTargetDate,
  onToggleShare,
}: Step2SavingsProps) {
  const linked = savingsAccounts.find((a) => a.id === linkedAccountId) ?? null;
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <GoalIcon glyph={branding.glyph} hue={branding.hue} mode={mode} size={48} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.uiMedium, fontSize: 20, fontWeight: "500", color: palette.ink1, letterSpacing: -0.3 }}>
            What&apos;s the goal?
          </Text>
          <Text style={{ marginTop: 4, fontFamily: fonts.ui, fontSize: 12.5, color: palette.ink3 }}>
            Name, target, and when you&apos;d like to be there.
          </Text>
        </View>
      </View>

      <View style={{ gap: 14 }}>
        <Field palette={palette} label="Name" error={fieldErrors.name}>
          <TextInput
            value={name}
            onChangeText={onName}
            onBlur={onValidateName}
            placeholder="Custom guitar"
            placeholderTextColor={palette.ink4}
            style={inputStyle(palette)}
          />
        </Field>

        <Field palette={palette} label="Target" error={fieldErrors.target}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              height: 64,
              paddingHorizontal: 16,
              borderRadius: 14,
              backgroundColor: palette.surface,
              borderWidth: 1.5,
              borderColor: palette.brand,
            }}
          >
            <Text style={{ fontFamily: fonts.num, fontSize: 22, color: palette.ink3, fontWeight: "600" }}>$</Text>
            <TextInput
              value={target}
              onChangeText={(v) => onTarget(v.replace(/[^0-9.,]/g, ""))}
              onBlur={onValidateTarget}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={palette.ink4}
              style={{
                flex: 1,
                marginLeft: 8,
                textAlign: "right",
                fontFamily: fonts.numMedium,
                fontSize: 28,
                fontWeight: "600",
                color: palette.ink1,
                letterSpacing: -0.5,
              }}
            />
          </View>
        </Field>

        <Field
          palette={palette}
          label="Target date"
          sub={
            monthsToTarget != null && monthsToTarget > 0
              ? `${monthsToTarget} month${monthsToTarget === 1 ? "" : "s"} from now`
              : "Pick a quick option or type a date."
          }
          error={fieldErrors.targetDate}
        >
          <View style={{ flexDirection: "row", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            {DATE_QUICK_PICKS.map((p) => {
              const iso = isoFromOffsetMonths(p.months);
              const active = targetDate === iso;
              return (
                <Pressable
                  key={p.months}
                  onPress={() => onTargetDate(iso)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 999,
                    backgroundColor: active ? palette.brand : palette.surface,
                    borderWidth: 1,
                    borderColor: active ? palette.brand : palette.line,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.uiMedium,
                      fontSize: 12,
                      fontWeight: "500",
                      color: active ? palette.brandOn : palette.ink2,
                    }}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            value={targetDate}
            onChangeText={onTargetDate}
            onBlur={onValidateTargetDate}
            placeholder="2026-09-01"
            placeholderTextColor={palette.ink4}
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
            style={{ ...inputStyle(palette), height: 52 }}
          />
        </Field>

        {savingsAccounts.length > 0 ? (
          <Field palette={palette} label="Link a savings account" sub="Optional — we'll show progress against the linked balance.">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Chip
                  palette={palette}
                  active={linkedAccountId === null}
                  label="None"
                  onPress={() => onLink(null)}
                />
                {savingsAccounts.map((a) => (
                  <Chip
                    key={a.id}
                    palette={palette}
                    active={linkedAccountId === a.id}
                    label={a.name}
                    onPress={() => onLink(a.id)}
                  />
                ))}
              </View>
            </ScrollView>
            {linked ? (
              <Text style={{ marginTop: 6, fontFamily: fonts.ui, fontSize: 11, color: palette.ink3 }}>
                Currently {fmtMoneyShort(linked.current_balance ?? 0)} in {linked.name}
              </Text>
            ) : null}
          </Field>
        ) : null}

        {previewMonthly != null ? (
          <View
            style={{
              padding: 14,
              borderRadius: 12,
              backgroundColor: palette.brandTint,
            }}
          >
            <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: palette.ink2, lineHeight: 18 }}>
              <Num style={{ color: palette.brand, fontWeight: "600" }}>~{fmtMoneyShort(previewMonthly)}/month</Num>
              {" "}from now until your target date gets you there. We&apos;ll suggest auto-transfers next.
            </Text>
          </View>
        ) : null}

        {showShareField && shareableSpaces && shareableSpaces.length > 0 ? (
          <ShareField
            palette={palette}
            shareableSpaces={shareableSpaces}
            currentShares={currentShares}
            onToggleShare={onToggleShare}
          />
        ) : null}
      </View>
    </View>
  );
}

interface Step2DebtProps {
  palette: Palette;
  mode: ThemeMode;
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
  fieldErrors: FieldErrors;
  shareableSpaces?: ReadonlyArray<{ id: string; name: string }>;
  currentShares?: Set<string>;
  showShareField: boolean;
  onName: (v: string) => void;
  onTarget: (v: string) => void;
  onStarting: (v: string) => void;
  onApr: (v: string) => void;
  onTargetDate: (v: string) => void;
  onPickAccount: (a: AccountOption) => void;
  onValidateName: () => void;
  onValidateTarget: () => void;
  onValidateApr: () => void;
  onValidateTargetDate: () => void;
  onToggleShare?: (spaceId: string) => void;
}

function Step2Debt({
  palette,
  mode,
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
  fieldErrors,
  shareableSpaces,
  currentShares,
  showShareField,
  onName,
  onTarget,
  onStarting,
  onApr,
  onTargetDate,
  onPickAccount,
  onValidateName,
  onValidateTarget,
  onValidateApr,
  onValidateTargetDate,
  onToggleShare,
}: Step2DebtProps) {
  return (
    <View>
      <Text
        style={{
          fontFamily: fonts.uiMedium,
          fontSize: 20,
          fontWeight: "500",
          color: palette.ink1,
          letterSpacing: -0.3,
        }}
      >
        Which debt?
      </Text>
      <Text
        style={{
          marginTop: 4,
          marginBottom: 16,
          fontFamily: fonts.ui,
          fontSize: 12.5,
          color: palette.ink3,
        }}
      >
        Pick the balance you want to clear. We&apos;ll do the math for you.
      </Text>

      {debtAccounts.length > 0 ? (
        <View style={{ gap: 8, marginBottom: 16 }}>
          {debtAccounts.map((a) => {
            const selected = a.id === linkedAccountId;
            return (
              <Pressable
                key={a.id}
                onPress={() => onPickAccount(a)}
                style={({ pressed }) => ({
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor: selected ? palette.brandTint : palette.surface,
                  borderWidth: selected ? 1.5 : 1,
                  borderColor: selected ? palette.brand : palette.line,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  opacity: pressed ? 0.92 : 1,
                })}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: palette.tinted,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <GoalGlyph glyph="card" size={18} color={palette.ink2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14, fontWeight: "500", color: palette.ink1 }}>
                    {a.name}
                  </Text>
                  <Text style={{ fontFamily: fonts.ui, fontSize: 11, color: palette.ink3 }}>
                    {a.type === "credit" ? "Credit card" : "Loan"}
                  </Text>
                </View>
                <Num style={{ fontSize: 13.5, fontWeight: "600", color: palette.ink1 }}>
                  {fmtMoneyShort(Math.abs(a.current_balance ?? 0))}
                </Num>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    borderWidth: 2,
                    borderColor: selected ? palette.brand : palette.lineFirm,
                    backgroundColor: selected ? palette.brand : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {selected ? (
                    <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: palette.surface }} />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={{ gap: 14 }}>
        <Field palette={palette} label="Name" error={fieldErrors.name}>
          <TextInput
            value={name}
            onChangeText={onName}
            onBlur={onValidateName}
            placeholder="Pay off Citi card"
            placeholderTextColor={palette.ink4}
            style={inputStyle(palette)}
          />
        </Field>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field palette={palette} label="Starting balance">
              <TextInput
                value={starting}
                onChangeText={(v) => onStarting(v.replace(/[^0-9.,]/g, ""))}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={palette.ink4}
                style={inputStyle(palette)}
              />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field
              palette={palette}
              label="APR %"
              sub={apr.trim() ? undefined : "Add APR for an accurate payoff projection."}
              error={fieldErrors.apr}
            >
              <TextInput
                value={apr}
                onChangeText={(v) => onApr(v.replace(/[^0-9.]/g, ""))}
                onBlur={onValidateApr}
                keyboardType="decimal-pad"
                placeholder="21.49"
                placeholderTextColor={palette.ink4}
                style={inputStyle(palette)}
              />
            </Field>
          </View>
        </View>
        <Field palette={palette} label="Target balance" sub="Usually 0 — leave as 0 to fully pay off." error={fieldErrors.target}>
          <TextInput
            value={target}
            onChangeText={(v) => onTarget(v.replace(/[^0-9.,]/g, ""))}
            onBlur={onValidateTarget}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={palette.ink4}
            style={inputStyle(palette)}
          />
        </Field>
        <Field
          palette={palette}
          label="Payoff by"
          sub={
            monthsToTarget != null && monthsToTarget > 0
              ? `${monthsToTarget} month${monthsToTarget === 1 ? "" : "s"} from now`
              : "Pick a quick option or type a date."
          }
          error={fieldErrors.targetDate}
        >
          <View style={{ flexDirection: "row", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            {DATE_QUICK_PICKS.map((p) => {
              const iso = isoFromOffsetMonths(p.months);
              const active = targetDate === iso;
              return (
                <Pressable
                  key={p.months}
                  onPress={() => onTargetDate(iso)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 999,
                    backgroundColor: active ? palette.brand : palette.surface,
                    borderWidth: 1,
                    borderColor: active ? palette.brand : palette.line,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.uiMedium,
                      fontSize: 12,
                      fontWeight: "500",
                      color: active ? palette.brandOn : palette.ink2,
                    }}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            value={targetDate}
            onChangeText={onTargetDate}
            onBlur={onValidateTargetDate}
            placeholder="2026-03-01"
            placeholderTextColor={palette.ink4}
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
            style={{ ...inputStyle(palette), height: 52 }}
          />
        </Field>

        {previewMonthly != null ? (
          <View
            style={{
              padding: 18,
              borderRadius: 16,
              backgroundColor: palette.brandTint,
              borderWidth: 1,
              borderColor: palette.brandTint,
            }}
          >
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 11, color: palette.brand, fontWeight: "600" }}>
              You&apos;ll pay
            </Text>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 6 }}>
              <Num style={{ fontSize: 30, fontWeight: "600", color: palette.ink1, letterSpacing: -0.6 }}>
                {fmtMoneyShort(previewMonthly)}
              </Num>
              <Text style={{ fontFamily: fonts.ui, fontSize: 13, color: palette.ink2 }}>/ month</Text>
            </View>
            {interestSplit ? (
              <Text style={{ marginTop: 4, fontFamily: fonts.ui, fontSize: 12, color: palette.ink2, lineHeight: 18 }}>
                Includes{" "}
                <Num style={{ color: palette.ink1, fontWeight: "500" }}>~{fmtMoneyShort(interestSplit.principal)}/mo principal</Num>
                {" "}+{" "}
                <Num style={{ color: palette.ink1, fontWeight: "500" }}>~{fmtMoneyShort(interestSplit.interest)}/mo interest</Num>
                {apr ? ` at ${apr}% APR.` : ""}
              </Text>
            ) : null}
          </View>
        ) : null}

        {showShareField && shareableSpaces && shareableSpaces.length > 0 ? (
          <ShareField
            palette={palette}
            shareableSpaces={shareableSpaces}
            currentShares={currentShares}
            onToggleShare={onToggleShare}
          />
        ) : null}
      </View>
    </View>
  );
}

function ShareField({
  palette,
  shareableSpaces,
  currentShares,
  onToggleShare,
}: {
  palette: Palette;
  shareableSpaces: ReadonlyArray<{ id: string; name: string }>;
  currentShares?: Set<string>;
  onToggleShare?: (spaceId: string) => void;
}) {
  return (
    <Field
      palette={palette}
      label="Share with"
      sub="Tap a space to share this goal with it. Members can see progress but only you can edit."
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {shareableSpaces.map((s) => {
          const on = currentShares?.has(s.id) ?? false;
          return (
            <Pressable
              key={s.id}
              onPress={() => {
                haptics.selection();
                onToggleShare?.(s.id);
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 999,
                backgroundColor: on ? palette.brand : palette.surface,
                borderWidth: 1,
                borderColor: on ? palette.brand : palette.line,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.uiMedium,
                  fontSize: 12,
                  fontWeight: "500",
                  color: on ? palette.brandOn : palette.ink2,
                }}
              >
                {s.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Field>
  );
}

function Field({
  palette,
  label,
  sub,
  error,
  children,
}: {
  palette: Palette;
  label: string;
  sub?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View>
      <Text
        style={{
          fontFamily: fonts.uiMedium,
          fontSize: 12,
          fontWeight: "500",
          color: palette.ink2,
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
      {children}
      {error ? (
        <Text style={{ marginTop: 6, fontFamily: fonts.ui, fontSize: 11.5, color: palette.warn, lineHeight: 16 }}>
          {error}
        </Text>
      ) : sub ? (
        <Text style={{ marginTop: 6, fontFamily: fonts.ui, fontSize: 11, color: palette.ink3, lineHeight: 16 }}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

function Chip({
  palette,
  active,
  label,
  onPress,
}: {
  palette: Palette;
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: active ? palette.brand : palette.surface,
        borderWidth: 1,
        borderColor: active ? palette.brand : palette.line,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.uiMedium,
          fontSize: 13,
          fontWeight: "600",
          color: active ? palette.brandOn : palette.ink1,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function PrimaryButton({
  palette,
  label,
  onPress,
  disabled,
}: {
  palette: Palette;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        height: 50,
        borderRadius: 12,
        backgroundColor: palette.brand,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.6 : pressed ? 0.9 : 1,
      })}
    >
      <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14.5, fontWeight: "500", color: palette.brandOn }}>
        {label}
      </Text>
    </Pressable>
  );
}

function inputStyle(palette: Palette) {
  return {
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    fontFamily: fonts.ui,
    fontSize: 15,
    color: palette.ink1,
  } as const;
}

function CloseIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path d="M6 6l12 12M18 6L6 18" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function BackIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d="M15 6l-6 6 6 6" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function TrashIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path
        d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
