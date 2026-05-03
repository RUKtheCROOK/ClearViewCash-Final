import { useEffect, useState } from "react";
import { tierAllows, type Tier } from "@cvc/types";
import { supabase } from "../lib/supabase";

export function useTier() {
  const [tier, setTier] = useState<Tier>("starter");
  useEffect(() => {
    supabase
      .from("users")
      .select("tier")
      .maybeSingle()
      .then(({ data }) => setTier(((data?.tier as Tier) ?? "starter") as Tier));
  }, []);
  return {
    tier,
    canForecast: tierAllows(tier, "forecast"),
    canPaymentLinks: tierAllows(tier, "paymentLinks"),
    canReports: tierAllows(tier, "reports"),
  };
}
