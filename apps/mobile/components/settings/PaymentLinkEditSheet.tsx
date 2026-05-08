import { useState } from "react";
import { Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { fonts, type Palette } from "@cvc/ui";
import { createPaymentLink, replacePaymentLinkCards, updatePaymentLink } from "@cvc/api-client";
import { supabase } from "../../lib/supabase";

export interface AccountOption {
  id: string;
  name: string;
  type: string;
  mask: string | null;
}

export interface CardSplit {
  card_account_id: string;
  split_pct: number;
}

export interface PaymentLinkDraft {
  id?: string;
  funding_account_id: string;
  name: string;
  cross_space: boolean;
  cards: CardSplit[];
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  fundingAccounts: AccountOption[];
  cardAccounts: AccountOption[];
  initialDraft: PaymentLinkDraft;
  palette: Palette;
}

export function PaymentLinkEditSheet({ visible, onClose, onSaved, fundingAccounts, cardAccounts, initialDraft, palette }: Props) {
  const [draft, setDraft] = useState<PaymentLinkDraft>(initialDraft);
  const [error, setError] = useState<string>("");
  const [saving, setSaving] = useState(false);

  function updateCard(idx: number, patch: Partial<CardSplit>) {
    setDraft({ ...draft, cards: draft.cards.map((c, i) => (i === idx ? { ...c, ...patch } : c)) });
  }

  function addCardRow() {
    const used = new Set(draft.cards.map((c) => c.card_account_id));
    const next = cardAccounts.find((a) => !used.has(a.id));
    if (!next) return;
    setDraft({ ...draft, cards: [...draft.cards, { card_account_id: next.id, split_pct: 100 }] });
  }

  function removeCardRow(idx: number) {
    setDraft({ ...draft, cards: draft.cards.filter((_, i) => i !== idx) });
  }

  async function save() {
    if (!draft.funding_account_id || !draft.name.trim()) {
      setError("Pick a funding account and give the link a name.");
      return;
    }
    const cards = draft.cards.filter((c) => c.card_account_id);
    if (cards.length === 0) {
      setError("Add at least one card.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      if (draft.id) {
        await updatePaymentLink(supabase, {
          id: draft.id,
          name: draft.name,
          funding_account_id: draft.funding_account_id,
          cross_space: draft.cross_space,
        });
        await replacePaymentLinkCards(supabase, { payment_link_id: draft.id, cards });
      } else {
        await createPaymentLink(supabase, {
          funding_account_id: draft.funding_account_id,
          name: draft.name,
          cross_space: draft.cross_space,
          cards,
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: palette.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 20,
            paddingBottom: 32,
            maxHeight: "92%",
          }}
        >
          <ScrollView contentContainerStyle={{ paddingHorizontal: 18, gap: 14 }}>
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 18, fontWeight: "500", color: palette.ink1 }}>
              {draft.id ? "Edit payment link" : "New payment link"}
            </Text>

            {error ? (
              <View style={{ padding: 10, borderRadius: 10, backgroundColor: palette.negTint }}>
                <Text style={{ color: palette.neg, fontSize: 12 }}>{error}</Text>
              </View>
            ) : null}

            <View style={{ gap: 6 }}>
              <Text style={{ fontFamily: fonts.numMedium, fontSize: 10, color: palette.ink3, letterSpacing: 0.8, fontWeight: "600", textTransform: "uppercase" }}>Name</Text>
              <TextInput
                value={draft.name}
                onChangeText={(t) => setDraft({ ...draft, name: t })}
                placeholder="e.g. Chase pays Amex"
                placeholderTextColor={palette.ink4}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: palette.line,
                  backgroundColor: palette.surface,
                  fontFamily: fonts.ui,
                  fontSize: 14,
                  color: palette.ink1,
                }}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ fontFamily: fonts.numMedium, fontSize: 10, color: palette.ink3, letterSpacing: 0.8, fontWeight: "600", textTransform: "uppercase" }}>Funding account</Text>
              <View style={{ gap: 6 }}>
                {fundingAccounts.map((a) => {
                  const sel = draft.funding_account_id === a.id;
                  return (
                    <Pressable
                      key={a.id}
                      onPress={() => setDraft({ ...draft, funding_account_id: a.id })}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: sel ? palette.brand : palette.line,
                        backgroundColor: sel ? palette.brand : palette.surface,
                      }}
                    >
                      <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13.5, fontWeight: "500", color: sel ? palette.brandOn : palette.ink1 }}>
                        {a.name} {a.mask ? `· •••${a.mask}` : ""}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ fontFamily: fonts.numMedium, fontSize: 10, color: palette.ink3, letterSpacing: 0.8, fontWeight: "600", textTransform: "uppercase" }}>Cards covered</Text>
              {draft.cards.map((c, idx) => (
                <View
                  key={idx}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: palette.line,
                    gap: 8,
                  }}
                >
                  <View style={{ gap: 4 }}>
                    {cardAccounts.map((a) => {
                      const sel = c.card_account_id === a.id;
                      return (
                        <Pressable
                          key={a.id}
                          onPress={() => updateCard(idx, { card_account_id: a.id })}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 8,
                            borderRadius: 8,
                            backgroundColor: sel ? palette.brand : "transparent",
                          }}
                        >
                          <Text style={{ fontFamily: fonts.ui, fontSize: 13, color: sel ? palette.brandOn : palette.ink1 }}>
                            {a.name} {a.mask ? `· •••${a.mask}` : ""}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: palette.ink3 }}>Split %</Text>
                    <TextInput
                      value={String(c.split_pct)}
                      onChangeText={(t) => {
                        const n = Number(t.replace(/[^\d.]/g, ""));
                        updateCard(idx, { split_pct: Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0 });
                      }}
                      keyboardType="numeric"
                      style={{
                        borderWidth: 1,
                        borderColor: palette.line,
                        borderRadius: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 6,
                        minWidth: 80,
                        textAlign: "right",
                        fontFamily: fonts.numMedium,
                        fontSize: 13,
                        color: palette.ink1,
                      }}
                    />
                  </View>
                  {draft.cards.length > 1 ? (
                    <Pressable onPress={() => removeCardRow(idx)} style={{ alignSelf: "flex-start" }}>
                      <Text style={{ fontFamily: fonts.uiMedium, fontSize: 12, color: palette.neg }}>Remove card</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
              {draft.cards.length < cardAccounts.length ? (
                <Pressable
                  onPress={addCardRow}
                  style={{ paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: palette.lineFirm, alignItems: "center" }}
                >
                  <Text style={{ fontFamily: fonts.uiMedium, fontSize: 12.5, fontWeight: "500", color: palette.ink2 }}>+ Add another card</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13.5, fontWeight: "500", color: palette.ink1 }}>Cross-space</Text>
                <Text style={{ fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink3, marginTop: 2 }}>
                  Show this link's effect in spaces where the funding account isn't shared.
                </Text>
              </View>
              <Switch value={draft.cross_space} onValueChange={(v) => setDraft({ ...draft, cross_space: v })} />
            </View>

            <View style={{ flexDirection: "row", gap: 8, paddingTop: 8 }}>
              <Pressable onPress={onClose} style={{ flex: 1, height: 44, borderRadius: 10, borderWidth: 1, borderColor: palette.lineFirm, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: palette.ink2 }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={save}
                disabled={saving}
                style={{ flex: 1, height: 44, borderRadius: 10, backgroundColor: palette.brand, alignItems: "center", justifyContent: "center", opacity: saving ? 0.5 : 1 }}
              >
                <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: palette.brandOn }}>{saving ? "Saving…" : draft.id ? "Save" : "Create"}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
