import { useEffect, useState } from "react";
import { Pressable, ScrollView, Switch, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button, Card, HStack, Money, Stack, Text, colors, radius, space } from "@cvc/ui";
import {
  deleteAccounts,
  getAccountsForPlaidItem,
  getPlaidItem,
} from "@cvc/api-client";
import { supabase } from "../../../lib/supabase";

interface AccountRow {
  id: string;
  name: string;
  mask: string | null;
  type: string;
  current_balance: number | null;
}

interface ItemDetail {
  id: string;
  institution_name: string | null;
  status: string;
}

export default function ConnectedDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [itm, accs] = await Promise.all([
        getPlaidItem(supabase, id),
        getAccountsForPlaidItem(supabase, id),
      ]);
      setItem(itm as ItemDetail | null);
      const rows = accs as AccountRow[];
      setAccounts(rows);
      // All checked by default — matches the flow where the user came here
      // intending to remove the service.
      setSelected(new Set(rows.map((a) => a.id)));
      setLoading(false);
    })();
  }, [id]);

  function toggle(accId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(accId)) next.delete(accId);
      else next.add(accId);
      return next;
    });
    // Any change while in confirming state should re-arm the warning.
    setConfirming(false);
  }

  const allSelected = accounts.length > 0 && selected.size === accounts.length;
  const noneSelected = selected.size === 0;

  async function performRemove() {
    if (noneSelected || !item) return;
    setRemoving(true);
    setError(null);
    try {
      if (allSelected) {
        // Remove the whole service. Cascade removes the accounts.
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/plaid-item-remove`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              Authorization: `Bearer ${session?.access_token ?? ""}`,
            },
            body: JSON.stringify({ plaid_item_row_id: item.id }),
          },
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail ?? body.error ?? `HTTP ${res.status}`);
        }
      } else {
        await deleteAccounts(supabase, Array.from(selected));
      }
      router.back();
    } catch (e) {
      setError((e as Error).message);
      setRemoving(false);
    }
  }

  if (loading) {
    return (
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, backgroundColor: colors.bg }}>
        <Text variant="muted">Loading…</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, backgroundColor: colors.bg }}>
      <Stack gap="xs">
        <Text variant="h2">{item?.institution_name ?? "Unknown bank"}</Text>
        <HStack gap="sm" align="center">
          <Text variant="muted">Status:</Text>
          <Text style={{ color: item?.status === "good" ? colors.positive : colors.negative }}>
            {item?.status ?? "unknown"}
          </Text>
        </HStack>
      </Stack>

      <Text variant="muted">
        Select the accounts you want to remove. Removing all accounts also disconnects the service from
        ClearViewCash and revokes access at Plaid. Removing some keeps the connection alive for the rest.
      </Text>

      {accounts.length === 0 ? (
        <Card>
          <Text variant="muted">This service has no accounts.</Text>
        </Card>
      ) : null}

      <Card padded={false}>
        <Stack>
          <Pressable
            onPress={() =>
              setSelected((prev) => (prev.size === accounts.length ? new Set() : new Set(accounts.map((a) => a.id))))
            }
            style={{
              paddingHorizontal: space.lg,
              paddingVertical: space.md,
              borderBottomWidth: 1,
              borderColor: colors.border,
            }}
          >
            <HStack justify="space-between" align="center">
              <Text style={{ fontWeight: "600" }}>
                {allSelected ? "Deselect all" : "Select all"}
              </Text>
              <Text variant="muted">
                {selected.size}/{accounts.length} selected
              </Text>
            </HStack>
          </Pressable>
          {accounts.map((a, idx) => {
            const isLast = idx === accounts.length - 1;
            const checked = selected.has(a.id);
            return (
              <Pressable
                key={a.id}
                onPress={() => toggle(a.id)}
                style={{
                  paddingHorizontal: space.lg,
                  paddingVertical: space.md,
                  borderBottomWidth: isLast ? 0 : 1,
                  borderColor: colors.border,
                }}
              >
                <HStack justify="space-between" align="center">
                  <Stack gap="xs" style={{ flex: 1 }}>
                    <Text>{a.name}</Text>
                    <Text variant="muted" style={{ fontSize: 12 }}>
                      {a.type}
                      {a.mask ? ` · •••${a.mask}` : ""}
                    </Text>
                  </Stack>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                    <Money cents={a.current_balance} positiveColor />
                    <Switch value={checked} onValueChange={() => toggle(a.id)} />
                  </View>
                </HStack>
              </Pressable>
            );
          })}
        </Stack>
      </Card>

      <Card>
        <Stack gap="md">
          <View
            style={{
              paddingHorizontal: space.sm,
              paddingVertical: 4,
              borderRadius: radius.pill,
              backgroundColor: allSelected ? colors.negative : colors.warning,
              alignSelf: "flex-start",
            }}
          >
            <Text style={{ color: colors.surface, fontSize: 11, fontWeight: "600" }}>
              {allSelected ? "Will disconnect service" : "Will keep service connected"}
            </Text>
          </View>
          <Text variant="muted">
            {allSelected
              ? `Removes all ${accounts.length} account${accounts.length === 1 ? "" : "s"} and revokes the Plaid connection.`
              : `Removes ${selected.size} of ${accounts.length} accounts. The service stays connected and other accounts continue to sync.`}
          </Text>
          {!confirming ? (
            <Button
              label={noneSelected ? "Select at least one account" : "Remove selected"}
              variant="destructive"
              disabled={noneSelected}
              onPress={() => setConfirming(true)}
            />
          ) : (
            <Stack gap="sm">
              <Text style={{ color: colors.negative, fontWeight: "600" }}>
                Final confirmation. This cannot be undone.
              </Text>
              <Button
                label={allSelected ? "Disconnect service & remove accounts" : "Remove selected accounts"}
                variant="destructive"
                onPress={performRemove}
                loading={removing}
              />
              <Button label="Cancel" variant="ghost" onPress={() => setConfirming(false)} />
              {error ? <Text style={{ color: colors.negative }}>{error}</Text> : null}
            </Stack>
          )}
        </Stack>
      </Card>
    </ScrollView>
  );
}
