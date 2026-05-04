import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface SpaceLike {
  id: string;
  name: string;
  tint: string;
  kind: "personal" | "shared";
}

interface AppState {
  activeSpaceId: string | null;
  sharedView: boolean;
  // Bump to force-refresh the unread notification count from anywhere
  // (e.g. after marking notifications read on the notifications screen).
  notificationsBump: number;
  setActiveSpace: (id: string) => void;
  toggleView: () => void;
  bumpNotifications: () => void;
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      activeSpaceId: null,
      sharedView: false,
      notificationsBump: 0,
      setActiveSpace: (id) => set({ activeSpaceId: id }),
      toggleView: () => set((s) => ({ sharedView: !s.sharedView })),
      bumpNotifications: () => set((s) => ({ notificationsBump: s.notificationsBump + 1 })),
    }),
    {
      name: "cvc-app-state",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ activeSpaceId: s.activeSpaceId, sharedView: s.sharedView }),
    },
  ),
);

export type { SpaceLike };
