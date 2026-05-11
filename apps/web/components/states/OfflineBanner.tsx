"use client";

import { useEffect, useState } from "react";
import { StateMono } from "./StateMono";

function formatRelative(syncedAt: number | null): string {
  if (syncedAt == null) return "—";
  const diffMs = Date.now() - syncedAt;
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "moments ago";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [lastOnlineAt, setLastOnlineAt] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("cvc-last-online-at");
    if (stored) setLastOnlineAt(Number(stored));

    setOffline(!navigator.onLine);

    function handleOffline() {
      setOffline(true);
      document.documentElement.setAttribute("data-offline", "true");
    }
    function handleOnline() {
      setOffline(false);
      document.documentElement.removeAttribute("data-offline");
      const now = Date.now();
      setLastOnlineAt(now);
      window.localStorage.setItem("cvc-last-online-at", String(now));
    }

    if (navigator.onLine) handleOnline();
    else handleOffline();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: "10px 16px",
        background: "var(--bg-tinted)",
        borderBottom: "1px solid var(--line-soft)",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--ink-2)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 8.5C5 6 8.5 4.5 12 4.5s7 1.5 10 4M6 12.5C8 11 10 10 12 10s4 1 6 2.5M9.5 16.5c.7-.5 1.5-1 2.5-1s1.8.5 2.5 1" />
        <path d="M3 3l18 18" />
      </svg>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-1)", fontWeight: 500 }}>
          You&apos;re offline
        </div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>
          Last synced <StateMono style={{ color: "var(--ink-2)" }}>{formatRelative(lastOnlineAt)}</StateMono> · We&apos;ll
          catch up automatically.
        </div>
      </div>
    </div>
  );
}
