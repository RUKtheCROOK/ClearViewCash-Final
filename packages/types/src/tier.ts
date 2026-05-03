import { z } from "zod";

export const TierSchema = z.enum(["starter", "pro", "household"]);
export type Tier = z.infer<typeof TierSchema>;

export const TierLimits = {
  starter: { maxAccounts: 2, maxSpaces: 1, maxMembersPerSpace: 1, forecast: false, paymentLinks: false, reports: false },
  pro: { maxAccounts: Infinity, maxSpaces: 3, maxMembersPerSpace: 1, forecast: true, paymentLinks: true, reports: true },
  household: { maxAccounts: Infinity, maxSpaces: Infinity, maxMembersPerSpace: 5, forecast: true, paymentLinks: true, reports: true },
} as const;

export type TierLimitKey = keyof typeof TierLimits.starter;

export function tierAllows(tier: Tier, feature: TierLimitKey): boolean {
  const v = TierLimits[tier][feature];
  return typeof v === "boolean" ? v : true;
}

export function tierWithin(tier: Tier, feature: "maxAccounts" | "maxSpaces" | "maxMembersPerSpace", currentCount: number): boolean {
  return currentCount < TierLimits[tier][feature];
}
