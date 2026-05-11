import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text as RNText,
  TextInput,
  View,
} from "react-native";
import { I, fonts, type Palette, type ThemeMode } from "@cvc/ui";
import { createTransaction } from "@cvc/api-client";
import { supabase } from "../lib/supabase";
import type { AccountOpt } from "../lib/activity-types";

interface Props {
  visible: boolean;
  palette: Palette;
  mode: ThemeMode;
  accountOpts: AccountOpt[];
  defaultAccountId?: string | null;
  categorySuggestions: string[];
  onClose: () => void;
  onSaved: () => void;
}

type Sign = "expense" | "income";

function todayIso(): string {
  return new Date().toLocaleDateString("en-CA");
}

function parseDateLocal(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const [, y, mo, da] = m;
  const d = new Date(Number(y), Number(mo) - 1, Number(da));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function parseAmountCents(text: string): number | null {
  const trimmed = text.trim().replace(/,/g, "");
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function AddTransactionSheet({
  visible,
  palette,
  mode: _mode,
  accountOpts,
  defaultAccountId,
  categorySuggestions,
  onClose,
  onSaved,
}: Props) {
  const [amountText, setAmountText] = useState("");
  const [sign, setSign] = useState<Sign>("expense");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [postedAt, setPostedAt] = useState(todayIso());
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form whenever the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setAmountText("");
    setSign("expense");
    setAccountId(defaultAccountId ?? accountOpts[0]?.id ?? null);
    setPostedAt(todayIso());
    setMerchant("");
    setCategory("");
    setNote("");
    setSaving(false);
    setError(null);
  }, [visible, defaultAccountId, accountOpts]);

  const amountCents = useMemo(() => parseAmountCents(amountText), [amountText]);
  const dateValid = parseDateLocal(postedAt) !== null;
  const canSubmit =
    !saving && amountCents !== null && amountCents > 0 && accountId !== null && dateValid;

  const filteredSuggestions = useMemo(() => {
    const q = category.trim().toLowerCase();
    if (!q) return categorySuggestions.slice(0, 6);
    return categorySuggestions
      .filter((s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q)
      .slice(0, 6);
  }, [category, categorySuggestions]);

  async function submit() {
    if (!canSubmit || amountCents === null || !accountId) return;
    setSaving(true);
    setError(null);
    try {
      const signedAmount = sign === "expense" ? -amountCents : amountCents;
      const trimmedMerchant = merchant.trim();
      const trimmedCategory = category.trim();
      const trimmedNote = note.trim();
      await createTransaction(supabase, {
        account_id: accountId,
        amount: signedAmount,
        posted_at: postedAt,
        display_name: trimmedMerchant || null,
        category: trimmedCategory || null,
        note: trimmedNote || null,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "Could not add transaction.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <Pressable
          onPress={onClose}
          style={{ flex: 1, backgroundColor: "rgba(20,24,28,0.34)", justifyContent: "flex-end" }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: palette.surface,
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              maxHeight: "92%",
              paddingBottom: 24,
            }}
          >
            <View style={{ alignItems: "center", paddingTop: 8 }}>
              <View
                style={{
                  width: 36,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: palette.lineFirm,
                }}
              />
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingTop: 6,
                paddingBottom: 4,
              }}
            >
              <Pressable
                onPress={onClose}
                hitSlop={8}
                style={{ minWidth: 60 }}
                accessibilityLabel="Cancel"
              >
                <RNText style={{ fontFamily: fonts.uiMedium, fontSize: 14, color: palette.ink2 }}>
                  Cancel
                </RNText>
              </Pressable>
              <RNText style={{ fontFamily: fonts.uiMedium, fontSize: 14, fontWeight: "500", color: palette.ink1 }}>
                Add transaction
              </RNText>
              <Pressable
                onPress={submit}
                disabled={!canSubmit}
                hitSlop={8}
                style={{ minWidth: 60, alignItems: "flex-end" }}
                accessibilityLabel="Save transaction"
              >
                <RNText
                  style={{
                    fontFamily: fonts.uiMedium,
                    fontSize: 14,
                    fontWeight: "600",
                    color: canSubmit ? palette.brand : palette.ink3,
                  }}
                >
                  {saving ? "Saving…" : "Add"}
                </RNText>
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 12 }}>
              {/* Amount hero */}
              <View
                style={{
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingTop: 18,
                  paddingBottom: 8,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                  <RNText
                    style={{
                      fontFamily: fonts.numMedium,
                      fontSize: 32,
                      fontWeight: "500",
                      color: amountCents === null ? palette.ink3 : palette.ink2,
                      marginRight: 2,
                    }}
                  >
                    {sign === "expense" ? "−$" : "+$"}
                  </RNText>
                  <TextInput
                    value={amountText}
                    onChangeText={setAmountText}
                    placeholder="0.00"
                    placeholderTextColor={palette.ink3}
                    keyboardType="decimal-pad"
                    autoFocus
                    style={{
                      fontFamily: fonts.numMedium,
                      fontSize: 42,
                      fontWeight: "500",
                      color: palette.ink1,
                      letterSpacing: -1,
                      minWidth: 120,
                      textAlign: "left",
                      padding: 0,
                    }}
                  />
                </View>
              </View>

              {/* Sign toggle */}
              <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
                <View
                  style={{
                    flexDirection: "row",
                    backgroundColor: palette.tinted,
                    borderRadius: 10,
                    padding: 3,
                    gap: 2,
                  }}
                >
                  {(
                    [
                      { k: "expense" as Sign, label: "Expense" },
                      { k: "income" as Sign, label: "Income" },
                    ] satisfies Array<{ k: Sign; label: string }>
                  ).map((opt) => {
                    const active = sign === opt.k;
                    return (
                      <Pressable
                        key={opt.k}
                        onPress={() => setSign(opt.k)}
                        style={{
                          flex: 1,
                          height: 34,
                          borderRadius: 8,
                          backgroundColor: active ? palette.surface : "transparent",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <RNText
                          style={{
                            fontFamily: fonts.uiMedium,
                            fontSize: 13,
                            fontWeight: "500",
                            color: active ? palette.ink1 : palette.ink2,
                          }}
                        >
                          {opt.label}
                        </RNText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Field rows */}
              <View
                style={{
                  marginTop: 18,
                  marginHorizontal: 16,
                  backgroundColor: palette.sunken,
                  borderRadius: 12,
                  paddingVertical: 4,
                }}
              >
                <FieldRow palette={palette} label="Account" first>
                  {accountOpts.length === 0 ? (
                    <RNText style={{ fontFamily: fonts.ui, fontSize: 13, color: palette.ink3 }}>
                      No linked accounts
                    </RNText>
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 6, paddingRight: 4 }}
                    >
                      {accountOpts.map((a) => {
                        const active = accountId === a.id;
                        return (
                          <Pressable
                            key={a.id}
                            onPress={() => setAccountId(a.id)}
                            style={{
                              height: 30,
                              paddingHorizontal: 11,
                              borderRadius: 999,
                              backgroundColor: active ? palette.ink1 : palette.surface,
                              borderWidth: 1,
                              borderColor: active ? palette.ink1 : palette.line,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <RNText
                              style={{
                                fontFamily: fonts.uiMedium,
                                fontSize: 12.5,
                                fontWeight: "500",
                                color: active ? palette.canvas : palette.ink2,
                              }}
                            >
                              {a.name}
                            </RNText>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  )}
                </FieldRow>

                <FieldRow palette={palette} label="Date">
                  <TextInput
                    value={postedAt}
                    onChangeText={setPostedAt}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={palette.ink3}
                    keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
                    style={{
                      fontFamily: fonts.numMedium,
                      fontSize: 13.5,
                      color: dateValid ? palette.ink1 : palette.neg,
                      padding: 0,
                      textAlign: "right",
                      minWidth: 120,
                    }}
                  />
                </FieldRow>

                <FieldRow palette={palette} label="Merchant">
                  <TextInput
                    value={merchant}
                    onChangeText={setMerchant}
                    placeholder="e.g. Whole Foods"
                    placeholderTextColor={palette.ink3}
                    style={{
                      fontFamily: fonts.ui,
                      fontSize: 13.5,
                      color: palette.ink1,
                      padding: 0,
                      textAlign: "right",
                      flex: 1,
                    }}
                  />
                </FieldRow>

                <FieldRow palette={palette} label="Category">
                  <TextInput
                    value={category}
                    onChangeText={setCategory}
                    placeholder="e.g. groceries"
                    placeholderTextColor={palette.ink3}
                    style={{
                      fontFamily: fonts.ui,
                      fontSize: 13.5,
                      color: palette.ink1,
                      padding: 0,
                      textAlign: "right",
                      flex: 1,
                    }}
                  />
                </FieldRow>

                <FieldRow palette={palette} label="Note" last>
                  <TextInput
                    value={note}
                    onChangeText={setNote}
                    placeholder="Optional"
                    placeholderTextColor={palette.ink3}
                    style={{
                      fontFamily: fonts.ui,
                      fontSize: 13.5,
                      color: palette.ink1,
                      padding: 0,
                      textAlign: "right",
                      flex: 1,
                    }}
                  />
                </FieldRow>
              </View>

              {filteredSuggestions.length > 0 ? (
                <View
                  style={{
                    marginTop: 8,
                    marginHorizontal: 16,
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 6,
                  }}
                >
                  {filteredSuggestions.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => setCategory(s)}
                      style={{
                        height: 28,
                        paddingHorizontal: 10,
                        borderRadius: 999,
                        backgroundColor: palette.tinted,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <RNText
                        style={{
                          fontFamily: fonts.uiMedium,
                          fontSize: 11.5,
                          fontWeight: "500",
                          color: palette.ink2,
                        }}
                      >
                        {s}
                      </RNText>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {error ? (
                <View
                  style={{
                    marginTop: 12,
                    marginHorizontal: 16,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    backgroundColor: palette.tinted,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <I.info color={palette.neg} size={14} />
                  <RNText style={{ flex: 1, fontFamily: fonts.ui, fontSize: 12.5, color: palette.neg }}>
                    {error}
                  </RNText>
                </View>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FieldRow({
  palette,
  label,
  children,
  first,
  last,
}: {
  palette: Palette;
  label: string;
  children: React.ReactNode;
  first?: boolean;
  last?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 12,
        paddingVertical: 12,
        gap: 12,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: palette.line,
        marginTop: first ? 0 : 0,
        marginBottom: last ? 0 : 0,
      }}
    >
      <RNText style={{ fontFamily: fonts.ui, fontSize: 13, color: palette.ink3 }}>{label}</RNText>
      <View style={{ flex: 1, alignItems: "flex-end" }}>{children}</View>
    </View>
  );
}
