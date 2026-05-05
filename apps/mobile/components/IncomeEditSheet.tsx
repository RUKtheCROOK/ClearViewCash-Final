import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import {
  deleteIncomeEvent,
  markIncomeReceived,
  upsertIncomeEvent,
} from "@cvc/api-client";
import { incomeLabelForType, INCOME_SOURCE_TYPES } from "@cvc/domain";
import type { Cadence, EditableIncome, IncomeSourceType } from "@cvc/types";
import { fonts, type Palette, type ThemeMode } from "@cvc/ui";
import { useTheme } from "../lib/theme";
import { supabase } from "../lib/supabase";
import { IncomeIcon } from "./income/IncomeIcon";
import { Num, fmtMoneyShort } from "./income/Num";

export type { EditableIncome };

interface Props {
  visible: boolean;
  income: EditableIncome | null;
  spaceId: string | null;
  ownerUserId: string | null;
  categorySuggestions?: string[];
  onClose: () => void;
  onSaved: () => void;
}

const CADENCES: Cadence[] = ["weekly", "biweekly", "monthly", "yearly", "once"];

function dollarsToCents(s: string): number {
  if (!s.trim()) return 0;
  const n = Number(s);
  if (!Number.isFinite(n)) return Number.NaN;
  return Math.round(n * 100);
}

function centsToDollarStr(c: number): string {
  return (c / 100).toFixed(2);
}

function dayOfMonth(iso: string): number {
  const m = iso.match(/^\d{4}-\d{2}-(\d{2})$/);
  if (!m) return 1;
  const day = Number(m[1]);
  return Number.isFinite(day) && day >= 1 && day <= 31 ? day : 1;
}

function isValidIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function IncomeEditSheet({
  visible,
  income,
  spaceId,
  ownerUserId,
  categorySuggestions,
  onClose,
  onSaved,
}: Props) {
  const { palette, mode } = useTheme();
  const isNew = !income;
  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState<IncomeSourceType>("paycheck");
  const [amountStr, setAmountStr] = useState("");
  const [lowStr, setLowStr] = useState("");
  const [highStr, setHighStr] = useState("");
  const [variable, setVariable] = useState(false);
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const [nextDueAt, setNextDueAt] = useState("");
  const [actualStr, setActualStr] = useState("");
  const [receivedAt, setReceivedAt] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [marking, setMarking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (income) {
      setName(income.name);
      setSourceType(income.source_type);
      setAmountStr(centsToDollarStr(income.amount));
      const isVar = income.amount_low != null && income.amount_high != null;
      setVariable(isVar);
      setLowStr(income.amount_low != null ? centsToDollarStr(income.amount_low) : "");
      setHighStr(income.amount_high != null ? centsToDollarStr(income.amount_high) : "");
      setCadence(income.cadence);
      setNextDueAt(income.next_due_at);
      setActualStr(centsToDollarStr(income.actual_amount ?? income.amount));
      setReceivedAt(income.received_at ?? todayIso());
      setCategory(income.category ?? "");
    } else {
      setName("");
      setSourceType("paycheck");
      setAmountStr("");
      setLowStr("");
      setHighStr("");
      setVariable(false);
      setCadence("monthly");
      setNextDueAt("");
      setActualStr("");
      setReceivedAt(todayIso());
      setCategory("");
    }
  }, [visible, income]);

  const isOnceReceived = !!income && income.cadence === "once" && income.received_at !== null;
  const variance = income && income.actual_amount !== null ? income.actual_amount - income.amount : null;

  const previewAmount = useMemo(() => {
    if (variable) {
      const lo = dollarsToCents(lowStr);
      const hi = dollarsToCents(highStr);
      if (Number.isFinite(lo) && lo > 0 && Number.isFinite(hi) && hi > 0) {
        return `${fmtMoneyShort(lo)}–${fmtMoneyShort(hi)}`;
      }
      return null;
    }
    const c = dollarsToCents(amountStr);
    return Number.isFinite(c) && c > 0 ? fmtMoneyShort(c) : null;
  }, [variable, amountStr, lowStr, highStr]);

  async function save() {
    if (!spaceId || !ownerUserId) {
      setError("Switch to a space first.");
      return;
    }
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    let amountCents: number;
    let lowCents: number | null = null;
    let highCents: number | null = null;
    if (variable) {
      lowCents = dollarsToCents(lowStr);
      highCents = dollarsToCents(highStr);
      if (!Number.isFinite(lowCents) || lowCents <= 0 || !Number.isFinite(highCents) || highCents <= 0) {
        setError("Enter a valid range.");
        return;
      }
      if (lowCents > highCents) {
        setError("Low must be ≤ high.");
        return;
      }
      amountCents = Math.round((lowCents + highCents) / 2);
    } else {
      amountCents = dollarsToCents(amountStr);
      if (!Number.isFinite(amountCents) || amountCents <= 0) {
        setError("Enter a valid amount.");
        return;
      }
    }
    if (!isValidIsoDate(nextDueAt)) {
      setError("Date must be YYYY-MM-DD.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await upsertIncomeEvent(supabase, {
        ...(income ? { id: income.id } : {}),
        space_id: spaceId,
        owner_user_id: ownerUserId,
        name: name.trim(),
        amount: amountCents,
        amount_low: lowCents,
        amount_high: highCents,
        source_type: sourceType,
        cadence,
        next_due_at: nextDueAt,
        autopay: false,
        due_day: dayOfMonth(nextDueAt),
        source: income?.source ?? "manual",
        category: category.trim() || null,
        linked_account_id: income?.linked_account_id ?? null,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "Could not save income.");
    } finally {
      setSaving(false);
    }
  }

  async function markReceived() {
    if (!income) return;
    const cents = dollarsToCents(actualStr);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Enter a valid received amount.");
      return;
    }
    if (!isValidIsoDate(receivedAt)) {
      setError("Received date must be YYYY-MM-DD.");
      return;
    }
    setMarking(true);
    setError(null);
    try {
      await markIncomeReceived(supabase, {
        id: income.id,
        actual_amount: cents,
        received_at: receivedAt,
        cadence: income.cadence,
        current_next_due_at: income.next_due_at,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "Could not mark received.");
    } finally {
      setMarking(false);
    }
  }

  async function remove() {
    if (!income) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteIncomeEvent(supabase, income.id);
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "Could not delete income.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: palette.canvas,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 24,
            maxHeight: "92%",
          }}
        >
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={{ gap: 14 }}>
              <Text style={{ fontFamily: fonts.uiMedium, fontSize: 18, fontWeight: "500", color: palette.ink1 }}>
                {isNew ? "Add income" : "Edit income"}
              </Text>

              {/* Source type */}
              <Field label="Source type" palette={palette}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {INCOME_SOURCE_TYPES.map((t) => {
                    const selected = sourceType === t;
                    return (
                      <Pressable
                        key={t}
                        onPress={() => setSourceType(t)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: selected ? palette.pos : palette.line,
                          backgroundColor: selected ? palette.posTint : palette.surface,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <IncomeIcon sourceType={t} mode={mode} size={20} radius={6} />
                        <Text
                          style={{
                            fontFamily: fonts.uiMedium,
                            fontSize: 12,
                            fontWeight: selected ? "600" : "500",
                            color: selected ? palette.pos : palette.ink2,
                          }}
                        >
                          {incomeLabelForType(t)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Field>

              <Field label="Source name" palette={palette}>
                <Input
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Acme Payroll"
                  palette={palette}
                />
              </Field>

              {/* Amount mode toggle */}
              <View style={{ flexDirection: "row", padding: 3, borderRadius: 999, backgroundColor: palette.tinted, alignSelf: "flex-start" }}>
                {([false, true] as const).map((v) => {
                  const active = variable === v;
                  return (
                    <Pressable
                      key={String(v)}
                      onPress={() => setVariable(v)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 999,
                        backgroundColor: active ? palette.surface : "transparent",
                      }}
                    >
                      <Text style={{ fontFamily: fonts.uiMedium, fontSize: 12, fontWeight: "500", color: active ? palette.ink1 : palette.ink2 }}>
                        {v ? "Range" : "Fixed"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {variable ? (
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Field label="Low" palette={palette} style={{ flex: 1 }}>
                    <Input value={lowStr} onChangeText={setLowStr} placeholder="0" keyboardType="decimal-pad" palette={palette} />
                  </Field>
                  <Field label="High" palette={palette} style={{ flex: 1 }}>
                    <Input value={highStr} onChangeText={setHighStr} placeholder="0" keyboardType="decimal-pad" palette={palette} />
                  </Field>
                </View>
              ) : (
                <Field label="Expected amount (USD)" palette={palette}>
                  <Input value={amountStr} onChangeText={setAmountStr} placeholder="0.00" keyboardType="decimal-pad" palette={palette} />
                </Field>
              )}

              {previewAmount ? (
                <Text style={{ fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink3 }}>
                  Forecast point: <Num style={{ color: palette.ink2 }}>{previewAmount}</Num>
                </Text>
              ) : null}

              <Field label={cadence === "once" ? "Date received expected" : "Next expected date"} palette={palette}>
                <Input
                  value={nextDueAt}
                  onChangeText={setNextDueAt}
                  placeholder="YYYY-MM-DD"
                  autoCapitalize="none"
                  autoCorrect={false}
                  palette={palette}
                />
              </Field>

              <Field label="Cadence" palette={palette}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {CADENCES.map((c) => {
                    const selected = cadence === c;
                    return (
                      <Pressable
                        key={c}
                        onPress={() => setCadence(c)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: selected ? palette.brand : palette.line,
                          backgroundColor: selected ? palette.brand : palette.surface,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: fonts.uiMedium,
                            color: selected ? palette.brandOn : palette.ink2,
                            fontSize: 12,
                            fontWeight: selected ? "600" : "500",
                          }}
                        >
                          {c === "once" ? "one-time" : c}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Field>

              <Field label="Category" palette={palette}>
                <Input value={category} onChangeText={setCategory} placeholder="e.g. Salary" palette={palette} />
                {categorySuggestions && categorySuggestions.length > 0 ? (
                  <View style={{ marginTop: 6, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {categorySuggestions.slice(0, 8).map((c) => {
                      const selected = category === c;
                      return (
                        <Pressable
                          key={c}
                          onPress={() => setCategory(c)}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: selected ? palette.brand : palette.line,
                            backgroundColor: selected ? palette.brandTint : palette.surface,
                          }}
                        >
                          <Text style={{ fontFamily: fonts.ui, fontSize: 11.5, color: selected ? palette.brand : palette.ink2 }}>{c}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </Field>

              {/* Mark received (edit mode only) */}
              {!isNew ? (
                <View style={{ gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: palette.line }}>
                  <Text style={{ fontFamily: fonts.uiMedium, fontSize: 11, fontWeight: "600", color: palette.ink2, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {isOnceReceived ? "Received" : "Mark received"}
                  </Text>
                  {isOnceReceived ? (
                    <View
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                        borderRadius: 12,
                        backgroundColor: palette.surface,
                        borderWidth: 1,
                        borderColor: palette.line,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <View>
                        <Text style={{ fontFamily: fonts.ui, fontSize: 13, color: palette.ink1 }}>{income!.received_at}</Text>
                        {variance !== null && variance !== 0 ? (
                          <Text style={{ fontFamily: fonts.ui, fontSize: 11, color: palette.ink3 }}>
                            {variance > 0 ? "+" : ""}
                            {centsToDollarStr(variance)} vs expected
                          </Text>
                        ) : null}
                      </View>
                      <Num style={{ color: palette.pos, fontWeight: "600" }}>${centsToDollarStr(income!.actual_amount ?? 0)}</Num>
                    </View>
                  ) : (
                    <>
                      <Field label="Actual amount (USD)" palette={palette}>
                        <Input value={actualStr} onChangeText={setActualStr} placeholder="0.00" keyboardType="decimal-pad" palette={palette} />
                      </Field>
                      <Field label="Received on" palette={palette}>
                        <Input value={receivedAt} onChangeText={setReceivedAt} placeholder="YYYY-MM-DD" autoCapitalize="none" autoCorrect={false} palette={palette} />
                      </Field>
                      <Pressable
                        onPress={markReceived}
                        disabled={marking}
                        style={({ pressed }) => ({
                          height: 44,
                          borderRadius: 12,
                          backgroundColor: marking ? palette.lineFirm : palette.pos,
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: pressed ? 0.9 : 1,
                        })}
                      >
                        <Text style={{ fontFamily: fonts.uiMedium, color: "#fff", fontWeight: "600" }}>
                          {marking ? "Saving…" : "Mark received"}
                        </Text>
                      </Pressable>
                    </>
                  )}
                </View>
              ) : null}

              {error ? <Text style={{ fontFamily: fonts.ui, color: palette.neg, fontSize: 12 }}>{error}</Text> : null}

              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => ({
                    flex: 1,
                    height: 46,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: palette.line,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Text style={{ fontFamily: fonts.uiMedium, color: palette.ink2 }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={save}
                  disabled={saving}
                  style={({ pressed }) => ({
                    flex: 1,
                    height: 46,
                    borderRadius: 12,
                    backgroundColor: saving ? palette.lineFirm : palette.brand,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <Text style={{ fontFamily: fonts.uiMedium, color: palette.brandOn, fontWeight: "600" }}>
                    {saving ? "Saving…" : isNew ? "Create" : "Save"}
                  </Text>
                </Pressable>
              </View>

              {!isNew ? (
                <Pressable
                  onPress={remove}
                  disabled={deleting}
                  style={({ pressed }) => ({
                    height: 46,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: palette.lineFirm,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 6,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Svg width={14} height={14} viewBox="0 0 24 24">
                    <Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" fill="none" stroke={palette.warn} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                  <Text style={{ fontFamily: fonts.uiMedium, color: palette.warn, fontWeight: "600" }}>
                    {deleting ? "Deleting…" : "Delete income"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Field({
  label,
  children,
  palette,
  style,
}: {
  label: string;
  children: React.ReactNode;
  palette: Palette;
  style?: object;
}) {
  return (
    <View style={style}>
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
        {label}
      </Text>
      {children}
    </View>
  );
}

function Input({
  palette,
  ...rest
}: React.ComponentProps<typeof TextInput> & { palette: Palette }) {
  return (
    <TextInput
      placeholderTextColor={palette.ink4}
      {...rest}
      style={[
        {
          paddingHorizontal: 12,
          height: 44,
          borderRadius: 12,
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: palette.lineFirm,
          fontFamily: fonts.ui,
          fontSize: 14,
          color: palette.ink1,
        },
        rest.style,
      ]}
    />
  );
}
