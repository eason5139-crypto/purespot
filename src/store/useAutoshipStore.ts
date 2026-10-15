"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { z } from "zod";
import {
  cartItemSchema,
  type LocalPlan,
  type DemoOrder,
  type CartItem,
} from "@/lib/types";
import { addDays } from "@/lib/utils";
const planSchema = z.object({
  id: z.string(),
  petId: z.string(),
  productId: z.string(),
  quantity: z.number().int().min(1).max(99),
  intervalDays: z.union([
    z.literal(14),
    z.literal(28),
    z.literal(42),
    z.literal(56),
  ]),
  nextDeliveryDate: z.iso.datetime(),
  status: z.enum(["ACTIVE", "PAUSED"]),
});
const orderSchema = z.object({
  id: z.string(),
  createdAt: z.iso.datetime(),
  items: z.array(cartItemSchema),
  totalNt: z.number().finite().nonnegative(),
});
interface State {
  plans: LocalPlan[];
  orders: DemoOrder[];
  confirmDemoOrder: (items: CartItem[], totalNt: number) => string;
  delay: (id: string) => void;
  toggle: (id: string) => void;
}
export const useAutoshipStore = create<State>()(
  persist(
    (set) => ({
      plans: [],
      orders: [],
      confirmDemoOrder: (items, totalNt) => {
        const now = new Date().toISOString();
        const id = `DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
        set((s) => ({
          orders: [
            { id, createdAt: now, items: structuredClone(items), totalNt },
            ...s.orders,
          ].slice(0, 100),
          plans: [
            ...s.plans,
            ...items
              .filter((i) => i.mode === "AUTOSHIP" && i.intervalDays)
              .map((i) => ({
                id: crypto.randomUUID(),
                petId: i.petId,
                productId: i.productId,
                quantity: i.quantity,
                intervalDays: i.intervalDays!,
                nextDeliveryDate: addDays(now, i.intervalDays!),
                status: "ACTIVE" as const,
              })),
          ],
        }));
        return id;
      },
      delay: (id) =>
        set((s) => ({
          plans: s.plans.map((p) =>
            p.id === id && p.status === "ACTIVE"
              ? { ...p, nextDeliveryDate: addDays(p.nextDeliveryDate, 7) }
              : p,
          ),
        })),
      toggle: (id) =>
        set((s) => ({
          plans: s.plans.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: p.status === "ACTIVE" ? "PAUSED" : "ACTIVE",
                  nextDeliveryDate:
                    p.status === "PAUSED" &&
                    new Date(p.nextDeliveryDate) < new Date()
                      ? addDays(new Date().toISOString(), p.intervalDays)
                      : p.nextDeliveryDate,
                }
              : p,
          ),
        })),
    }),
    {
      name: "purespot-demo-autoship",
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ plans: s.plans, orders: s.orders }),
      merge: (saved, current) => {
        const data = z
          .object({
            plans: z.array(planSchema).max(500),
            orders: z.array(orderSchema).max(100),
          })
          .safeParse(saved);
        return data.success ? { ...current, ...data.data } : current;
      },
    },
  ),
);
