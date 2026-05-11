import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { fonts, type Palette } from "@cvc/ui";
import { createTransaction } from "@cvc/api-client";
import { haptics } from "../lib/haptics";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/theme";

export type GoalKind = "save" | "payoff";

interface Props {
  visible: boolean;
  goalName: string;
  goalKind: GoalKind;
  linkedAccountId: string;
  linkedAccountName?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function yesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function dollarsToCents(s: string): number {
  const cleaned = s.replace(/,/g, "").trim();
  if (!cleaned) return 0;
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function validateIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.trim())) return false;
  const d = new Date(s.trim());
  return !Number.isNaN(d.getTime());
}

export function AddMoneySheet({
  visible,
  goalName,
  goalKind,
  linkedAccountId,
  linkedAccountName,
  onClose,
  onSaved,
}: Props) {
  const { palette } = useTheme();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [dateIso, setDateIso] = useState(todayIso());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPayoff = goalKind === "payoff";
  const title = isPayoff ? "Log a payment" : "Add money";
  const verb = isPayoff ? "Payment" : "Contribution";
  const cta = isPayoff ? "Log payment" : "Add money";

  useEffect(() => {
    if (!visible) return;
    setAmount("");
    setNote("");
    setDateIso(todayIso());
    setError(null);
  }, [visible]);

  async function save() {
    const cents = dollarsToCents(amount);
    if (cents <= 0) {
      setError("Enter an amount greater than $0.");
      return;
    }
    if (!validateIsoDate(dateIso)) {
      setError("Use YYYY-MM-DD for the date.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Sign convention: positive amount = deposit into savings; negative amount
      // = payment recorded against a credit/loan account (reduces balance).
      const signed = isPayoff ? -cents : cents;
      await createTransaction(supabase, {
        account_id: linkedAccountId,
        amount: signed,
        posted_at: dateIso,
        display_name: `${verb}: ${goalName}`,
        note: note.trim() || null,
      });
      haptics.success();
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "Could not save.");
    } finally {
      setSaving(false);
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
              paddingTop: 10,
              paddingBottom: 8,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Pressable
              onPress={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                backgroundColor: palette.tinted,
                alignItems: "center",
                justifyContent: "center",
              }}
              accessibilityLabel="Close"
            >
              <Svg width={20} height={20} viewBox="0 0 24 24">
                <Path d="M6 6l12 12M18 6L6 18" fill="none" stroke={palette.ink2} strokeWidth={2} strokeLinecap="round" />
              </Svg>
            </Pressable>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontFamily: fonts.ui, fontSize: 11, color: palette.ink3 }}>{goalName}</Text>
              <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14, fontWeight: "500", color: palette.ink1 }}>
                {title}
              </Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28, paddingTop: 8 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ gap: 14 }}>
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
                  Amount
                </Text>
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
                  <Text
                    style={{
                      fontFamily: fonts.num,
                      fontSize: 22,
                      color: palette.ink3,
                      fontWeight: "600",
                    }}
                  >
                    $
                  </Text>
                  <TextInput
                    value={amount}
                    onChangeText={(v) => setAmount(v.replace(/[^0-9.,]/g, ""))}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={palette.ink4}
                    autoFocus
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
                {linkedAccountName ? (
                  <Text style={{ marginTop: 6, fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink3 }}>
                    {isPayoff ? "From " : "Into "}
                    <Text style={{ color: palette.ink2, fontWeight: "500" }}>{linkedAccountName}</Text>
                  </Text>
                ) : null}
              </View>

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
                  Date
                </Text>
                <View style={{ flexDirection: "row", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                  {[
                    { label: "Today", iso: todayIso() },
                    { label: "Yesterday", iso: yesterdayIso() },
                  ].map((p) => {
                    const active = dateIso === p.iso;
                    return (
                      <Pressable
                        key={p.label}
                        onPress={() => {
                          haptics.selection();
                          setDateIso(p.iso);
                        }}
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
                  value={dateIso}
                  onChangeText={setDateIso}
                  placeholder="2026-05-01"
                  placeholderTextColor={palette.ink4}
                  autoCapitalize="none"
                  keyboardType="numbers-and-punctuation"
                  style={{
                    height: 48,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    backgroundColor: palette.surface,
                    borderWidth: 1,
                    borderColor: palette.line,
                    fontFamily: fonts.ui,
                    fontSize: 15,
                    color: palette.ink1,
                  }}
                />
              </View>

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
                  Note <Text style={{ color: palette.ink4, fontWeight: "400" }}>(optional)</Text>
                </Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder={isPayoff ? "e.g. Extra principal" : "e.g. Tax refund"}
                  placeholderTextColor={palette.ink4}
                  style={{
                    height: 48,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    backgroundColor: palette.surface,
                    borderWidth: 1,
                    borderColor: palette.line,
                    fontFamily: fonts.ui,
                    fontSize: 15,
                    color: palette.ink1,
                  }}
                />
              </View>
            </View>

            {error ? (
              <Text
                style={{
                  marginTop: 14,
                  color: palette.warn,
                  fontFamily: fonts.ui,
                  fontSize: 13,
                }}
              >
                {error}
              </Text>
            ) : null}

            <View style={{ marginTop: 18 }}>
              <Pressable
                onPress={save}
                disabled={saving}
                style={({ pressed }) => ({
                  height: 50,
                  borderRadius: 12,
                  backgroundColor: palette.brand,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: saving ? 0.6 : pressed ? 0.9 : 1,
                })}
              >
                <Text
                  style={{
                    fontFamily: fonts.uiMedium,
                    fontSize: 14.5,
                    fontWeight: "500",
                    color: palette.brandOn,
                  }}
                >
                  {saving ? "Saving…" : cta}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
