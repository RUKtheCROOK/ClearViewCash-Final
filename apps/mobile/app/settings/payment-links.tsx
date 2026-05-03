import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Switch, TextInput, View } from "react-native";
import { Button, Card, HStack, Stack, Text, colors, radius, space } from "@cvc/ui";
import {
  createPaymentLink,
  deletePaymentLink,
  replacePaymentLinkCards,
  updatePaymentLink,
} from "@cvc/api-client";
import { supabase } from "../../lib/supabase";

interface AccountRow {
  id: string;
  name: string;
  type: "depository" | "credit" | "loan" | "investment" | "other";
  mask: string | null;
}

interface CardRow {
  card_account_id: string;
  split_pct: number;
}

interface LinkRow {
  id: string;
  funding_account_id: string;
  name: string;
  cross_space: boolean;
  cards: CardRow[];
}

interface DraftLink {
  id?: string;
  funding_account_id: string;
  name: string;
  cross_space: boolean;
  cards: CardRow[];
}

const EMPTY_DRAFT: DraftLink = {
  funding_account_id: "",
  name: "",
  cross_space: false,
  cards: [{ card_account_id: "", split_pct: 100 }],
};

export default function PaymentLinks() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [draft, setDraft] = useState<DraftLink | null>(null);
  const [error, setError] = useState<string>("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    (async () => {
      const [{ data: accs }, { data: rawLinks }, { data: cards }] = await Promise.all([
        supabase.from("accounts").select("id, name, type, mask"),
        supabase.from("payment_links").select("id, funding_account_id, name, cross_space"),
        supabase.from("payment_link_cards").select("*"),
      ]);
      setAccounts((accs ?? []) as AccountRow[]);
      const merged: LinkRow[] = (rawLinks ?? []).map((l: { id: string; funding_account_id: string; name: string; cross_space: boolean }) => ({
        ...l,
        cards: (cards ?? []).filter((c: { payment_link_id: string }) => c.payment_link_id === l.id) as CardRow[],
      }));
      setLinks(merged);
    })();
  }, [reload]);

  const fundingAccounts = useMemo(
    () => accounts.filter((a) => a.type === "depository"),
    [accounts],
  );
  const cardAccounts = useMemo(() => accounts.filter((a) => a.type === "credit"), [accounts]);
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  function startNew() {
    if (fundingAccounts.length === 0 || cardAccounts.length === 0) {
      setError("You need at least one depository and one credit account first.");
      return;
    }
    setError("");
    setDraft({
      ...EMPTY_DRAFT,
      funding_account_id: fundingAccounts[0]!.id,
      name: `${fundingAccounts[0]!.name} pays cards`,
      cards: [{ card_account_id: cardAccounts[0]!.id, split_pct: 100 }],
    });
  }

  function startEdit(link: LinkRow) {
    setError("");
    setDraft({
      id: link.id,
      funding_account_id: link.funding_account_id,
      name: link.name,
      cross_space: link.cross_space,
      cards: link.cards.length > 0 ? link.cards.map((c) => ({ ...c })) : [{ card_account_id: cardAccounts[0]?.id ?? "", split_pct: 100 }],
    });
  }

  async function save() {
    if (!draft) return;
    setError("");
    if (!draft.funding_account_id || !draft.name.trim()) {
      setError("Pick a funding account and give the link a name.");
      return;
    }
    const cards = draft.cards.filter((c) => c.card_account_id);
    if (cards.length === 0) {
      setError("Add at least one card.");
      return;
    }
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
      setDraft(null);
      setReload((r) => r + 1);
    } catch (e) {
      setError((e as Error).message ?? "Save failed.");
    }
  }

  async function destroy(linkId: string) {
    setError("");
    try {
      await deletePaymentLink(supabase, linkId);
      setReload((r) => r + 1);
    } catch (e) {
      setError((e as Error).message ?? "Delete failed.");
    }
  }

  function updateCard(idx: number, patch: Partial<CardRow>) {
    if (!draft) return;
    setDraft({
      ...draft,
      cards: draft.cards.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    });
  }
  function addCardRow() {
    if (!draft) return;
    const used = new Set(draft.cards.map((c) => c.card_account_id));
    const next = cardAccounts.find((a) => !used.has(a.id));
    if (!next) return;
    setDraft({ ...draft, cards: [...draft.cards, { card_account_id: next.id, split_pct: 100 }] });
  }
  function removeCardRow(idx: number) {
    if (!draft) return;
    setDraft({ ...draft, cards: draft.cards.filter((_, i) => i !== idx) });
  }

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, backgroundColor: colors.bg }}>
      <Stack gap="xs">
        <Text variant="h2">Payment Links</Text>
        <Text variant="muted">
          Mark which depository account pays each credit card. Effective Available subtracts linked
          card balances from the funding account in real time.
        </Text>
      </Stack>

      {error ? (
        <Card>
          <Text style={{ color: colors.negative }}>{error}</Text>
        </Card>
      ) : null}

      {links.map((link) => {
        const funding = accountById.get(link.funding_account_id);
        return (
          <Card key={link.id}>
            <Stack gap="sm">
              <HStack justify="space-between" align="center">
                <Stack gap="xs">
                  <Text variant="title">{link.name}</Text>
                  <Text variant="muted">
                    Funded by {funding?.name ?? "—"} {link.cross_space ? "· cross-space" : ""}
                  </Text>
                </Stack>
              </HStack>
              {link.cards.map((c) => {
                const card = accountById.get(c.card_account_id);
                return (
                  <HStack key={c.card_account_id} justify="space-between">
                    <Text>→ {card?.name ?? "(unknown card)"}</Text>
                    <Text variant="muted">{c.split_pct}%</Text>
                  </HStack>
                );
              })}
              <HStack gap="sm">
                <Button label="Edit" variant="secondary" style={{ flex: 1 }} onPress={() => startEdit(link)} />
                <Button label="Delete" variant="destructive" style={{ flex: 1 }} onPress={() => destroy(link.id)} />
              </HStack>
            </Stack>
          </Card>
        );
      })}

      {links.length === 0 ? (
        <Card>
          <Text variant="muted">No payment links yet. Tap "+ New link" to set one up.</Text>
        </Card>
      ) : null}

      {!draft ? <Button label="+ New link" onPress={startNew} /> : null}

      {draft ? (
        <Card>
          <Stack gap="md">
            <Text variant="title">{draft.id ? "Edit link" : "New link"}</Text>

            <Stack gap="sm">
              <Text variant="label">Name</Text>
              <TextInput
                value={draft.name}
                onChangeText={(t) => setDraft({ ...draft, name: t })}
                placeholder="e.g. Chase pays Amex"
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  padding: space.md,
                  backgroundColor: colors.surface,
                }}
              />
            </Stack>

            <Stack gap="sm">
              <Text variant="label">Funding account</Text>
              <Stack gap="xs">
                {fundingAccounts.map((a) => (
                  <Pressable
                    key={a.id}
                    onPress={() => setDraft({ ...draft, funding_account_id: a.id })}
                    style={{
                      padding: space.md,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor:
                        draft.funding_account_id === a.id ? colors.primary : colors.border,
                      backgroundColor:
                        draft.funding_account_id === a.id ? colors.primary : colors.surface,
                    }}
                  >
                    <Text
                      style={{
                        color: draft.funding_account_id === a.id ? "#fff" : colors.text,
                      }}
                    >
                      {a.name} {a.mask ? `· •••${a.mask}` : ""}
                    </Text>
                  </Pressable>
                ))}
              </Stack>
            </Stack>

            <Stack gap="sm">
              <Text variant="label">Cards covered</Text>
              {draft.cards.map((c, idx) => (
                <View
                  key={idx}
                  style={{
                    padding: space.md,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: colors.border,
                    gap: space.sm,
                  }}
                >
                  <Stack gap="xs">
                    {cardAccounts.map((a) => (
                      <Pressable
                        key={a.id}
                        onPress={() => updateCard(idx, { card_account_id: a.id })}
                        style={{
                          padding: space.sm,
                          borderRadius: radius.sm,
                          backgroundColor:
                            c.card_account_id === a.id ? colors.primary : "transparent",
                        }}
                      >
                        <Text
                          style={{
                            color: c.card_account_id === a.id ? "#fff" : colors.text,
                          }}
                        >
                          {a.name} {a.mask ? `· •••${a.mask}` : ""}
                        </Text>
                      </Pressable>
                    ))}
                  </Stack>
                  <HStack justify="space-between" align="center">
                    <Text variant="muted">Split %</Text>
                    <TextInput
                      value={String(c.split_pct)}
                      onChangeText={(t) => {
                        const n = Number(t.replace(/[^\d.]/g, ""));
                        updateCard(idx, { split_pct: Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0 });
                      }}
                      keyboardType="numeric"
                      style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: radius.sm,
                        padding: space.sm,
                        minWidth: 80,
                        textAlign: "right",
                      }}
                    />
                  </HStack>
                  {draft.cards.length > 1 ? (
                    <Button
                      label="Remove card"
                      variant="ghost"
                      onPress={() => removeCardRow(idx)}
                    />
                  ) : null}
                </View>
              ))}
              {draft.cards.length < cardAccounts.length ? (
                <Button label="+ Add another card" variant="secondary" onPress={addCardRow} />
              ) : null}
            </Stack>

            <HStack justify="space-between" align="center">
              <Stack gap="xs" style={{ flex: 1 }}>
                <Text>Cross-space</Text>
                <Text variant="muted" style={{ fontSize: 12 }}>
                  Show this link's effect in spaces where the funding account isn't shared.
                </Text>
              </Stack>
              <Switch
                value={draft.cross_space}
                onValueChange={(v) => setDraft({ ...draft, cross_space: v })}
              />
            </HStack>

            <HStack gap="sm">
              <Button label="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setDraft(null)} />
              <Button label={draft.id ? "Save" : "Create"} style={{ flex: 1 }} onPress={save} />
            </HStack>
          </Stack>
        </Card>
      ) : null}
    </ScrollView>
  );
}
