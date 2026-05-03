import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Button, Card, HStack, Money, Stack, Text, colors, radius, space } from "@cvc/ui";
import { effectiveAvailableBalances } from "@cvc/domain";
import { getAccountsForView } from "@cvc/api-client";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../lib/store";

interface AccountRow {
  id: string;
  name: string;
  mask: string | null;
  type: string;
  current_balance: number | null;
}

interface LinkRow {
  id: string;
  funding_account_id: string;
  name: string;
  cross_space: boolean;
}
interface CardRow {
  payment_link_id: string;
  card_account_id: string;
  split_pct: number;
}

export default function Accounts() {
  const activeSpaceId = useApp((s) => s.activeSpaceId);
  const sharedView = useApp((s) => s.sharedView);
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [myAccounts, setMyAccounts] = useState<AccountRow[]>([]);
  const [effective, setEffective] = useState<Record<string, number>>({});
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);

  useEffect(() => {
    (async () => {
      const [accs, allAccsRes, linksRes, cardsRes] = await Promise.all([
        getAccountsForView(supabase, { spaceId: activeSpaceId, sharedView }),
        supabase.from("accounts").select("id, name, mask, type, current_balance"),
        supabase.from("payment_links").select("id, funding_account_id, name, cross_space"),
        supabase.from("payment_link_cards").select("payment_link_id, card_account_id, split_pct"),
      ]);
      const accounts = accs as AccountRow[];
      setRows(accounts);
      setMyAccounts((allAccsRes.data ?? []) as AccountRow[]);
      setLinks((linksRes.data ?? []) as LinkRow[]);
      setCards((cardsRes.data ?? []) as CardRow[]);
      const linkObjs = (linksRes.data ?? []).map(
        (pl: { id: string; funding_account_id: string; name: string; cross_space: boolean }) => ({
          ...pl,
          owner_user_id: "",
          cards: (cardsRes.data ?? []).filter(
            (c: { payment_link_id: string }) => c.payment_link_id === pl.id,
          ),
        }),
      );
      const eff = effectiveAvailableBalances(
        linkObjs as never,
        accounts.map((a) => ({ account_id: a.id, current_balance: a.current_balance ?? 0 })),
      );
      setEffective(Object.fromEntries(eff));
    })();
  }, [activeSpaceId, sharedView]);

  const accountNameById = new Map(rows.map((r) => [r.id, r.name]));
  const myAccountNameById = new Map(myAccounts.map((r) => [r.id, r.name]));

  function badgesFor(account: AccountRow): string[] {
    const out: string[] = [];
    if (account.type === "depository") {
      const myLinks = links.filter((l) => l.funding_account_id === account.id);
      for (const l of myLinks) {
        for (const c of cards.filter((c) => c.payment_link_id === l.id)) {
          const name = accountNameById.get(c.card_account_id) ?? myAccountNameById.get(c.card_account_id);
          if (!name) continue;
          out.push(`Pays → ${name}${l.cross_space ? " · cross-space" : ""}`);
        }
      }
    }
    if (account.type === "credit") {
      const cardLinks = cards.filter((c) => c.card_account_id === account.id);
      for (const cl of cardLinks) {
        const link = links.find((l) => l.id === cl.payment_link_id);
        if (!link) continue;
        const counterpartVisible = accountNameById.has(link.funding_account_id);
        const name =
          accountNameById.get(link.funding_account_id) ??
          (link.cross_space ? myAccountNameById.get(link.funding_account_id) : undefined);
        if (!name) continue;
        const suffix = link.cross_space && !counterpartVisible ? " · cross-space" : "";
        out.push(`Paid by ${name}${suffix}`);
      }
    }
    return out;
  }

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, backgroundColor: colors.bg }}>
      <HStack justify="space-between" align="center">
        <Text variant="h2">Accounts {sharedView ? "· Shared" : "· Mine"}</Text>
        <HStack gap="sm">
          <Button
            label="Links"
            variant="secondary"
            onPress={() => router.push("/settings/payment-links")}
          />
          <Button label="+ Add" onPress={() => router.push("/(onboarding)/link-bank")} />
        </HStack>
      </HStack>
      {rows.map((a) => {
        const badges = badgesFor(a);
        return (
          <Pressable key={a.id} onPress={() => router.push({ pathname: "/settings/account-share", params: { account_id: a.id } })}>
            <Card>
              <Stack gap="sm">
                <HStack justify="space-between" align="center">
                  <Stack gap="xs">
                    <Text variant="title">{a.name}</Text>
                    <Text variant="muted">
                      {a.type} {a.mask ? `· •••${a.mask}` : ""}
                    </Text>
                  </Stack>
                  <Money cents={a.current_balance} positiveColor />
                </HStack>
                {a.type === "depository" &&
                effective[a.id] !== undefined &&
                effective[a.id] !== a.current_balance ? (
                  <HStack justify="space-between">
                    <Text variant="muted">Effective Available</Text>
                    <Money cents={effective[a.id]!} positiveColor />
                  </HStack>
                ) : null}
                {badges.length > 0 ? (
                  <HStack gap="sm" style={{ flexWrap: "wrap" }}>
                    {badges.map((b) => (
                      <View
                        key={b}
                        style={{
                          paddingHorizontal: space.sm,
                          paddingVertical: 4,
                          borderRadius: radius.pill,
                          backgroundColor: colors.surface,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        <Text variant="muted" style={{ fontSize: 12 }}>
                          {b}
                        </Text>
                      </View>
                    ))}
                  </HStack>
                ) : null}
              </Stack>
            </Card>
          </Pressable>
        );
      })}
      {rows.length === 0 && sharedView ? (
        <Text variant="muted">Nothing shared into this space yet. Open an account to share it.</Text>
      ) : null}
    </ScrollView>
  );
}
