import { describe, expect, it } from "vitest";
import { initialPets, products } from "@/lib/catalog";
import { allergenConflicts } from "@/lib/allergenMatch";
import {
  buildCompassRecommendations,
  compassIntentSchema,
} from "@/lib/selectionCompass";

const cat = initialPets[0]!;
const defaultIntent = compassIntentSchema.parse({});

describe("選物羅盤的商品排除與提案", () => {
  it("將常見別名與成分表一同納入過敏排除", () => {
    expect(allergenConflicts(["魚類"], [], ["鮭魚", "地瓜"])).toEqual(["魚類"]);
    expect(allergenConflicts(["大豆"], [], ["黃豆粉"])).toEqual(["大豆"]);
    expect(allergenConflicts(["雞肉"], [], ["雞油", "南瓜"])).toEqual(["雞肉"]);
    expect(allergenConflicts(["禽肉"], [], ["鴨肉"])).toEqual(["禽肉"]);
    expect(allergenConflicts(["雞肉"], ["家禽"], [])).toEqual(["雞肉"]);
    expect(allergenConflicts(["鴨肉"], [], ["雞肉"])).toEqual([]);
    expect(allergenConflicts(["牛肉"], [], ["鮭魚"])).toEqual([]);
  });

  it("即使 AI 指定不適合的商品，也不會進入任何提案", () => {
    const result = buildCompassRecommendations(products, cat, defaultIntent, [
      "chicken-cat",
      "beef-dog",
      "salmon-cat",
    ]);
    expect(result.cards.some((card) => card.product.id === "chicken-cat")).toBe(
      false,
    );
    expect(result.cards.some((card) => card.product.id === "beef-dog")).toBe(
      false,
    );
    expect(result.cards.every((card) => card.product.type === "CAT")).toBe(
      true,
    );
    expect(result.cards.every((card) => card.product.stock > 0)).toBe(true);
    expect(result.cards.map((card) => card.product.id).length).toBe(
      new Set(result.cards.map((card) => card.product.id)).size,
    );
  });

  it("追加避開條件和預算後仍維持硬排除", () => {
    const intent = compassIntentSchema.parse({
      kind: "FOOD",
      avoid: ["魚類"],
      budgetNt: 1000,
    });
    const result = buildCompassRecommendations(products, cat, intent, [
      "salmon-cat",
    ]);
    expect(
      result.cards.every(
        (card) =>
          card.product.kind !== "SUPPLIES" && card.product.priceNt <= 1000,
      ),
    ).toBe(true);
    expect(result.cards.some((card) => card.product.id === "salmon-cat")).toBe(
      false,
    );
  });

  it("沒有可用熱量來源時，不呈現日份量與補貨天數", () => {
    const salmon = {
      ...products.find((product) => product.id === "salmon-cat")!,
      nutritionDataProvided: false,
    };
    const intent = compassIntentSchema.parse({
      scenario: "REFILL",
      remainingGrams: 300,
    });
    const result = buildCompassRecommendations([salmon], cat, intent);
    expect(result.cards[0]?.dailyGrams).toBeNull();
    expect(result.cards[0]?.dailyCostNt).toBeNull();
    expect(result.cards[0]?.refillInDays).toBeNull();
  });
});
