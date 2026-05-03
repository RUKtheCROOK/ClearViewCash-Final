import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { Card, HStack, Money, Stack, Text, colors, radius, space } from "@cvc/ui";
import { getTransactionsForView, setTransactionShare } from "@cvc/api-client";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../lib/store";

interface Txn {
  id: string;
  merchant_name: string | null;
  amount: number;
  posted_at: string;
  category: string | null;
  pending: boolean;
  is_recurring: boolean;
  account_id: string;
}

type Filter = "all" | "pending" | "completed" | "recurring";

export default function Transactions() {
  const activeSpaceId = useApp((s) => s.activeSpaceId);
  const sharedView = useApp((s) => s.sharedView);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    getTransactionsForView(supabase, {
      spaceId: activeSpaceId,
      sharedView,
      limit: 200,
    }).then((data) => setTxns(data as unknown as Txn[]));
  }, [activeSpaceId, sharedView, reloadCount]);

  const filtered = useMemo(() => {
    return txns.filter((t) => {
      if (filter === "pending" && !t.pending) return false;
      if (filter === "completed" && t.pending) return false;
      if (filter === "recurring" && !t.is_recurring) return false;
      if (search && !(t.merchant_name ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [txns, filter, search]);

  async function hideFromSpace(txnId: string) {
    if (!activeSpaceId) return;
    await setTransactionShare(supabase, {
      transaction_id: txnId,
      space_id: activeSpaceId,
      hidden: true,
    });
    setReloadCount((c) => c + 1);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, backgroundColor: colors.bg }}>
      <Text variant="muted">
        {sharedView
          ? "Shared view: showing transactions visible in this space."
          : "My view: every transaction on accounts you own."}
      </Text>
      <TextInput
        placeholder="Search merchant…"
        value={search}
        onChangeText={setSearch}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: space.md,
          backgroundColor: colors.surface,
        }}
      />
      <HStack gap="sm">
        {(["all", "pending", "completed", "recurring"] as Filter[]).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={{
              paddingHorizontal: space.md,
              paddingVertical: space.sm,
              borderRadius: radius.pill,
              backgroundColor: filter === f ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor: filter === f ? colors.primary : colors.border,
            }}
          >
            <Text style={{ color: filter === f ? "#fff" : colors.text }}>{f}</Text>
          </Pressable>
        ))}
      </HStack>
      <Card padded={false}>
        <Stack gap="sm">
          {filtered.map((t) => (
            <Pressable key={t.id} onLongPress={() => hideFromSpace(t.id)}>
              <HStack
                justify="space-between"
                align="center"
                style={{
                  paddingHorizontal: space.lg,
                  paddingVertical: space.md,
                  borderBottomWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text>{t.merchant_name ?? "Unknown"}</Text>
                  <Text variant="muted">
                    {t.category ?? "Uncategorized"} · {t.posted_at}
                    {t.pending ? " · pending" : ""}
                    {t.is_recurring ? " · recurring" : ""}
                  </Text>
                </View>
                <Money cents={t.amount} positiveColor />
              </HStack>
            </Pressable>
          ))}
          {filtered.length === 0 ? (
            <Text variant="muted" style={{ padding: space.lg }}>
              {sharedView ? "Nothing shared into this space matches your filters." : "No transactions."}
            </Text>
          ) : null}
        </Stack>
      </Card>
    </ScrollView>
  );
}
