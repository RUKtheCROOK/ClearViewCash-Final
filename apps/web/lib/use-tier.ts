"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { tierAllows, type Tier } from "@cvc/types";

/**
 * Web parallel of apps/mobile/hooks/useTier.ts. Reads `users.tier` once on
 * mount; defaults to "starter" until the row resolves so gated UI stays
 * conservatively locked rather than flashing premium content for free users.
 */
export function useTier(supabase: SupabaseClient) {
  const [tier, setTier] = useState<Tier>("starter");
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("users")
      .select("tier")
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const next = (data?.tier as Tier) ?? "starter";
        setTier(next);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase]);
  return {
    tier,
    isPremium: tier !== "starter",
    canForecast: tierAllows(tier, "forecast"),
    canPaymentLinks: tierAllows(tier, "paymentLinks"),
    canReports: tierAllows(tier, "reports"),
  };
}
