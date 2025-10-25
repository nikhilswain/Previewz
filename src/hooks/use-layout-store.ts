import { create } from "zustand";
import { persist } from "zustand/middleware";

export type LayoutType = "grid" | "overlay" | "masonry" | "large";

interface LayoutStore {
  layout: LayoutType;
  setLayout: (layout: LayoutType) => void;
}

export const useLayoutStore = create<LayoutStore>()(
  persist(
    (set) => ({
      layout: "grid",
      setLayout: (layout) => set({ layout }),
    }),
    {
      name: "layout-store",
    }
  )
);
