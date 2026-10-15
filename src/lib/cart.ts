import { getProduct } from "./catalog";
import type { CartItem, Product } from "./types";
export function unitPrice(product: Product, mode: CartItem["mode"]) {
  return mode === "AUTOSHIP"
    ? Math.round(product.priceNt * 0.9)
    : product.priceNt;
}
export function cartTotals(items: CartItem[]) {
  const subtotalNt = items.reduce((sum, item) => {
    const p = getProduct(item.productId);
    return sum + (p ? unitPrice(p, item.mode) * item.quantity : 0);
  }, 0);
  const thresholdNt =
    items.length > 0 && items.every((i) => i.mode === "AUTOSHIP") ? 699 : 999;
  const shippingNt = subtotalNt === 0 || subtotalNt >= thresholdNt ? 0 : 80;
  const savingsNt = items.reduce((sum, item) => {
    const p = getProduct(item.productId);
    return (
      sum + (p ? (p.priceNt - unitPrice(p, item.mode)) * item.quantity : 0)
    );
  }, 0);
  return {
    subtotalNt,
    shippingNt,
    thresholdNt,
    savingsNt,
    totalNt: subtotalNt + shippingNt,
    remainingNt: Math.max(0, thresholdNt - subtotalNt),
  };
}
export const cartKey = (item: Omit<CartItem, "key" | "quantity">) =>
  `${item.petId}:${item.productId}:${item.mode}:${item.intervalDays ?? 0}`;
