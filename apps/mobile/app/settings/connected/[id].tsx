import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { fonts, Money } from "@cvc/ui";
import {
  deleteAccounts,
  getAccountsForPlaidItem,
  getPlaidItem,
} from "@cvc/api-client";
import { supabase } from "../../../lib/supabase";
import { useTheme } from "../../../lib/theme";
import { CheckRow, Group, PageHeader, ProChip, Row, RowSkeleton, SectionLabel } from "../../../components/settings/SettingsAtoms";

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
  const { palette } = useTheme();
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
      const [itm, accs] = await Promise.all([getPlaidItem(supabase, id), getAccountsForPlaidItem(supabase, id)]);
      setItem(itm as ItemDetail | null);
      const rows = accs as AccountRow[];
      setAccounts(rows);
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
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/plaid-item-remove`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${session?.access_token ?? ""}`,
          },
          body: JSON.stringify({ plaid_item_row_id: item.id }),
        });
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

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <PageHeader
          palette={palette}
          title={item?.institution_name ?? "Connected service"}
          sub={loading ? "Loading…" : `Status: ${item?.status ?? "unknown"}`}
          onBack={() => router.back()}
        />

        <View style={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: 12 }}>
          <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: palette.ink3, lineHeight: 17 }}>
            Select accounts to remove. Removing all of them disconnects the service from ClearViewCash and revokes access at Plaid. Removing some keeps the connection alive.
          </Text>
        </View>

        <SectionLabel palette={palette}>ACCOUNTS</SectionLabel>
        <Group palette={palette}>
          {loading ? (
            <>
              <RowSkeleton palette={palette} withGlyph={false} withSub />
              <RowSkeleton palette={palette} withGlyph={false} withSub />
              <RowSkeleton palette={palette} withGlyph={false} withSub last />
            </>
          ) : accounts.length === 0 ? (
            <Row palette={palette} title="No accounts" right={null} last />
          ) : (
            <>
              <Row
                palette={palette}
                title={allSelected ? "Deselect all" : "Select all"}
                value={`${selected.size}/${accounts.length}`}
                onPress={() => setSelected(allSelected ? new Set() : new Set(accounts.map((a) => a.id)))}
              />
              {accounts.map((a, idx) => (
                <CheckRow
                  key={a.id}
                  palette={palette}
                  title={a.name}
                  sub={`${a.type}${a.mask ? ` · •••${a.mask}` : ""}`}
                  value={<Money cents={a.current_balance} positiveColor />}
                  selected={selected.has(a.id)}
                  onToggle={() => toggle(a.id)}
                  last={idx === accounts.length - 1}
                />
              ))}
            </>
          )}
        </Group>

        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <View style={{ marginBottom: 8 }}>
            <ProChip palette={palette} tone={allSelected ? "muted" : "muted"}>
              {allSelected ? "WILL DISCONNECT SERVICE" : "WILL KEEP SERVICE CONNECTED"}
            </ProChip>
          </View>
          <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: palette.ink3, lineHeight: 17, marginBottom: 12 }}>
            {allSelected
              ? `Removes all ${accounts.length} account${accounts.length === 1 ? "" : "s"} and revokes the Plaid connection.`
              : `Removes ${selected.size} of ${accounts.length} accounts. The service stays connected.`}
          </Text>
          {error ? (
            <View style={{ padding: 12, borderRadius: 12, backgroundColor: palette.negTint, marginBottom: 12 }}>
              <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: palette.neg }}>{error}</Text>
            </View>
          ) : null}
          {!confirming ? (
            <Pressable
              onPress={() => setConfirming(true)}
              disabled={noneSelected}
              style={{
                height: 44,
                borderRadius: 10,
                backgroundColor: palette.surface,
                borderWidth: 1,
                borderColor: palette.line,
                alignItems: "center",
                justifyContent: "center",
                opacity: noneSelected ? 0.5 : 1,
              }}
            >
              <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: palette.neg }}>
                {noneSelected ? "Select at least one account" : "Remove selected"}
              </Text>
            </Pressable>
          ) : (
            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: fonts.uiMedium, fontSize: 12, fontWeight: "600", color: palette.neg }}>
                Final confirmation. This cannot be undone.
              </Text>
              <Pressable
                onPress={performRemove}
                disabled={removing}
                style={{ height: 44, borderRadius: 10, backgroundColor: palette.neg, alignItems: "center", justifyContent: "center", opacity: removing ? 0.5 : 1 }}
              >
                <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: "white" }}>
                  {removing ? "Removing…" : allSelected ? "Disconnect & remove" : "Remove selected accounts"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setConfirming(false)}
                style={{ height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: palette.ink2 }}>Cancel</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
