"use client";
import { create } from "zustand";

interface CompareState {
  ids: string[];
  open: boolean;
  add: (id: string) => boolean;
  remove: (id: string) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
}

export const useCompareStore = create<CompareState>((set, get) => ({
  ids: [],
  open: false,
  add: (id) => {
    const ids = get().ids;
    if (ids.includes(id)) return true;
    if (ids.length >= 3) return false;
    set({ ids: [...ids, id] });
    return true;
  },
  remove: (id) => set((state) => ({ ids: state.ids.filter((item) => item !== id) })),
  clear: () => set({ ids: [], open: false }),
  setOpen: (open) => set({ open }),
}));
