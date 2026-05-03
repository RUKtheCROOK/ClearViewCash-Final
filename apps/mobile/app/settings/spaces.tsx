import { useEffect, useState } from "react";
import { Pressable, ScrollView, Share, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Button, Card, HStack, Stack, Text, colors, radius, space } from "@cvc/ui";
import {
  createSpace,
  getInvitationsForSpace,
  getMembersForSpace,
  inviteToSpace,
  revokeInvitation,
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
}

function inviteStatus(inv: InvitationRow): "accepted" | "expired" | "pending" {
  if (inv.accepted_user_id) return "accepted";
  if (new Date(inv.expires_at) < new Date()) return "expired";
  return "pending";
}

export default function Spaces() {
  const { spaces } = useSpaces();
  const { user } = useAuth();
  const [newName, setNewName] = useState("");
  const [newTint, setNewTint] = useState("#10B981");
  const [inviteFor, setInviteFor] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
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
    setReload((r) => r + 1);
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
        const isOwner = members.some((m) => m.user_id === user?.id && m.role === "owner");
        return (
          <Card key={s.id}>
            <Stack gap="md">
              <HStack justify="space-between" align="center">
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: s.tint }} />
                  <Text variant="title">{s.name}</Text>
                </View>
                <Text variant="muted">{s.kind}</Text>
              </HStack>

              {members.length > 0 ? (
                <Stack gap="xs">
                  <Text variant="label">Members</Text>
                  {members.map((m, i) => (
                    <HStack key={`${m.user_id ?? m.invited_email}-${i}`} justify="space-between">
                      <Text>
                        {m.user_id === user?.id ? "You" : m.invited_email ?? m.user_id ?? "—"}
                      </Text>
                      <Text variant="muted">
                        {m.role}
                        {m.accepted_at ? "" : " · pending"}
                      </Text>
                    </HStack>
                  ))}
                </Stack>
              ) : null}

              {isOwner && invites.length > 0 ? (
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

              {isOwner && s.kind === "shared" ? (
                <Stack gap="sm">
                  <Button label="Invite member" variant="secondary" onPress={() => setInviteFor(s.id)} />
                  {inviteFor === s.id ? (
                    <Stack gap="sm">
                      <TextInput
                        placeholder="email@example.com"
                        value={inviteEmail}
                        onChangeText={setInviteEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        style={{
                          borderWidth: 1,
                          borderColor: colors.border,
                          borderRadius: radius.md,
                          padding: space.md,
                        }}
                      />
                      <Button label="Send invite" onPress={onInvite} />
                    </Stack>
                  ) : null}
                </Stack>
              ) : null}
            </Stack>
          </Card>
        );
      })}

      <Card>
        <Stack gap="sm">
          <Text variant="title">New shared space</Text>
          <TextInput
            placeholder="House, Trip, Roommates…"
            value={newName}
            onChangeText={setNewName}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: space.md,
            }}
          />
          <TextInput
            placeholder="#10B981"
            value={newTint}
            onChangeText={setNewTint}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: space.md,
            }}
          />
          <Button label="Create space" onPress={onCreate} disabled={!newName} />
        </Stack>
      </Card>
    </ScrollView>
  );
}
