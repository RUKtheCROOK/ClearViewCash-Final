// Canonical metadata for dashboard modules. Both web + mobile customize
// sheets and rendering loops read from here so they stay in sync.

export type DashboardModuleId = "funding" | "bills" | "forecast" | "recent" | "netWorth";

export interface DashboardModuleMeta {
  id: DashboardModuleId;
  label: string;
  description: string;
  premium: boolean;
}

export const DASHBOARD_MODULES: Record<DashboardModuleId, DashboardModuleMeta> = {
  funding: {
    id: "funding",
    label: "Funding coverage",
    description: "How much of your card balances your funding accounts can actually cover.",
    premium: false,
  },
  bills: {
    id: "bills",
    label: "Bills · next 7 days",
    description: "Top upcoming bills and their funding accounts.",
    premium: false,
  },
  forecast: {
    id: "forecast",
    label: "30-day forecast",
    description: "Projected balance over the next 30 days with low-balance markers.",
    premium: true,
  },
  recent: {
    id: "recent",
    label: "Recent activity",
    description: "Most recent transactions across your linked accounts.",
    premium: false,
  },
  netWorth: {
    id: "netWorth",
    label: "Net worth",
    description: "Assets minus liabilities snapshot.",
    premium: false,
  },
};

export const DASHBOARD_MODULE_ORDER: DashboardModuleId[] = [
  "funding",
  "bills",
  "forecast",
  "recent",
  "netWorth",
];

export function isPremiumModule(id: DashboardModuleId): boolean {
  return DASHBOARD_MODULES[id].premium;
}
