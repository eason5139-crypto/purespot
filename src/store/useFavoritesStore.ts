"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { z } from "zod";

interface FavoritesState {
  ids: string[];
  toggle: (id: string) => void;
  clear: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set) => ({
      ids: [],
      toggle: (id) => set((state) => ({ ids: state.ids.includes(id) ? state.ids.filter((item) => item !== id) : [...state.ids, id].slice(-200) })),
      clear: () => set({ ids: [] }),
    }),
    {
      name: "purespot-favorites",
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ ids: state.ids }),
      merge: (saved, current) => {
        const result = z.object({ ids: z.array(z.string().min(1).max(100)).max(200) }).safeParse(saved);
        return result.success ? { ...current, ids: [...new Set(result.data.ids)] } : current;
      },
    },
  ),
);
