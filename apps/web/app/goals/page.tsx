"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import {
  deleteGoal,
  getGoalsForView,
  getMySpaces,
  getSharesForGoal,
  removeGoalShare,
  setGoalShare,
  upsertGoal,
} from "@cvc/api-client";
import {
  goalProgressFraction,
  projectGoalDate,
  projectMonthsToGoal,
  requiredMonthlyPayment,
} from "@cvc/domain";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

interface Goal {
  id: string;
  space_id: string;
  kind: "save" | "payoff";
  name: string;
  target_amount: number;
  starting_amount: number | null;
  target_date: string | null;
  monthly_contribution: number | null;
  linked_account_id: string | null;
  apr_bps: number | null;
  term_months: number | null;
}

interface AccountRow {
  id: string;
  name: string;
  type: string;
  current_balance: number | null;
}

interface Space {
  id: string;
  name: string;
  members?: { user_id: string | null; accepted_at: string | null }[];
}

interface Draft {
  id?: string;
  kind: "save" | "payoff";
  name: string;
  target: string;
  starting: string;
  target_date: string;
  monthly_contribution: string;
  linked_account_id: string | null;
  apr: string;
  term_months: string;
}

const EMPTY_DRAFT: Draft = {
  kind: "save",
  name: "",
  target: "",
  starting: "",
  target_date: "",
  monthly_contribution: "",
  linked_account_id: null,
  apr: "",
  term_months: "",
};

function dollarsToCents(s: string): number {
  const n = Number.parseFloat(s.replace(/,/g, ""));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function centsToDollars(c: number | null | undefined): string {
  if (c == null) return "";
  return (c / 100).toFixed(2);
}

function formatCents(c: number | null | undefined): string {
  if (c == null) return "—";
  return `$${(c / 100).toFixed(2)}`;
}

function aprBpsToString(bps: number | null | undefined): string {
  if (bps == null) return "";
  return (bps / 100).toFixed(2);
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 14,
  background: "var(--surface)",
  color: "var(--text)",
};

const selectStyle: React.CSSProperties = {
  padding: "8px 10px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 14,
  background: "var(--surface)",
  color: "var(--text)",
};

export default function GoalsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [includeShared, setIncludeShared] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [sharesByGoal, setSharesByGoal] = useState<Record<string, Set<string>>>({});
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftReadOnly, setDraftReadOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reloadCount, setReloadCount] = useState(0);

  const activeSpace = useMemo(
    () => spaces.find((s) => s.id === activeSpaceId) ?? null,
    [spaces, activeSpaceId],
  );

  const debtAccounts = useMemo(
    () => accounts.filter((a) => a.type === "credit" || a.type === "loan"),
    [accounts],
  );

  const shareableSpaces = useMemo(
    () => spaces.filter((s) => s.id !== activeSpaceId),
    [spaces, activeSpaceId],
  );

  // Auth check + initial settings restore from localStorage.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setSignedIn(!!data.user);
    });
    if (typeof window !== "undefined") {
      const inc = localStorage.getItem("cvc-goals-include-shared");
      if (inc === "1") setIncludeShared(true);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // Load spaces.
  useEffect(() => {
    if (!signedIn) return;
    getMySpaces(supabase)
      .then((rows) => {
        const list = rows as Space[];
        setSpaces(list);
        const stored =
          typeof window !== "undefined" ? localStorage.getItem("cvc-active-space") : null;
        const valid = stored && list.some((s) => s.id === stored) ? stored : list[0]?.id ?? null;
        setActiveSpaceId(valid);
      })
      .catch(() => undefined);
  }, [signedIn]);

  // Load goals + accounts + shares for the active view.
  useEffect(() => {
    if (!signedIn || !activeSpaceId) return;
    let cancelled = false;
    (async () => {
      const [g, accs] = await Promise.all([
        getGoalsForView(supabase, { spaceId: activeSpaceId, includeShared }),
        supabase.from("accounts").select("id, name, type, current_balance"),
      ]);
      if (cancelled) return;
      const rows = g as unknown as Goal[];
      setGoals(rows);
      setAccounts((accs.data ?? []) as AccountRow[]);
      const ownIds = rows.filter((r) => r.space_id === activeSpaceId).map((r) => r.id);
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
  }, [signedIn, activeSpaceId, includeShared, reloadCount]);

  // ?prefill=<accountId> — open new-goal panel pre-filled, then strip the param.
  useEffect(() => {
    if (!signedIn || !activeSpaceId || accounts.length === 0) return;
    const prefillId = searchParams.get("prefill");
    if (!prefillId) return;
    const acc = accounts.find((a) => a.id === prefillId);
    if (!acc) return;
    setError("");
    setDraft({
      ...EMPTY_DRAFT,
      kind: "payoff",
      name: `Pay off ${acc.name}`,
      target: "0",
      starting: centsToDollars(Math.abs(acc.current_balance ?? 0)),
      linked_account_id: acc.id,
    });
    router.replace("/goals");
  }, [signedIn, activeSpaceId, accounts, searchParams, router]);

  function startNew() {
    setError("");
    setDraftReadOnly(false);
    setDraft({ ...EMPTY_DRAFT });
  }

  function startEdit(g: Goal, opts: { readOnly?: boolean } = {}) {
    setError("");
    setDraftReadOnly(!!opts.readOnly);
    setDraft({
      id: g.id,
      kind: g.kind,
      name: g.name,
      target: centsToDollars(g.target_amount),
      starting: centsToDollars(g.starting_amount),
      target_date: g.target_date ?? "",
      monthly_contribution: centsToDollars(g.monthly_contribution),
      linked_account_id: g.linked_account_id,
      apr: aprBpsToString(g.apr_bps),
      term_months: g.term_months != null ? String(g.term_months) : "",
    });
  }

  function pickDebt(a: AccountRow) {
    if (!draft) return;
    setDraft({
      ...draft,
      linked_account_id: a.id,
      name: draft.name.trim() ? draft.name : `Pay off ${a.name}`,
      starting: centsToDollars(Math.abs(a.current_balance ?? 0)),
      target: draft.target.trim() ? draft.target : "0",
    });
  }

  async function save() {
    if (!draft || !activeSpaceId) return;
    if (!draft.name.trim()) {
      setError("Give the goal a name.");
      return;
    }
    const target = dollarsToCents(draft.target);
    if (target <= 0 && draft.kind === "save") {
      setError("Target amount must be greater than 0.");
      return;
    }
    let aprBps: number | null = null;
    if (draft.kind === "payoff" && draft.apr.trim()) {
      const aprPct = Number.parseFloat(draft.apr);
      if (!Number.isFinite(aprPct) || aprPct < 0) {
        setError("APR must be a non-negative number.");
        return;
      }
      aprBps = Math.round(aprPct * 100);
    }
    let termMonths: number | null = null;
    if (draft.kind === "payoff" && draft.term_months.trim()) {
      const t = Number.parseInt(draft.term_months, 10);
      if (!Number.isFinite(t) || t <= 0) {
        setError("Term must be a positive whole number of months.");
        return;
      }
      termMonths = t;
    }
    setBusy(true);
    setError("");
    try {
      const starting = draft.starting.trim() ? dollarsToCents(draft.starting) : null;
      const monthly = draft.monthly_contribution.trim()
        ? dollarsToCents(draft.monthly_contribution)
        : null;
      await upsertGoal(supabase, {
        ...(draft.id ? { id: draft.id } : {}),
        space_id: activeSpaceId,
        kind: draft.kind,
        name: draft.name.trim(),
        target_amount: target,
        starting_amount: starting,
        target_date: draft.target_date.trim() || null,
        monthly_contribution: monthly,
        linked_account_id: draft.linked_account_id,
        apr_bps: aprBps,
        term_months: termMonths,
      });
      setDraft(null);
      setReloadCount((n) => n + 1);
    } catch (e) {
      setError((e as Error).message ?? "Could not save the goal.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await deleteGoal(supabase, id);
      setDraft(null);
      setReloadCount((n) => n + 1);
    } catch (e) {
      setError((e as Error).message ?? "Could not delete.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleShare(goalId: string, spaceId: string) {
    setBusy(true);
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

  function persistIncludeShared(next: boolean) {
    setIncludeShared(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("cvc-goals-include-shared", next ? "1" : "0");
    }
  }

  if (signedIn === null) return null;

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

  const balanceById = new Map(accounts.map((a) => [a.id, a.current_balance ?? 0]));

  return (
    <main className="container" style={{ padding: "32px 0" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h1 style={{ margin: 0 }}>Goals</h1>
        <Link href="/" className="muted" style={{ fontSize: 14 }}>
          ← Home
        </Link>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <label className="muted" style={{ fontSize: 13 }}>
          Space
        </label>
        <select
          value={activeSpaceId ?? ""}
          onChange={(e) => {
            setActiveSpaceId(e.target.value);
            if (typeof window !== "undefined") {
              localStorage.setItem("cvc-active-space", e.target.value);
            }
          }}
          style={selectStyle}
        >
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          className={includeShared ? "btn btn-primary" : "btn btn-secondary"}
          style={{ padding: "8px 14px", fontSize: 14 }}
          onClick={() => persistIncludeShared(!includeShared)}
        >
          {includeShared ? "Including shared" : "This space only"}
        </button>
        <div style={{ flex: 1 }} />
        {!draft ? (
          <button
            className="btn btn-primary"
            style={{ padding: "8px 14px", fontSize: 14 }}
            onClick={startNew}
          >
            + New goal
          </button>
        ) : null}
      </div>

      {error ? (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "var(--negative)",
            padding: "10px 14px",
            borderRadius: 10,
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          {error}
        </div>
      ) : null}

      {draft ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>
            {draftReadOnly ? "Goal details" : draft.id ? "Edit goal" : "New goal"}
          </h3>
          {draftReadOnly ? (
            <p className="muted" style={{ marginTop: -8, marginBottom: 12, fontSize: 13 }}>
              Read-only — owned by another space.
            </p>
          ) : null}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button
              className={draft.kind === "save" ? "btn btn-primary" : "btn btn-secondary"}
              style={{ padding: "8px 14px", fontSize: 13 }}
              onClick={() => !draftReadOnly && setDraft({ ...draft, kind: "save" })}
              disabled={draftReadOnly}
            >
              Save toward
            </button>
            <button
              className={draft.kind === "payoff" ? "btn btn-primary" : "btn btn-secondary"}
              style={{ padding: "8px 14px", fontSize: 13 }}
              onClick={() => !draftReadOnly && setDraft({ ...draft, kind: "payoff" })}
              disabled={draftReadOnly}
            >
              Pay off debt
            </button>
          </div>
          <FormGrid>
            <FormField label="Name">
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder={draft.kind === "save" ? "Emergency fund" : "Pay off Citi card"}
                style={inputStyle}
                readOnly={draftReadOnly}
              />
            </FormField>
            <FormField label={draft.kind === "save" ? "Target amount" : "Target balance (usually 0)"}>
              <input
                value={draft.target}
                onChange={(e) => setDraft({ ...draft, target: e.target.value })}
                placeholder="0.00"
                inputMode="decimal"
                style={inputStyle}
                readOnly={draftReadOnly}
              />
            </FormField>
            {draft.kind === "payoff" ? (
              <FormField label="Starting debt">
                <input
                  value={draft.starting}
                  onChange={(e) => setDraft({ ...draft, starting: e.target.value })}
                  placeholder="Balance the day you set this goal"
                  inputMode="decimal"
                  style={inputStyle}
                  readOnly={draftReadOnly}
                />
              </FormField>
            ) : null}
            <FormField label="Monthly contribution (optional)">
              <input
                value={draft.monthly_contribution}
                onChange={(e) =>
                  setDraft({ ...draft, monthly_contribution: e.target.value })
                }
                placeholder="0.00"
                inputMode="decimal"
                style={inputStyle}
                readOnly={draftReadOnly}
              />
            </FormField>
            {draft.kind === "payoff" ? (
              <>
                <FormField label="APR % (optional)">
                  <input
                    value={draft.apr}
                    onChange={(e) => setDraft({ ...draft, apr: e.target.value })}
                    placeholder="24.99"
                    inputMode="decimal"
                    style={inputStyle}
                    readOnly={draftReadOnly}
                  />
                </FormField>
                <FormField label="Term months (optional)">
                  <input
                    value={draft.term_months}
                    onChange={(e) => setDraft({ ...draft, term_months: e.target.value })}
                    placeholder="36"
                    inputMode="numeric"
                    style={inputStyle}
                    readOnly={draftReadOnly}
                  />
                </FormField>
              </>
            ) : null}
            <FormField label="Target date (optional)">
              <input
                type="date"
                value={draft.target_date}
                onChange={(e) => setDraft({ ...draft, target_date: e.target.value })}
                style={inputStyle}
                readOnly={draftReadOnly}
              />
            </FormField>
          </FormGrid>

          {!draftReadOnly && draft.kind === "payoff" && !draft.id && debtAccounts.length > 0 ? (
            <div style={{ marginTop: 12 }}>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Pick a debt to track (optional)
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {debtAccounts.map((a) => (
                  <button
                    key={a.id}
                    className={
                      draft.linked_account_id === a.id ? "btn btn-primary" : "btn btn-secondary"
                    }
                    style={{ padding: "6px 12px", fontSize: 13 }}
                    onClick={() => pickDebt(a)}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {!draftReadOnly ? (
            <div style={{ marginTop: 12 }}>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Linked account (optional)
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  className={
                    draft.linked_account_id === null ? "btn btn-primary" : "btn btn-secondary"
                  }
                  style={{ padding: "6px 12px", fontSize: 13 }}
                  onClick={() => setDraft({ ...draft, linked_account_id: null })}
                >
                  None
                </button>
                {accounts.map((a) => (
                  <button
                    key={a.id}
                    className={
                      draft.linked_account_id === a.id ? "btn btn-primary" : "btn btn-secondary"
                    }
                    style={{ padding: "6px 12px", fontSize: 13 }}
                    onClick={() => setDraft({ ...draft, linked_account_id: a.id })}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            {draftReadOnly ? (
              <button
                className="btn btn-secondary"
                style={{ padding: "10px 16px" }}
                onClick={() => {
                  setDraft(null);
                  setDraftReadOnly(false);
                  setError("");
                }}
              >
                Close
              </button>
            ) : (
              <>
                <button
                  className="btn btn-primary"
                  style={{ padding: "10px 16px" }}
                  onClick={save}
                  disabled={busy}
                >
                  {busy ? "Saving…" : "Save"}
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: "10px 16px" }}
                  onClick={() => {
                    setDraft(null);
                    setError("");
                  }}
                  disabled={busy}
                >
                  Cancel
                </button>
                {draft.id ? (
                  <button
                    className="btn btn-secondary"
                    style={{ padding: "10px 16px", color: "var(--negative)" }}
                    onClick={() => remove(draft.id!)}
                    disabled={busy}
                  >
                    Delete
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 12 }}>
        {goals.map((g) => {
          const current = g.linked_account_id ? balanceById.get(g.linked_account_id) ?? 0 : 0;
          const fraction = goalProgressFraction({
            kind: g.kind,
            current,
            target: g.target_amount,
            starting: g.starting_amount,
          });
          const projected = projectGoalDate({
            kind: g.kind,
            current,
            target: g.target_amount,
            monthlyContribution: g.monthly_contribution,
            aprBps: g.apr_bps ?? 0,
          });
          const monthsLeft = projectMonthsToGoal({
            kind: g.kind,
            current,
            target: g.target_amount,
            monthlyContribution: g.monthly_contribution,
            aprBps: g.apr_bps ?? 0,
          });
          const requiredPmt =
            g.kind === "payoff" && g.term_months
              ? requiredMonthlyPayment({
                  balance: current || g.starting_amount || 0,
                  aprBps: g.apr_bps ?? 0,
                  months: g.term_months,
                  target: g.target_amount,
                })
              : null;
          const ownedHere = g.space_id === activeSpaceId;
          const shares = sharesByGoal[g.id] ?? new Set<string>();
          return (
            <div key={g.id} className="card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <button
                  type="button"
                  onClick={
                    ownedHere
                      ? () => startEdit(g)
                      : () => startEdit(g, { readOnly: true })
                  }
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    fontSize: 16,
                    fontWeight: 600,
                    color: "var(--text)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {g.name}
                </button>
                <span className="muted" style={{ fontSize: 13 }}>
                  {g.kind === "save" ? "Save" : "Payoff"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 8,
                  fontSize: 14,
                }}
              >
                <span>{formatCents(current)}</span>
                <span className="muted">
                  {g.kind === "save" ? "of " : "→ "}
                  {formatCents(g.target_amount)}
                </span>
              </div>
              <div
                style={{
                  height: 8,
                  background: "var(--border)",
                  borderRadius: 999,
                  overflow: "hidden",
                  marginTop: 8,
                }}
              >
                <div
                  style={{
                    width: `${Math.round(fraction * 100)}%`,
                    height: "100%",
                    background: g.kind === "save" ? "var(--positive)" : "var(--primary)",
                  }}
                />
              </div>
              {projected ? (
                <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>
                  {g.kind === "save" ? "Funded" : "Paid off"} by{" "}
                  {projected.toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                  {monthsLeft != null ? ` · ${monthsLeft} mo` : ""}
                </div>
              ) : g.target_date ? (
                <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>
                  Target: {g.target_date}
                </div>
              ) : null}
              {g.monthly_contribution ? (
                <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                  {formatCents(g.monthly_contribution)} per month
                </div>
              ) : null}
              {requiredPmt != null ? (
                <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                  Required: {formatCents(requiredPmt)}/mo over {g.term_months} mo
                  {g.apr_bps ? ` @ ${aprBpsToString(g.apr_bps)}% APR` : ""}
                </div>
              ) : null}

              {ownedHere && shareableSpaces.length > 0 ? (
                <div style={{ marginTop: 12 }}>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                    Share to:
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {shareableSpaces.map((s) => (
                      <button
                        key={s.id}
                        className={shares.has(s.id) ? "btn btn-primary" : "btn btn-secondary"}
                        style={{ padding: "6px 12px", fontSize: 13 }}
                        onClick={() => toggleShare(g.id, s.id)}
                        disabled={busy}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

            </div>
          );
        })}
        {goals.length === 0 ? (
          <div className="card">
            <p className="muted" style={{ margin: 0 }}>
              {includeShared
                ? "Nothing yet — no goals here, and none have been shared into this space."
                : "Nothing yet — set your first savings or payoff goal."}
            </p>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function FormGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 12,
      }}
    >
      {children}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span className="muted" style={{ fontSize: 12 }}>
        {label}
      </span>
      {children}
    </label>
  );
}
