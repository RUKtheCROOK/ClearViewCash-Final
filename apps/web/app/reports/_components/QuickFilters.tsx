"use client";

import { useEffect, useRef, useState } from "react";
import { RANGE_PRESETS, resolvePreset, type DateRange, type RangePreset } from "@cvc/domain";
import { ChevDownIcon } from "./reportGlyphs";

const PRESET_ORDER: { key: RangePreset["key"] | "custom"; label: string; sub?: (r: DateRange) => string }[] = [
  ...RANGE_PRESETS.map((p) => ({ key: p.key, label: p.label })),
  { key: "custom", label: "Custom range" },
];

const FMT_RANGE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const FMT_RANGE_YEAR = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

function formatRangeSub(range: DateRange): string {
  const from = new Date(`${range.from}T00:00:00`);
  const to = new Date(`${range.to}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return `${range.from} – ${range.to}`;
  const sameYear = from.getUTCFullYear() === to.getUTCFullYear();
  if (sameYear) {
    const yr = from.getUTCFullYear();
    return `${FMT_RANGE.format(from)} – ${FMT_RANGE.format(to)}, ${yr}`;
  }
  return `${FMT_RANGE_YEAR.format(from)} – ${FMT_RANGE_YEAR.format(to)}`;
}

interface DateRangePillProps {
  presetKey: RangePreset["key"] | "custom";
  range: DateRange;
  onChange: (next: { presetKey: RangePreset["key"] | "custom"; range: DateRange }) => void;
}

export function DateRangePill({ presetKey, range, onChange }: DateRangePillProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const activeLabel =
    PRESET_ORDER.find((p) => p.key === presetKey)?.label ??
    (presetKey === "custom" ? "Custom range" : "This month");
  const sub = formatRangeSub(range);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          padding: "10px 14px",
          borderRadius: 12,
          background: "var(--bg-surface)",
          border: "1px solid var(--line-soft)",
          cursor: "pointer",
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          gap: 10,
          alignItems: "center",
          textAlign: "left",
          color: "var(--ink-1)",
          fontFamily: "var(--font-ui)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-num)",
            fontSize: 9.5,
            color: "var(--ink-3)",
            letterSpacing: "0.08em",
            fontWeight: 600,
          }}
        >
          RANGE
        </span>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 500 }}>{activeLabel}</div>
          <div
            style={{
              fontFamily: "var(--font-num)",
              fontSize: 10.5,
              color: "var(--ink-3)",
              marginTop: 1,
            }}
          >
            {sub}
          </div>
        </div>
        <ChevDownIcon color="var(--ink-3)" />
      </button>

      {open ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 10,
            background: "var(--bg-surface)",
            border: "1px solid var(--line-soft)",
            borderRadius: 14,
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            padding: 6,
          }}
        >
          {RANGE_PRESETS.map((p) => {
            const active = presetKey === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  onChange({ presetKey: p.key, range: resolvePreset(p.key) });
                  setOpen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: active ? "var(--brand-tint)" : "transparent",
                  color: active ? "var(--brand)" : "var(--ink-1)",
                  border: 0,
                  cursor: "pointer",
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  fontWeight: active ? 500 : 400,
                }}
              >
                {p.label}
              </button>
            );
          })}
          <div
            style={{
              marginTop: 4,
              paddingTop: 8,
              borderTop: "1px solid var(--line-soft)",
              padding: "8px 10px",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <input
              type="date"
              value={range.from}
              onChange={(e) => onChange({ presetKey: "custom", range: { ...range, from: e.target.value } })}
              style={inputStyle}
            />
            <span style={{ color: "var(--ink-3)" }}>→</span>
            <input
              type="date"
              value={range.to}
              onChange={(e) => onChange({ presetKey: "custom", range: { ...range, to: e.target.value } })}
              style={inputStyle}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface SpaceFilterPillProps {
  spaces: { id: string; name: string; tint?: string | null }[];
  activeSpaceId: string | null;
  onChange: (id: string) => void;
  spaceHueByTint: Record<string, number>;
}

export function SpaceFilterPill({ spaces, activeSpaceId, onChange, spaceHueByTint }: SpaceFilterPillProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const active = spaces.find((s) => s.id === activeSpaceId) ?? spaces[0];
  const activeHue = active ? spaceHueByTint[active.tint ?? "personal"] ?? 195 : 195;
  const dotColor = `oklch(35% 0.060 ${activeHue})`;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          padding: "10px 14px",
          borderRadius: 12,
          background: "var(--bg-surface)",
          border: "1px solid var(--line-soft)",
          cursor: spaces.length > 1 ? "pointer" : "default",
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          gap: 10,
          alignItems: "center",
          textAlign: "left",
          color: "var(--ink-1)",
          fontFamily: "var(--font-ui)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-num)",
            fontSize: 9.5,
            color: "var(--ink-3)",
            letterSpacing: "0.08em",
            fontWeight: 600,
          }}
        >
          SPACE
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: dotColor }} />
          <span style={{ fontSize: 13.5, fontWeight: 500 }}>{active?.name ?? "Personal"}</span>
        </div>
        <ChevDownIcon color="var(--ink-3)" />
      </button>

      {open && spaces.length > 1 ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 10,
            background: "var(--bg-surface)",
            border: "1px solid var(--line-soft)",
            borderRadius: 14,
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            padding: 6,
          }}
        >
          {spaces.map((s) => {
            const isActive = s.id === activeSpaceId;
            const hue = spaceHueByTint[s.tint ?? "personal"] ?? 195;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onChange(s.id);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: isActive ? "var(--brand-tint)" : "transparent",
                  color: isActive ? "var(--brand)" : "var(--ink-1)",
                  border: 0,
                  cursor: "pointer",
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  fontWeight: isActive ? 500 : 400,
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 999, background: `oklch(35% 0.060 ${hue})` }} />
                {s.name}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--line-soft)",
  borderRadius: 8,
  padding: "6px 8px",
  fontSize: 12,
  background: "var(--bg-surface)",
  color: "var(--ink-1)",
  fontFamily: "var(--font-ui)",
  flex: 1,
  minWidth: 0,
};
