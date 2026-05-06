"use client";
import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import {
  goalProgressFraction,
  projectMonthsToGoal,
} from "@cvc/domain";
import { GoalIcon, resolveBranding } from "../_components/goalGlyphs";
import { ProgressArc } from "../_components/ProgressArc";
import { ProjectionChart } from "../_components/ProjectionChart";
import { Num, fmtMoneyDollars, fmtMoneyShort } from "../_components/Num";
import {
  classifyStatus,
  StatusPill,
  type GoalStatus,
} from "../_components/StatusPill";
import { EditPanel, type AccountOption, type EditableGoal } from "../EditPanel";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

interface ContribTxn {
  id: string;
  posted_at: string;
  amount: number;
  display_name: string | null;
  merchant_name: string | null;
}

interface Props {
  params: Promise<{ id: string }>;
}

export default function GoalDetailPage(props: Props) {
  const { id } = use(props.params);
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [goal, setGoal] = useState<EditableGoal | null>(null);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [contribs, setContribs] = useState<ContribTxn[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSignedIn(!!data.session);
      setAuthReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    (async () => {
      const [goalRes, accs] = await Promise.all([
        supabase.from("goals").select("*").eq("id", id).maybeSingle(),
        supabase.from("accounts").select("id, name, type, current_balance"),
      ]);
      if (cancelled) return;
      if (!goalRes.data) {
        setNotFound(true);
        return;
      }
      setGoal(goalRes.data as unknown as EditableGoal);
      setActiveSpaceId(goalRes.data.space_id);
      setAccounts((accs.data ?? []) as AccountOption[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, id, reloadCount]);

  // Load recent transactions on the linked account as "contributions" / "payments".
  useEffect(() => {
    const accountId = goal?.linked_account_id;
    const kind = goal?.kind;
    if (!signedIn || !accountId || !kind) {
      setContribs([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("transactions")
        .select("id, posted_at, amount, display_name, merchant_name")
        .eq("account_id", accountId)
        .order("posted_at", { ascending: false })
        .limit(20);
      if (cancelled) return;
      const sign = kind === "save" ? 1 : -1;
      const rows = ((data ?? []) as ContribTxn[]).filter((t) =>
        sign === 1 ? t.amount > 0 : t.amount < 0,
      );
      setContribs(rows.slice(0, 6));
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, goal?.linked_account_id, goal?.kind, reloadCount]);

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
        <h1>Goal</h1>
        <p className="muted" style={{ marginTop: 16 }}>
          Sign in to view this goal.
        </p>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => router.push("/sign-in")}>
          Sign in
        </button>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="container" style={{ padding: "60px 0", textAlign: "center" }}>
        <h1>Goal not found</h1>
        <p className="muted">It may have been deleted, or you don&apos;t have access to it.</p>
        <Link href="/goals" className="btn btn-secondary" style={{ marginTop: 16, display: "inline-block" }}>
          ← Back to goals
        </Link>
      </main>
    );
  }

  if (!goal) {
    return (
      <main className="container" style={{ padding: "40px 0" }}>
        <p className="muted">Loading goal…</p>
      </main>
    );
  }

  const linked = accounts.find((a) => a.id === goal.linked_account_id) ?? null;
  const linkedBalance = linked ? linked.current_balance ?? 0 : 0;

  const savedCents =
    goal.kind === "save"
      ? linkedBalance > 0
        ? linkedBalance
        : 0
      : Math.max(0, (goal.starting_amount ?? 0) - (linkedBalance > 0 ? linkedBalance : 0));
  const targetCents = goal.kind === "save" ? goal.target_amount : goal.starting_amount ?? goal.target_amount;
  const fraction = goalProgressFraction({
    kind: goal.kind,
    current: linkedBalance,
    target: goal.target_amount,
    starting: goal.starting_amount,
  });
  const monthsLeft = projectMonthsToGoal({
    kind: goal.kind,
    current: linkedBalance,
    target: goal.target_amount,
    monthlyContribution: goal.monthly_contribution,
    aprBps: goal.apr_bps ?? 0,
  });
  const status: GoalStatus = classifyStatus({
    fraction,
    monthsLeft,
    targetDate: goal.target_date,
    monthlyContribution: goal.monthly_contribution,
  });

  const branding = resolveBranding(goal.kind, goal.name);
  const isReadOnly = activeSpaceId !== null && goal.space_id !== activeSpaceId;

  const arcColor = status === "behind" ? "var(--accent)" : status === "ahead" ? "var(--pos)" : "var(--brand)";

  return (
    <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", paddingBottom: 40 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Top nav */}
        <div style={{ padding: "20px 16px 8px", display: "flex", alignItems: "center", gap: 10 }}>
          <Link
            href="/goals"
            aria-label="Back"
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              background: "var(--bg-tinted)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <BackIcon />
          </Link>
          <div style={{ flex: 1 }} />
          {!isReadOnly ? (
            <button
              type="button"
              onClick={() => setPanelOpen(true)}
              aria-label="Edit goal"
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                background: "var(--bg-tinted)",
                border: 0,
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
              }}
            >
              <MoreIcon />
            </button>
          ) : null}
        </div>

        {/* Hero */}
        <div style={{ padding: "10px 24px 18px", textAlign: "center" }}>
          <div style={{ display: "inline-block", position: "relative" }}>
            <ProgressArc fraction={fraction} color={arcColor} size={140} thickness={7} />
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
              <GoalIcon glyph={branding.glyph} hue={branding.hue} size={72} radius={20} />
            </div>
          </div>
          <div
            style={{
              marginTop: 14,
              fontFamily: "var(--font-ui)",
              fontSize: 22,
              fontWeight: 500,
              color: "var(--ink-1)",
              letterSpacing: "-0.01em",
            }}
          >
            {goal.name}
          </div>
          <div style={{ marginTop: 4, fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-3)" }}>
            {goal.kind === "save" ? "Savings goal" : "Debt payoff"}
            {isReadOnly ? " · Shared (read-only)" : ""}
          </div>
          <div style={{ marginTop: 14 }}>
            <Num
              style={{
                fontSize: 30,
                fontWeight: 600,
                color: "var(--ink-1)",
                letterSpacing: "-0.02em",
              }}
            >
              {fmtMoneyShort(savedCents)}
            </Num>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink-3)", marginLeft: 6 }}>
              {goal.kind === "save" ? "of" : "paid of"}{" "}
              <Num style={{ color: "var(--ink-2)", fontWeight: 500 }}>{fmtMoneyShort(targetCents)}</Num>
            </span>
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
            <StatusPill status={status} />
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-3)" }}>·</span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-2)" }}>
              {Math.round(fraction * 100)}% complete
            </span>
          </div>
        </div>

        {/* Projection */}
        <div style={{ padding: "0 16px 14px" }}>
          <ProjectionChart
            kind={goal.kind}
            savedCents={savedCents}
            targetCents={targetCents}
            monthlyContributionCents={goal.monthly_contribution}
            monthsLeft={monthsLeft}
            targetDate={goal.target_date}
          />
        </div>

        {/* Auto-contribution */}
        {goal.monthly_contribution ? (
          <div style={{ padding: "0 16px 14px" }}>
            <div
              style={{
                padding: 14,
                borderRadius: 14,
                background: "var(--bg-surface)",
                border: "1px solid var(--line-soft)",
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: 12,
                alignItems: "center",
              }}
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "var(--brand-tint)",
                  color: "var(--brand)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <SparkIcon />
              </span>
              <div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 500, color: "var(--ink-1)" }}>
                  {goal.kind === "save" ? "Auto-contribute" : "Planned payment"}{" "}
                  <Num style={{ color: "var(--ink-1)" }}>{fmtMoneyShort(goal.monthly_contribution)}</Num> / month
                </div>
                <div style={{ marginTop: 2, fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-3)" }}>
                  {linked ? `From ${linked.name}` : "No linked account"}
                </div>
              </div>
              {!isReadOnly ? (
                <button
                  type="button"
                  onClick={() => setPanelOpen(true)}
                  aria-label="Edit auto-contribution"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 999,
                    background: "transparent",
                    border: 0,
                    display: "grid",
                    placeItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <ChevR />
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* CTAs */}
        {!isReadOnly ? (
          <div style={{ padding: "0 16px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Link
              href={linked ? `/transactions?account=${linked.id}` : "/transactions"}
              style={{
                height: 46,
                borderRadius: 12,
                border: 0,
                background: "var(--brand)",
                color: "var(--brand-on)",
                cursor: "pointer",
                fontFamily: "var(--font-ui)",
                fontSize: 13.5,
                fontWeight: 500,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <PlusIcon /> {goal.kind === "save" ? "Add money" : "Log payment"}
            </Link>
            <button
              type="button"
              onClick={() => setPanelOpen(true)}
              style={{
                height: 46,
                borderRadius: 12,
                border: "1px solid var(--line-firm)",
                background: "transparent",
                color: "var(--ink-1)",
                cursor: "pointer",
                fontFamily: "var(--font-ui)",
                fontSize: 13.5,
                fontWeight: 500,
              }}
            >
              Edit goal
            </button>
          </div>
        ) : null}

        {/* Contributions list */}
        {linked && contribs.length > 0 ? (
          <>
            <div style={{ padding: "4px 18px 8px", display: "flex", alignItems: "baseline" }}>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--ink-1)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {goal.kind === "save" ? "Contributions" : "Payments"}
              </span>
              <span style={{ marginLeft: "auto", fontFamily: "var(--font-num)", fontSize: 11, color: "var(--ink-3)" }}>
                last {contribs.length}
              </span>
            </div>
            <div style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--line-soft)", borderBottom: "1px solid var(--line-soft)" }}>
              {contribs.map((c, i) => (
                <ContribRow key={c.id} txn={c} kind={goal.kind} isLast={i === contribs.length - 1} />
              ))}
            </div>
          </>
        ) : null}

        {!linked ? (
          <div style={{ padding: "0 16px 0" }}>
            <div
              style={{
                padding: 14,
                borderRadius: 14,
                background: "var(--bg-surface)",
                border: "1px dashed var(--line-firm)",
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-3)",
                textAlign: "center",
              }}
            >
              Link an account to see contributions automatically.
            </div>
          </div>
        ) : null}
      </div>

      <EditPanel
        client={supabase}
        open={panelOpen}
        spaceId={goal.space_id}
        goal={goal}
        accounts={accounts}
        onClose={() => setPanelOpen(false)}
        onSaved={() => setReloadCount((n) => n + 1)}
      />
    </main>
  );
}

function ContribRow({
  txn,
  kind,
  isLast,
}: {
  txn: ContribTxn;
  kind: "save" | "payoff";
  isLast: boolean;
}) {
  const date = new Date(txn.posted_at);
  const label = txn.display_name ?? txn.merchant_name ?? "Transfer";
  const isCredit = kind === "save";
  return (
    <div
      style={{
        padding: "12px 18px",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 12,
        alignItems: "center",
        borderBottom: isLast ? "none" : "1px solid var(--line-soft)",
      }}
    >
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: "var(--pos-tint)",
          color: "var(--pos)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <ArrowUp />
      </span>
      <div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--ink-1)" }}>
          {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>
          {label}
        </div>
      </div>
      <Num style={{ fontSize: 13.5, fontWeight: 500, color: "var(--pos)" }}>
        {isCredit ? "+" : ""}
        {fmtMoneyDollars(Math.abs(txn.amount))}
      </Num>
    </div>
  );
}

function BackIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="var(--ink-2)" aria-hidden="true">
      <circle cx={5} cy={12} r={1.6} />
      <circle cx={12} cy={12} r={1.6} />
      <circle cx={19} cy={12} r={1.6} />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ChevR() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" />
    </svg>
  );
}

function ArrowUp() {
  return (
    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}
