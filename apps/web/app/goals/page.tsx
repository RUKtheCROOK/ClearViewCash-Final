"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import {
  getGoalsForView,
  getMySpaces,
  getSharesForGoal,
  removeGoalShare,
  setGoalShare,
} from "@cvc/api-client";
import {
  goalProgressFraction,
  projectMonthsToGoal,
} from "@cvc/domain";
import { effectiveSharedView, type SpaceMember } from "../../lib/view";
import { EditPanel, type AccountOption, type EditableGoal } from "./EditPanel";
import { AggregateStrip } from "./_components/AggregateStrip";
import { JustReachedBanner } from "./_components/JustReachedBanner";
import { GoalCard, type GoalCardData } from "./_components/GoalCard";
import { AddGoalCard } from "./_components/AddGoalCard";
import { resolveBranding } from "./_components/goalGlyphs";
import { classifyStatus, type GoalStatus } from "./_components/StatusPill";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

interface Space {
  id: string;
  name: string;
  tint: string;
  members?: SpaceMember[];
}

const SPACE_HUE: Record<string, number> = {
  personal: 195,
  household: 30,
  business: 270,
  family: 145,
  travel: 220,
};

export default function GoalsPage() {
  return (
    <Suspense fallback={null}>
      <GoalsPageInner />
    </Suspense>
  );
}

function GoalsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [rawSharedView, setRawSharedView] = useState(false);
  const [goals, setGoals] = useState<EditableGoal[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [sharesByGoal, setSharesByGoal] = useState<Record<string, Set<string>>>({});
  const [editing, setEditing] = useState<EditableGoal | null>(null);
  const [prefillAccount, setPrefillAccount] = useState<AccountOption | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  const [shareUiFor, setShareUiFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSignedIn(!!data.session);
      setCurrentUserId(data.session?.user?.id ?? null);
      setAuthReady(true);
    });
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("cvc-goals-include-shared");
      if (stored === "1") setRawSharedView(true);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const activeSpace = useMemo(
    () => spaces.find((s) => s.id === activeSpaceId) ?? null,
    [spaces, activeSpaceId],
  );

  const { sharedView, toggleVisible } = useMemo(
    () => effectiveSharedView(activeSpace, rawSharedView, currentUserId),
    [activeSpace, rawSharedView, currentUserId],
  );

  const shareableSpaces = useMemo(
    () => spaces.filter((s) => s.id !== activeSpaceId),
    [spaces, activeSpaceId],
  );

  useEffect(() => {
    if (!signedIn) return;
    getMySpaces(supabase)
      .then((rows) => {
        const list = rows as unknown as Space[];
        setSpaces(list);
        const stored =
          typeof window !== "undefined" ? localStorage.getItem("cvc-active-space") : null;
        const valid = stored && list.some((s) => s.id === stored) ? stored : list[0]?.id ?? null;
        setActiveSpaceId(valid);
      })
      .catch(() => undefined);
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn || !activeSpaceId) return;
    let cancelled = false;
    (async () => {
      const [goalRows, accs] = await Promise.all([
        getGoalsForView(supabase, { spaceId: activeSpaceId, includeShared: sharedView }),
        supabase.from("accounts").select("id, name, type, current_balance"),
      ]);
      if (cancelled) return;
      const goalRecords = goalRows as unknown as EditableGoal[];
      setGoals(goalRecords);
      setAccounts((accs.data ?? []) as AccountOption[]);
      const ownIds = goalRecords.filter((r) => r.space_id === activeSpaceId).map((r) => r.id);
      if (ownIds.length === 0) {
        setSharesByGoal({});
        return;
      }
      const lists = await Promise.all(ownIds.map((id) => getSharesForGoal(supabase, id)));
      if (cancelled) return;
      const map: Record<string, Set<string>> = {};
      ownIds.forEach((id, i) => {
        map[id] = new Set(lists[i]);
      });
      setSharesByGoal(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, activeSpaceId, sharedView, reloadCount]);

  // ?prefill=<accountId> — open create panel pre-filled, then strip the param.
  useEffect(() => {
    if (!signedIn || !activeSpaceId || accounts.length === 0) return;
    const prefillId = searchParams.get("prefill");
    if (!prefillId) return;
    const acc = accounts.find((a) => a.id === prefillId);
    if (!acc) return;
    setEditing(null);
    setPrefillAccount(acc);
    setPanelOpen(true);
    router.replace("/goals");
  }, [signedIn, activeSpaceId, accounts, searchParams, router]);

  const balanceById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a.current_balance ?? 0])),
    [accounts],
  );

  const cards = useMemo<{ data: GoalCardData; raw: EditableGoal }[]>(() => {
    return goals.map((g) => {
      const linkedBalance = g.linked_account_id
        ? balanceById.get(g.linked_account_id) ?? 0
        : 0;
      const savedCents =
        g.kind === "save"
          ? linkedBalance > 0
            ? linkedBalance
            : 0
          : Math.max(0, (g.starting_amount ?? 0) - (linkedBalance > 0 ? linkedBalance : 0));
      const targetCents = g.kind === "save" ? g.target_amount : g.starting_amount ?? g.target_amount;
      const remainingCents =
        g.kind === "save"
          ? Math.max(0, g.target_amount - savedCents)
          : Math.max(0, linkedBalance > 0 ? linkedBalance : g.target_amount);
      const fraction = goalProgressFraction({
        kind: g.kind,
        current: linkedBalance,
        target: g.target_amount,
        starting: g.starting_amount,
      });
      const monthsLeft = projectMonthsToGoal({
        kind: g.kind,
        current: linkedBalance,
        target: g.target_amount,
        monthlyContribution: g.monthly_contribution,
        aprBps: g.apr_bps ?? 0,
      });
      const status: GoalStatus = classifyStatus({
        fraction,
        monthsLeft,
        targetDate: g.target_date,
        monthlyContribution: g.monthly_contribution,
      });
      const branding = resolveBranding(g.kind, g.name);
      return {
        raw: g,
        data: {
          id: g.id,
          kind: g.kind,
          name: g.name,
          glyph: branding.glyph,
          hue: branding.hue,
          savedCents,
          targetCents,
          remainingCents,
          status,
          monthsLeft,
          targetDate: g.target_date,
          readOnly: g.space_id !== activeSpaceId,
        },
      };
    });
  }, [goals, balanceById, activeSpaceId]);

  const aggregate = useMemo(() => {
    let savedCents = 0;
    let savedGoalCount = 0;
    let paidDownCents = 0;
    let monthlyTotalCents = 0;
    for (const c of cards) {
      if (c.data.kind === "save") {
        savedCents += c.data.savedCents;
        if (c.data.savedCents > 0) savedGoalCount += 1;
      } else {
        paidDownCents += c.data.savedCents;
      }
      if (c.raw.monthly_contribution) {
        monthlyTotalCents += c.raw.monthly_contribution;
      }
    }
    return { savedCents, savedGoalCount, paidDownCents, monthlyTotalCents };
  }, [cards]);

  const reachedCard = useMemo(() => cards.find((c) => c.data.status === "done") ?? null, [cards]);

  function startNew() {
    setEditing(null);
    setPrefillAccount(null);
    setPanelOpen(true);
  }

  function startEdit(g: EditableGoal) {
    if (g.space_id !== activeSpaceId) {
      router.push(`/goals/${g.id}`);
      return;
    }
    setEditing(g);
    setPrefillAccount(null);
    setPanelOpen(true);
  }

  function openDetail(id: string) {
    router.push(`/goals/${id}`);
  }

  async function toggleShare(goalId: string, spaceId: string) {
    setBusy(true);
    setError(null);
    try {
      const current = sharesByGoal[goalId] ?? new Set<string>();
      if (current.has(spaceId)) {
        await removeGoalShare(supabase, { goal_id: goalId, space_id: spaceId });
      } else {
        await setGoalShare(supabase, { goal_id: goalId, space_id: spaceId });
      }
      setReloadCount((n) => n + 1);
    } catch (e) {
      setError((e as Error).message ?? "Could not update share.");
    } finally {
      setBusy(false);
    }
  }

  function persistSharedView(next: boolean) {
    setRawSharedView(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("cvc-goals-include-shared", next ? "1" : "0");
    }
  }

  if (!authReady) {
    return (
      <main className="container" style={{ padding: "40px 0" }}>
        <p className="muted">Loading…</p>
      </main>
    );
  }

  if (!signedIn) {
    return (
      <main className="container" style={{ padding: "80px 0", maxWidth: 460 }}>
        <h1>Goals</h1>
        <p className="muted" style={{ marginTop: 16 }}>
          Sign in to view your goals.
        </p>
        <button
          className="btn btn-primary"
          style={{ marginTop: 16 }}
          onClick={() => router.push("/sign-in")}
        >
          Sign in
        </button>
      </main>
    );
  }

  const spaceHue = activeSpace ? SPACE_HUE[activeSpace.tint] ?? 195 : 195;

  return (
    <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", paddingBottom: 40 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            padding: "20px 16px 10px",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <div style={{ flex: 1 }}>
            <h1
              style={{
                margin: 0,
                fontFamily: "var(--font-ui)",
                fontSize: 28,
                fontWeight: 500,
                letterSpacing: "-0.02em",
                color: "var(--ink-1)",
                lineHeight: 1.1,
              }}
            >
              Goals
            </h1>
            {activeSpace ? (
              <SpacePill
                name={activeSpace.name}
                hue={spaceHue}
                onSwitch={() => {
                  if (spaces.length > 1) {
                    const idx = spaces.findIndex((s) => s.id === activeSpaceId);
                    const next = spaces[(idx + 1) % spaces.length];
                    if (next) {
                      setActiveSpaceId(next.id);
                      if (typeof window !== "undefined")
                        localStorage.setItem("cvc-active-space", next.id);
                    }
                  }
                }}
              />
            ) : null}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {toggleVisible ? (
              <button
                type="button"
                onClick={() => persistSharedView(!sharedView)}
                style={{
                  border: "1px solid var(--line-soft)",
                  borderRadius: 999,
                  padding: "6px 10px",
                  fontSize: 13,
                  background: sharedView ? "var(--brand-tint)" : "var(--bg-surface)",
                  color: sharedView ? "var(--brand)" : "var(--ink-2)",
                  cursor: "pointer",
                  fontFamily: "var(--font-ui)",
                }}
              >
                {sharedView ? "Shared view" : "My view"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={startNew}
              aria-label="New goal"
              style={{
                width: 38,
                height: 38,
                borderRadius: 999,
                background: "var(--brand)",
                color: "var(--brand-on)",
                border: 0,
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
              }}
            >
              <svg
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
        </div>

        {error ? (
          <div
            style={{
              margin: "0 16px 12px",
              padding: "10px 14px",
              borderRadius: 12,
              background: "var(--warn-tint)",
              color: "var(--warn)",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        ) : null}

        {cards.length === 0 ? (
          <div style={{ padding: "0 16px" }}>
            <div
              style={{
                padding: 32,
                borderRadius: 18,
                background: "var(--bg-surface)",
                border: "1px solid var(--line-soft)",
                textAlign: "center",
              }}
            >
              <p style={{ marginBottom: 16, color: "var(--ink-3)", fontFamily: "var(--font-ui)" }}>
                Pick something to work toward — a fund, a thing, a debt to clear. We&apos;ll track
                the pace and tell you if you&apos;re ahead or behind.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={startNew}
                style={{ padding: "10px 18px" }}
              >
                + Start your first goal
              </button>
            </div>
          </div>
        ) : (
          <>
            <AggregateStrip
              savedCents={aggregate.savedCents}
              savedGoalCount={aggregate.savedGoalCount}
              paidDownCents={aggregate.paidDownCents}
              monthlyTotalCents={aggregate.monthlyTotalCents}
            />

            {reachedCard ? (
              <JustReachedBanner
                name={reachedCard.data.name}
                detail={`${reachedCard.data.kind === "save" ? "Saved" : "Cleared"} ${formatCents(
                  reachedCard.data.targetCents,
                )}`}
                onView={() => openDetail(reachedCard.data.id)}
              />
            ) : null}

            <div style={{ padding: "4px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
              {cards.map((c) => (
                <div key={c.data.id}>
                  <GoalCard goal={c.data} onClick={() => openDetail(c.data.id)} />
                  {!c.data.readOnly && shareableSpaces.length > 0 ? (
                    <ShareControls
                      open={shareUiFor === c.data.id}
                      busy={busy}
                      shares={sharesByGoal[c.data.id] ?? new Set()}
                      shareableSpaces={shareableSpaces}
                      onToggleOpen={() =>
                        setShareUiFor(shareUiFor === c.data.id ? null : c.data.id)
                      }
                      onToggleShare={(spaceId) => toggleShare(c.data.id, spaceId)}
                      onEdit={() => startEdit(c.raw)}
                    />
                  ) : null}
                </div>
              ))}
            </div>

            <AddGoalCard onClick={startNew} />
          </>
        )}
      </div>

      <EditPanel
        client={supabase}
        open={panelOpen}
        spaceId={activeSpaceId}
        goal={editing}
        prefillAccount={prefillAccount}
        accounts={accounts}
        onClose={() => {
          setPanelOpen(false);
          setEditing(null);
          setPrefillAccount(null);
        }}
        onSaved={() => setReloadCount((n) => n + 1)}
      />
    </main>
  );
}

function formatCents(c: number): string {
  const abs = Math.abs(c) / 100;
  return `$${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function SpacePill({ name, hue, onSwitch }: { name: string; hue: number; onSwitch: () => void }) {
  const wash = `oklch(92% 0.035 ${hue})`;
  const fg = `oklch(35% 0.060 ${hue})`;
  return (
    <button
      type="button"
      onClick={onSwitch}
      style={{
        marginTop: 6,
        appearance: "none",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        background: wash,
        color: fg,
        border: 0,
        fontFamily: "var(--font-ui)",
        fontSize: 11.5,
        fontWeight: 500,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: fg }} />
      {name}
      <svg
        width={11}
        height={11}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M7 7h12l-3-3M17 17H5l3 3" />
      </svg>
    </button>
  );
}

interface ShareControlsProps {
  open: boolean;
  busy: boolean;
  shares: Set<string>;
  shareableSpaces: Space[];
  onToggleOpen: () => void;
  onToggleShare: (spaceId: string) => void;
  onEdit: () => void;
}

function ShareControls({
  open,
  busy,
  shares,
  shareableSpaces,
  onToggleOpen,
  onToggleShare,
  onEdit,
}: ShareControlsProps) {
  return (
    <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
      <button
        type="button"
        onClick={onEdit}
        style={{
          padding: "5px 10px",
          borderRadius: 999,
          background: "var(--bg-tinted)",
          border: 0,
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          color: "var(--ink-2)",
          cursor: "pointer",
        }}
      >
        Edit
      </button>
      <button
        type="button"
        onClick={onToggleOpen}
        style={{
          padding: "5px 10px",
          borderRadius: 999,
          background: open ? "var(--brand-tint)" : "var(--bg-tinted)",
          border: 0,
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          color: open ? "var(--brand)" : "var(--ink-2)",
          cursor: "pointer",
        }}
      >
        {open ? "Hide share" : `Share (${shares.size})`}
      </button>
      {open
        ? shareableSpaces.map((s) => {
            const on = shares.has(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onToggleShare(s.id)}
                disabled={busy}
                style={{
                  padding: "5px 10px",
                  borderRadius: 999,
                  background: on ? "var(--brand)" : "var(--bg-surface)",
                  color: on ? "var(--brand-on)" : "var(--ink-2)",
                  border: on ? 0 : "1px solid var(--line-soft)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  cursor: busy ? "default" : "pointer",
                }}
              >
                {s.name}
              </button>
            );
          })
        : null}
    </div>
  );
}
