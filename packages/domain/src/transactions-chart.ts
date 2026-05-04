import { addDays, parseISO } from "date-fns";
import type { IsoDate, MoneyCents } from "@cvc/types";
import type { ForecastBucket } from "./forecast";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface TxnInput {
  amount: MoneyCents;
  posted_at: IsoDate;
}

interface BuildOpts {
  days: number;
  endDate: IsoDate;
}

export function buildTransactionBuckets(txns: TxnInput[], opts: BuildOpts): ForecastBucket[] {
  const days = Math.max(1, Math.floor(opts.days));
  const end = parseISO(opts.endDate);

  const flowsByDate = new Map<IsoDate, { cashIn: MoneyCents; cashOut: MoneyCents }>();
  for (const t of txns) {
    if (!t.posted_at) continue;
    const day = t.posted_at.slice(0, 10);
    const cur = flowsByDate.get(day) ?? { cashIn: 0, cashOut: 0 };
    if (t.amount > 0) cur.cashIn += t.amount;
    else if (t.amount < 0) cur.cashOut += -t.amount;
    flowsByDate.set(day, cur);
  }

  const buckets: ForecastBucket[] = [];
  let runningNet: MoneyCents = 0;
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(end, -i);
    const iso = isoUtcDate(date);
    const flows = flowsByDate.get(iso) ?? { cashIn: 0, cashOut: 0 };
    const open = runningNet;
    const close = open + flows.cashIn - flows.cashOut;
    runningNet = close;
    buckets.push({
      label: shortLabel(date),
      startDate: iso,
      endDate: iso,
      effectiveAvailable: close,
      openEffectiveAvailable: open,
      cashIn: flows.cashIn,
      cashOut: flows.cashOut,
      belowThreshold: false,
      appliedItems: [],
      days: [],
    });
  }
  return buckets;
}

function isoUtcDate(d: Date): IsoDate {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shortLabel(d: Date): string {
  return `${MONTH_LABELS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}
