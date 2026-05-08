import { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { fonts, SPACE_HUES, spaceKeyFromTint } from "@cvc/ui";
import {
  createSpace,
  deleteSpace,
  getInvitationsForSpace,
  getMembersForSpace,
  inviteToSpace,
  leaveSpace,
  revokeInvitation,
  updateMemberPermissions,
  updateSpace,
  updateSpaceSharingDefaults,
} from "@cvc/api-client";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../lib/store";
import { useTheme } from "../../lib/theme";
import { useSpaces } from "../../hooks/useSpaces";
import { useAuth } from "../../hooks/useAuth";
import { Group, PageHeader, Row, SectionLabel, ToggleRow } from "../../components/settings/SettingsAtoms";
import { SpaceCard } from "../../components/settings/SpaceCard";
import { MemberRow } from "../../components/settings/MemberRow";
import { Si } from "../../components/settings/settingsGlyphs";

interface InvitationRow {
  id: string;
  email: string;
  token: string;
  expires_at: string;
  accepted_user_id: string | null;
  created_at: string;
}

interface MemberRowData {
  user_id: string | null;
  role: "owner" | "member";
  invited_email: string | null;
  accepted_at: string | null;
  can_invite: boolean;
  can_rename: boolean;
  can_delete: boolean;
}

interface SpaceWithDefaults {
  id: string;
  name: string;
  tint: string;
  owner_user_id: string;
  share_balances_default?: boolean;
  share_transactions_default?: boolean;
  members_can_edit?: boolean;
  mine_shared_enabled?: boolean;
}

const HUE_VALUES = Object.values(SPACE_HUES);
const HUE_LABELS: Record<number, string> = {
  195: "Teal",
  30: "Terracotta",
  270: "Indigo",
  145: "Sage",
  220: "Slate",
};
const HUE_TO_HEX: Record<number, string> = {
  195: "#1c4544",
  30: "#d97706",
  270: "#7c3aed",
  145: "#16a34a",
  220: "#0284c7",
};

function inviteStatus(inv: InvitationRow): "accepted" | "expired" | "pending" {
  if (inv.accepted_user_id) return "accepted";
  if (new Date(inv.expires_at) < new Date()) return "expired";
  return "pending";
}

function shareLink(token: string): string {
  return `https://app.clearviewcash.com/accept-invite?token=${token}`;
}

function spaceHue(tint: string | null | undefined): number {
  return SPACE_HUES[spaceKeyFromTint(tint)];
}

function initialsFromName(name: string | null | undefined): string {
  const src = (name ?? "").trim();
  if (!src) return "?";
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export default function Spaces() {
  const { palette, mode } = useTheme();
  const { user } = useAuth();
  const { spaces, refresh: refreshSpaces } = useSpaces();
  const activeSpaceId = useApp((s) => s.activeSpaceId);
  const setActive = useApp((s) => s.setActiveSpace);

  const [managingId, setManagingId] = useState<string | null>(activeSpaceId);
  const [invitesBySpace, setInvitesBySpace] = useState<Record<string, InvitationRow[]>>({});
  const [membersBySpace, setMembersBySpace] = useState<Record<string, MemberRowData[]>>({});
  const [reload, setReload] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createHue, setCreateHue] = useState<number>(SPACE_HUES.personal);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);

  // Keep managing in sync with active when it changes externally
  useEffect(() => {
    if (managingId == null && spaces.length > 0) setManagingId(activeSpaceId ?? spaces[0]!.id);
  }, [activeSpaceId, spaces, managingId]);

  useEffect(() => {
    if (spaces.length === 0) return;
    (async () => {
      const inv: Record<string, InvitationRow[]> = {};
      const mem: Record<string, MemberRowData[]> = {};
      for (const s of spaces) {
        try {
          inv[s.id] = (await getInvitationsForSpace(supabase, s.id)) as InvitationRow[];
        } catch {
          inv[s.id] = [];
        }
        try {
          mem[s.id] = (await getMembersForSpace(supabase, s.id)) as MemberRowData[];
        } catch {
          mem[s.id] = [];
        }
      }
      setInvitesBySpace(inv);
      setMembersBySpace(mem);
    })();
  }, [spaces, reload]);

  const managingSpace = useMemo(
    () => (spaces.find((s) => s.id === managingId) as SpaceWithDefaults | undefined) ?? null,
    [spaces, managingId],
  );
  const managingHue = managingSpace ? spaceHue(managingSpace.tint) : SPACE_HUES.personal;
  const managingMembers = managingSpace ? membersBySpace[managingSpace.id] ?? [] : [];
  const managingInvites = managingSpace ? invitesBySpace[managingSpace.id] ?? [] : [];
  const isOwner = managingSpace ? managingSpace.owner_user_id === user?.id : false;
  const selfMember = managingMembers.find((m) => m.user_id === user?.id);

  const totalMembers = useMemo(() => {
    return Object.values(membersBySpace).reduce((acc, arr) => acc + arr.filter((m) => m.user_id && m.accepted_at).length, 0);
  }, [membersBySpace]);

  const pendingInvite = managingInvites.find((i) => inviteStatus(i) === "pending");
  const inviteExpiresIn = pendingInvite
    ? Math.max(0, Math.round((new Date(pendingInvite.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  function handleSelect(id: string) {
    setManagingId(id);
    setActive(id);
  }

  async function handleCreate() {
    if (!createName.trim()) return;
    const tint = HUE_TO_HEX[createHue] ?? "#1c4544";
    try {
      await createSpace(supabase, { name: createName.trim(), tint });
      setCreateName("");
      setCreateHue(SPACE_HUES.personal);
      setCreateOpen(false);
      refreshSpaces();
      setReload((r) => r + 1);
    } catch (e) {
      Alert.alert("Couldn't create space", e instanceof Error ? e.message : String(e));
    }
  }

  async function handleRename() {
    if (!managingSpace || !renameValue.trim()) return;
    try {
      await updateSpace(supabase, { space_id: managingSpace.id, name: renameValue.trim() });
      setRenameOpen(false);
      refreshSpaces();
      setReload((r) => r + 1);
    } catch (e) {
      Alert.alert("Couldn't rename", e instanceof Error ? e.message : String(e));
    }
  }

  async function handlePickColor(hue: number) {
    if (!managingSpace) return;
    try {
      await updateSpace(supabase, { space_id: managingSpace.id, tint: HUE_TO_HEX[hue] ?? "#1c4544" });
      setColorPickerOpen(false);
      refreshSpaces();
      setReload((r) => r + 1);
    } catch (e) {
      Alert.alert("Couldn't change color", e instanceof Error ? e.message : String(e));
    }
  }

  async function handleInvite() {
    if (!managingSpace || !inviteEmail.trim()) return;
    try {
      await inviteToSpace(supabase, { space_id: managingSpace.id, email: inviteEmail.trim() });
      setInviteEmail("");
      setInviteOpen(false);
      setReload((r) => r + 1);
    } catch (e) {
      Alert.alert("Couldn't invite", e instanceof Error ? e.message : String(e));
    }
  }

  async function handleRevoke(invId: string) {
    try {
      await revokeInvitation(supabase, invId);
      setReload((r) => r + 1);
    } catch (e) {
      Alert.alert("Couldn't revoke", e instanceof Error ? e.message : String(e));
    }
  }

  async function handleShare(token: string) {
    try {
      await Share.share({ message: `Join my Clear View Cash space: ${shareLink(token)}` });
    } catch {
      // user cancelled
    }
  }

  async function handleDelete() {
    if (!managingSpace) return;
    Alert.alert(
      `Delete "${managingSpace.name}"?`,
      "This removes the space and everything inside it (bills, budgets, goals, splits). Account links survive but stop being visible to other members. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteSpace(supabase, managingSpace.id);
              refreshSpaces();
              setReload((r) => r + 1);
              if (managingId === managingSpace.id) setManagingId(null);
            } catch (e) {
              Alert.alert("Couldn't delete", e instanceof Error ? e.message : String(e));
            }
          },
        },
      ],
    );
  }

  async function handleLeave() {
    if (!managingSpace) return;
    Alert.alert(
      `Leave "${managingSpace.name}"?`,
      "You'll lose access. Other members keep the space and its data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              await leaveSpace(supabase, managingSpace.id);
              refreshSpaces();
              setReload((r) => r + 1);
              setManagingId(null);
            } catch (e) {
              Alert.alert("Couldn't leave", e instanceof Error ? e.message : String(e));
            }
          },
        },
      ],
    );
  }

  async function togglePermSafe(memberUserId: string, key: "can_invite" | "can_rename" | "can_delete", next: boolean) {
    if (!managingSpace) return;
    try {
      await updateMemberPermissions(supabase, { space_id: managingSpace.id, user_id: memberUserId, [key]: next });
      setReload((r) => r + 1);
    } catch (e) {
      Alert.alert("Couldn't update", e instanceof Error ? e.message : String(e));
    }
  }

  async function toggleSharingDefault(key: "share_balances_default" | "share_transactions_default" | "members_can_edit" | "mine_shared_enabled", next: boolean) {
    if (!managingSpace) return;
    try {
      await updateSpaceSharingDefaults(supabase, { space_id: managingSpace.id, [key]: next });
      refreshSpaces();
      setReload((r) => r + 1);
    } catch (e) {
      Alert.alert("Couldn't save", e instanceof Error ? e.message : String(e));
    }
  }

  const accent = `oklch(${mode === "dark" ? "70% 0.110" : "60% 0.105"} ${managingHue})`;

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80, paddingTop: 4 }}>
        <PageHeader
          palette={palette}
          title="Spaces & Members"
          sub={`${spaces.length} ${spaces.length === 1 ? "space" : "spaces"} · ${totalMembers} ${totalMembers === 1 ? "member" : "members"}`}
          onBack={() => router.back()}
        />

        <SectionLabel palette={palette}>YOUR SPACES</SectionLabel>
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {spaces.map((s) => {
            const members = membersBySpace[s.id] ?? [];
            const acceptedCount = members.filter((m) => m.user_id && m.accepted_at).length || 1;
            const isSpaceOwner = s.owner_user_id === user?.id;
            return (
              <SpaceCard
                key={s.id}
                palette={palette}
                mode={mode}
                name={s.name}
                sub={acceptedCount === 1 ? "Just you" : `${acceptedCount} members`}
                hue={spaceHue(s.tint)}
                role={isSpaceOwner ? "OWNER" : "MEMBER"}
                members={acceptedCount}
                solo={acceptedCount === 1}
                active={s.id === managingId}
                onPress={() => handleSelect(s.id)}
              />
            );
          })}

          <Pressable
            onPress={() => setCreateOpen(true)}
            style={({ pressed }) => ({
              padding: 14,
              borderRadius: 12,
              backgroundColor: palette.surface,
              borderWidth: 1.5,
              borderStyle: "dashed",
              borderColor: palette.lineFirm,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13.5, fontWeight: "500", color: palette.ink2 }}>
              + Create or join a space
            </Text>
          </Pressable>
        </View>

        {managingSpace ? (
          <>
            <SectionLabel
              palette={palette}
              sub={isOwner ? "Manage members, sharing rules, and invites for the space below." : "You're a member here. Some controls are owner-only."}
            >
              MANAGING · {managingSpace.name.toUpperCase()}
            </SectionLabel>

            {/* Members card */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
              <View
                style={{
                  padding: 16,
                  borderRadius: 16,
                  backgroundColor: palette.surface,
                  borderWidth: 1,
                  borderColor: palette.line,
                  borderTopWidth: 3,
                  borderTopColor: accent,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "baseline", marginBottom: 4 }}>
                  <Text style={{ flex: 1, fontFamily: fonts.numMedium, fontSize: 10, color: palette.ink3, letterSpacing: 0.8, fontWeight: "600", textTransform: "uppercase" }}>
                    Members
                  </Text>
                  <Text style={{ fontFamily: fonts.num, fontSize: 11, color: palette.ink3 }}>
                    {managingMembers.filter((m) => m.user_id && m.accepted_at).length}
                  </Text>
                </View>

                {managingMembers
                  .filter((m) => m.user_id)
                  .map((m, i) => {
                    const isSelfRow = m.user_id === user?.id;
                    const isOwnerRow = m.role === "owner";
                    const showPermToggles = isOwner && !isOwnerRow && !isSelfRow && !!m.user_id;
                    const display = isSelfRow ? "You" : (m.invited_email ?? "Member");
                    return (
                      <View key={`${m.user_id ?? i}`}>
                        <MemberRow
                          palette={palette}
                          initials={initialsFromName(display === "You" ? user?.email ?? "You" : display)}
                          name={display}
                          sub={isOwnerRow ? "Owner" : (m.invited_email ?? "Editor")}
                          hue={isSelfRow ? managingHue : 30}
                          isYou={isSelfRow || isOwnerRow}
                          role={isOwnerRow ? "owner" : "editor"}
                          onChangeRole={undefined}
                        />
                        {showPermToggles ? (
                          <View style={{ flexDirection: "row", gap: 6, paddingLeft: 48, paddingBottom: 8 }}>
                            {(["can_invite", "can_rename", "can_delete"] as const).map((key) => {
                              const on = (m as unknown as Record<string, boolean>)[key];
                              const label = key === "can_invite" ? "Invite" : key === "can_rename" ? "Rename" : "Delete";
                              return (
                                <Pressable
                                  key={key}
                                  onPress={() => togglePermSafe(m.user_id!, key, !on)}
                                  style={{
                                    paddingHorizontal: 10,
                                    paddingVertical: 5,
                                    borderRadius: 999,
                                    backgroundColor: on ? palette.brand : palette.tinted,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontFamily: fonts.uiMedium,
                                      fontSize: 11,
                                      fontWeight: "500",
                                      color: on ? palette.brandOn : palette.ink2,
                                    }}
                                  >
                                    {label}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}

                {/* Invite */}
                {(isOwner || selfMember?.can_invite) && pendingInvite ? (
                  <View
                    style={{
                      marginTop: 12,
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: palette.sunken,
                      borderWidth: 1,
                      borderColor: palette.line,
                    }}
                  >
                    <Text style={{ fontFamily: fonts.numMedium, fontSize: 9.5, color: palette.ink3, letterSpacing: 0.8, fontWeight: "600", textTransform: "uppercase" }}>
                      Invite Link
                    </Text>
                    <View style={{ marginTop: 8, flexDirection: "row", gap: 8, alignItems: "center" }}>
                      <View
                        style={{
                          flex: 1,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 8,
                          backgroundColor: palette.surface,
                          borderWidth: 1,
                          borderColor: palette.line,
                        }}
                      >
                        <Text numberOfLines={1} style={{ fontFamily: fonts.num, fontSize: 11, color: palette.ink2 }}>
                          {shareLink(pendingInvite.token)}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => handleShare(pendingInvite.token)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 8,
                          backgroundColor: palette.brand,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        {Si.copy(palette.brandOn)}
                        <Text style={{ fontFamily: fonts.uiMedium, fontSize: 12, fontWeight: "500", color: palette.brandOn }}>Share</Text>
                      </Pressable>
                    </View>
                    <Text style={{ marginTop: 8, fontFamily: fonts.ui, fontSize: 11, color: palette.ink3, lineHeight: 17 }}>
                      Expires in <Text style={{ color: palette.ink2, fontWeight: "500" }}>{inviteExpiresIn} {inviteExpiresIn === 1 ? "day" : "days"}</Text>. Anyone with the link can request to join — you'll approve.
                    </Text>
                    <Pressable onPress={() => handleRevoke(pendingInvite.id)} style={{ marginTop: 8, alignSelf: "flex-start" }}>
                      <Text style={{ fontFamily: fonts.uiMedium, fontSize: 11.5, fontWeight: "500", color: palette.neg }}>Revoke</Text>
                    </Pressable>
                  </View>
                ) : null}

                {/* Invite by email button */}
                {(isOwner || selfMember?.can_invite) ? (
                  inviteOpen ? (
                    <View style={{ marginTop: 10, gap: 8 }}>
                      <TextInput
                        value={inviteEmail}
                        onChangeText={setInviteEmail}
                        placeholder="email@example.com"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        placeholderTextColor={palette.ink4}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          borderRadius: 10,
                          backgroundColor: palette.surface,
                          borderWidth: 1,
                          borderColor: palette.line,
                          fontFamily: fonts.ui,
                          fontSize: 14,
                          color: palette.ink1,
                        }}
                      />
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <Pressable onPress={() => setInviteOpen(false)} style={{ flex: 1, height: 38, borderRadius: 10, borderWidth: 1, borderColor: palette.lineFirm, alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontFamily: fonts.uiMedium, fontSize: 12.5, fontWeight: "500", color: palette.ink2 }}>Cancel</Text>
                        </Pressable>
                        <Pressable onPress={handleInvite} style={{ flex: 1, height: 38, borderRadius: 10, backgroundColor: palette.brand, alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontFamily: fonts.uiMedium, fontSize: 12.5, fontWeight: "500", color: palette.brandOn }}>Send invite</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => setInviteOpen(true)}
                      style={{
                        marginTop: 10,
                        height: 42,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: palette.lineFirm,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: palette.ink1 }}>
                        {pendingInvite ? "Invite by email instead" : "Invite a member"}
                      </Text>
                    </Pressable>
                  )
                ) : null}
              </View>
            </View>

            {/* Sharing rules */}
            {isOwner ? (
              <>
                <SectionLabel palette={palette}>SHARING RULES</SectionLabel>
                <Group palette={palette}>
                  <ToggleRow
                    palette={palette}
                    title="Share account balances"
                    sub="Members see balances for accounts shared into this space."
                    on={managingSpace.share_balances_default ?? true}
                    onChange={(v) => toggleSharingDefault("share_balances_default", v)}
                    accent={accent}
                  />
                  <ToggleRow
                    palette={palette}
                    title="Share transaction details"
                    sub="Includes merchant, amount, and notes. Members can re-categorize."
                    on={managingSpace.share_transactions_default ?? true}
                    onChange={(v) => toggleSharingDefault("share_transactions_default", v)}
                    accent={accent}
                  />
                  <ToggleRow
                    palette={palette}
                    title="Allow editing budgets and bills"
                    sub="Non-owners can add or change bills and budget caps in this space."
                    on={managingSpace.members_can_edit ?? true}
                    onChange={(v) => toggleSharingDefault("members_can_edit", v)}
                    accent={accent}
                  />
                  <ToggleRow
                    palette={palette}
                    title="Mark some transactions as Mine"
                    sub="Hide personal txns in shared accounts using the Mine/Shared flag."
                    on={managingSpace.mine_shared_enabled ?? true}
                    onChange={(v) => toggleSharingDefault("mine_shared_enabled", v)}
                    accent={accent}
                    last
                  />
                </Group>
                <View style={{ paddingHorizontal: 18, paddingTop: 8 }}>
                  <Text style={{ fontFamily: fonts.ui, fontSize: 11, color: palette.ink3, lineHeight: 16 }}>
                    Per-account overrides live in <Text style={{ color: palette.ink2 }}>Account → Sharing</Text>.
                  </Text>
                </View>
              </>
            ) : null}

            {/* Space settings */}
            {isOwner || selfMember?.can_rename ? (
              <>
                <SectionLabel palette={palette}>SPACE</SectionLabel>
                <Group palette={palette}>
                  <Row
                    palette={palette}
                    title="Rename space"
                    value={managingSpace.name}
                    onPress={() => {
                      setRenameValue(managingSpace.name);
                      setRenameOpen(true);
                    }}
                  />
                  <Row
                    palette={palette}
                    title="Space color"
                    right={
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <View style={{ width: 14, height: 14, borderRadius: 999, backgroundColor: `oklch(60% 0.105 ${managingHue})` }} />
                        {Si.chevR(palette.ink3)}
                      </View>
                    }
                    onPress={() => setColorPickerOpen(true)}
                    last
                  />
                </Group>
              </>
            ) : null}

            {/* Danger zone */}
            <SectionLabel palette={palette}>DANGER ZONE</SectionLabel>
            <Group palette={palette}>
              {!isOwner ? (
                <Row
                  palette={palette}
                  title="Leave space"
                  sub="You'll lose access. Other members keep the space and its data."
                  danger
                  onPress={handleLeave}
                  last={!isOwner}
                />
              ) : null}
              {isOwner || selfMember?.can_delete ? (
                <Row
                  palette={palette}
                  title="Delete space permanently"
                  sub="Removes the space for everyone. Cannot be undone."
                  danger
                  onPress={handleDelete}
                  last
                />
              ) : null}
            </Group>
          </>
        ) : null}
      </ScrollView>

      {/* Create modal */}
      <Modal visible={createOpen} transparent animationType="fade" onRequestClose={() => setCreateOpen(false)}>
        <Pressable onPress={() => setCreateOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 24 }}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: palette.surface, borderRadius: 18, padding: 18, gap: 12 }}>
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 18, fontWeight: "500", color: palette.ink1 }}>Create a space</Text>
            <TextInput
              value={createName}
              onChangeText={setCreateName}
              placeholder="House, Trip, Roommates…"
              placeholderTextColor={palette.ink4}
              maxLength={64}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: palette.surface,
                borderWidth: 1,
                borderColor: palette.line,
                fontFamily: fonts.ui,
                fontSize: 14,
                color: palette.ink1,
              }}
            />
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {HUE_VALUES.map((h) => (
                <Pressable
                  key={h}
                  onPress={() => setCreateHue(h)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: createHue === h ? `oklch(94% 0.026 ${h})` : palette.tinted,
                    borderWidth: createHue === h ? 1 : 0,
                    borderColor: `oklch(60% 0.105 ${h})`,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <View style={{ width: 12, height: 12, borderRadius: 999, backgroundColor: `oklch(60% 0.105 ${h})` }} />
                  <Text style={{ fontFamily: fonts.uiMedium, fontSize: 12, fontWeight: "500", color: palette.ink2 }}>{HUE_LABELS[h]}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => router.push("/accept-invite")}
                style={{ flex: 1, height: 42, borderRadius: 10, borderWidth: 1, borderColor: palette.lineFirm, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: palette.ink2 }}>I have an invite</Text>
              </Pressable>
              <Pressable
                onPress={handleCreate}
                disabled={!createName.trim()}
                style={{ flex: 1, height: 42, borderRadius: 10, backgroundColor: palette.brand, alignItems: "center", justifyContent: "center", opacity: createName.trim() ? 1 : 0.5 }}
              >
                <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: palette.brandOn }}>Create</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Rename modal */}
      <Modal visible={renameOpen} transparent animationType="fade" onRequestClose={() => setRenameOpen(false)}>
        <Pressable onPress={() => setRenameOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 24 }}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: palette.surface, borderRadius: 18, padding: 18, gap: 12 }}>
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 18, fontWeight: "500", color: palette.ink1 }}>Rename space</Text>
            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              maxLength={64}
              autoFocus
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: palette.surface,
                borderWidth: 1,
                borderColor: palette.line,
                fontFamily: fonts.ui,
                fontSize: 14,
                color: palette.ink1,
              }}
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable onPress={() => setRenameOpen(false)} style={{ flex: 1, height: 42, borderRadius: 10, borderWidth: 1, borderColor: palette.lineFirm, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: palette.ink2 }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleRename} disabled={!renameValue.trim()} style={{ flex: 1, height: 42, borderRadius: 10, backgroundColor: palette.brand, alignItems: "center", justifyContent: "center", opacity: renameValue.trim() ? 1 : 0.5 }}>
                <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: palette.brandOn }}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Color picker modal */}
      <Modal visible={colorPickerOpen} transparent animationType="fade" onRequestClose={() => setColorPickerOpen(false)}>
        <Pressable onPress={() => setColorPickerOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 24 }}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: palette.surface, borderRadius: 18, padding: 18, gap: 12 }}>
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 18, fontWeight: "500", color: palette.ink1 }}>Space color</Text>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {HUE_VALUES.map((h) => (
                <Pressable
                  key={h}
                  onPress={() => handlePickColor(h)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 999,
                    backgroundColor: managingHue === h ? `oklch(94% 0.026 ${h})` : palette.tinted,
                    borderWidth: managingHue === h ? 1 : 0,
                    borderColor: `oklch(60% 0.105 ${h})`,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <View style={{ width: 14, height: 14, borderRadius: 999, backgroundColor: `oklch(60% 0.105 ${h})` }} />
                  <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: palette.ink2 }}>{HUE_LABELS[h]}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
