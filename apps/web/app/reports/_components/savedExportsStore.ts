// Client-side log of saved export entries. Backed by localStorage so the user
// sees a "Saved exports" section after generating a report. Not synced to the
// backend — purely for in-session continuity until a real backend table exists.

const KEY = "cvc-reports-saved-exports";
const MAX_ENTRIES = 12;

export interface SavedExport {
  id: string;
  /** Display name (e.g. "Spending Q1 · for accountant"). */
  name: string;
  /** ISO date string when saved. */
  savedAt: string;
  /** Report kind label for the icon background hue. */
  reportKind: "cash_flow" | "category" | "net_worth" | "income" | "activity";
  /** Format key. */
  format: "PDF" | "CSV";
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadSavedExports(): SavedExport[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValid).slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function pushSavedExport(entry: Omit<SavedExport, "id" | "savedAt">): SavedExport {
  const full: SavedExport = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: new Date().toISOString(),
    ...entry,
  };
  if (!isBrowser()) return full;
  try {
    const current = loadSavedExports();
    const next = [full, ...current].slice(0, MAX_ENTRIES);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return full;
}

export function clearSavedExports() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(KEY);
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
