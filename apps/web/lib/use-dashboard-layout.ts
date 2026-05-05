"use client";

import { useCallback, useEffect, useState } from "react";

export type DashboardModuleId = "funding" | "bills" | "forecast" | "recent" | "netWorth";

export interface DashboardLayoutEntry {
  id: DashboardModuleId;
  visible: boolean;
}

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayoutEntry[] = [
  { id: "funding", visible: true },
  { id: "bills", visible: true },
  { id: "forecast", visible: true },
  { id: "recent", visible: true },
  { id: "netWorth", visible: true },
];

const STORAGE_KEY = "cvc-dashboard-layout";

function readStored(): DashboardLayoutEntry[] {
  if (typeof window === "undefined") return DEFAULT_DASHBOARD_LAYOUT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DASHBOARD_LAYOUT;
    const parsed = JSON.parse(raw) as DashboardLayoutEntry[];
    if (!Array.isArray(parsed)) return DEFAULT_DASHBOARD_LAYOUT;
    // Append any modules added after this layout was persisted so users
    // automatically pick up new sections without losing their order.
    const known = new Set(parsed.map((e) => e.id));
    const additions = DEFAULT_DASHBOARD_LAYOUT.filter((d) => !known.has(d.id));
    return [...parsed, ...additions];
  } catch {
    return DEFAULT_DASHBOARD_LAYOUT;
  }
}

export function useDashboardLayout() {
  const [layout, setLayoutState] = useState<DashboardLayoutEntry[]>(DEFAULT_DASHBOARD_LAYOUT);

  // Hydrate after mount to avoid SSR mismatch.
  useEffect(() => {
    setLayoutState(readStored());
  }, []);

  const setLayout = useCallback((next: DashboardLayoutEntry[]) => {
    setLayoutState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage may throw in private mode; UI still updates in memory.
    }
  }, []);

  const reset = useCallback(() => {
    setLayout(DEFAULT_DASHBOARD_LAYOUT);
  }, [setLayout]);

  return { layout, setLayout, reset };
}
