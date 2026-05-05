import { useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Text } from "@cvc/ui";
import {
  accountDisplayName,
  allocatePaymentLinks,
  effectiveAvailableBalances,
  groupAccountsByType,
  summarizeAccounts,
  type PaymentLinkAllocation,
} from "@cvc/domain";
import { getAccountsForView, getPlaidItemsStatus } from "@cvc/api-client";
import type { PaymentLink } from "@cvc/types";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../lib/store";
import { useEffectiveSharedView } from "../../lib/view";
import { useSpaces, acceptedMemberCount } from "../../hooks/useSpaces";
import { useTheme } from "../../lib/theme";
import { openPlaidLink } from "../../lib/plaid";
import { AccountsTitleBlock } from "../../components/accounts/AccountsTitleBlock";
import { SectionHead } from "../../components/accounts/SectionHead";
import { AccountCard, type AccountCardData } from "../../components/accounts/AccountCard";
import { EmptyLinksCallout } from "../../components/accounts/EmptyLinksCallout";
import { PaymentLinkSheet } from "../../components/accounts/PaymentLinkSheet";
import { ScopeToggle } from "../../components/dashboard/ScopeToggle";

interface AccountRow {
  id: string;
  name: string;
  display_name?: string | null;
  mask: string | null;
  type: string;
  subtype?: string | null;
  current_balance: number | null;
  plaid_item_id: string | null;
  last_synced_at?: string | null;
  color?: string | null;
}

interface PlaidItemStatus {
  id: string;
  status: string;
  institution_name: string | null;
}

interface PaymentLinkRow {
  id: string;
  funding_account_id: string;
  name: string;
  cross_space: boolean;
  owner_user_id: string;
}

interface PaymentLinkCardRow {
  payment_link_id: string;
  card_account_id: string;
  split_pct: number;
}

interface ShareRow {
  account_id: string;
  space_id: string;
}

function relativeAgo(iso: string | null): string | null {
  if (!iso) return null;
  const diffMs = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return null;
  const m = Math.floor(diffMs / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return `${d} d ago`;
}

export default function AccountsPage() {
  const activeSpaceId = useApp((s) => s.activeSpaceId);
  const dismissedCallout = useApp((s) => s.dismissedAccountsLinksCallout);
  const dismissCallout = useApp((s) => s.dismissAccountsLinksCallout);
  const { activeSpace } = useSpaces();
  const { sharedView, restrictToOwnerId, toggleVisible } = useEffectiveSharedView(activeSpace);
  const { palette } = useTheme(activeSpace?.tint);

  const [rows, setRows] = useState<AccountRow[]>([]);
  const [allOwnedAccounts, setAllOwnedAccounts] = useState<AccountRow[]>([]);
  const [links, setLinks] = useState<PaymentLinkRow[]>([]);
  const [linkCards, setLinkCards] = useState<PaymentLinkCardRow[]>([]);
  const [allocations, setAllocations] = useState<PaymentLinkAllocation[]>([]);
  const [effective, setEffective] = useState<Record<string, number>>({});
  const [itemStatus, setItemStatus] = useState<Record<string, PlaidItemStatus>>({});
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [reconnectingItemId, setReconnectingItemId] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [linkSheetOpen, setLinkSheetOpen] = useState(false);
  const [linkSheetCardId, setLinkSheetCardId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [accs, allOwnedRes, linksRes, cardsRes, items, sharesRes] = await Promise.all([
        getAccountsForView(supabase, { spaceId: activeSpaceId, sharedView, restrictToOwnerId }),
        supabase
          .from("accounts")
          .select(
            "id, name, display_name, mask, type, subtype, current_balance, plaid_item_id, last_synced_at, color",
          ),
        supabase.from("payment_links").select("id, funding_account_id, name, cross_space, owner_user_id"),
        supabase.from("payment_link_cards").select("payment_link_id, card_account_id, split_pct"),
        getPlaidItemsStatus(supabase),
        activeSpaceId
          ? supabase
              .from("account_shares")
              .select("account_id, space_id")
              .eq("space_id", activeSpaceId)
          : Promise.resolve({ data: [] as ShareRow[] }),
      ]);
      if (cancelled) return;

      const accountsList = accs as AccountRow[];
      const allOwned = (allOwnedRes.data ?? []) as AccountRow[];
      const linksData = (linksRes.data ?? []) as PaymentLinkRow[];
      const cardsData = (cardsRes.data ?? []) as PaymentLinkCardRow[];

      setRows(accountsList);
      setAllOwnedAccounts(allOwned);
      setLinks(linksData);
      setLinkCards(cardsData);
      setItemStatus(Object.fromEntries(items.map((it) => [it.id, it])));
      setShares(((sharesRes as { data: ShareRow[] | null }).data ?? []) as ShareRow[]);

      const linkObjs: PaymentLink[] = linksData.map((pl) => ({
        ...(pl as unknown as Record<string, unknown>),
        cards: cardsData.filter((c) => c.payment_link_id === pl.id),
      })) as unknown as PaymentLink[];

      const allBalances = [
        ...accountsList.map((a) => ({ account_id: a.id, current_balance: a.current_balance ?? 0 })),
        ...allOwned
          .filter((a) => !accountsList.some((x) => x.id === a.id))
          .map((a) => ({ account_id: a.id, current_balance: a.current_balance ?? 0 })),
      ];
      setAllocations(allocatePaymentLinks(linkObjs, allBalances));
      setEffective(Object.fromEntries(effectiveAvailableBalances(linkObjs, allBalances)));
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSpaceId, sharedView, restrictToOwnerId, reloadCount]);

  const linkObjs = useMemo<PaymentLink[]>(
    () =>
      links.map((pl) => ({
        ...(pl as unknown as Record<string, unknown>),
        cards: linkCards.filter((c) => c.payment_link_id === pl.id),
      })) as unknown as PaymentLink[],
    [links, linkCards],
  );

  const summary = useMemo(() => summarizeAccounts(rows, linkObjs), [rows, linkObjs]);

  const accountNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of rows) m.set(a.id, accountDisplayName(a));
    for (const a of allOwnedAccounts) if (!m.has(a.id)) m.set(a.id, accountDisplayName(a));
    return m;
  }, [rows, allOwnedAccounts]);

  const balanceById = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of rows) m.set(a.id, a.current_balance ?? 0);
    for (const a of allOwnedAccounts) if (!m.has(a.id)) m.set(a.id, a.current_balance ?? 0);
    return m;
  }, [rows, allOwnedAccounts]);

  const sharedAccountIds = useMemo(() => new Set(shares.map((s) => s.account_id)), [shares]);

  function isFullyCovered(accountId: string, type: string): boolean {
    if (type !== "credit") return false;
    const cardAllocs = allocations.filter((a) => a.card_account_id === accountId);
    if (cardAllocs.length === 0) return false;
    for (const alloc of cardAllocs) {
      if (!balanceById.has(alloc.funding_account_id)) return false;
      if ((balanceById.get(alloc.funding_account_id) ?? 0) < alloc.reserved_cents) return false;
    }
    return true;
  }

  function buildCardData(a: AccountRow): AccountCardData {
    const item = a.plaid_item_id ? itemStatus[a.plaid_item_id] : null;
    const syncStatus = item ? (item.status === "error" ? "error" : "good") : null;
    const isCredit = a.type === "credit" || a.type === "loan";
    const linkDirection: "in" | "out" = isCredit ? "in" : "out";

    const chips = isCredit
      ? linkCards
          .filter((c) => c.card_account_id === a.id)
          .map((c) => {
            const link = links.find((l) => l.id === c.payment_link_id);
            if (!link) return null;
            const counterpartName =
              accountNameById.get(link.funding_account_id) ??
              (link.cross_space ? "Linked account" : null);
            if (!counterpartName) return null;
            return {
              hueKey: a.id,
              label: counterpartName,
              share: c.split_pct,
            };
          })
          .filter(Boolean) as { hueKey: string; label: string; share: number }[]
      : links
          .filter((l) => l.funding_account_id === a.id)
          .flatMap((l) =>
            linkCards
              .filter((c) => c.payment_link_id === l.id)
              .map((c) => {
                const cardName = accountNameById.get(c.card_account_id);
                if (!cardName) return null;
                return {
                  hueKey: c.card_account_id,
                  label: cardName,
                  share: c.split_pct,
                };
              }),
          )
          .filter(Boolean) as { hueKey: string; label: string; share: number }[];

    return {
      id: a.id,
      type: a.type,
      subtype: a.subtype ?? null,
      name: accountDisplayName(a),
      institution: itemStatus[a.plaid_item_id ?? ""]?.institution_name ?? "Bank",
      mask: a.mask ?? null,
      balanceCents: a.current_balance ?? 0,
      lastSyncedAgo: relativeAgo(a.last_synced_at ?? null),
      ownership: sharedAccountIds.has(a.id) ? "shared" : "private",
      sharedSpaceHex: activeSpace?.tint ?? null,
      effectiveAvailableCents:
        a.type === "depository" && effective[a.id] !== undefined ? effective[a.id]! : null,
      linkDirection,
      links: chips,
      syncStatus,
      apr: null,
      fullyCovered: isFullyCovered(a.id, a.type),
      onPress: () =>
        router.push({ pathname: "/settings/account/[id]", params: { id: a.id } }),
      onReconnectPress:
        syncStatus === "error" && a.plaid_item_id
          ? () => reconnect(a.plaid_item_id!)
          : undefined,
      reconnecting: reconnectingItemId === a.plaid_item_id,
    };
  }

  async function reconnect(itemRowId: string) {
    setReconnectingItemId(itemRowId);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
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
      await openPlaidLink(tokenJson.link_token);
      await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/plaid-sync`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plaid_item_row_id: itemRowId }),
      });
      setReloadCount((n) => n + 1);
    } catch {
      // Surface to user via card state on next render; nothing else to do.
    } finally {
      setReconnectingItemId(null);
    }
  }

  const showScopeToggle = toggleVisible && acceptedMemberCount(activeSpace) >= 2;
  const cardCandidates = useMemo(() => rows.filter((r) => r.type === "credit"), [rows]);
  const funderCandidates = useMemo(() => rows.filter((r) => r.type === "depository"), [rows]);
  const hasAnyLinks = linkObjs.some((l) => l.cards.length > 0);
  const showCallout = !dismissedCallout && !hasAnyLinks && cardCandidates.length > 0 && funderCandidates.length > 0;

  const groups = groupAccountsByType(rows);
  const groupCaption = (
    group: string,
    count: number,
  ): string | undefined => {
    if (group === "Cash") return `${count} ${count === 1 ? "account" : "accounts"}`;
    if (group === "Credit") return `${count} ${count === 1 ? "card" : "cards"}`;
    if (group === "Loans") return `${count} ${count === 1 ? "loan" : "loans"}`;
    if (group === "Investments") return "Read-only · not in cash";
    return undefined;
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <AccountsTitleBlock
          spaceTintHex={activeSpace?.tint}
          summary={summary}
          onLinkAccount={() => {
            setLinkSheetCardId(null);
            setLinkSheetOpen(true);
          }}
          onAddBank={() => router.push("/(onboarding)/link-bank")}
        />

        {showScopeToggle ? (
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 14,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <ScopeToggle
              value={sharedView ? "shared" : "mine"}
              onChange={(next) => {
                if ((next === "shared") !== sharedView) {
                  useApp.getState().toggleView();
                }
              }}
              spaceTintHex={activeSpace?.tint}
            />
          </View>
        ) : null}

        {groups.map(({ group, accounts }) => (
          <View key={group}>
            <SectionHead eyebrow={group.toUpperCase()} caption={groupCaption(group, accounts.length)} />
            <View style={{ paddingHorizontal: 16, gap: 10 }}>
              {accounts.map((a) => (
                <AccountCard key={a.id} {...buildCardData(a)} />
              ))}
            </View>
          </View>
        ))}

        {rows.length === 0 ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 32 }}>
            <Text style={{ color: palette.ink2 }}>
              {sharedView
                ? "Nothing shared into this space yet. Open an account to share it."
                : "No accounts yet. Tap + Add bank to connect one."}
            </Text>
          </View>
        ) : null}

        {showCallout ? (
          <EmptyLinksCallout
            onSetUp={() => {
              setLinkSheetCardId(null);
              setLinkSheetOpen(true);
            }}
            onDismiss={dismissCallout}
          />
        ) : null}

        <View style={{ height: 24 }} />
      </ScrollView>

      <PaymentLinkSheet
        visible={linkSheetOpen}
        cards={cardCandidates.map((c) => ({
          id: c.id,
          name: c.name,
          display_name: c.display_name ?? null,
          mask: c.mask ?? null,
          current_balance: c.current_balance,
        }))}
        funders={funderCandidates.map((f) => ({
          id: f.id,
          name: f.name,
          display_name: f.display_name ?? null,
          mask: f.mask ?? null,
          current_balance: f.current_balance,
        }))}
        spaceName={activeSpace?.name ?? "Personal"}
        initialCardId={linkSheetCardId}
        onClose={() => setLinkSheetOpen(false)}
        onSaved={() => setReloadCount((n) => n + 1)}
      />
    </View>
  );
}
