// Mobile mirror of apps/web/app/reports/_components/savedExportsStore.ts —
// uses AsyncStorage instead of localStorage. The same shape is used so the two
// clients stay in sync conceptually (no cross-device sync — local-only).

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "cvc-reports-saved-exports";
const MAX_ENTRIES = 12;

export interface SavedExport {
  id: string;
  name: string;
  savedAt: string;
  reportKind: "cash_flow" | "category" | "net_worth" | "income" | "activity";
  format: "PDF" | "CSV";
}

export async function loadSavedExports(): Promise<SavedExport[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValid).slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export async function pushSavedExport(entry: Omit<SavedExport, "id" | "savedAt">): Promise<SavedExport> {
  const full: SavedExport = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: new Date().toISOString(),
    ...entry,
  };
  try {
    const current = await loadSavedExports();
    const next = [full, ...current].slice(0, MAX_ENTRIES);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore persistence error — return entry anyway so callers can render
    // optimistically.
  }
  return full;
}

export async function clearSavedExports() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

function isValid(x: unknown): x is SavedExport {
  if (!x || typeof x !== "object") return false;
  const e = x as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.name === "string" &&
    typeof e.savedAt === "string" &&
    typeof e.reportKind === "string" &&
    (e.format === "PDF" || e.format === "CSV")
  );
}
