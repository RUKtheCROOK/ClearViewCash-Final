import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { fonts } from "@cvc/ui";
import { deletePaymentLink } from "@cvc/api-client";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { Group, PageHeader, Row, SectionLabel } from "../../components/settings/SettingsAtoms";
import { PaymentLinkEditSheet, type AccountOption, type PaymentLinkDraft } from "../../components/settings/PaymentLinkEditSheet";

interface CardRow {
  card_account_id: string;
  split_pct: number;
  payment_link_id: string;
}

interface LinkRow {
  id: string;
  funding_account_id: string;
  name: string;
  cross_space: boolean;
  cards: CardRow[];
}

const EMPTY_DRAFT: PaymentLinkDraft = {
  funding_account_id: "",
  name: "",
  cross_space: false,
  cards: [{ card_account_id: "", split_pct: 100 }],
};

export default function PaymentLinks() {
  const { palette } = useTheme();
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [draft, setDraft] = useState<PaymentLinkDraft | null>(null);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: accs }, { data: rawLinks }, { data: cards }] = await Promise.all([
        supabase.from("accounts").select("id, name, type, mask"),
        supabase.from("payment_links").select("id, funding_account_id, name, cross_space"),
        supabase.from("payment_link_cards").select("*"),
      ]);
      setAccounts((accs ?? []) as AccountOption[]);
      const merged: LinkRow[] = (rawLinks ?? []).map((l: { id: string; funding_account_id: string; name: string; cross_space: boolean }) => ({
        ...l,
        cards: ((cards ?? []) as CardRow[]).filter((c) => c.payment_link_id === l.id),
      }));
      setLinks(merged);
    })();
  }, [reload]);

  const fundingAccounts = useMemo(() => accounts.filter((a) => a.type === "depository"), [accounts]);
  const cardAccounts = useMemo(() => accounts.filter((a) => a.type === "credit"), [accounts]);
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  function startNew() {
    if (fundingAccounts.length === 0 || cardAccounts.length === 0) {
      setError("You need at least one depository and one credit account first.");
      return;
    }
    setError(null);
    setDraft({
      ...EMPTY_DRAFT,
      funding_account_id: fundingAccounts[0]!.id,
      name: `${fundingAccounts[0]!.name} pays cards`,
      cards: [{ card_account_id: cardAccounts[0]!.id, split_pct: 100 }],
    });
  }

  function startEdit(link: LinkRow) {
    setError(null);
    setDraft({
      id: link.id,
      funding_account_id: link.funding_account_id,
      name: link.name,
      cross_space: link.cross_space,
      cards: link.cards.length > 0 ? link.cards.map((c) => ({ card_account_id: c.card_account_id, split_pct: c.split_pct })) : [{ card_account_id: cardAccounts[0]?.id ?? "", split_pct: 100 }],
    });
  }

  async function destroy(linkId: string, name: string) {
    Alert.alert(`Delete "${name}"?`, "Your effective available balance will stop subtracting these card balances.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePaymentLink(supabase, linkId);
            setReload((r) => r + 1);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Delete failed.");
          }
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <PageHeader palette={palette} title="Payment Links" onBack={() => router.back()} />

        <View style={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: 12 }}>
          <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: palette.ink3, lineHeight: 17 }}>
            Mark which depository account pays each credit card. Effective Available subtracts linked card balances from the funding account in real time.
          </Text>
        </View>

        {error ? (
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <View style={{ padding: 12, borderRadius: 12, backgroundColor: palette.negTint }}>
              <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: palette.neg }}>{error}</Text>
            </View>
          </View>
        ) : null}

        <SectionLabel palette={palette}>YOUR LINKS</SectionLabel>
        <Group palette={palette}>
          {links.length === 0 ? (
            <Row palette={palette} title="No payment links yet" sub="Tap the button below to set up your first." right={null} last />
          ) : (
            links.map((link, i) => {
              const funding = accountById.get(link.funding_account_id);
              const totalPct = link.cards.reduce((acc, c) => acc + c.split_pct, 0);
              return (
                <Row
                  key={link.id}
                  palette={palette}
                  title={link.name}
                  sub={`Funded by ${funding?.name ?? "—"}${link.cross_space ? " · cross-space" : ""} · ${link.cards.length} ${link.cards.length === 1 ? "card" : "cards"}`}
                  value={`${totalPct}%`}
                  onPress={() => startEdit(link)}
                  last={i === links.length - 1}
                />
              );
            })
          )}
        </Group>

        <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 8 }}>
          <Pressable
            onPress={startNew}
            style={({ pressed }) => ({
              height: 44,
              borderRadius: 10,
              backgroundColor: palette.brand,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: palette.brandOn }}>+ New payment link</Text>
          </Pressable>
        </View>

        {links.length > 0 ? (
          <>
            <SectionLabel palette={palette}>MANAGE</SectionLabel>
            <Group palette={palette}>
              {links.map((link, i) => (
                <Row
                  key={`del-${link.id}`}
                  palette={palette}
                  title={`Delete "${link.name}"`}
                  danger
                  onPress={() => destroy(link.id, link.name)}
                  last={i === links.length - 1}
                />
              ))}
            </Group>
          </>
        ) : null}
      </ScrollView>

      {draft ? (
        <PaymentLinkEditSheet
          visible
          onClose={() => setDraft(null)}
          onSaved={() => setReload((r) => r + 1)}
          fundingAccounts={fundingAccounts}
          cardAccounts={cardAccounts}
          initialDraft={draft}
          palette={palette}
        />
      ) : null}
    </View>
  );
}
