import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface SpaceLike {
  id: string;
  name: string;
  tint: string;
}

interface PendingGoalDraft {
  account_id: string;
  account_name: string;
  balance_cents: number;
}

export type ThemeMode = "system" | "light" | "dark";

export type BudgetMode = "monthly" | "paycheck";

export type DashboardModuleId = "funding" | "bills" | "forecast" | "recent" | "netWorth";

export interface DashboardLayoutEntry {
  id: DashboardModuleId;
  visible: boolean;
}

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayoutEntry[] = [
  { id: "funding", visible: true },
  { id: "bills", visible: true },
  { id: "forecast", visible: true },
  { id: "recent", visible: true },
  { id: "netWorth", visible: true },
];

interface AppState {
  activeSpaceId: string | null;
  sharedView: boolean;
  pendingGoalDraft: PendingGoalDraft | null;
  // Bump to force-refresh the unread notification count from anywhere
  // (e.g. after marking notifications read on the notifications screen).
  notificationsBump: number;
  // One-shot flag — set true to request the Activity screen open the
  // AddTransactionSheet on next mount. Activity clears it on close.
  addTransactionPending: boolean;
  themeMode: ThemeMode;
  budgetMode: BudgetMode;
  dashboardLayout: DashboardLayoutEntry[];
  dismissedAccountsLinksCallout: boolean;
  dismissedBudgetSuggestions: string[];
  setActiveSpace: (id: string) => void;
  toggleView: () => void;
  setPendingGoalDraft: (draft: PendingGoalDraft | null) => void;
  bumpNotifications: () => void;
  requestAddTransaction: (open: boolean) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setBudgetMode: (mode: BudgetMode) => void;
  setDashboardLayout: (layout: DashboardLayoutEntry[]) => void;
  resetDashboardLayout: () => void;
  dismissAccountsLinksCallout: () => void;
  dismissBudgetSuggestion: (category: string) => void;
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      activeSpaceId: null,
      sharedView: false,
      pendingGoalDraft: null,
      notificationsBump: 0,
      addTransactionPending: false,
      themeMode: "system",
      budgetMode: "monthly",
      dashboardLayout: DEFAULT_DASHBOARD_LAYOUT,
      dismissedAccountsLinksCallout: false,
      dismissedBudgetSuggestions: [],
      setActiveSpace: (id) => set({ activeSpaceId: id }),
      toggleView: () => set((s) => ({ sharedView: !s.sharedView })),
      setPendingGoalDraft: (draft) => set({ pendingGoalDraft: draft }),
      bumpNotifications: () => set((s) => ({ notificationsBump: s.notificationsBump + 1 })),
      requestAddTransaction: (open) => set({ addTransactionPending: open }),
      setThemeMode: (mode) => set({ themeMode: mode }),
      setBudgetMode: (mode) => set({ budgetMode: mode }),
      setDashboardLayout: (layout) => set({ dashboardLayout: layout }),
      resetDashboardLayout: () => set({ dashboardLayout: DEFAULT_DASHBOARD_LAYOUT }),
      dismissAccountsLinksCallout: () => set({ dismissedAccountsLinksCallout: true }),
      dismissBudgetSuggestion: (category) =>
        set((s) =>
          s.dismissedBudgetSuggestions.includes(category)
            ? s
            : { dismissedBudgetSuggestions: [...s.dismissedBudgetSuggestions, category] },
        ),
    }),
    {
      name: "cvc-app-state",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        activeSpaceId: s.activeSpaceId,
        sharedView: s.sharedView,
        themeMode: s.themeMode,
        budgetMode: s.budgetMode,
        dashboardLayout: s.dashboardLayout,
        dismissedAccountsLinksCallout: s.dismissedAccountsLinksCallout,
        dismissedBudgetSuggestions: s.dismissedBudgetSuggestions,
      }),
      // If a previously persisted layout is missing newer modules (e.g. we
      // ship a new module key in a future release), append them with
      // visible=true so users automatically see new sections by default.
      merge: (persisted, current) => {
        const persistedTyped = persisted as Partial<AppState> | undefined;
        const persistedLayout = persistedTyped?.dashboardLayout;
        const merged: AppState = { ...current, ...persistedTyped } as AppState;
        if (persistedLayout && Array.isArray(persistedLayout)) {
          const known = new Set(persistedLayout.map((e) => e.id));
          const additions = DEFAULT_DASHBOARD_LAYOUT.filter((d) => !known.has(d.id));
          merged.dashboardLayout = [...persistedLayout, ...additions];
        }
        return merged;
      },
    },
  ),
);

export type { SpaceLike, PendingGoalDraft };
