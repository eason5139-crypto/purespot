export type GiftCard = {
  included: boolean;
  recipient: string;
  message: string;
  signature: string;
  font: "serif" | "sans";
  tone: "clay" | "blue";
};

export const defaultGiftCard: GiftCard = {
  included: true,
  recipient: "親愛的毛孩",
  message: "願每一餐日常，都成為健康長久的陪伴。",
  signature: "PURESPOT",
  font: "serif",
  tone: "clay",
};

export const giftCardStorageKey = "purespot-gift-card-v1";
