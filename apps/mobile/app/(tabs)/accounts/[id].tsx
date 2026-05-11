import { useEffect, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button, Card, HStack, I, Money, Stack, Text, colors, radius, space, type IconKey } from "@cvc/ui";
import {
  deleteAccount as deleteAccountRow,
  getAccount,
  getAccountsForPlaidItem,
  getPaymentLinks,
  getPlaidItem,
  updateAccountSettings,
} from "@cvc/api-client";
import {
  ACCOUNT_ICON_KEYS,
  accountBalanceTone,
  accountDisplayName,
  defaultAccountIcon,
  accountKind,
  isAccountIconKey,
  isValidHexColor,
  readableTextOn,
} from "@cvc/domain";
import { supabase } from "../../../lib/supabase";
import { openPlaidLink } from "../../../lib/plaid";

const COLOR_SWATCHES: Array<{ hex: string; label: string }> = [
  { hex: "#3c8f8f", label: "Teal" },
  { hex: "#428ba1", label: "Sea" },
  { hex: "#6d7eb1", label: "Indigo" },
  { hex: "#618d62", label: "Sage" },
  { hex: "#9c7947", label: "Gold" },
  { hex: "#ab6e64", label: "Clay" },
  { hex: "#a96c7a", label: "Rose" },
  { hex: "#96719e", label: "Plum" },
];

interface AccountDetail {
  id: string;
  name: string;
  display_name: string | null;
  mask: string | null;
  type: string;
  subtype?: string | null;
  current_balance: number | null;
  plaid_item_id: string | null;
  color: string | null;
  icon: string | null;
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

  const [nameInput, setNameInput] = useState("");
  const [colorInput, setColorInput] = useState("");
  const [iconInput, setIconInput] = useState<string | null>(null);
  const [colorOtherOpen, setColorOtherOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const acc = (await getAccount(supabase, id)) as AccountDetail | null;
      setAccount(acc);
      setNameInput(acc?.display_name ?? "");
      setColorInput(acc?.color ?? "");
      setIconInput(acc?.icon ?? null);
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
        supabase.from("accounts").select("id, name, display_name"),
      ]);
      setPaymentLinks(pls as PaymentLinkRow[]);
      setShareCount((sharesRes.data ?? []).length);
      setAccountNameById(
        Object.fromEntries(
          (
            (allAccsRes.data ?? []) as Array<{
              id: string;
              name: string;
              display_name: string | null;
            }>
          ).map((a) => [a.id, accountDisplayName(a)]),
        ),
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

  async function saveCustomization() {
    if (!account) return;
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      const trimmedName = nameInput.trim();
      const trimmedColor = colorInput.trim();
      if (trimmedColor && !isValidHexColor(trimmedColor)) {
        throw new Error('Color must be a hex value like "#0EA5E9".');
      }
      await updateAccountSettings(supabase, {
        id: account.id,
        display_name: trimmedName.length === 0 ? null : trimmedName,
        color: trimmedColor.length === 0 ? null : trimmedColor,
        icon: isAccountIconKey(iconInput) ? iconInput : null,
      });
      const refreshed = (await getAccount(supabase, account.id)) as AccountDetail | null;
      setAccount(refreshed);
      setNameInput(refreshed?.display_name ?? "");
      setColorInput(refreshed?.color ?? "");
      setIconInput(refreshed?.icon ?? null);
      setSaveMessage("Saved");
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function clearCustomization() {
    if (!account) return;
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      await updateAccountSettings(supabase, {
        id: account.id,
        display_name: null,
        color: null,
        icon: null,
      });
      const refreshed = (await getAccount(supabase, account.id)) as AccountDetail | null;
      setAccount(refreshed);
      setNameInput("");
      setColorInput("");
      setIconInput(null);
      setSaveMessage("Cleared");
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
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

  const tone = accountBalanceTone({
    type: account.type,
    current_balance: account.current_balance,
  });
  const balanceColor =
    tone === "positive" ? colors.positive : tone === "negative" ? colors.negative : colors.text;
  const hasColor = isValidHexColor(account.color ?? null);
  const headerBg = hasColor ? (account.color as string) : "transparent";
  const headerFg = hasColor ? readableTextOn(account.color ?? null) : colors.text;
  const previewColorValid =
    colorInput.trim() === "" || isValidHexColor(colorInput.trim());
  const previewSwatch = isValidHexColor(colorInput.trim()) ? colorInput.trim() : null;

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, backgroundColor: colors.bg }}>
      <Card padded={false} style={{ overflow: "hidden" }}>
        <View
          style={{
            backgroundColor: headerBg,
            paddingHorizontal: space.lg,
            paddingVertical: space.md,
          }}
        >
          <HStack justify="space-between" align="center">
            <Text variant="h2" style={{ color: headerFg }}>
              {accountDisplayName(account)}
            </Text>
            <Money
              cents={account.current_balance}
              style={{
                color: hasColor ? headerFg : balanceColor,
                fontWeight: "700",
              }}
            />
          </HStack>
        </View>
        <View style={{ paddingHorizontal: space.lg, paddingVertical: space.md }}>
          <Text variant="muted">
            {account.type}
            {account.mask ? ` · •••${account.mask}` : ""}
            {account.display_name ? ` · originally "${account.name}"` : ""}
          </Text>
        </View>
      </Card>

      <Card>
        <Stack gap="sm">
          <Text variant="title">Customize</Text>
          <Text variant="muted" style={{ fontSize: 13 }}>
            Override how this account appears. The bank's name remains "{account.name}".
          </Text>

          <Text variant="label">Display name</Text>
          <TextInput
            value={nameInput}
            onChangeText={setNameInput}
            placeholder={account.name}
            placeholderTextColor={colors.textMuted}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: space.md,
              color: colors.text,
            }}
          />

          <Text variant="label">Card color</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            <Pressable
              onPress={() => {
                setColorInput("");
                setColorOtherOpen(false);
              }}
              accessibilityLabel="Use default color"
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.md,
                borderWidth: colorInput.trim() === "" ? 2 : 1,
                borderColor: colorInput.trim() === "" ? colors.text : colors.border,
                backgroundColor: colors.surface,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 10, color: colors.textMuted }}>auto</Text>
            </Pressable>
            {COLOR_SWATCHES.map((s) => {
              const selected = colorInput.trim().toLowerCase() === s.hex.toLowerCase();
              return (
                <Pressable
                  key={s.hex}
                  onPress={() => {
                    setColorInput(s.hex);
                    setColorOtherOpen(false);
                  }}
                  accessibilityLabel={`Use ${s.label}`}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: radius.md,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? colors.text : colors.border,
                    backgroundColor: s.hex,
                  }}
                />
              );
            })}
            <Pressable
              onPress={() => setColorOtherOpen((v) => !v)}
              accessibilityLabel="Enter a custom color"
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.md,
                borderWidth: colorOtherOpen ? 2 : 1,
                borderColor: colorOtherOpen ? colors.text : colors.border,
                backgroundColor: previewSwatch ?? colors.surface,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 10, color: previewSwatch ? "#ffffff" : colors.textMuted }}>
                {previewSwatch ? "•" : "···"}
              </Text>
            </Pressable>
          </View>
          {colorOtherOpen ? (
            <TextInput
              value={colorInput}
              onChangeText={setColorInput}
              placeholder="#0EA5E9"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: space.md,
                color: colors.text,
              }}
            />
          ) : null}
          {!previewColorValid ? (
            <Text style={{ color: colors.negative, fontSize: 12 }}>
              Enter a valid hex like #0EA5E9 or leave blank.
            </Text>
          ) : null}

          <Text variant="label">Icon</Text>
          <Text variant="muted" style={{ fontSize: 12 }}>
            Default is the {defaultAccountIcon(accountKind({ type: account.type, subtype: account.subtype ?? null }))} icon for {account.type} accounts.
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <Pressable
              onPress={() => setIconInput(null)}
              accessibilityLabel="Use default icon"
              style={{
                width: 44,
                height: 44,
                borderRadius: radius.md,
                borderWidth: iconInput == null ? 2 : 1,
                borderColor: iconInput == null ? colors.text : colors.border,
                backgroundColor: colors.surface,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 10, color: colors.textMuted }}>auto</Text>
            </Pressable>
            {ACCOUNT_ICON_KEYS.map((key) => {
              const Icon = I[key as IconKey];
              const selected = iconInput === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setIconInput(key)}
                  accessibilityLabel={`Use ${key} icon`}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: radius.md,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? colors.text : colors.border,
                    backgroundColor: colors.surface,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon color={colors.text} size={20} />
                </Pressable>
              );
            })}
          </View>

          <HStack gap="sm">
            <Button
              label={saving ? "Saving…" : "Save"}
              onPress={saveCustomization}
              disabled={saving || !previewColorValid}
            />
            <Button
              label="Clear customizations"
              variant="secondary"
              onPress={clearCustomization}
              disabled={saving}
            />
          </HStack>
          {saveMessage ? (
            <Text variant="muted" style={{ fontSize: 12 }}>
              {saveMessage}
            </Text>
          ) : null}
          {saveError ? (
            <Text style={{ color: colors.negative, fontSize: 12 }}>{saveError}</Text>
          ) : null}
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
            Removes {accountDisplayName(account)} and its transactions from ClearViewCash.
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
