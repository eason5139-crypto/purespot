"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { z } from "zod";
import { cartItemSchema, type CartItem } from "@/lib/types";
import { getProduct } from "@/lib/catalog";
import { cartKey } from "@/lib/cart";
import { matchProduct } from "@/lib/matching";
import { usePetContextStore } from "./usePetContextStore";
interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "key">) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
}
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (input) =>
        set((s) => {
          const item = cartItemSchema.parse({ ...input, key: cartKey(input) });
          const product = getProduct(item.productId);
          const pet = usePetContextStore
            .getState()
            .allPets.find((p) => p.id === item.petId);
          if (!product || !pet || !matchProduct(product, pet).safe)
            throw new Error("商品與毛孩資料不適配，請重新選擇");
          if (
            item.mode === "AUTOSHIP" &&
            (!product.autoshipEligible || !item.intervalDays)
          )
            throw new Error("循環補貨需要有效的配送週期");
          if (item.mode === "ONCE" && item.intervalDays !== null)
            throw new Error("單次購買不應設定配送週期");
          const totalQuantity =
            s.items
              .filter((i) => i.productId === item.productId)
              .reduce((sum, i) => sum + i.quantity, 0) + item.quantity;
          const existing = s.items.find((i) => i.key === item.key);
          if (
            totalQuantity > product.stock ||
            (existing?.quantity ?? 0) + item.quantity > 99
          )
            throw new Error("選購數量超過目前可用庫存");
          return {
            items: existing
              ? s.items.map((i) =>
                  i.key === item.key
                    ? { ...i, quantity: i.quantity + item.quantity }
                    : i,
                )
              : [...s.items, item],
          };
        }),
      setQuantity: (key, quantity) =>
        set((s) => {
          if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99)
            throw new Error("數量需為 1 至 99 的整數");
          const item = s.items.find((i) => i.key === key);
          if (!item) return {};
          const product = getProduct(item.productId);
          const otherQuantity = s.items
            .filter((i) => i.productId === item.productId && i.key !== key)
            .reduce((sum, i) => sum + i.quantity, 0);
          if (!product || otherQuantity + quantity > product.stock)
            throw new Error("選購數量超過目前可用庫存");
          return {
            items: s.items.map((i) => (i.key === key ? { ...i, quantity } : i)),
          };
        }),
      removeItem: (key) =>
        set((s) => ({ items: s.items.filter((i) => i.key !== key) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "purespot-cart",
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }),
      merge: (saved, current) => {
        const data = z
          .object({ items: z.array(cartItemSchema).max(200) })
          .safeParse(saved);
        if (!data.success) return current;
        const seen = new Set<string>();
        return {
          ...current,
          items: data.data.items.filter((i) => {
            const p = getProduct(i.productId);
            if (
              !p ||
              i.key !== cartKey(i) ||
              seen.has(i.key) ||
              (i.mode === "AUTOSHIP"
                ? i.intervalDays === null
                : i.intervalDays !== null)
            )
              return false;
            seen.add(i.key);
            return true;
          }),
        };
      },
    },
  ),
);
