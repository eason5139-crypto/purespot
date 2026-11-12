"use client";

export interface FlyToCartPayload {
  id: string;
  startX: number;
  startY: number;
  image?: string;
  label?: string;
}

export interface PawBurstPayload {
  id: string;
  x: number;
  y: number;
}

const FLY_EVENT = "purespot:fly-to-cart";
const PAW_EVENT = "purespot:paw-burst";
const CART_BUMP_EVENT = "purespot:cart-bump";

/**
 * 觸發商品拋物線飛入購物車動畫
 */
export function triggerFlyToCart(
  sourceEl: HTMLElement | null,
  options?: { image?: string; label?: string; delayMs?: number },
) {
  if (typeof window === "undefined") return;

  const delay = options?.delayMs ?? 0;
  const rect = sourceEl?.getBoundingClientRect();
  const startX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const startY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;

  const dispatch = () => {
    const payload: FlyToCartPayload = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      startX,
      startY,
      image: options?.image,
      label: options?.label,
    };
    window.dispatchEvent(new CustomEvent<FlyToCartPayload>(FLY_EVENT, { detail: payload }));
  };

  if (delay > 0) {
    window.setTimeout(dispatch, delay);
  } else {
    dispatch();
  }
}

/**
 * 觸發愛心／肉球粒子噴發微互動
 */
export function triggerPawBurst(sourceEl: HTMLElement | null) {
  if (typeof window === "undefined" || !sourceEl) return;
  const rect = sourceEl.getBoundingClientRect();
  const payload: PawBurstPayload = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
  window.dispatchEvent(new CustomEvent<PawBurstPayload>(PAW_EVENT, { detail: payload }));
}

export function triggerCartBump(label?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CART_BUMP_EVENT, { detail: { label } }));
}

export { FLY_EVENT, PAW_EVENT, CART_BUMP_EVENT };

