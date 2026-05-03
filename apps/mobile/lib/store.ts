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
  setActiveSpace: (id: string) => void;
  toggleView: () => void;
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      activeSpaceId: null,
      sharedView: false,
      setActiveSpace: (id) => set({ activeSpaceId: id }),
      toggleView: () => set((s) => ({ sharedView: !s.sharedView })),
    }),
    {
      name: "cvc-app-state",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ activeSpaceId: s.activeSpaceId, sharedView: s.sharedView }),
    },
  ),
);

export type { SpaceLike };
