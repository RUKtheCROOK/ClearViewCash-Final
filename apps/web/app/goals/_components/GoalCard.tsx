"use client";

import { GoalIcon, type GoalGlyphKey } from "./goalGlyphs";
import { Num, fmtMoneyShort } from "./Num";
import { GoalProgressBar } from "./ProgressArc";
import { StatusPill, type GoalStatus, projectionLabel } from "./StatusPill";

export interface GoalCardData {
  id: string;
  kind: "save" | "payoff";
  name: string;
  glyph: GoalGlyphKey;
  hue: number;
  /** Saved amount (savings) or paid-down amount (payoff), in cents. */
  savedCents: number;
  /** Target amount (savings) or starting balance (payoff), in cents. */
  targetCents: number;
  /** Remaining cents — for payoff, current balance; for savings, target - saved. */
  remainingCents: number;
  status: GoalStatus;
  monthsLeft: number | null;
  targetDate: string | null;
  readOnly?: boolean;
}

interface Props {
  goal: GoalCardData;
  onClick: () => void;
}

const TARGET_DATE_FMT = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });

function formatTargetDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return TARGET_DATE_FMT.format(d);
}

export function GoalCard({ goal, onClick }: Props) {
  const isSavings = goal.kind === "save";
  const fraction = goal.targetCents > 0 ? goal.savedCents / goal.targetCents : 0;
  const dateLabel = formatTargetDate(goal.targetDate);
  const projection = projectionLabel(goal.status, goal.monthsLeft, goal.targetDate);

  const arcColor =
    goal.status === "behind"
      ? "var(--accent)"
      : goal.status === "ahead"
        ? "var(--pos)"
        : "var(--brand)";

  const projectionColor =
    goal.status === "ahead"
      ? "var(--pos)"
      : goal.status === "behind"
        ? "var(--accent)"
        : "var(--brand)";

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        appearance: "none",
        textAlign: "left",
        padding: 16,
        borderRadius: 16,
        background: "var(--bg-surface)",
        border: "1px solid var(--line-soft)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        cursor: "pointer",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <GoalIcon hue={goal.hue} glyph={goal.glyph} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-num)",
              fontSize: 9.5,
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: "var(--ink-3)",
              textTransform: "uppercase",
            }}
          >
            {isSavings ? "SAVINGS" : "DEBT PAYOFF"}
            {goal.readOnly ? " · SHARED" : ""}
          </div>
          <div
            style={{
              marginTop: 2,
              fontFamily: "var(--font-ui)",
              fontSize: 15,
              fontWeight: 500,
              color: "var(--ink-1)",
              lineHeight: 1.3,
            }}
          >
            {goal.name}
          </div>
          <div style={{ marginTop: 6 }}>
            <StatusPill status={goal.status} />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        {isSavings ? (
          <>
            <Num style={{ fontSize: 22, fontWeight: 600, color: "var(--ink-1)" }}>
              {fmtMoneyShort(goal.savedCents)}
            </Num>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-3)" }}>
              of{" "}
              <Num style={{ color: "var(--ink-2)", fontWeight: 500 }}>
                {fmtMoneyShort(goal.targetCents)}
              </Num>
            </span>
          </>
        ) : (
          <>
            <Num style={{ fontSize: 22, fontWeight: 600, color: "var(--ink-1)" }}>
              {fmtMoneyShort(goal.remainingCents)}
            </Num>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-3)" }}>
              left of{" "}
              <Num style={{ color: "var(--ink-2)", fontWeight: 500 }}>
                {fmtMoneyShort(goal.targetCents)}
              </Num>
            </span>
          </>
        )}
      </div>

      <div>
        <GoalProgressBar fraction={fraction} color={arcColor} />
        <div
          style={{
            marginTop: 8,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            color: "var(--ink-3)",
          }}
        >
          <FlagIcon />
          <span>{dateLabel ? `by ${dateLabel}` : "no target date"}</span>
          <span style={{ marginLeft: "auto", color: projectionColor, fontWeight: 500 }}>
            {projection}
          </span>
        </div>
      </div>
    </button>
  );
}

function FlagIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 21V4l14 5-14 5" />
    </svg>
  );
}
