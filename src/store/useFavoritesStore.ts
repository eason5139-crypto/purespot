"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { z } from "zod";
import { toast } from "sonner";

interface FavoritesState {
  ids: string[];
  toggle: (id: string) => void;
  clear: () => void;
  setIds: (ids: string[]) => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set) => ({
      ids: [],
      toggle: (id) => {
        const wasSaved = useFavoritesStore.getState().ids.includes(id);
        set((state) => ({ ids: wasSaved ? state.ids.filter((item) => item !== id) : [...state.ids, id].slice(-200) }));
        void import("./useAuthStore").then(({ useAuthStore }) => {
          if (!useAuthStore.getState().user) return;
          return fetch("/api/account/favorites", { method: wasSaved ? "DELETE" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: id }) }).then((response) => {
            if (!response.ok) throw new Error("收藏暫時無法同步");
          });
        }).catch(() => {
          set((state) => ({ ids: wasSaved ? [...state.ids, id] : state.ids.filter((item) => item !== id) }));
          toast.error("收藏暫時無法同步，請再試一次");
        });
      },
      clear: () => set({ ids: [] }),
      setIds: (ids) => set({ ids: [...new Set(ids)].slice(-200) }),
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
