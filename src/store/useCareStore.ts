"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { z } from "zod";

const refillSchema = z.object({
  petId: z.string().min(1).max(100),
  productId: z.string().min(1).max(100),
  sharedPetIds: z.array(z.string().min(1).max(100)).max(20),
  sealedBags: z.number().int().min(0).max(99),
  openGrams: z.number().int().min(0).max(100000),
  updatedAt: z.iso.datetime(),
});
const logSchema = z.object({
  day: z.number().int().min(1).max(21),
  appetite: z.enum(["GOOD", "LOW", "NONE"]),
  stool: z.enum(["NORMAL", "SOFT", "OTHER"]),
  note: z.string().trim().max(240),
});
const transitionSchema = z.object({
  petId: z.string().min(1).max(100),
  productId: z.string().min(1).max(100),
  oldFoodName: z.string().trim().min(1).max(80),
  startDate: z.iso.date(),
  durationDays: z.union([z.literal(7), z.literal(10), z.literal(14)]),
  logs: z.array(logSchema).max(21),
});

export type RefillPlan = z.infer<typeof refillSchema>;
export type TransitionPlan = z.infer<typeof transitionSchema>;
export type TransitionLog = z.infer<typeof logSchema>;

interface CareState {
  hydrated: boolean;
  refillPlans: RefillPlan[];
  transitionPlans: TransitionPlan[];
  saveRefill: (plan: RefillPlan) => void;
  saveTransition: (plan: TransitionPlan) => void;
  saveLog: (petId: string, log: TransitionLog) => void;
  removeRefill: (petId: string) => void;
  removeTransition: (petId: string) => void;
  resetCare: () => void;
  setHydrated: () => void;
}

export const useCareStore = create<CareState>()(
  persist(
    (set) => ({
      hydrated: false,
      refillPlans: [],
      transitionPlans: [],
      saveRefill: (raw) => {
        const plan = refillSchema.parse(raw);
        set((state) => ({
          refillPlans: [
            ...state.refillPlans.filter((item) => item.petId !== plan.petId),
            plan,
          ].slice(-20),
        }));
      },
      saveTransition: (raw) => {
        const plan = transitionSchema.parse(raw);
        set((state) => ({
          transitionPlans: [
            ...state.transitionPlans.filter(
              (item) => item.petId !== plan.petId,
            ),
            plan,
          ].slice(-20),
        }));
      },
      saveLog: (petId, raw) => {
        const log = logSchema.parse(raw);
        set((state) => ({
          transitionPlans: state.transitionPlans.map((plan) =>
            plan.petId === petId && log.day <= plan.durationDays
              ? {
                  ...plan,
                  logs: [
                    ...plan.logs.filter((item) => item.day !== log.day),
                    log,
                  ].sort((a, b) => a.day - b.day),
                }
              : plan,
          ),
        }));
      },
      removeRefill: (petId) =>
        set((state) => ({
          refillPlans: state.refillPlans.filter((plan) => plan.petId !== petId),
        })),
      removeTransition: (petId) =>
        set((state) => ({
          transitionPlans: state.transitionPlans.filter(
            (plan) => plan.petId !== petId,
          ),
        })),
      resetCare: () => set({ refillPlans: [], transitionPlans: [] }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "purespot-care-tools",
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        refillPlans: state.refillPlans,
        transitionPlans: state.transitionPlans,
      }),
      merge: (saved, current) => {
        const parsed = z
          .object({
            refillPlans: z.array(refillSchema).max(20),
            transitionPlans: z.array(transitionSchema).max(20),
          })
          .safeParse(saved);
        return parsed.success ? { ...current, ...parsed.data } : current;
      },
    },
  ),
);
