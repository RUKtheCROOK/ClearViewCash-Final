import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button, Card, HStack, Money, Stack, Text, colors, radius, space } from "@cvc/ui";
import {
  deleteAccount as deleteAccountRow,
  getAccount,
  getAccountsForPlaidItem,
  getPaymentLinks,
  getPlaidItem,
} from "@cvc/api-client";
import { supabase } from "../../../lib/supabase";
import { openPlaidLink } from "../../../lib/plaid";

interface AccountDetail {
  id: string;
  name: string;
  mask: string | null;
  type: string;
  current_balance: number | null;
  plaid_item_id: string | null;
}

interface ItemDetail {
  id: string;
  institution_name: string | null;
  status: string;
}

interface PaymentLinkRow {
  id: string;
  name: string;
  funding_account_id: string;
  cross_space: boolean;
  cards: Array<{ card_account_id: string; split_pct: number }>;
}

export default function AccountDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [siblingCount, setSiblingCount] = useState<number>(0);
  const [paymentLinks, setPaymentLinks] = useState<PaymentLinkRow[]>([]);
  const [accountNameById, setAccountNameById] = useState<Record<string, string>>({});
  const [shareCount, setShareCount] = useState<number>(0);

  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectError, setReconnectError] = useState<string | null>(null);

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const acc = (await getAccount(supabase, id)) as AccountDetail | null;
      setAccount(acc);
      if (acc?.plaid_item_id) {
        const [itm, siblings] = await Promise.all([
          getPlaidItem(supabase, acc.plaid_item_id),
          getAccountsForPlaidItem(supabase, acc.plaid_item_id),
        ]);
        setItem(itm as ItemDetail | null);
        setSiblingCount(siblings.length);
      }
      const [pls, sharesRes, allAccsRes] = await Promise.all([
        getPaymentLinks(supabase),
        supabase.from("account_shares").select("space_id").eq("account_id", id),
        supabase.from("accounts").select("id, name"),
      ]);
      setPaymentLinks(pls as PaymentLinkRow[]);
      setShareCount((sharesRes.data ?? []).length);
      setAccountNameById(
        Object.fromEntries(((allAccsRes.data ?? []) as Array<{ id: string; name: string }>).map((a) => [a.id, a.name])),
      );
    })();
  }, [id]);

  async function reconnect() {
    if (!account?.plaid_item_id) return;
    setReconnecting(true);
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
          body: JSON.stringify({ plaid_item_row_id: account.plaid_item_id }),
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
        body: JSON.stringify({ plaid_item_row_id: account.plaid_item_id }),
      });
      const itm = await getPlaidItem(supabase, account.plaid_item_id);
      setItem(itm as ItemDetail | null);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg !== "user_exited") setReconnectError(msg);
    } finally {
      setReconnecting(false);
    }
  }

  async function performDelete() {
    if (!account) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      // If this is the last account on its service, revoke the whole Plaid
      // item. Cascade FK on accounts.plaid_item_id removes this row too.
      if (account.plaid_item_id && siblingCount <= 1) {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/plaid-item-remove`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              Authorization: `Bearer ${session?.access_token ?? ""}`,
            },
            body: JSON.stringify({ plaid_item_row_id: account.plaid_item_id }),
          },
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail ?? body.error ?? `HTTP ${res.status}`);
        }
      } else {
        await deleteAccountRow(supabase, account.id);
      }
      router.back();
    } catch (e) {
      setDeleteError((e as Error).message);
      setDeleting(false);
    }
  }

  if (!account) {
    return (
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, backgroundColor: colors.bg }}>
        <Text variant="muted">Loading…</Text>
      </ScrollView>
    );
  }

  const status = item?.status;
  const needsReconnect = status === "error";

  const linksForAccount = paymentLinks.filter(
    (l) => l.funding_account_id === account.id || l.cards.some((c) => c.card_account_id === account.id),
  );

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, backgroundColor: colors.bg }}>
      <Card>
        <Stack gap="sm">
          <HStack justify="space-between" align="center">
            <Stack gap="xs">
              <Text variant="h2">{account.name}</Text>
              <Text variant="muted">
                {account.type}
                {account.mask ? ` · •••${account.mask}` : ""}
              </Text>
            </Stack>
            <Money cents={account.current_balance} positiveColor />
          </HStack>
        </Stack>
      </Card>

      <Card>
        <Stack gap="md">
          <Text variant="title">Connection</Text>
          <HStack justify="space-between" align="center">
            <Text>{item?.institution_name ?? "Unknown bank"}</Text>
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
          </HStack>
          {needsReconnect && account.plaid_item_id ? (
            <Stack gap="xs">
              <Button
                label={reconnecting ? "Reconnecting…" : "Reconnect"}
                variant="secondary"
                disabled={reconnecting}
                onPress={reconnect}
              />
              {reconnectError ? (
                <Text style={{ color: colors.negative, fontSize: 12 }}>{reconnectError}</Text>
              ) : null}
            </Stack>
          ) : null}
          {account.plaid_item_id ? (
            <Button
              label="Manage connected service"
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: "/settings/connected/[id]",
                  params: { id: account.plaid_item_id! },
                })
              }
            />
          ) : null}
        </Stack>
      </Card>

      <Card>
        <Stack gap="md">
          <HStack justify="space-between" align="center">
            <Text variant="title">Sharing</Text>
            <Text variant="muted">
              {shareCount === 0 ? "Private" : `Shared with ${shareCount} space${shareCount === 1 ? "" : "s"}`}
            </Text>
          </HStack>
          <Button
            label="Manage sharing"
            variant="secondary"
            onPress={() =>
              router.push({ pathname: "/settings/account-share", params: { account_id: account.id } })
            }
          />
        </Stack>
      </Card>

      <Card>
        <Stack gap="md">
          <Text variant="title">Payment links</Text>
          {linksForAccount.length === 0 ? (
            <Text variant="muted">No payment links involve this account.</Text>
          ) : (
            <Stack gap="sm">
              {linksForAccount.map((l) => {
                const isFunder = l.funding_account_id === account.id;
                const counterparts = isFunder
                  ? l.cards.map((c) => accountNameById[c.card_account_id]).filter(Boolean)
                  : [accountNameById[l.funding_account_id]].filter(Boolean);
                return (
                  <Pressable key={l.id} onPress={() => router.push("/settings/payment-links")}>
                    <Stack gap="xs">
                      <Text>{l.name}</Text>
                      <Text variant="muted" style={{ fontSize: 12 }}>
                        {isFunder ? "Pays → " : "Paid by "}
                        {counterparts.join(", ") || "—"}
                        {l.cross_space ? " · cross-space" : ""}
                      </Text>
                    </Stack>
                  </Pressable>
                );
              })}
            </Stack>
          )}
        </Stack>
      </Card>

      <Card>
        <Stack gap="md">
          <Text variant="title" style={{ color: colors.negative }}>
            Delete account
          </Text>
          <Text variant="muted">
            Removes {account.name} and its transactions from ClearViewCash.
            {account.plaid_item_id && siblingCount <= 1
              ? " This is the last account on this connected service, so the connection itself will also be removed."
              : ""}
            {" "}This cannot be undone.
          </Text>
          {!confirming ? (
            <Button
              label="Delete this account"
              variant="destructive"
              onPress={() => setConfirming(true)}
            />
          ) : (
            <Stack gap="sm">
              <Text style={{ color: colors.negative, fontWeight: "600" }}>
                Final confirmation. There is no recovery after this.
              </Text>
              <Button
                label="Delete"
                variant="destructive"
                onPress={performDelete}
                loading={deleting}
              />
              <Button label="Cancel" variant="ghost" onPress={() => setConfirming(false)} />
              {deleteError ? (
                <Text style={{ color: colors.negative }}>{deleteError}</Text>
              ) : null}
            </Stack>
          )}
        </Stack>
      </Card>
    </ScrollView>
  );
}
