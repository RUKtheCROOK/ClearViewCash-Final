"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import { SPACE_HUES, spaceKeyFromTint } from "../_components/theme-helpers";
import {
  createSpace,
  deleteSpace,
  getInvitationsForSpace,
  getMembersForSpace,
  getMySpaces,
  inviteToSpace,
  leaveSpace,
  revokeInvitation,
  updateMemberPermissions,
  updateSpace,
  updateSpaceSharingDefaults,
} from "@cvc/api-client";
import { useTheme } from "../../../lib/theme-provider";
import { Group, PageHeader, Row, SectionLabel, ToggleRow } from "../_components/SettingsAtoms";
import { SpaceCard } from "../_components/SpaceCard";
import { MemberRow } from "../_components/MemberRow";
import { Si } from "../_components/settingsGlyphs";
import { PartnerInvitePending, PartnerNoData } from "../../../components/states";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

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

interface Space {
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

export default function SpacesPage() {
  const router = useRouter();
  const { resolved } = useTheme();
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [managingId, setManagingId] = useState<string | null>(null);
  const [membersBySpace, setMembersBySpace] = useState<Record<string, MemberRowData[]>>({});
  const [invitesBySpace, setInvitesBySpace] = useState<Record<string, InvitationRow[]>>({});
  const [reload, setReload] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createHue, setCreateHue] = useState<number>(SPACE_HUES.personal);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (cancelled) return;
      setUserId(sess.session?.user?.id ?? null);
      setUserEmail(sess.session?.user?.email ?? "");
      try {
        const rows = (await getMySpaces(supabase)) as unknown as Space[];
        if (cancelled) return;
        setSpaces(rows);
        const stored = typeof window !== "undefined" ? window.localStorage.getItem("cvc-active-space") : null;
        const valid = stored && rows.some((s) => s.id === stored) ? stored : rows[0]?.id ?? null;
        setManagingId(valid);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load spaces");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  useEffect(() => {
    if (spaces.length === 0) return;
    let cancelled = false;
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
      if (cancelled) return;
      setInvitesBySpace(inv);
      setMembersBySpace(mem);
    })();
    return () => {
      cancelled = true;
    };
  }, [spaces, reload]);

  const managingSpace = useMemo(() => spaces.find((s) => s.id === managingId) ?? null, [spaces, managingId]);
  const managingHue = managingSpace ? spaceHue(managingSpace.tint) : SPACE_HUES.personal;
  const managingMembers = managingSpace ? membersBySpace[managingSpace.id] ?? [] : [];
  const managingInvites = managingSpace ? invitesBySpace[managingSpace.id] ?? [] : [];
  const isOwner = managingSpace ? managingSpace.owner_user_id === userId : false;
  const selfMember = managingMembers.find((m) => m.user_id === userId);

  const totalMembers = useMemo(() => {
    return Object.values(membersBySpace).reduce((acc, arr) => acc + arr.filter((m) => m.user_id && m.accepted_at).length, 0);
  }, [membersBySpace]);

  const pendingInvite = managingInvites.find((i) => inviteStatus(i) === "pending");
  const inviteExpiresIn = pendingInvite
    ? Math.max(0, Math.round((new Date(pendingInvite.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const acceptedMembers = managingMembers.filter((m) => m.user_id != null && m.accepted_at != null);
  const showPartnerInvitePending = managingSpace != null && pendingInvite != null && acceptedMembers.length <= 1;
  const showPartnerNoData =
    managingSpace != null &&
    !showPartnerInvitePending &&
    acceptedMembers.length >= 2 &&
    managingSpace.owner_user_id === userId;
  const newestPartner = showPartnerNoData
    ? [...acceptedMembers]
        .filter((m) => m.user_id !== userId && m.accepted_at)
        .sort((a, b) => (b.accepted_at ?? "").localeCompare(a.accepted_at ?? ""))[0]
    : null;
  const partnerJoinedRelative = newestPartner?.accepted_at
    ? ((): string => {
        const diff = Date.now() - new Date(newestPartner.accepted_at as string).getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days <= 0) return "today";
        if (days === 1) return "yesterday";
        if (days < 7) return `${days} days ago`;
        if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
        return `${Math.floor(days / 30)} months ago`;
      })()
    : "recently";

  function handleSelect(id: string) {
    setManagingId(id);
    if (typeof window !== "undefined") window.localStorage.setItem("cvc-active-space", id);
  }

  async function handleCreate() {
    if (!createName.trim()) return;
    const tint = HUE_TO_HEX[createHue] ?? "#1c4544";
    try {
      await createSpace(supabase, { name: createName.trim(), tint });
      setCreateName("");
      setCreateHue(SPACE_HUES.personal);
      setCreateOpen(false);
      setReload((r) => r + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleRename() {
    if (!managingSpace || !renameValue.trim()) return;
    try {
      await updateSpace(supabase, { space_id: managingSpace.id, name: renameValue.trim() });
      setRenameOpen(false);
      setReload((r) => r + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handlePickColor(hue: number) {
    if (!managingSpace) return;
    try {
      await updateSpace(supabase, { space_id: managingSpace.id, tint: HUE_TO_HEX[hue] ?? "#1c4544" });
      setColorPickerOpen(false);
      setReload((r) => r + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
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
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleRevoke(invId: string) {
    try {
      await revokeInvitation(supabase, invId);
      setReload((r) => r + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleCopyLink(token: string) {
    try {
      await navigator.clipboard.writeText(shareLink(token));
    } catch {
      // Fallback: show the link in a prompt for manual copy
      window.prompt("Copy this invite link:", shareLink(token));
    }
  }

  async function handleDelete() {
    if (!managingSpace) return;
    const ok = window.confirm(`Delete "${managingSpace.name}"? This removes the space and everything inside it. Cannot be undone.`);
    if (!ok) return;
    try {
      await deleteSpace(supabase, managingSpace.id);
      setReload((r) => r + 1);
      setManagingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleLeave() {
    if (!managingSpace) return;
    const ok = window.confirm(`Leave "${managingSpace.name}"? You'll lose access. Other members keep the space.`);
    if (!ok) return;
    try {
      await leaveSpace(supabase, managingSpace.id);
      setReload((r) => r + 1);
      setManagingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function togglePermSafe(memberUserId: string, key: "can_invite" | "can_rename" | "can_delete", next: boolean) {
    if (!managingSpace) return;
    try {
      await updateMemberPermissions(supabase, { space_id: managingSpace.id, user_id: memberUserId, [key]: next });
      setReload((r) => r + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function toggleSharingDefault(key: "share_balances_default" | "share_transactions_default" | "members_can_edit" | "mine_shared_enabled", next: boolean) {
    if (!managingSpace) return;
    try {
      await updateSpaceSharingDefaults(supabase, { space_id: managingSpace.id, [key]: next });
      setReload((r) => r + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const accent = `oklch(${resolved === "dark" ? "70% 0.110" : "60% 0.105"} ${managingHue})`;

  return (
    <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", paddingBottom: 60 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <PageHeader
          title="Spaces & Members"
          sub={`${spaces.length} ${spaces.length === 1 ? "space" : "spaces"} · ${totalMembers} ${totalMembers === 1 ? "member" : "members"}`}
          backHref="/settings"
          onBack={() => router.push("/settings")}
        />

        {error ? (
          <div style={{ padding: "0 16px 8px" }}>
            <div style={{ padding: 12, borderRadius: 12, background: "var(--neg-tint)", color: "var(--neg)", fontSize: 13 }}>{error}</div>
          </div>
        ) : null}

        <SectionLabel>YOUR SPACES</SectionLabel>
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {spaces.map((s) => {
            const members = membersBySpace[s.id] ?? [];
            const acceptedCount = members.filter((m) => m.user_id && m.accepted_at).length || 1;
            const isSpaceOwner = s.owner_user_id === userId;
            return (
              <SpaceCard
                key={s.id}
                mode={resolved}
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

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            style={{
              padding: 14,
              borderRadius: 12,
              background: "var(--bg-surface)",
              border: "1.5px dashed var(--line-firm)",
              cursor: "pointer",
              color: "var(--ink-2)",
              fontFamily: "var(--font-ui)",
              fontSize: 13.5,
              fontWeight: 500,
            }}
          >
            + Create or join a space
          </button>
        </div>

        {managingSpace ? (
          <>
            <SectionLabel sub={isOwner ? "Manage members, sharing rules, and invites for the space below." : "You're a member here. Some controls are owner-only."}>
              MANAGING · {managingSpace.name.toUpperCase()}
            </SectionLabel>

            {showPartnerInvitePending && pendingInvite ? (
              <PartnerInvitePending
                spaceName={managingSpace.name}
                spaceHue={managingHue}
                inviteeName={(pendingInvite.email ?? "Your invitee").split("@")[0] || "Your invitee"}
                inviteeEmail={pendingInvite.email ?? "—"}
                invitedOn={new Date(pendingInvite.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
                inviteLink={shareLink(pendingInvite.token)}
                expiryLabel={
                  inviteExpiresIn != null
                    ? `INVITE LINK · EXPIRES IN ${inviteExpiresIn} ${inviteExpiresIn === 1 ? "DAY" : "DAYS"}`
                    : "INVITE LINK"
                }
                onResend={() => handleCopyLink(pendingInvite.token)}
                onCancel={() => handleRevoke(pendingInvite.id)}
              />
            ) : null}

            {showPartnerNoData && newestPartner ? (
              <PartnerNoData
                spaceName={managingSpace.name}
                spaceHue={managingHue}
                partnerName={(newestPartner.invited_email ?? "Your partner").split("@")[0] || "Your partner"}
                partnerJoinedRelative={partnerJoinedRelative}
                selfInitials={(selfMember?.invited_email ?? "You").slice(0, 2).toUpperCase()}
                partnerInitials={(newestPartner.invited_email ?? "P").slice(0, 2).toUpperCase()}
              />
            ) : null}

            <div style={{ padding: "0 16px 12px" }}>
              <div
                style={{
                  padding: 16,
                  borderRadius: 16,
                  background: "var(--bg-surface)",
                  border: "1px solid var(--line-soft)",
                  borderTop: `3px solid ${accent}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", marginBottom: 4 }}>
                  <span
                    style={{
                      flex: 1,
                      fontFamily: "var(--font-num)",
                      fontSize: 10,
                      color: "var(--ink-3)",
                      letterSpacing: "0.08em",
                      fontWeight: 600,
                      textTransform: "uppercase",
                    }}
                  >
                    Members
                  </span>
                  <span style={{ fontFamily: "var(--font-num)", fontSize: 11, color: "var(--ink-3)" }}>
                    {managingMembers.filter((m) => m.user_id && m.accepted_at).length}
                  </span>
                </div>

                {managingMembers
                  .filter((m) => m.user_id)
                  .map((m, i) => {
                    const isSelfRow = m.user_id === userId;
                    const isOwnerRow = m.role === "owner";
                    const showPermToggles = isOwner && !isOwnerRow && !isSelfRow && !!m.user_id;
                    const display = isSelfRow ? "You" : m.invited_email ?? "Member";
                    return (
                      <div key={`${m.user_id ?? i}`}>
                        <MemberRow
                          initials={initialsFromName(display === "You" ? userEmail : display)}
                          name={display}
                          sub={isOwnerRow ? "Owner" : m.invited_email ?? "Editor"}
                          hue={isSelfRow ? managingHue : 30}
                          isYou={isSelfRow || isOwnerRow}
                          role={isOwnerRow ? "owner" : "editor"}
                        />
                        {showPermToggles ? (
                          <div style={{ display: "flex", gap: 6, paddingLeft: 48, paddingBottom: 8 }}>
                            {(["can_invite", "can_rename", "can_delete"] as const).map((key) => {
                              const on = (m as unknown as Record<string, boolean>)[key];
                              const label = key === "can_invite" ? "Invite" : key === "can_rename" ? "Rename" : "Delete";
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => togglePermSafe(m.user_id!, key, !on)}
                                  style={{
                                    padding: "5px 10px",
                                    borderRadius: 999,
                                    background: on ? "var(--brand)" : "var(--bg-tinted)",
                                    color: on ? "var(--brand-on)" : "var(--ink-2)",
                                    border: 0,
                                    cursor: "pointer",
                                    fontFamily: "var(--font-ui)",
                                    fontSize: 11,
                                    fontWeight: 500,
                                  }}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}

                {(isOwner || selfMember?.can_invite) && pendingInvite ? (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      borderRadius: 12,
                      background: "var(--bg-sunken)",
                      border: "1px solid var(--line-soft)",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-num)",
                        fontSize: 9.5,
                        color: "var(--ink-3)",
                        letterSpacing: "0.08em",
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    >
                      Invite Link
                    </div>
                    <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
                      <div
                        style={{
                          padding: "8px 12px",
                          borderRadius: 8,
                          background: "var(--bg-surface)",
                          border: "1px solid var(--line-soft)",
                          fontFamily: "var(--font-num)",
                          fontSize: 11,
                          color: "var(--ink-2)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {shareLink(pendingInvite.token)}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyLink(pendingInvite.token)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 8,
                          background: "var(--brand)",
                          color: "var(--brand-on)",
                          border: 0,
                          cursor: "pointer",
                          fontFamily: "var(--font-ui)",
                          fontSize: 12,
                          fontWeight: 500,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        {Si.copy("var(--brand-on)")}
                        Copy
                      </button>
                    </div>
                    <div style={{ marginTop: 8, fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)", lineHeight: 1.5 }}>
                      Expires in <span style={{ color: "var(--ink-2)", fontWeight: 500 }}>{inviteExpiresIn} {inviteExpiresIn === 1 ? "day" : "days"}</span>. Anyone with the link can request to join — you'll approve.
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRevoke(pendingInvite.id)}
                      style={{
                        marginTop: 8,
                        background: "transparent",
                        border: 0,
                        cursor: "pointer",
                        color: "var(--neg)",
                        fontFamily: "var(--font-ui)",
                        fontSize: 11.5,
                        fontWeight: 500,
                        padding: 0,
                      }}
                    >
                      Revoke
                    </button>
                  </div>
                ) : null}

                {isOwner || selfMember?.can_invite ? (
                  inviteOpen ? (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="email@example.com"
                        style={{
                          padding: "10px 12px",
                          borderRadius: 10,
                          background: "var(--bg-surface)",
                          border: "1px solid var(--line-soft)",
                          fontFamily: "var(--font-ui)",
                          fontSize: 14,
                          color: "var(--ink-1)",
                        }}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => setInviteOpen(false)}
                          style={{
                            flex: 1,
                            height: 38,
                            borderRadius: 10,
                            border: "1px solid var(--line-firm)",
                            background: "transparent",
                            color: "var(--ink-2)",
                            cursor: "pointer",
                            fontFamily: "var(--font-ui)",
                            fontSize: 12.5,
                            fontWeight: 500,
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleInvite}
                          style={{
                            flex: 1,
                            height: 38,
                            borderRadius: 10,
                            background: "var(--brand)",
                            color: "var(--brand-on)",
                            border: 0,
                            cursor: "pointer",
                            fontFamily: "var(--font-ui)",
                            fontSize: 12.5,
                            fontWeight: 500,
                          }}
                        >
                          Send invite
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setInviteOpen(true)}
                      style={{
                        marginTop: 10,
                        width: "100%",
                        height: 42,
                        borderRadius: 10,
                        background: "transparent",
                        border: "1px solid var(--line-firm)",
                        color: "var(--ink-1)",
                        cursor: "pointer",
                        fontFamily: "var(--font-ui)",
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      {pendingInvite ? "Invite by email instead" : "Invite a member"}
                    </button>
                  )
                ) : null}
              </div>
            </div>

            {isOwner ? (
              <>
                <SectionLabel>SHARING RULES</SectionLabel>
                <Group>
                  <ToggleRow
                    title="Share account balances"
                    sub="Members see balances for accounts shared into this space."
                    on={managingSpace.share_balances_default ?? true}
                    onChange={(v) => toggleSharingDefault("share_balances_default", v)}
                    accent={accent}
                  />
                  <ToggleRow
                    title="Share transaction details"
                    sub="Includes merchant, amount, and notes. Members can re-categorize."
                    on={managingSpace.share_transactions_default ?? true}
                    onChange={(v) => toggleSharingDefault("share_transactions_default", v)}
                    accent={accent}
                  />
                  <ToggleRow
                    title="Allow editing budgets and bills"
                    sub="Non-owners can add or change bills and budget caps in this space."
                    on={managingSpace.members_can_edit ?? true}
                    onChange={(v) => toggleSharingDefault("members_can_edit", v)}
                    accent={accent}
                  />
                  <ToggleRow
                    title="Mark some transactions as Mine"
                    sub="Hide personal txns in shared accounts using the Mine/Shared flag."
                    on={managingSpace.mine_shared_enabled ?? true}
                    onChange={(v) => toggleSharingDefault("mine_shared_enabled", v)}
                    accent={accent}
                    last
                  />
                </Group>
                <div style={{ padding: "8px 18px 0", fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)", lineHeight: 1.5 }}>
                  Per-account overrides live in <span style={{ color: "var(--ink-2)" }}>Account → Sharing</span>.
                </div>
              </>
            ) : null}

            {isOwner || selfMember?.can_rename ? (
              <>
                <SectionLabel>SPACE</SectionLabel>
                <Group>
                  <Row
                    title="Rename space"
                    value={managingSpace.name}
                    onPress={() => {
                      setRenameValue(managingSpace.name);
                      setRenameOpen(true);
                    }}
                  />
                  <Row
                    title="Space color"
                    right={
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 14, height: 14, borderRadius: 999, background: `oklch(60% 0.105 ${managingHue})` }} />
                        {Si.chevR("var(--ink-3)")}
                      </span>
                    }
                    onPress={() => setColorPickerOpen(true)}
                    last
                  />
                </Group>
              </>
            ) : null}

            <SectionLabel>DANGER ZONE</SectionLabel>
            <Group>
              {!isOwner ? (
                <Row
                  title="Leave space"
                  sub="You'll lose access. Other members keep the space and its data."
                  danger
                  onPress={handleLeave}
                  last={!isOwner}
                />
              ) : null}
              {isOwner || selfMember?.can_delete ? (
                <Row
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
      </div>

      {/* Create modal */}
      {createOpen ? (
        <div onClick={() => setCreateOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "grid", placeItems: "center", padding: 24, zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, width: "100%", background: "var(--bg-surface)", borderRadius: 18, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ margin: 0, fontFamily: "var(--font-ui)", fontSize: 18, fontWeight: 500, color: "var(--ink-1)" }}>Create a space</h2>
            <input
              type="text"
              autoFocus
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="House, Trip, Roommates…"
              maxLength={64}
              style={{ padding: "10px 12px", borderRadius: 10, background: "var(--bg-surface)", border: "1px solid var(--line-soft)", fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink-1)" }}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {HUE_VALUES.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setCreateHue(h)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 999,
                    background: createHue === h ? `oklch(94% 0.026 ${h})` : "var(--bg-tinted)",
                    border: createHue === h ? `1px solid oklch(60% 0.105 ${h})` : "1px solid transparent",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ width: 12, height: 12, borderRadius: 999, background: `oklch(60% 0.105 ${h})` }} />
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 500, color: "var(--ink-2)" }}>{HUE_LABELS[h]}</span>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => router.push("/accept-invite")}
                style={{ flex: 1, height: 42, borderRadius: 10, border: "1px solid var(--line-firm)", background: "transparent", color: "var(--ink-2)", cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500 }}
              >
                I have an invite
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!createName.trim()}
                style={{ flex: 1, height: 42, borderRadius: 10, background: "var(--brand)", color: "var(--brand-on)", border: 0, cursor: createName.trim() ? "pointer" : "not-allowed", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500, opacity: createName.trim() ? 1 : 0.5 }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Rename modal */}
      {renameOpen ? (
        <div onClick={() => setRenameOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "grid", placeItems: "center", padding: 24, zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, width: "100%", background: "var(--bg-surface)", borderRadius: 18, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ margin: 0, fontFamily: "var(--font-ui)", fontSize: 18, fontWeight: 500, color: "var(--ink-1)" }}>Rename space</h2>
            <input
              type="text"
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              maxLength={64}
              style={{ padding: "10px 12px", borderRadius: 10, background: "var(--bg-surface)", border: "1px solid var(--line-soft)", fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink-1)" }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setRenameOpen(false)} style={{ flex: 1, height: 42, borderRadius: 10, border: "1px solid var(--line-firm)", background: "transparent", color: "var(--ink-2)", cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500 }}>
                Cancel
              </button>
              <button type="button" onClick={handleRename} disabled={!renameValue.trim()} style={{ flex: 1, height: 42, borderRadius: 10, background: "var(--brand)", color: "var(--brand-on)", border: 0, cursor: renameValue.trim() ? "pointer" : "not-allowed", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500, opacity: renameValue.trim() ? 1 : 0.5 }}>
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Color picker modal */}
      {colorPickerOpen ? (
        <div onClick={() => setColorPickerOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "grid", placeItems: "center", padding: 24, zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, width: "100%", background: "var(--bg-surface)", borderRadius: 18, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ margin: 0, fontFamily: "var(--font-ui)", fontSize: 18, fontWeight: 500, color: "var(--ink-1)" }}>Space color</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {HUE_VALUES.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => handlePickColor(h)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 999,
                    background: managingHue === h ? `oklch(94% 0.026 ${h})` : "var(--bg-tinted)",
                    border: managingHue === h ? `1px solid oklch(60% 0.105 ${h})` : "1px solid transparent",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ width: 14, height: 14, borderRadius: 999, background: `oklch(60% 0.105 ${h})` }} />
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500, color: "var(--ink-2)" }}>{HUE_LABELS[h]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
