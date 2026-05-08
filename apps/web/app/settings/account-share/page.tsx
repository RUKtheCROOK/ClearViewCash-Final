"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import { SPACE_HUES, spaceKeyFromTint } from "../_components/theme-helpers";
import {
  getAccount,
  getMembersWithProfilesForSpace,
  getMySpaces,
  getShareVisibility,
  getSharesForAccount,
  removeAccountShare,
  setAccountShare,
  setShareVisibility,
} from "@cvc/api-client";
import { useTheme } from "../../../lib/theme-provider";
import { Group, PageHeader, ProChip, Row, SectionLabel, ToggleRow } from "../_components/SettingsAtoms";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

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

interface Space {
  id: string;
  name: string;
  tint: string;
}

export default function AccountSharePage() {
  return (
    <Suspense fallback={null}>
      <AccountShareInner />
    </Suspense>
  );
}

function AccountShareInner() {
  const router = useRouter();
  const params = useSearchParams();
  const accountId = params.get("account_id") ?? "";
  const { resolved } = useTheme();
  const [userId, setUserId] = useState<string | null>(null);
  const [account, setAccount] = useState<{ id: string; name: string; type: string } | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [visibility, setVisibility] = useState<Record<string, string[]>>({});
  const [membersBySpace, setMembersBySpace] = useState<Record<string, MemberRow[]>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (cancelled) return;
      setUserId(u.user?.id ?? null);
      if (!accountId) return;
      const [acc, sh, sps] = await Promise.all([
        getAccount(supabase, accountId),
        getSharesForAccount(supabase, accountId),
        getMySpaces(supabase),
      ]);
      if (cancelled) return;
      if (acc) setAccount({ id: acc.id, name: acc.name, type: acc.type });
      setShares(sh as ShareRow[]);
      setSpaces(sps as unknown as Space[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  useEffect(() => {
    if (!accountId || shares.length === 0) return;
    let cancelled = false;
    (async () => {
      const vis: Record<string, string[]> = {};
      const mem: Record<string, MemberRow[]> = {};
      for (const s of shares) {
        try {
          vis[s.space_id] = await getShareVisibility(supabase, accountId, s.space_id);
        } catch {
          vis[s.space_id] = [];
        }
        try {
          mem[s.space_id] = (await getMembersWithProfilesForSpace(supabase, s.space_id)) as MemberRow[];
        } catch {
          mem[s.space_id] = [];
        }
      }
      if (cancelled) return;
      setVisibility(vis);
      setMembersBySpace(mem);
    })();
    return () => {
      cancelled = true;
    };
  }, [accountId, shares]);

  function shareFor(spaceId: string): ShareRow | undefined {
    return shares.find((s) => s.space_id === spaceId);
  }

  async function applyToggle(spaceId: string, next: { share_balances: boolean; share_transactions: boolean }) {
    if (!accountId) return;
    if (!next.share_balances && !next.share_transactions) {
      await removeAccountShare(supabase, { account_id: accountId, space_id: spaceId });
      setShares((rows) => rows.filter((r) => r.space_id !== spaceId));
      setVisibility((v) => {
        const { [spaceId]: _drop, ...rest } = v;
        return rest;
      });
      return;
    }
    await setAccountShare(supabase, { account_id: accountId, space_id: spaceId, share_balances: next.share_balances, share_transactions: next.share_transactions });
    setShares((rows) => {
      const without = rows.filter((r) => r.space_id !== spaceId);
      return [...without, { space_id: spaceId, ...next }];
    });
  }

  function visibilityMode(spaceId: string): "everyone" | "specific" {
    return (visibility[spaceId]?.length ?? 0) === 0 ? "everyone" : "specific";
  }

  async function setMode(spaceId: string, mode: "everyone" | "specific") {
    if (!accountId || !userId) return;
    if (mode === "everyone") {
      await setShareVisibility(supabase, { account_id: accountId, space_id: spaceId, user_ids: [] });
      setVisibility((v) => ({ ...v, [spaceId]: [] }));
      return;
    }
    const ids = [userId];
    await setShareVisibility(supabase, { account_id: accountId, space_id: spaceId, user_ids: ids });
    setVisibility((v) => ({ ...v, [spaceId]: ids }));
  }

  async function toggleMember(spaceId: string, memberId: string, on: boolean) {
    if (!accountId || !userId) return;
    const current = visibility[spaceId] ?? [];
    let nextIds: string[];
    if (on) {
      nextIds = Array.from(new Set([...current, memberId, userId]));
    } else {
      nextIds = current.filter((id) => id !== memberId);
      if (!nextIds.includes(userId)) nextIds = [userId, ...nextIds];
    }
    await setShareVisibility(supabase, { account_id: accountId, space_id: spaceId, user_ids: nextIds });
    setVisibility((v) => ({ ...v, [spaceId]: nextIds }));
  }

  return (
    <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", paddingBottom: 60 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <PageHeader
          title={account ? `Share · ${account.name}` : "Share account"}
          sub={account ? account.type : "Loading…"}
          backHref="/settings"
          onBack={() => router.push("/settings")}
        />

        <div style={{ padding: "4px 18px 12px", fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
          Choose which spaces see this account. Toggle off both rows to fully un-share. Visibility within a space lets you limit which members can see the share.
        </div>

        {spaces.length === 0 ? (
          <Group>
            <Row title="No spaces yet" sub="Create one in Settings → Spaces & Members first." right={null} last />
          </Group>
        ) : null}

        {spaces.map((s) => {
          const cur = shareFor(s.id);
          const sb = cur?.share_balances ?? false;
          const st = cur?.share_transactions ?? false;
          const vmode = visibilityMode(s.id);
          const selected = new Set(visibility[s.id] ?? []);
          const otherMembers = (membersBySpace[s.id] ?? []).filter((m) => m.user_id && m.user_id !== userId && m.accepted_at);
          const hue = SPACE_HUES[spaceKeyFromTint(s.tint)];
          const accent = `oklch(${resolved === "dark" ? "70% 0.110" : "60% 0.105"} ${hue})`;
          return (
            <div key={s.id}>
              <SectionLabel>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: `oklch(60% 0.105 ${hue})` }} />
                  {s.name.toUpperCase()}
                </span>
              </SectionLabel>
              <Group>
                <ToggleRow
                  title="Share balance"
                  on={sb}
                  onChange={(v) => applyToggle(s.id, { share_balances: v, share_transactions: st })}
                  accent={accent}
                />
                <ToggleRow
                  title="Share transactions"
                  sub="Sharing transactions implies sharing the balance."
                  on={st}
                  onChange={(v) => applyToggle(s.id, { share_balances: sb, share_transactions: v })}
                  accent={accent}
                  last={!cur}
                />
                {cur ? (
                  <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500, color: "var(--ink-1)" }}>Visible to</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setMode(s.id, "everyone")}
                        style={{
                          flex: 1,
                          height: 38,
                          borderRadius: 10,
                          background: vmode === "everyone" ? "var(--brand)" : "var(--bg-tinted)",
                          color: vmode === "everyone" ? "var(--brand-on)" : "var(--ink-2)",
                          border: 0,
                          cursor: "pointer",
                          fontFamily: "var(--font-ui)",
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      >
                        Everyone in this space
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode(s.id, "specific")}
                        style={{
                          flex: 1,
                          height: 38,
                          borderRadius: 10,
                          background: vmode === "specific" ? "var(--brand)" : "var(--bg-tinted)",
                          color: vmode === "specific" ? "var(--brand-on)" : "var(--ink-2)",
                          border: 0,
                          cursor: "pointer",
                          fontFamily: "var(--font-ui)",
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      >
                        Specific members
                      </button>
                    </div>
                    {vmode === "specific" ? (
                      otherMembers.length === 0 ? (
                        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-3)" }}>
                          No other accepted members yet — only you will see this account here.
                        </span>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {otherMembers.map((m) => {
                            const id = m.user_id as string;
                            const on = selected.has(id);
                            return (
                              <div key={id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-1)" }}>{m.display_name ?? m.invited_email ?? "Member"}</span>
                                <button type="button" onClick={() => toggleMember(s.id, id, !on)} style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer" }}>
                                  <ProChip tone={on ? "brand" : "muted"}>{on ? "VISIBLE" : "HIDDEN"}</ProChip>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )
                    ) : null}
                  </div>
                ) : null}
              </Group>
            </div>
          );
        })}
      </div>
    </main>
  );
}
