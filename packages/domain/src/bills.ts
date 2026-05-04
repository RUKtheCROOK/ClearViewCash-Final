import { differenceInDays, parseISO } from "date-fns";

export type BillCycleStatus = "overdue" | "due_soon" | "upcoming";

export interface BillStatusOptions {
  dueSoonDays?: number;
}

export function computeBillStatus(
  nextDueAtIso: string,
  todayIso: string,
  opts: BillStatusOptions = {},
): BillCycleStatus {
  const dueSoonDays = opts.dueSoonDays ?? 7;
  const diff = differenceInDays(parseISO(nextDueAtIso), parseISO(todayIso));
  if (diff < 0) return "overdue";
  if (diff <= dueSoonDays) return "due_soon";
  return "upcoming";
}

export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
