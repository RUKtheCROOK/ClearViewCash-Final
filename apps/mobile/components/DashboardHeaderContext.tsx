import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export interface DashboardHero {
  effectiveCents: number;
  totalCashCents: number;
  linkedCardDebtCents: number;
  upcomingBillsCents: number;
}

interface ContextValue {
  hero: DashboardHero | null;
  setHero: (hero: DashboardHero | null) => void;
}

const DashboardHeaderContext = createContext<ContextValue | null>(null);

export function DashboardHeaderProvider({ children }: { children: ReactNode }) {
  const [hero, setHero] = useState<DashboardHero | null>(null);
  const value = useMemo(() => ({ hero, setHero }), [hero]);
  return (
    <DashboardHeaderContext.Provider value={value}>
      {children}
    </DashboardHeaderContext.Provider>
  );
}

export function useDashboardHeader(): ContextValue {
  const ctx = useContext(DashboardHeaderContext);
  if (!ctx) {
    return { hero: null, setHero: () => undefined };
  }
  return ctx;
}
