import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Share, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Button, Card, HStack, Stack, Text, colors, radius, space } from "@cvc/ui";
import {
  createSpace,
  deleteSpace,
  getInvitationsForSpace,
  getMembersForSpace,
  inviteToSpace,
  revokeInvitation,
  updateMemberPermissions,
  updateSpace,
} from "@cvc/api-client";
import { supabase } from "../../lib/supabase";
import { useSpaces } from "../../hooks/useSpaces";
import { useAuth } from "../../hooks/useAuth";

interface InvitationRow {
  id: string;
  email: string;
  token: string;
  expires_at: string;
  accepted_user_id: string | null;
  created_at: string;
}

interface MemberRow {
  user_id: string | null;
  role: "owner" | "member";
  invited_email: string | null;
  accepted_at: string | null;
  can_invite: boolean;
  can_rename: boolean;
  can_delete: boolean;
}

type PermKey = "can_invite" | "can_rename" | "can_delete";

const PERM_LABEL: Record<PermKey, string> = {
  can_invite: "Invite",
  can_rename: "Rename",
  can_delete: "Delete",
};

function inviteStatus(inv: InvitationRow): "accepted" | "expired" | "pending" {
  if (inv.accepted_user_id) return "accepted";
  if (new Date(inv.expires_at) < new Date()) return "expired";
  return "pending";
}

const inputStyle = {
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radius.md,
  padding: space.md,
};

export default function Spaces() {
  const { spaces, refresh: refreshSpaces } = useSpaces();
  const { user } = useAuth();
  const [newName, setNewName] = useState("");
  const [newTint, setNewTint] = useState("#10B981");
  const [inviteFor, setInviteFor] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [editFor, setEditFor] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTint, setEditTint] = useState("");
  const [invitesBySpace, setInvitesBySpace] = useState<Record<string, InvitationRow[]>>({});
  const [membersBySpace, setMembersBySpace] = useState<Record<string, MemberRow[]>>({});
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (spaces.length === 0) return;
    (async () => {
      const inv: Record<string, InvitationRow[]> = {};
      const mem: Record<string, MemberRow[]> = {};
      for (const s of spaces) {
        try {
          inv[s.id] = (await getInvitationsForSpace(supabase, s.id)) as InvitationRow[];
        } catch {
          inv[s.id] = [];
        }
        try {
          mem[s.id] = (await getMembersForSpace(supabase, s.id)) as MemberRow[];
        } catch {
          mem[s.id] = [];
        }
      }
      setInvitesBySpace(inv);
      setMembersBySpace(mem);
    })();
  }, [spaces, reload]);

  async function onCreate() {
    if (!newName) return;
    await createSpace(supabase, { name: newName, tint: newTint });
    setNewName("");
    refreshSpaces();
    setReload((r) => r + 1);
  }

  function startEdit(s: { id: string; name: string; tint: string }) {
    setEditFor(s.id);
    setEditName(s.name);
    setEditTint(s.tint);
  }

  async function saveEdit() {
    if (!editFor || !editName.trim()) return;
    try {
      await updateSpace(supabase, {
        space_id: editFor,
        name: editName.trim(),
        tint: editTint.trim() || undefined,
      });
      setEditFor(null);
      refreshSpaces();
      setReload((r) => r + 1);
    } catch (e) {
      Alert.alert("Couldn't save", e instanceof Error ? e.message : String(e));
    }
  }

  async function onInvite() {
    if (!inviteFor || !inviteEmail) return;
    await inviteToSpace(supabase, { space_id: inviteFor, email: inviteEmail });
    setInviteEmail("");
    setInviteFor(null);
    setReload((r) => r + 1);
  }

  async function onShareToken(inv: InvitationRow) {
    const link = `https://app.clearviewcash.com/accept-invite?token=${inv.token}`;
    try {
      await Share.share({ message: `Join my Clear View Cash space: ${link}` });
    } catch {
      // user cancelled
    }
  }

  async function onRevoke(invitationId: string) {
    await revokeInvitation(supabase, invitationId);
    setReload((r) => r + 1);
  }

  async function togglePerm(spaceId: string, memberUserId: string, key: PermKey, next: boolean) {
    try {
      await updateMemberPermissions(supabase, {
        space_id: spaceId,
        user_id: memberUserId,
        [key]: next,
      });
      setReload((r) => r + 1);
    } catch (e) {
      Alert.alert("Couldn't update permission", e instanceof Error ? e.message : String(e));
    }
  }

  function onDelete(spaceId: string, spaceName: string) {
    Alert.alert(
      `Delete "${spaceName}"?`,
      "This removes the space and everything inside it (bills, budgets, goals, splits). Account links survive but stop being visible to other members. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteSpace(supabase, spaceId);
              refreshSpaces();
              setReload((r) => r + 1);
            } catch (e) {
              Alert.alert("Couldn't delete space", e instanceof Error ? e.message : String(e));
            }
          },
        },
      ],
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, backgroundColor: colors.bg }}>
      <Text variant="h2">Spaces & Members</Text>

      <Pressable onPress={() => router.push("/accept-invite")}>
        <Card>
          <HStack justify="space-between" align="center">
            <Stack gap="xs">
              <Text variant="title">Have an invite token?</Text>
              <Text variant="muted">Paste it here to join a space.</Text>
            </Stack>
            <Text variant="muted">›</Text>
          </HStack>
        </Card>
      </Pressable>

      {spaces.map((s) => {
        const invites = invitesBySpace[s.id] ?? [];
        const members = membersBySpace[s.id] ?? [];
        const self = members.find((m) => m.user_id === user?.id);
        const isOwner = s.owner_user_id === user?.id;
        const canInvite = isOwner || !!self?.can_invite;
        const canRename = isOwner || !!self?.can_rename;
        const canDelete = isOwner || !!self?.can_delete;
        const isEditing = editFor === s.id;
        return (
          <Card key={s.id}>
            <Stack gap="md">
              <HStack justify="space-between" align="center">
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, flex: 1 }}>
                  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: s.tint }} />
                  <Text variant="title">{s.name}</Text>
                </View>
                {canRename && !isEditing ? (
                  <Pressable onPress={() => startEdit(s)} hitSlop={10}>
                    <Text variant="muted">Edit</Text>
                  </Pressable>
                ) : null}
              </HStack>

              {isEditing ? (
                <Stack gap="sm">
                  <TextInput
                    placeholder="Space name"
                    value={editName}
                    onChangeText={setEditName}
                    maxLength={64}
                    style={inputStyle}
                  />
                  <TextInput
                    placeholder="#RRGGBB"
                    value={editTint}
                    onChangeText={setEditTint}
                    autoCapitalize="characters"
                    style={inputStyle}
                  />
                  <HStack gap="sm">
                    <Button
                      label="Save"
                      onPress={saveEdit}
                      disabled={!editName.trim()}
                      style={{ flex: 1 }}
                    />
                    <Button
                      label="Cancel"
                      variant="secondary"
                      onPress={() => setEditFor(null)}
                      style={{ flex: 1 }}
                    />
                  </HStack>
                </Stack>
              ) : null}

              {members.length > 0 ? (
                <Stack gap="xs">
                  <Text variant="label">Members</Text>
                  {members.map((m, i) => {
                    const isSelfRow = m.user_id === user?.id;
                    const isOwnerRow = m.role === "owner";
                    const showPermToggles = isOwner && !isOwnerRow && !isSelfRow && !!m.user_id;
                    return (
                      <Stack key={`${m.user_id ?? m.invited_email}-${i}`} gap="xs">
                        <HStack justify="space-between">
                          <Text>
                            {isSelfRow ? "You" : m.invited_email ?? m.user_id ?? "—"}
                          </Text>
                          <Text variant="muted">
                            {m.role}
                            {m.accepted_at ? "" : " · pending"}
                          </Text>
                        </HStack>
                        {showPermToggles ? (
                          <HStack gap="xs">
                            {(Object.keys(PERM_LABEL) as PermKey[]).map((key) => {
                              const on = m[key];
                              return (
                                <Pressable
                                  key={key}
                                  onPress={() => togglePerm(s.id, m.user_id!, key, !on)}
                                  style={{
                                    flex: 1,
                                    paddingVertical: space.xs,
                                    paddingHorizontal: space.sm,
                                    borderRadius: radius.sm,
                                    borderWidth: 1,
                                    borderColor: on ? colors.primary : colors.border,
                                    backgroundColor: on ? colors.primary : "transparent",
                                    alignItems: "center",
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 12,
                                      fontWeight: "600",
                                      color: on ? "#FFFFFF" : colors.textMuted,
                                    }}
                                  >
                                    {PERM_LABEL[key]}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </HStack>
                        ) : null}
                      </Stack>
                    );
                  })}
                </Stack>
              ) : null}

              {canInvite && invites.length > 0 ? (
                <Stack gap="xs">
                  <Text variant="label">Invitations</Text>
                  {invites.map((inv) => {
                    const status = inviteStatus(inv);
                    return (
                      <Stack key={inv.id} gap="xs">
                        <HStack justify="space-between">
                          <Text>{inv.email}</Text>
                          <Text
                            variant="muted"
                            style={{
                              color:
                                status === "accepted"
                                  ? colors.positive
                                  : status === "expired"
                                    ? colors.negative
                                    : colors.textMuted,
                            }}
                          >
                            {status}
                          </Text>
                        </HStack>
                        {status === "pending" ? (
                          <HStack gap="sm">
                            <Button
                              label="Share link"
                              variant="secondary"
                              onPress={() => onShareToken(inv)}
                              style={{ flex: 1 }}
                            />
                            <Button
                              label="Revoke"
                              variant="secondary"
                              onPress={() => onRevoke(inv.id)}
                              style={{ flex: 1 }}
                            />
                          </HStack>
                        ) : null}
                      </Stack>
                    );
                  })}
                </Stack>
              ) : null}

              {canInvite || canDelete ? (
                <Stack gap="sm">
                  {canInvite ? (
                    <Button
                      label="Invite member"
                      variant="secondary"
                      onPress={() => setInviteFor(s.id)}
                    />
                  ) : null}
                  {inviteFor === s.id && canInvite ? (
                    <Stack gap="sm">
                      <TextInput
                        placeholder="email@example.com"
                        value={inviteEmail}
                        onChangeText={setInviteEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        style={inputStyle}
                      />
                      <Button label="Send invite" onPress={onInvite} />
                    </Stack>
                  ) : null}
                  {canDelete ? (
                    <Button
                      label="Delete space"
                      variant="destructive"
                      onPress={() => onDelete(s.id, s.name)}
                    />
                  ) : null}
                </Stack>
              ) : null}
            </Stack>
          </Card>
        );
      })}

      <Card>
        <Stack gap="sm">
          <Text variant="title">New space</Text>
          <TextInput
            placeholder="House, Trip, Roommates…"
            value={newName}
            onChangeText={setNewName}
            style={inputStyle}
          />
          <TextInput
            placeholder="#10B981"
            value={newTint}
            onChangeText={setNewTint}
            style={inputStyle}
          />
          <Button label="Create space" onPress={onCreate} disabled={!newName} />
        </Stack>
      </Card>
    </ScrollView>
  );
}
