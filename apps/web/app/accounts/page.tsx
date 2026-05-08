"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import {
  accountDisplayName,
  allocatePaymentLinks,
  effectiveAvailableBalances,
  groupAccountsByType,
  summarizeAccounts,
  type PaymentLinkAllocation,
} from "@cvc/domain";
import {
  getAccountsForView,
  getMySpaces,
  getPlaidItemsStatus,
} from "@cvc/api-client";
import type { PaymentLink } from "@cvc/types";
import { openPlaidLink } from "../../lib/plaid";
import { effectiveSharedView, type SpaceMember } from "../../lib/view";
import { AccountsTitleBlock } from "../../components/accounts/AccountsTitleBlock";
import { SectionHead } from "../../components/accounts/SectionHead";
import {
  AccountCard,
  type AccountCardData,
} from "../../components/accounts/AccountCard";
import { EmptyLinksCallout } from "../../components/accounts/EmptyLinksCallout";
import { PaymentLinkSheet } from "../../components/accounts/PaymentLinkSheet";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

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
  icon?: string | null;
}

interface PlaidItemStatus {
  id: string;
  status: string;
  institution_name: string | null;
}

interface Space {
  id: string;
  name: string;
  tint: string;
  members?: SpaceMember[];
}

interface PaymentLinkRow {
  id: string;
  funding_account_id: string;
  name: string;
  cross_space: boolean;
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

const SPACE_HEX_TO_CLASS: Record<string, string> = {
  "#0EA5E9": "space-personal",
  "#0ea5e9": "space-personal",
  "#1c4544": "space-personal",
  "#d97706": "space-household",
  "#7c3aed": "space-business",
  "#16a34a": "space-family",
  "#0284c7": "space-travel",
};

function spaceClassFor(tint: string | null | undefined): string {
  if (!tint) return "space-personal";
  return SPACE_HEX_TO_CLASS[tint] ?? "space-personal";
}

function relativeAgo(iso: string | null | undefined): string | null {
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

const DISMISSED_KEY = "cvc-accounts-links-callout-dismissed";

export default function AccountsPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [rawSharedView, setRawSharedView] = useState(false);

  const [rows, setRows] = useState<AccountRow[]>([]);
  const [allOwnedAccounts, setAllOwnedAccounts] = useState<AccountRow[]>([]);
  const [links, setLinks] = useState<PaymentLinkRow[]>([]);
  const [linkCards, setLinkCards] = useState<PaymentLinkCardRow[]>([]);
  const [allocations, setAllocations] = useState<PaymentLinkAllocation[]>([]);
  const [effective, setEffective] = useState<Record<string, number>>({});
  const [itemStatus, setItemStatus] = useState<Record<string, PlaidItemStatus>>({});
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [reconnectingItemId, setReconnectingItemId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [dismissedCallout, setDismissedCallout] = useState(false);
  const [linkSheetOpen, setLinkSheetOpen] = useState(false);
  const [linkSheetCardId, setLinkSheetCardId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSignedIn(!!data.session);
      setCurrentUserId(data.session?.user?.id ?? null);
      setAuthReady(true);
    })();
    if (typeof window !== "undefined") {
      setDismissedCallout(localStorage.getItem(DISMISSED_KEY) === "1");
      const stored = localStorage.getItem("cvc-shared-view");
      if (stored === "1") setRawSharedView(true);
    }
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    getMySpaces(supabase).then((spacesRows) => {
      const list = spacesRows as unknown as Space[];
      setSpaces(list);
      const first = list[0];
      if (first && !activeSpaceId) {
        const stored =
          typeof window !== "undefined" ? localStorage.getItem("cvc-active-space") : null;
        const found = stored ? list.find((s) => s.id === stored) : null;
        setActiveSpaceId(found ? found.id : first.id);
      }
    });
  }, [signedIn, activeSpaceId]);

  const activeSpace = useMemo(
    () => spaces.find((s) => s.id === activeSpaceId) ?? null,
    [spaces, activeSpaceId],
  );
  const { sharedView, restrictToOwnerId, toggleVisible } = useMemo(
    () => effectiveSharedView(activeSpace, rawSharedView, currentUserId),
    [activeSpace, rawSharedView, currentUserId],
  );

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    (async () => {
      const [accs, allOwnedRes, linksRes, cardsRes, items, sharesRes] = await Promise.all([
        getAccountsForView(supabase, { spaceId: activeSpaceId, sharedView, restrictToOwnerId }),
        supabase
          .from("accounts")
          .select(
            "id, name, display_name, mask, type, subtype, current_balance, plaid_item_id, last_synced_at, color, icon",
          ),
        supabase.from("payment_links").select("id, funding_account_id, name, cross_space"),
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

      const accountsList = accs as unknown as AccountRow[];
      const allOwned = (allOwnedRes.data ?? []) as unknown as AccountRow[];
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
        owner_user_id: "",
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
  }, [signedIn, activeSpaceId, sharedView, restrictToOwnerId, reloadCount]);

  const linkObjs = useMemo<PaymentLink[]>(
    () =>
      links.map((pl) => ({
        ...(pl as unknown as Record<string, unknown>),
        owner_user_id: "",
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

  const accountColorById = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const a of rows) m.set(a.id, a.color ?? null);
    for (const a of allOwnedAccounts) if (!m.has(a.id)) m.set(a.id, a.color ?? null);
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
              hueKey: link.funding_account_id,
              label: counterpartName,
              share: c.split_pct,
              color: accountColorById.get(link.funding_account_id) ?? null,
            };
          })
          .filter(Boolean) as { hueKey: string; label: string; share: number; color: string | null }[]
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
                  color: accountColorById.get(c.card_account_id) ?? null,
                };
              }),
          )
          .filter(Boolean) as { hueKey: string; label: string; share: number; color: string | null }[];

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
      effectiveAvailableCents:
        a.type === "depository" && effective[a.id] !== undefined ? effective[a.id]! : null,
      linkDirection,
      links: chips,
      syncStatus,
      apr: null,
      fullyCovered: isFullyCovered(a.id, a.type),
      color: a.color ?? null,
      iconKey: a.icon ?? null,
      onPress: () => router.push(`/accounts/${a.id}`),
      onReconnectPress:
        syncStatus === "error" && a.plaid_item_id
          ? () => reconnect(a.plaid_item_id!)
          : undefined,
      reconnecting: reconnectingItemId === a.plaid_item_id,
    };
  }

  async function reconnect(itemRowId: string) {
    setReconnectingItemId(itemRowId);
    setActionError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("not_signed_in");
      const tokenRes = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/plaid-link-token`,
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
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/plaid-sync`, {
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
      if (msg !== "user_exited") setActionError(msg);
    } finally {
      setReconnectingItemId(null);
    }
  }

  async function addAccount() {
    setAdding(true);
    setActionError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("not_signed_in");
      const tokenRes = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/plaid-link-token`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );
      const tokenJson = await tokenRes.json();
      if (!tokenRes.ok || !tokenJson.link_token) {
        throw new Error(tokenJson.error ?? "could_not_start_link");
      }
      const publicToken = await openPlaidLink(tokenJson.link_token);
      const exchangeRes = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/plaid-exchange`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ public_token: publicToken }),
        },
      );
      const exchangeJson = await exchangeRes.json();
      if (!exchangeRes.ok) throw new Error(exchangeJson.error ?? "exchange_failed");
      setReloadCount((n) => n + 1);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg !== "user_exited") setActionError(msg);
    } finally {
      setAdding(false);
    }
  }

  function dismissCallout() {
    setDismissedCallout(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(DISMISSED_KEY, "1");
    }
  }

  if (!authReady) {
    return (
      <main style={{ padding: "40px 16px", maxWidth: 1080, margin: "0 auto" }}>
        <p style={{ color: "var(--ink-3)" }}>Loading…</p>
      </main>
    );
  }

  if (!signedIn) {
    return (
      <main style={{ padding: "80px 16px", maxWidth: 460, margin: "0 auto" }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>Accounts</h1>
        <p style={{ marginTop: 16, color: "var(--ink-3)" }}>Sign in to view your accounts.</p>
        <button
          className="btn btn-primary"
          style={{ marginTop: 16 }}
          onClick={() => router.push("/sign-in")}
        >
          Sign in
        </button>
      </main>
    );
  }

  const groups = groupAccountsByType(rows);
  const groupCaption = (group: string, count: number): string | undefined => {
    if (group === "Cash") return `${count} ${count === 1 ? "account" : "accounts"}`;
    if (group === "Credit") return `${count} ${count === 1 ? "card" : "cards"}`;
    if (group === "Loans") return `${count} ${count === 1 ? "loan" : "loans"}`;
    if (group === "Investments") return "Read-only · not in cash";
    return undefined;
  };

  const cardCandidates = rows.filter((r) => r.type === "credit");
  const funderCandidates = rows.filter((r) => r.type === "depository");
  const hasAnyLinks = linkObjs.some((l) => l.cards.length > 0);
  const showCallout =
    !dismissedCallout && !hasAnyLinks && cardCandidates.length > 0 && funderCandidates.length > 0;

  const spaceCls = spaceClassFor(activeSpace?.tint);

  return (
    <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", paddingBottom: 60 }}>
      <AccountsTitleBlock
        spaceClass={spaceCls}
        summary={summary}
        onLinkAccount={() => {
          setLinkSheetCardId(null);
          setLinkSheetOpen(true);
        }}
        onAddBank={addAccount}
      />

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "12px 16px 24px" }}>
        {actionError ? (
          <div
            style={{
              background: "var(--neg-tint)",
              border: "1px solid var(--neg)",
              color: "var(--neg)",
              padding: "10px 14px",
              borderRadius: 10,
              marginTop: 12,
              fontSize: 14,
              fontFamily: "var(--font-ui)",
            }}
          >
            {actionError}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            paddingTop: 16,
            flexWrap: "wrap",
          }}
        >
          {spaces.length > 1 ? (
            <select
              value={activeSpaceId ?? ""}
              onChange={(e) => {
                setActiveSpaceId(e.target.value);
                if (typeof window !== "undefined") {
                  localStorage.setItem("cvc-active-space", e.target.value);
                }
              }}
              style={{
                appearance: "none",
                border: "1px solid var(--line-soft)",
                borderRadius: 10,
                padding: "8px 12px",
                fontSize: 14,
                background: "var(--bg-surface)",
                color: "var(--ink-1)",
                fontFamily: "var(--font-ui)",
              }}
            >
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : (
            <div />
          )}
          {toggleVisible ? (
            <button
              type="button"
              onClick={() => {
                const next = !rawSharedView;
                setRawSharedView(next);
                if (typeof window !== "undefined") {
                  localStorage.setItem("cvc-shared-view", next ? "1" : "0");
                }
              }}
              style={{
                appearance: "none",
                cursor: "pointer",
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid var(--line-soft)",
                background: rawSharedView ? "var(--brand)" : "var(--bg-surface)",
                color: rawSharedView ? "var(--brand-on)" : "var(--ink-1)",
                fontSize: 13,
                fontWeight: 500,
                fontFamily: "var(--font-ui)",
              }}
            >
              {rawSharedView ? "Shared view" : "My view"}
            </button>
          ) : null}
        </div>

        {groups.map(({ group, accounts }) => (
          <div key={group}>
            <SectionHead
              eyebrow={group.toUpperCase()}
              caption={groupCaption(group, accounts.length)}
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: 10,
              }}
            >
              {accounts.map((a) => (
                <AccountCard key={a.id} {...buildCardData(a)} />
              ))}
            </div>
          </div>
        ))}

        {rows.length === 0 ? (
          <div style={{ paddingTop: 32, color: "var(--ink-2)", fontSize: 14 }}>
            {sharedView
              ? "Nothing shared into this space yet. Open an account to share it."
              : "No accounts yet. Tap + Add bank to connect one."}
          </div>
        ) : null}

        {showCallout ? (
          <EmptyLinksCallout onSetUp={() => setLinkSheetOpen(true)} onDismiss={dismissCallout} />
        ) : null}
      </div>

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
        supabase={supabase}
        onClose={() => setLinkSheetOpen(false)}
        onSaved={() => setReloadCount((n) => n + 1)}
      />
    </main>
  );
}
