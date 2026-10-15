"use client";
import { create } from "zustand";
interface UiState {
  cartOpen: boolean;
  calculatorProductId: string | null;
  petEditorOpen: boolean;
  ugcPostId: string | null;
  authOpen: boolean;
  setCartOpen: (open: boolean) => void;
  openCalculator: (id: string | null) => void;
  setPetEditorOpen: (open: boolean) => void;
  openUgc: (id: string | null) => void;
  setAuthOpen: (open: boolean) => void;
}
export const useUiStore = create<UiState>((set) => ({
  cartOpen: false,
  calculatorProductId: null,
  petEditorOpen: false,
  ugcPostId: null,
  authOpen: false,
  setCartOpen: (cartOpen) => set({ cartOpen }),
  openCalculator: (calculatorProductId) => set({ calculatorProductId }),
  setPetEditorOpen: (petEditorOpen) => set({ petEditorOpen }),
  openUgc: (ugcPostId) => set({ ugcPostId }),
  setAuthOpen: (authOpen) => set({ authOpen }),
}));

