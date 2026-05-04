import { useEffect, useState } from "react";
import { Pressable, ScrollView, Switch, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Card, HStack, Stack, Text, colors, radius, space } from "@cvc/ui";
import {
  getAccount,
  getMembersWithProfilesForSpace,
  getShareVisibility,
  getSharesForAccount,
  removeAccountShare,
  setAccountShare,
  setShareVisibility,
} from "@cvc/api-client";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useSpaces } from "../../hooks/useSpaces";

interface ShareRow {
  space_id: string;
  share_balances: boolean;
  share_transactions: boolean;
}

interface MemberRow {
  user_id: string | null;
  role: "owner" | "member";
  invited_email: string | null;
  accepted_at: string | null;
  display_name: string | null;
}

export default function AccountShare() {
  const { account_id } = useLocalSearchParams<{ account_id: string }>();
  const { spaces } = useSpaces();
  const { user } = useAuth();
  const [account, setAccount] = useState<{ id: string; name: string; type: string } | null>(null);
  const [shares, setShares] = useState<ShareRow[]>([]);
  // visibility[spaceId] = list of user_ids in the allowlist for this account.
  // Empty list = everyone in the space sees the share (default).
  const [visibility, setVisibility] = useState<Record<string, string[]>>({});
  const [membersBySpace, setMembersBySpace] = useState<Record<string, MemberRow[]>>({});

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

  // Once shares are loaded, fetch each space's member list + this account's
  // visibility allowlist for that space. Lazily on shares change so we don't
  // hit unsharable spaces.
  useEffect(() => {
    if (!account_id || shares.length === 0) return;
    (async () => {
      const vis: Record<string, string[]> = {};
      const mem: Record<string, MemberRow[]> = {};
      for (const s of shares) {
        try {
          vis[s.space_id] = await getShareVisibility(supabase, account_id, s.space_id);
        } catch {
          vis[s.space_id] = [];
        }
        try {
          mem[s.space_id] = (await getMembersWithProfilesForSpace(
            supabase,
            s.space_id,
          )) as MemberRow[];
        } catch {
          mem[s.space_id] = [];
        }
      }
      setVisibility(vis);
      setMembersBySpace(mem);
    })();
  }, [account_id, shares]);

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
      // FK cascade clears visibility rows server-side; mirror locally.
      setVisibility((v) => {
        const { [spaceId]: _drop, ...rest } = v;
        return rest;
      });
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

  function visibilityMode(spaceId: string): "everyone" | "specific" {
    return (visibility[spaceId]?.length ?? 0) === 0 ? "everyone" : "specific";
  }

  async function setMode(spaceId: string, mode: "everyone" | "specific") {
    if (!account_id || !user) return;
    if (mode === "everyone") {
      await setShareVisibility(supabase, { account_id, space_id: spaceId, user_ids: [] });
      setVisibility((v) => ({ ...v, [spaceId]: [] }));
      return;
    }
    // Switching to specific: seed with just the owner so the allowlist is
    // non-empty (otherwise the policy treats "no rows" as "everyone").
    // The owner always sees their share regardless, but we keep their id in
    // the list as the mode sentinel.
    const ids = [user.id];
    await setShareVisibility(supabase, { account_id, space_id: spaceId, user_ids: ids });
    setVisibility((v) => ({ ...v, [spaceId]: ids }));
  }

  async function toggleMember(spaceId: string, memberId: string, on: boolean) {
    if (!account_id || !user) return;
    const current = visibility[spaceId] ?? [];
    let nextIds: string[];
    if (on) {
      nextIds = Array.from(new Set([...current, memberId, user.id]));
    } else {
      nextIds = current.filter((id) => id !== memberId);
      if (!nextIds.includes(user.id)) nextIds = [user.id, ...nextIds];
    }
    await setShareVisibility(supabase, { account_id, space_id: spaceId, user_ids: nextIds });
    setVisibility((v) => ({ ...v, [spaceId]: nextIds }));
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
        const mode = visibilityMode(s.id);
        const selected = new Set(visibility[s.id] ?? []);
        const otherMembers = (membersBySpace[s.id] ?? []).filter(
          (m) => m.user_id && m.user_id !== user?.id && m.accepted_at,
        );
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
              {cur ? (
                <Stack gap="sm">
                  <Text variant="title">Visible to</Text>
                  <HStack gap="sm">
                    <ModeChip
                      label="Everyone in this space"
                      active={mode === "everyone"}
                      onPress={() => setMode(s.id, "everyone")}
                    />
                    <ModeChip
                      label="Specific members"
                      active={mode === "specific"}
                      onPress={() => setMode(s.id, "specific")}
                    />
                  </HStack>
                  {mode === "specific" ? (
                    otherMembers.length === 0 ? (
                      <Text variant="muted" style={{ fontSize: 12 }}>
                        No other accepted members in this space yet — only you will see this
                        account here.
                      </Text>
                    ) : (
                      <Stack gap="xs">
                        {otherMembers.map((m) => {
                          const id = m.user_id as string;
                          const on = selected.has(id);
                          return (
                            <HStack key={id} justify="space-between" align="center">
                              <Text>{m.display_name ?? m.invited_email ?? "Member"}</Text>
                              <Switch
                                value={on}
                                onValueChange={(v) => toggleMember(s.id, id, v)}
                              />
                            </HStack>
                          );
                        })}
                      </Stack>
                    )
                  ) : null}
                </Stack>
              ) : null}
            </Stack>
          </Card>
        );
      })}
    </ScrollView>
  );
}

function ModeChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: space.xs,
        paddingHorizontal: space.sm,
        borderRadius: radius.md,
        backgroundColor: active ? colors.primary : colors.surface,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
      }}
    >
      <Text style={{ color: active ? colors.bg : colors.text, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}
