"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { z } from "zod";
import { initialPets } from "@/lib/catalog";
import { petSchema, type ActivePet } from "@/lib/types";
export type { ActivePet } from "@/lib/types";
interface PetContextState {
  allPets: ActivePet[];
  activePetId: string;
  setActivePet: (id: string) => void;
  updatePet: (id: string, patch: Partial<Omit<ActivePet, "id">>) => void;
  addPet: (pet: ActivePet) => void;
  removePet: (id: string) => void;
}
const persistedSchema = z.object({
  allPets: z.array(petSchema).min(1).max(20),
  activePetId: z.string(),
});
export const usePetContextStore = create<PetContextState>()(
  persist(
    (set) => ({
      allPets: initialPets,
      activePetId: initialPets[0]!.id,
      setActivePet: (id) =>
        set((s) =>
          s.allPets.some((p) => p.id === id) ? { activePetId: id } : {},
        ),
      updatePet: (id, patch) =>
        set((s) => ({
          allPets: s.allPets.map((p) =>
            p.id === id ? petSchema.parse({ ...p, ...patch, id }) : p,
          ),
        })),
      addPet: (pet) =>
        set((s) => {
          const valid = petSchema.parse(pet);
          if (
            s.allPets.length >= 20 ||
            s.allPets.some((p) => p.id === valid.id)
          )
            throw new Error("毛孩資料重複或已達上限");
          return { allPets: [...s.allPets, valid], activePetId: valid.id };
        }),
      removePet: (id) =>
        set((s) => {
          if (s.allPets.length <= 1) return {};
          const allPets = s.allPets.filter((p) => p.id !== id);
          return {
            allPets,
            activePetId: s.activePetId === id ? allPets[0]!.id : s.activePetId,
          };
        }),
    }),
    {
      name: "purespot-pet-context",
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ allPets: s.allPets, activePetId: s.activePetId }),
      merge: (saved, current) => {
        const parsed = persistedSchema.safeParse(saved);
        if (!parsed.success) return current;
        const { allPets, activePetId } = parsed.data;
        return {
          ...current,
          allPets,
          activePetId: allPets.some((p) => p.id === activePetId)
            ? activePetId
            : allPets[0]!.id,
        };
      },
    },
  ),
);
export const useActivePet = () =>
  usePetContextStore(
    (s) => s.allPets.find((p) => p.id === s.activePetId) ?? s.allPets[0]!,
  );
