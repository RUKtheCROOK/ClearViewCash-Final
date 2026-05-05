"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@cvc/api-client";
import { I } from "../lib/icons";

interface Props {
  open: boolean;
  onClose: () => void;
  supabase: SupabaseClient;
  onChange?: () => void;
}

interface NotificationRow {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

interface ToneSpec {
  fg: string;
  tint: string;
  icon: keyof typeof I;
  label: string;
  urgent?: boolean;
}

const TONE_MAP: Record<string, ToneSpec> = {
  "bill-due": { fg: "var(--brand)", tint: "var(--brand-tint)", icon: "bill", label: "BILL" },
  "bill-overdue": { fg: "var(--neg)", tint: "var(--neg-tint)", icon: "alert", label: "OVERDUE", urgent: true },
  "low-balance": { fg: "var(--warn)", tint: "var(--warn-tint)", icon: "arrowDown", label: "LOW BAL", urgent: true },
  "large-txn": { fg: "var(--accent)", tint: "var(--accent-tint)", icon: "arrowUp", label: "LARGE TXN" },
  "sync-fail": { fg: "var(--neg)", tint: "var(--neg-tint)", icon: "syncErr", label: "SYNC", urgent: true },
  "milestone": { fg: "var(--pos)", tint: "var(--pos-tint)", icon: "star", label: "GOAL" },
  "shared": { fg: "var(--info)", tint: "var(--info-tint)", icon: "share", label: "SHARED" },
  "summary": { fg: "var(--info)", tint: "var(--info-tint)", icon: "summary", label: "WEEKLY" },
};

function tone(kind: string): ToneSpec {
  return TONE_MAP[kind] ?? { fg: "var(--brand)", tint: "var(--brand-tint)", icon: "bell", label: kind.toUpperCase() };
}

function relative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 2) return "yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function bucketFor(iso: string): "today" | "yesterday" | "earlier" {
  const created = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86_400_000);
  if (created >= startOfToday) return "today";
  if (created >= startOfYesterday) return "yesterday";
  return "earlier";
}

export function NotificationsDrawer({ open, onClose, supabase, onChange }: Props) {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    getMyNotifications(supabase as never, { limit: 50 })
      .then((d) => {
        if (!cancelled) setRows(d as NotificationRow[]);
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, supabase]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const visible = useMemo(
    () => (filter === "unread" ? rows.filter((r) => !r.read_at) : rows),
    [rows, filter],
  );
  const grouped = useMemo(() => {
    const t: NotificationRow[] = [];
    const y: NotificationRow[] = [];
    const e: NotificationRow[] = [];
    for (const r of visible) {
      const b = bucketFor(r.created_at);
      if (b === "today") t.push(r);
      else if (b === "yesterday") y.push(r);
      else e.push(r);
    }
    return { today: t, yesterday: y, earlier: e };
  }, [visible]);

  const unread = rows.filter((r) => !r.read_at).length;
  const urgentUnread = rows.filter((r) => !r.read_at && tone(r.kind).urgent).length;

  async function handleRowClick(row: NotificationRow) {
    if (row.read_at) return;
    try {
      await markNotificationRead(supabase as never, row.id);
      setRows((cur) => cur.map((r) => (r.id === row.id ? { ...r, read_at: new Date().toISOString() } : r)));
      onChange?.();
    } catch {
      // silent
    }
  }

  async function handleMarkAll() {
    try {
      await markAllNotificationsRead(supabase as never);
      const stamp = new Date().toISOString();
      setRows((cur) => cur.map((r) => (r.read_at ? r : { ...r, read_at: stamp })));
      onChange?.();
    } catch {
      // silent
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,22,28,0.32)",
        zIndex: 100,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          maxHeight: "92vh",
          background: "var(--bg-canvas)",
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "24px 16px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "var(--brand-tint)",
                display: "grid",
                placeItems: "center",
                position: "relative",
              }}
            >
              <I.bell color="var(--brand)" size={18} />
              {unread > 0 ? (
                <span
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -2,
                    minWidth: 16,
                    height: 16,
                    padding: "0 4px",
                    borderRadius: 999,
                    background: "var(--neg)",
                    color: "white",
                    border: "2px solid var(--bg-canvas)",
                    fontFamily: "var(--font-num)",
                    fontSize: 9.5,
                    fontWeight: 700,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {unread > 99 ? "99+" : unread}
                </span>
              ) : null}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 500, color: "var(--ink-1)", letterSpacing: "-0.005em" }}>
                Notifications
              </div>
              <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 1 }}>
                {rows.length === 0
                  ? loading
                    ? "Loading…"
                    : "All caught up"
                  : `${unread} unread · ${rows.length} total`}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                background: "var(--bg-tinted)",
                border: 0,
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
              }}
            >
              <I.close color="var(--ink-2)" />
            </button>
          </div>

          {rows.length > 0 ? (
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                onClick={handleMarkAll}
                style={{
                  padding: "7px 12px",
                  borderRadius: 999,
                  background: "var(--bg-surface)",
                  border: "1px solid var(--line-soft)",
                  color: "var(--ink-1)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Mark all read
              </button>
              <FilterChip label="All" active={filter === "all"} onClick={() => setFilter("all")} />
              <FilterChip
                label={`Unread · ${unread}`}
                active={filter === "unread"}
                onClick={() => setFilter("unread")}
              />
              <span style={{ flex: 1 }} />
              <Link
                href="/settings/notifications"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  background: "var(--bg-tinted)",
                  border: 0,
                  display: "grid",
                  placeItems: "center",
                  textDecoration: "none",
                }}
              >
                <I.gear color="var(--ink-2)" size={14} />
              </Link>
            </div>
          ) : null}
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {urgentUnread > 0 ? (
            <div style={{ padding: "0 16px" }}>
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: "var(--neg-tint)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--neg)" }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-1)" }}>
                    {urgentUnread} need{urgentUnread === 1 ? "s" : ""} your attention
                  </span>
                </div>
                <I.chevR color="var(--neg)" />
              </div>
            </div>
          ) : null}

          {grouped.today.length > 0 ? (
            <Group label="TODAY" count={grouped.today.length}>
              {grouped.today.map((r, i, arr) => (
                <Row key={r.id} row={r} last={i === arr.length - 1} onClick={() => handleRowClick(r)} />
              ))}
            </Group>
          ) : null}
          {grouped.yesterday.length > 0 ? (
            <Group label="YESTERDAY" count={grouped.yesterday.length}>
              {grouped.yesterday.map((r, i, arr) => (
                <Row key={r.id} row={r} last={i === arr.length - 1} onClick={() => handleRowClick(r)} />
              ))}
            </Group>
          ) : null}
          {grouped.earlier.length > 0 ? (
            <Group label="EARLIER" count={grouped.earlier.length}>
              {grouped.earlier.map((r, i, arr) => (
                <Row key={r.id} row={r} last={i === arr.length - 1} onClick={() => handleRowClick(r)} />
              ))}
            </Group>
          ) : null}

          {visible.length === 0 && !loading ? (
            <div style={{ padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: "var(--ink-1)" }}>
                You&apos;re all caught up
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 6 }}>
                Nothing to look at right now.
              </div>
            </div>
          ) : null}

          <div style={{ height: 24 }} />
        </div>
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "7px 12px",
        borderRadius: 999,
        background: active ? "var(--brand-tint)" : "var(--bg-surface)",
        border: `1px solid ${active ? "var(--brand)" : "var(--line-soft)"}`,
        color: active ? "var(--brand)" : "var(--ink-2)",
        fontFamily: "var(--font-ui)",
        fontSize: 12,
        fontWeight: active ? 600 : 500,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function Group({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: "flex", padding: "14px 16px 6px", gap: 8 }}>
        <span style={{ fontFamily: "var(--font-num)", fontSize: 10, color: "var(--ink-3)", letterSpacing: 1, fontWeight: 600 }}>
          {label}
        </span>
        <span style={{ fontFamily: "var(--font-num)", fontSize: 10, color: "var(--ink-4)" }}>·</span>
        <span style={{ fontFamily: "var(--font-num)", fontSize: 10, color: "var(--ink-4)" }}>{count}</span>
      </div>
      <div
        style={{
          margin: "0 16px",
          background: "var(--bg-surface)",
          borderRadius: 14,
          border: "1px solid var(--line-soft)",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Row({ row, last, onClick }: { row: NotificationRow; last: boolean; onClick: () => void }) {
  const t = tone(row.kind);
  const Icon = I[t.icon];
  const unread = !row.read_at;
  const urgent = !!t.urgent;
  const payload = row.payload ?? {};
  const title =
    typeof payload.title === "string" ? payload.title : row.kind.replace(/-/g, " ");
  const body = typeof payload.body === "string" ? payload.body : "";

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        background: "transparent",
        cursor: "pointer",
        textAlign: "left",
        padding: "12px 16px",
        borderBottom: last ? "none" : "1px solid var(--line-soft)",
        borderLeft: urgent && unread ? `3px solid ${t.fg}` : "3px solid transparent",
        borderTop: 0,
        borderRight: 0,
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: t.tint,
          display: "grid",
          placeItems: "center",
          marginTop: 2,
        }}
      >
        <Icon color={t.fg} size={16} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <span style={{ fontFamily: "var(--font-num)", fontSize: 9, letterSpacing: "0.08em", fontWeight: 700, color: t.fg }}>
            {t.label}
          </span>
          <span style={{ fontSize: 10.5, color: "var(--ink-4)" }}>•</span>
          <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{relative(row.created_at)}</span>
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: unread ? 600 : 500,
            color: unread ? "var(--ink-1)" : "var(--ink-2)",
          }}
        >
          {title}
        </div>
        {body ? (
          <div style={{ fontSize: 12, color: unread ? "var(--ink-2)" : "var(--ink-3)", marginTop: 3 }}>
            {body}
          </div>
        ) : null}
      </div>
      {unread && !urgent ? (
        <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--brand)", marginTop: 12 }} />
      ) : (
        <span style={{ marginTop: 12, color: urgent && unread ? t.fg : "var(--ink-4)" }}>
          <I.chevR color={urgent && unread ? t.fg : "var(--ink-4)"} />
        </span>
      )}
    </button>
  );
}
