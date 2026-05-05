"use client";

import { TX_CATEGORY_KINDS, categoryKindLabel } from "@cvc/domain";
import { I } from "../../lib/icons";
import { categoryTint, type CategoryKind, type ThemeMode } from "../../lib/categoryTheme";
import { Avatar } from "./Avatar";
import { CategoryGlyph } from "./CategoryGlyph";
import type { AccountOpt, AmountRange, DateRangeKey, MemberOpt, Status } from "./types";

interface Props {
  mode: ThemeMode;
  status: Status;
  setStatus: (s: Status) => void;
  counts: { all: number; pending: number; completed: number };
  accountOpts: AccountOpt[];
  accountIds: Set<string>;
  toggleAccount: (id: string) => void;
  categoryKinds: Set<string>;
  toggleCategoryKind: (k: string) => void;
  memberOpts: MemberOpt[];
  ownerUserIds: Set<string>;
  toggleOwner: (id: string) => void;
  showPersonGroup: boolean;
  dateRange: DateRangeKey;
  setDateRange: (k: DateRangeKey) => void;
  amountRange: AmountRange;
  setAmountRange: (r: AmountRange) => void;
  onApply: () => void;
  onReset: () => void;
  totalMatches: number;
}

export function ExpandedFilters(props: Props) {
  return (
    <div
      style={{
        padding: 16,
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--line-soft)",
      }}
    >
      <Group label="Status">
        <Seg
          options={[
            { k: "all", label: "All", count: props.counts.all },
            { k: "pending", label: "Pending", count: props.counts.pending },
            { k: "completed", label: "Completed", count: props.counts.completed },
          ]}
          value={props.status}
          onChange={(k) => props.setStatus(k as Status)}
        />
      </Group>

      <Group label="Account">
        <ChipRow>
          {props.accountOpts.length === 0 ? (
            <Empty>No linked accounts.</Empty>
          ) : (
            props.accountOpts.map((a) => (
              <ChoiceChip
                key={a.id}
                label={a.name}
                active={props.accountIds.has(a.id)}
                onClick={() => props.toggleAccount(a.id)}
              />
            ))
          )}
        </ChipRow>
      </Group>

      <Group label="Category">
        <ChipRow>
          {TX_CATEGORY_KINDS.map((kind) => (
            <CategoryChoiceChip
              key={kind}
              mode={props.mode}
              kind={kind as CategoryKind}
              label={categoryKindLabel(kind)}
              active={props.categoryKinds.has(kind)}
              onClick={() => props.toggleCategoryKind(kind)}
            />
          ))}
        </ChipRow>
      </Group>

      {props.showPersonGroup && props.memberOpts.length > 0 ? (
        <Group label="Person">
          <ChipRow>
            {props.memberOpts.map((m) => (
              <PersonChip
                key={m.user_id}
                mode={props.mode}
                initial={memberInitial(m)}
                name={memberName(m)}
                hue={30}
                active={props.ownerUserIds.has(m.user_id)}
                onClick={() => props.toggleOwner(m.user_id)}
              />
            ))}
          </ChipRow>
        </Group>
      ) : null}

      <Group label="Date range">
        <ChipRow>
          {(
            [
              { k: "7d", label: "7 days" },
              { k: "30d", label: "30 days" },
              { k: "month", label: "This month" },
              { k: "all", label: "All time" },
            ] as Array<{ k: DateRangeKey; label: string }>
          ).map((opt) => (
            <ChoiceChip
              key={opt.k}
              label={opt.label}
              active={props.dateRange === opt.k}
              onClick={() => props.setDateRange(opt.k)}
            />
          ))}
        </ChipRow>
      </Group>

      <Group label="Amount range">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <AmountInput
            placeholder="Min"
            value={props.amountRange.min}
            onChange={(v) => props.setAmountRange({ ...props.amountRange, min: v })}
          />
          <span style={{ color: "var(--ink-3)" }}>–</span>
          <AmountInput
            placeholder="Max"
            value={props.amountRange.max}
            onChange={(v) => props.setAmountRange({ ...props.amountRange, max: v })}
          />
        </div>
      </Group>

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button
          type="button"
          onClick={props.onApply}
          style={{
            appearance: "none",
            cursor: "pointer",
            background: "var(--brand)",
            color: "var(--brand-on)",
            border: 0,
            height: 40,
            padding: "0 14px",
            borderRadius: 10,
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            fontWeight: 500,
            flex: 1,
          }}
        >
          Apply · {props.totalMatches} {props.totalMatches === 1 ? "result" : "results"}
        </button>
        <button
          type="button"
          onClick={props.onReset}
          style={{
            appearance: "none",
            cursor: "pointer",
            background: "transparent",
            color: "var(--ink-1)",
            border: "1px solid var(--line-firm)",
            height: 40,
            padding: "0 14px",
            borderRadius: 10,
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          fontWeight: 600,
          color: "var(--ink-2)",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{children}</div>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-3)" }}>
      {children}
    </span>
  );
}

function Seg({
  options,
  value,
  onChange,
}: {
  options: Array<{ k: string; label: string; count: number }>;
  value: string;
  onChange: (k: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        background: "var(--bg-tinted)",
        borderRadius: 8,
        padding: 3,
        gap: 2,
      }}
    >
      {options.map((opt) => {
        const active = opt.k === value;
        return (
          <button
            key={opt.k}
            type="button"
            onClick={() => onChange(opt.k)}
            style={{
              appearance: "none",
              border: 0,
              cursor: "pointer",
              flex: 1,
              height: 30,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              background: active ? "var(--bg-surface)" : "transparent",
              color: active ? "var(--ink-1)" : "var(--ink-2)",
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              fontWeight: 500,
              boxShadow: active ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
            }}
          >
            {opt.label}
            <span style={{ fontFamily: "var(--font-num)", fontSize: 10, color: "var(--ink-3)" }}>
              {opt.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ChoiceChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        appearance: "none",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        height: 30,
        padding: "0 11px",
        borderRadius: 999,
        background: active ? "var(--ink-1)" : "var(--bg-surface)",
        color: active ? "var(--bg-canvas)" : "var(--ink-2)",
        border: `1px solid ${active ? "var(--ink-1)" : "var(--line-soft)"}`,
        fontFamily: "var(--font-ui)",
        fontSize: 12.5,
        fontWeight: 500,
      }}
    >
      {active ? <I.check color="var(--bg-canvas)" size={12} /> : null}
      {label}
    </button>
  );
}

function CategoryChoiceChip({
  mode,
  kind,
  label,
  active,
  onClick,
}: {
  mode: ThemeMode;
  kind: CategoryKind;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const tint = categoryTint(kind, mode);
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        appearance: "none",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 30,
        padding: "0 10px 0 6px",
        borderRadius: 999,
        background: active ? tint.pillBg : "var(--bg-surface)",
        color: active ? tint.pillFg : "var(--ink-2)",
        border: `1px solid ${active ? "transparent" : "var(--line-soft)"}`,
        fontFamily: "var(--font-ui)",
        fontSize: 12.5,
        fontWeight: 500,
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          background: active ? tint.swatch : tint.pillBg,
          display: "grid",
          placeItems: "center",
        }}
      >
        <CategoryGlyph kind={kind} color={active ? "#fff" : tint.pillFg} size={12} strokeWidth={1.8} />
      </span>
      {label}
    </button>
  );
}

function PersonChip({
  mode,
  initial,
  name,
  hue,
  active,
  onClick,
}: {
  mode: ThemeMode;
  initial: string;
  name: string;
  hue: number;
  active: boolean;
  onClick: () => void;
}) {
  const tint =
    hue === 30
      ? categoryTint("dining", mode)
      : { pillBg: "var(--bg-tinted)", pillFg: "var(--ink-2)", swatch: "var(--ink-3)", wash: "", edge: "" };
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        appearance: "none",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 30,
        padding: "0 11px 0 4px",
        borderRadius: 999,
        background: active ? tint.pillBg : "var(--bg-surface)",
        color: active ? tint.pillFg : "var(--ink-2)",
        border: `1px solid ${active ? "transparent" : "var(--line-soft)"}`,
        fontFamily: "var(--font-ui)",
        fontSize: 12.5,
        fontWeight: 500,
      }}
    >
      <Avatar initial={initial} bg={tint.pillBg} fg={tint.pillFg} size={20} />
      {name}
    </button>
  );
}

function AmountInput({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        gap: 6,
        height: 36,
        padding: "0 12px",
        borderRadius: 8,
        background: "var(--bg-tinted)",
      }}
    >
      <span style={{ fontFamily: "var(--font-num)", fontSize: 12, color: "var(--ink-3)" }}>$</span>
      <input
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={value === null ? "" : String(value)}
        onChange={(e) => {
          const t = e.target.value.trim();
          if (!t) return onChange(null);
          const n = Number(t);
          onChange(Number.isFinite(n) ? n : null);
        }}
        style={{
          flex: 1,
          border: 0,
          outline: 0,
          background: "transparent",
          fontFamily: "var(--font-num)",
          fontSize: 13,
          color: "var(--ink-1)",
        }}
      />
    </div>
  );
}

function memberInitial(m: MemberOpt): string {
  const n = m.display_name ?? m.invited_email ?? "?";
  return (n.trim()[0] ?? "?").toUpperCase();
}

function memberName(m: MemberOpt): string {
  return m.display_name ?? m.invited_email ?? m.user_id.slice(0, 8);
}
