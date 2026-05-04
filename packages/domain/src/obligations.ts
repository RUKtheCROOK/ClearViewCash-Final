import type { MoneyCents } from "@cvc/types";

export interface ObligationAccount {
  type: string;
  current_balance: MoneyCents | null;
}

export interface ObligationBill {
  amount: MoneyCents;
  next_due_at: string;
}

export interface ObligationsBreakdown {
  debtCents: MoneyCents;
  upcomingBillsCents: MoneyCents;
  totalCents: MoneyCents;
}

const DEBT_TYPES = new Set(["credit", "loan"]);

export function computeObligations(input: {
  accounts: ObligationAccount[];
  bills: ObligationBill[];
  today?: Date;
  horizonDays?: number;
}): ObligationsBreakdown {
  const horizonDays = input.horizonDays ?? 30;
  const today = input.today ?? new Date();
  const horizonEnd = new Date(today);
  horizonEnd.setUTCDate(horizonEnd.getUTCDate() + horizonDays);
  const todayIso = today.toISOString().slice(0, 10);
  const horizonIso = horizonEnd.toISOString().slice(0, 10);

  const debtCents = input.accounts
    .filter((a) => DEBT_TYPES.has(a.type))
    .reduce((s, a) => s + (a.current_balance ?? 0), 0);

  const upcomingBillsCents = input.bills
    .filter((b) => b.next_due_at >= todayIso && b.next_due_at <= horizonIso)
    .reduce((s, b) => s + b.amount, 0);

  return {
    debtCents,
    upcomingBillsCents,
    totalCents: debtCents + upcomingBillsCents,
  };
}
