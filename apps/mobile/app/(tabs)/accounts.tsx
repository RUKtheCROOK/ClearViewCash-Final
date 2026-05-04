import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Button, Card, HStack, Money, Stack, Text, colors, radius, space } from "@cvc/ui";
import {
  allocatePaymentLinks,
  computeObligations,
  displayMerchantName,
  effectiveAvailableBalances,
  type ObligationsBreakdown,
  type PaymentLinkAllocation,
} from "@cvc/domain";
import {
  getAccountsForView,
  getPlaidItemsStatus,
  getTransactionsForView,
} from "@cvc/api-client";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../lib/store";
import { openPlaidLink } from "../../lib/plaid";
import { TransactionEditSheet, type EditableTxn } from "../../components/TransactionEditSheet";

interface AccountRow {
  id: string;
  name: string;
  mask: string | null;
  type: string;
  current_balance: number | null;
  plaid_item_id: string | null;
  // Optional until supabase.generated.ts is regenerated after the
  // 20260504000003_account_last_synced_at migration. Present at runtime.
  last_synced_at?: string | null;
}

function relativeAgo(iso: string | null): string | null {
  if (!iso) return null;
  const diffMs = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return null;
  const m = Math.floor(diffMs / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

interface PlaidItemStatus {
  id: string;
  status: string;
  institution_name: string | null;
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
  const [allocations, setAllocations] = useState<PaymentLinkAllocation[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [itemStatus, setItemStatus] = useState<Record<string, PlaidItemStatus>>({});
  const [reconnectingItemId, setReconnectingItemId] = useState<string | null>(null);
  const [reconnectError, setReconnectError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [cashOnHand, setCashOnHand] = useState(0);
  const [obligations, setObligations] = useState<ObligationsBreakdown>({
    debtCents: 0,
    upcomingBillsCents: 0,
    totalCents: 0,
  });
  const [recent, setRecent] = useState<EditableTxn[]>([]);
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);
  const [editing, setEditing] = useState<EditableTxn | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const todayIso = new Date().toISOString().slice(0, 10);
      const [accs, allAccsRes, linksRes, cardsRes, items, billsRes, txnsRes] = await Promise.all([
        getAccountsForView(supabase, { spaceId: activeSpaceId, sharedView }),
        supabase.from("accounts").select("id, name, mask, type, current_balance, plaid_item_id"),
        supabase.from("payment_links").select("id, funding_account_id, name, cross_space"),
        supabase.from("payment_link_cards").select("payment_link_id, card_account_id, split_pct"),
        getPlaidItemsStatus(supabase),
        activeSpaceId
          ? supabase
              .from("bills")
              .select("amount, next_due_at")
              .eq("space_id", activeSpaceId)
              .gte("next_due_at", todayIso)
          : Promise.resolve({ data: [] as Array<{ amount: number; next_due_at: string }> }),
        getTransactionsForView(supabase, {
          spaceId: activeSpaceId,
          sharedView,
          limit: 10,
          fields:
            "id, merchant_name, display_name, amount, posted_at, category, pending, is_recurring, account_id, owner_user_id, note",
        }),
      ]);
      const accounts = accs as AccountRow[];
      setRows(accounts);
      setMyAccounts((allAccsRes.data ?? []) as AccountRow[]);
      setLinks((linksRes.data ?? []) as LinkRow[]);
      setCards((cardsRes.data ?? []) as CardRow[]);
      setItemStatus(Object.fromEntries(items.map((it) => [it.id, it])));

      const bills = (billsRes.data ?? []) as Array<{ amount: number; next_due_at: string }>;
      setCashOnHand(
        accounts
          .filter((a) => a.type === "depository")
          .reduce((s, a) => s + (a.current_balance ?? 0), 0),
      );
      setObligations(computeObligations({ accounts, bills }));

      const txns = txnsRes as unknown as EditableTxn[];
      setRecent(txns);
      const catSet = new Set<string>();
      for (const t of txns) if (t.category) catSet.add(t.category);
      setCategorySuggestions(Array.from(catSet).sort());
      const linkObjs = (linksRes.data ?? []).map(
        (pl: { id: string; funding_account_id: string; name: string; cross_space: boolean }) => ({
          ...pl,
          owner_user_id: "",
          cards: (cardsRes.data ?? []).filter(
            (c: { payment_link_id: string }) => c.payment_link_id === pl.id,
          ),
        }),
      );
      const allBalances = [
        ...accounts.map((a) => ({ account_id: a.id, current_balance: a.current_balance ?? 0 })),
        ...((allAccsRes.data ?? []) as AccountRow[])
          .filter((a) => !accounts.some((ac) => ac.id === a.id))
          .map((a) => ({ account_id: a.id, current_balance: a.current_balance ?? 0 })),
      ];
      const eff = effectiveAvailableBalances(linkObjs as never, allBalances);
      setEffective(Object.fromEntries(eff));
      setAllocations(allocatePaymentLinks(linkObjs as never, allBalances));
    })();
  }, [activeSpaceId, sharedView, reloadCount]);

  useEffect(() => {
    if (!sharedView || !activeSpaceId) {
      setHiddenIds(new Set());
      return;
    }
    supabase
      .from("transaction_shares")
      .select("transaction_id")
      .eq("space_id", activeSpaceId)
      .eq("hidden", true)
      .then(({ data }) => {
        const ids = (data ?? []).map((r: { transaction_id: string }) => r.transaction_id);
        setHiddenIds(new Set(ids));
      });
  }, [activeSpaceId, sharedView, reloadCount]);

  const effectiveAvailableTotal = cashOnHand - obligations.totalCents;
  const obligationsSubtitle = useMemo(() => {
    const parts: string[] = [];
    if (obligations.debtCents > 0) parts.push(`$${(obligations.debtCents / 100).toFixed(0)} balances`);
    if (obligations.upcomingBillsCents > 0)
      parts.push(`$${(obligations.upcomingBillsCents / 100).toFixed(0)} bills (30d)`);
    return parts.join(" · ");
  }, [obligations]);

  async function reconnect(itemRowId: string) {
    setReconnectingItemId(itemRowId);
    setReconnectError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("not_signed_in");
      const tokenRes = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/plaid-link-token`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ plaid_item_row_id: itemRowId }),
        },
      );
      const tokenJson = await tokenRes.json();
      if (!tokenRes.ok || !tokenJson.link_token) {
        throw new Error(tokenJson.error ?? "could_not_start_reconnect");
      }
      // Update mode: completing the flow re-auths the item in place. There is
      // no public_token to exchange — Plaid just returns onSuccess.
      await openPlaidLink(tokenJson.link_token);
      // Trigger an immediate sync so status flips back to 'good' without
      // waiting for the next webhook tick.
      await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/plaid-sync`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plaid_item_row_id: itemRowId }),
      });
      setReloadCount((n) => n + 1);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg !== "user_exited") setReconnectError(msg);
    } finally {
      setReconnectingItemId(null);
    }
  }

  const accountNameById = new Map(rows.map((r) => [r.id, r.name]));
  const myAccountNameById = new Map(myAccounts.map((r) => [r.id, r.name]));
  const balanceById = new Map<string, number>(
    [...myAccounts, ...rows].map((r) => [r.id, r.current_balance ?? 0]),
  );

  function isDebtFullyCovered(account: AccountRow): boolean {
    if (account.type !== "credit") return false;
    if ((account.current_balance ?? 0) <= 0) return false;
    const cardAllocs = allocations.filter((a) => a.card_account_id === account.id);
    if (cardAllocs.length === 0) return false;
    for (const alloc of cardAllocs) {
      if (!balanceById.has(alloc.funding_account_id)) return false;
      const funderBalance = balanceById.get(alloc.funding_account_id) ?? 0;
      if (funderBalance < alloc.reserved_cents) return false;
    }
    return true;
  }

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

      <Card>
        <Stack gap="sm">
          <Text variant="label">Effective available</Text>
          <Money cents={effectiveAvailableTotal} style={{ fontSize: 32, fontWeight: "700" }} />
          <Text variant="muted">Cash on hand minus obligations.</Text>
        </Stack>
      </Card>
      <HStack gap="md">
        <Card style={{ flex: 1 }}>
          <Stack gap="xs">
            <Text variant="label">Cash on hand</Text>
            <Money cents={cashOnHand} positiveColor />
          </Stack>
        </Card>
        <Card style={{ flex: 1 }}>
          <Stack gap="xs">
            <Text variant="label">Obligations</Text>
            <Money cents={obligations.totalCents} />
            {obligationsSubtitle ? (
              <Text variant="muted" style={{ fontSize: 11 }}>
                {obligationsSubtitle}
              </Text>
            ) : null}
          </Stack>
        </Card>
      </HStack>
      {rows.map((a) => {
        const badges = badgesFor(a);
        const status = a.plaid_item_id ? itemStatus[a.plaid_item_id]?.status : undefined;
        const needsReconnect = status === "error";
        const fullyCovered = isDebtFullyCovered(a);
        return (
          <Pressable key={a.id} onPress={() => router.push({ pathname: "/settings/account/[id]", params: { id: a.id } })}>
            <Card>
              <Stack gap="sm">
                <HStack justify="space-between" align="center">
                  <Stack gap="xs">
                    <HStack gap="sm" align="center">
                      <Text variant="title">{a.name}</Text>
                      {status ? (
                        <View
                          style={{
                            paddingHorizontal: space.sm,
                            paddingVertical: 2,
                            borderRadius: radius.pill,
                            backgroundColor: needsReconnect ? colors.warning : colors.positive,
                          }}
                        >
                          <Text style={{ color: colors.surface, fontSize: 11, fontWeight: "600" }}>
                            {needsReconnect ? "Needs reconnect" : "Synced"}
                          </Text>
                        </View>
                      ) : null}
                      {fullyCovered ? (
                        <View
                          style={{
                            paddingHorizontal: space.sm,
                            paddingVertical: 2,
                            borderRadius: radius.pill,
                            backgroundColor: colors.positive,
                          }}
                        >
                          <Text style={{ color: colors.surface, fontSize: 11, fontWeight: "600" }}>
                            Fully covered
                          </Text>
                        </View>
                      ) : null}
                    </HStack>
                    <Text variant="muted">
                      {a.type} {a.mask ? `· •••${a.mask}` : ""}
                      {(() => {
                        const ago = relativeAgo(a.last_synced_at ?? null);
                        return ago ? ` · synced ${ago}` : "";
                      })()}
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
                {needsReconnect && a.plaid_item_id ? (
                  <Stack gap="xs">
                    <Button
                      label={
                        reconnectingItemId === a.plaid_item_id ? "Reconnecting…" : "Reconnect"
                      }
                      variant="secondary"
                      disabled={reconnectingItemId !== null}
                      onPress={() => reconnect(a.plaid_item_id!)}
                    />
                    {reconnectError && reconnectingItemId === null ? (
                      <Text style={{ color: colors.negative, fontSize: 12 }}>{reconnectError}</Text>
                    ) : null}
                  </Stack>
                ) : null}
              </Stack>
            </Card>
          </Pressable>
        );
      })}
      {rows.length === 0 && sharedView ? (
        <Text variant="muted">Nothing shared into this space yet. Open an account to share it.</Text>
      ) : null}

      <Card>
        <Stack gap="md">
          <Text variant="title">Recent transactions</Text>
          {recent.map((t) => (
            <Pressable key={t.id} onPress={() => setEditing(t)}>
              <HStack justify="space-between" align="center">
                <View style={{ flex: 1 }}>
                  <Text>{displayMerchantName(t)}</Text>
                  <Text variant="muted">
                    {t.category ?? "Uncategorized"} · {t.posted_at}
                    {t.pending ? " · pending" : ""}
                  </Text>
                </View>
                <Money cents={t.amount} positiveColor />
              </HStack>
            </Pressable>
          ))}
          {recent.length === 0 ? (
            <Text variant="muted">
              {sharedView ? "Nothing shared into this space yet." : "No transactions yet."}
            </Text>
          ) : null}
        </Stack>
      </Card>

      <TransactionEditSheet
        txn={editing}
        spaceId={activeSpaceId}
        sharedView={sharedView}
        hiddenInSpace={editing ? hiddenIds.has(editing.id) : false}
        categorySuggestions={categorySuggestions}
        onClose={() => setEditing(null)}
        onSaved={() => setReloadCount((c) => c + 1)}
      />
    </ScrollView>
  );
}
