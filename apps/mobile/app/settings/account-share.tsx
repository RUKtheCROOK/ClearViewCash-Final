import { useEffect, useState } from "react";
import { ScrollView, Switch, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Card, HStack, Stack, Text, colors, space } from "@cvc/ui";
import {
  getAccount,
  getSharesForAccount,
  removeAccountShare,
  setAccountShare,
} from "@cvc/api-client";
import { supabase } from "../../lib/supabase";
import { useSpaces } from "../../hooks/useSpaces";

interface ShareRow {
  space_id: string;
  share_balances: boolean;
  share_transactions: boolean;
}

export default function AccountShare() {
  const { account_id } = useLocalSearchParams<{ account_id: string }>();
  const { spaces } = useSpaces();
  const [account, setAccount] = useState<{ id: string; name: string; type: string } | null>(null);
  const [shares, setShares] = useState<ShareRow[]>([]);

  useEffect(() => {
    if (!account_id) return;
    (async () => {
      const [acc, sh] = await Promise.all([
        getAccount(supabase, account_id),
        getSharesForAccount(supabase, account_id),
      ]);
      if (acc) setAccount({ id: acc.id, name: acc.name, type: acc.type });
      setShares(sh as ShareRow[]);
    })();
  }, [account_id]);

  function shareFor(spaceId: string): ShareRow | undefined {
    return shares.find((s) => s.space_id === spaceId);
  }

  async function applyToggle(
    spaceId: string,
    next: { share_balances: boolean; share_transactions: boolean },
  ) {
    if (!account_id) return;
    if (!next.share_balances && !next.share_transactions) {
      await removeAccountShare(supabase, { account_id, space_id: spaceId });
      setShares((rows) => rows.filter((r) => r.space_id !== spaceId));
      return;
    }
    await setAccountShare(supabase, {
      account_id,
      space_id: spaceId,
      share_balances: next.share_balances,
      share_transactions: next.share_transactions,
    });
    setShares((rows) => {
      const without = rows.filter((r) => r.space_id !== spaceId);
      return [...without, { space_id: spaceId, ...next }];
    });
  }

  const sharableSpaces = spaces.filter((s) => s.kind === "shared");

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, backgroundColor: colors.bg }}>
      <Stack gap="xs">
        <Text variant="h2">Share account</Text>
        <Text variant="muted">
          {account ? `${account.name} · ${account.type}` : "Loading…"}
        </Text>
      </Stack>
      <Text variant="muted">
        Choose which shared spaces see this account. Toggle off both rows to fully un-share.
      </Text>
      {sharableSpaces.length === 0 ? (
        <Card>
          <Text variant="muted">
            No shared spaces yet. Create one in Settings → Spaces &amp; Members first.
          </Text>
        </Card>
      ) : null}
      {sharableSpaces.map((s) => {
        const cur = shareFor(s.id);
        const sb = cur?.share_balances ?? false;
        const st = cur?.share_transactions ?? false;
        return (
          <Card key={s.id}>
            <Stack gap="md">
              <HStack justify="space-between" align="center">
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                  <View
                    style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: s.tint }}
                  />
                  <Text variant="title">{s.name}</Text>
                </View>
                <Text variant="muted">{cur ? "shared" : "private"}</Text>
              </HStack>
              <HStack justify="space-between" align="center">
                <Text>Share balance</Text>
                <Switch
                  value={sb}
                  onValueChange={(v) =>
                    applyToggle(s.id, { share_balances: v, share_transactions: st })
                  }
                />
              </HStack>
              <HStack justify="space-between" align="center">
                <Text>Share transactions</Text>
                <Switch
                  value={st}
                  onValueChange={(v) =>
                    applyToggle(s.id, { share_balances: sb, share_transactions: v })
                  }
                />
              </HStack>
              <Text variant="muted" style={{ fontSize: 12 }}>
                Sharing transactions implies sharing the balance. Hide individual transactions by
                long-pressing them in the Transactions tab.
              </Text>
            </Stack>
          </Card>
        );
      })}
    </ScrollView>
  );
}
