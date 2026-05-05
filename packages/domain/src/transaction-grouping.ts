// Bucket transactions into the date groups the Activity page renders:
//   TODAY · YESTERDAY · THIS WEEK · then per-date "TUE · APR 29"
// Returns ordered groups (most-recent first) with running net totals.

export interface MinTxn {
  id: string;
  amount: number;
  posted_at: string;
}

export interface DateGroup<T extends MinTxn> {
  key: string;
  label: string;
  count: number;
  totalCents: number;
  txns: T[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diffDays(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / DAY_MS);
}

function parseDate(iso: string): Date | null {
  // Accept "YYYY-MM-DD" and full ISO timestamps.
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const [, y, mo, da] = m;
  return new Date(Number(y), Number(mo) - 1, Number(da));
}

const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function dateLabel(d: Date): string {
  return `${DOW[d.getDay()]} · ${MONTH[d.getMonth()]} ${d.getDate()}`;
}

interface BucketKey {
  key: string;
  label: string;
  rank: number; // higher = more recent
}

function bucketFor(date: Date, today: Date): BucketKey {
  const days = diffDays(today, date);
  if (days === 0) return { key: "today", label: "TODAY", rank: 1_000_000 };
  if (days === 1) return { key: "yesterday", label: "YESTERDAY", rank: 999_999 };
  if (days <= 7 && days > 1) return { key: "week", label: "THIS WEEK", rank: 999_998 };
  return {
    key: `d-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
    label: dateLabel(date),
    // Older dates rank by absolute time so they sort newest-first.
    rank: date.getTime(),
  };
}

export function groupTransactionsByDate<T extends MinTxn>(
  txns: T[],
  reference: Date = new Date(),
): DateGroup<T>[] {
  const today = startOfDay(reference);
  const map = new Map<string, DateGroup<T> & { rank: number }>();

  for (const t of txns) {
    const d = parseDate(t.posted_at);
    if (!d) continue;
    const b = bucketFor(d, today);
    const existing = map.get(b.key);
    if (existing) {
      existing.count += 1;
      existing.totalCents += t.amount;
      existing.txns.push(t);
    } else {
      map.set(b.key, {
        key: b.key,
        label: b.label,
        rank: b.rank,
        count: 1,
        totalCents: t.amount,
        txns: [t],
      });
    }
  }

  const groups = Array.from(map.values()).sort((a, b) => b.rank - a.rank);
  // Strip rank from the public type.
  return groups.map(({ rank: _rank, ...rest }) => rest);
}
