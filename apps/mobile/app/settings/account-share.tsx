import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { fonts, SPACE_HUES, spaceKeyFromTint } from "@cvc/ui";
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
import { useTheme } from "../../lib/theme";
import { useAuth } from "../../hooks/useAuth";
import { useSpaces } from "../../hooks/useSpaces";
import { Group, PageHeader, ProChip, Row, SectionLabel, ToggleRow } from "../../components/settings/SettingsAtoms";

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
  const { palette, mode } = useTheme();
  const { account_id } = useLocalSearchParams<{ account_id: string }>();
  const { spaces } = useSpaces();
  const { user } = useAuth();
  const [account, setAccount] = useState<{ id: string; name: string; type: string } | null>(null);
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [visibility, setVisibility] = useState<Record<string, string[]>>({});
  const [membersBySpace, setMembersBySpace] = useState<Record<string, MemberRow[]>>({});

  useEffect(() => {
    if (!account_id) return;
    (async () => {
      const [acc, sh] = await Promise.all([getAccount(supabase, account_id), getSharesForAccount(supabase, account_id)]);
      if (acc) setAccount({ id: acc.id, name: acc.name, type: acc.type });
      setShares(sh as ShareRow[]);
    })();
  }, [account_id]);

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
          mem[s.space_id] = (await getMembersWithProfilesForSpace(supabase, s.space_id)) as MemberRow[];
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

  async function applyToggle(spaceId: string, next: { share_balances: boolean; share_transactions: boolean }) {
    if (!account_id) return;
    if (!next.share_balances && !next.share_transactions) {
      await removeAccountShare(supabase, { account_id, space_id: spaceId });
      setShares((rows) => rows.filter((r) => r.space_id !== spaceId));
      setVisibility((v) => {
        const { [spaceId]: _drop, ...rest } = v;
        return rest;
      });
      return;
    }
    await setAccountShare(supabase, { account_id, space_id: spaceId, share_balances: next.share_balances, share_transactions: next.share_transactions });
    setShares((rows) => {
      const without = rows.filter((r) => r.space_id !== spaceId);
      return [...without, { space_id: spaceId, ...next }];
    });
  }

  function visibilityMode(spaceId: string): "everyone" | "specific" {
    return (visibility[spaceId]?.length ?? 0) === 0 ? "everyone" : "specific";
  }

  async function setMode(spaceId: string, vmode: "everyone" | "specific") {
    if (!account_id || !user) return;
    if (vmode === "everyone") {
      await setShareVisibility(supabase, { account_id, space_id: spaceId, user_ids: [] });
      setVisibility((v) => ({ ...v, [spaceId]: [] }));
      return;
    }
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

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <PageHeader
          palette={palette}
          title={account ? `Share · ${account.name}` : "Share account"}
          sub={account ? account.type : "Loading…"}
          onBack={() => router.back()}
        />

        <View style={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: 12 }}>
          <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: palette.ink3, lineHeight: 17 }}>
            Choose which spaces see this account. Toggle off both rows to fully un-share. Visibility within a space lets you limit which members can see the share.
          </Text>
        </View>

        {spaces.length === 0 ? (
          <Group palette={palette}>
            <Row palette={palette} title="No spaces yet" sub="Create one in Settings → Spaces & Members first." right={null} last />
          </Group>
        ) : null}

        {spaces.map((s) => {
          const cur = shareFor(s.id);
          const sb = cur?.share_balances ?? false;
          const st = cur?.share_transactions ?? false;
          const vmode = visibilityMode(s.id);
          const selected = new Set(visibility[s.id] ?? []);
          const otherMembers = (membersBySpace[s.id] ?? []).filter((m) => m.user_id && m.user_id !== user?.id && m.accepted_at);
          const hue = SPACE_HUES[spaceKeyFromTint(s.tint)];
          const accent = `oklch(${mode === "dark" ? "70% 0.110" : "60% 0.105"} ${hue})`;
          return (
            <View key={s.id}>
              <SectionLabel palette={palette}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: `oklch(60% 0.105 ${hue})` }} />
                  <Text style={{ fontFamily: fonts.numMedium, fontSize: 10, color: palette.ink3, letterSpacing: 0.8, fontWeight: "600", textTransform: "uppercase" }}>
                    {s.name}
                  </Text>
                </View>
              </SectionLabel>
              <Group palette={palette}>
                <ToggleRow
                  palette={palette}
                  title="Share balance"
                  on={sb}
                  onChange={(v) => applyToggle(s.id, { share_balances: v, share_transactions: st })}
                  accent={accent}
                />
                <ToggleRow
                  palette={palette}
                  title="Share transactions"
                  sub="Sharing transactions implies sharing the balance."
                  on={st}
                  onChange={(v) => applyToggle(s.id, { share_balances: sb, share_transactions: v })}
                  accent={accent}
                  last={!cur}
                />
                {cur ? (
                  <View style={{ paddingHorizontal: 18, paddingVertical: 14, gap: 10 }}>
                    <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: palette.ink1 }}>Visible to</Text>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      <Pressable
                        onPress={() => setMode(s.id, "everyone")}
                        style={{
                          flex: 1,
                          height: 38,
                          borderRadius: 10,
                          backgroundColor: vmode === "everyone" ? palette.brand : palette.tinted,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ fontFamily: fonts.uiMedium, fontSize: 12, fontWeight: "500", color: vmode === "everyone" ? palette.brandOn : palette.ink2 }}>
                          Everyone in this space
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setMode(s.id, "specific")}
                        style={{
                          flex: 1,
                          height: 38,
                          borderRadius: 10,
                          backgroundColor: vmode === "specific" ? palette.brand : palette.tinted,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ fontFamily: fonts.uiMedium, fontSize: 12, fontWeight: "500", color: vmode === "specific" ? palette.brandOn : palette.ink2 }}>
                          Specific members
                        </Text>
                      </Pressable>
                    </View>
                    {vmode === "specific" ? (
                      otherMembers.length === 0 ? (
                        <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: palette.ink3 }}>
                          No other accepted members yet — only you will see this account here.
                        </Text>
                      ) : (
                        <View style={{ gap: 6 }}>
                          {otherMembers.map((m) => {
                            const id = m.user_id as string;
                            const on = selected.has(id);
                            return (
                              <View key={id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                                <Text style={{ fontFamily: fonts.ui, fontSize: 13, color: palette.ink1, flex: 1 }} numberOfLines={1}>
                                  {m.display_name ?? m.invited_email ?? "Member"}
                                </Text>
                                <Pressable onPress={() => toggleMember(s.id, id, !on)}>
                                  <ProChip palette={palette} tone={on ? "brand" : "muted"}>{on ? "VISIBLE" : "HIDDEN"}</ProChip>
                                </Pressable>
                              </View>
                            );
                          })}
                        </View>
                      )
                    ) : null}
                  </View>
                ) : null}
              </Group>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
