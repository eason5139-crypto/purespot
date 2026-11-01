import { describe, expect, it } from "vitest";
import { initialPets, products } from "@/lib/catalog";
import {
  addCalendarDays,
  dailyFoodGrams,
  forecastFood,
  suitableMainFoods,
  transitionPercent,
} from "@/lib/careTools";

describe("照顧工具共用計算", () => {
  it("只讓同物種、合年齡且避開過敏原的有貨主食進入計算", () => {
    const cat = initialPets[0]!;
    const foods = suitableMainFoods(products, cat);
    expect(foods.some((food) => food.id === "salmon-cat")).toBe(true);
    expect(foods.some((food) => food.id === "chicken-cat")).toBe(false);
    expect(foods.every((food) => food.type === "CAT" && food.stock > 0)).toBe(
      true,
    );
    expect(
      dailyFoodGrams(products.find((food) => food.id === "chicken-cat")!, cat),
    ).toBeNull();
  });
  it("共食時用總份量估算，存量不可超過包裝", () => {
    const cat = initialPets[0]!;
    const food = products.find((item) => item.id === "salmon-cat")!;
    const daily = dailyFoodGrams(food, cat)!;
    const forecast = forecastFood({
      bagGrams: food.bagGrams,
      sealedBags: 1,
      openGrams: 500,
      dailyGrams: daily,
    });
    expect(forecast?.daysRemaining).toBeCloseTo(2500 / daily);
    expect(
      forecastFood({
        bagGrams: food.bagGrams,
        sealedBags: 1,
        openGrams: 2500,
        dailyGrams: daily,
      }),
    ).toBeNull();
    expect(
      forecastFood({
        bagGrams: food.bagGrams,
        sealedBags: 0,
        openGrams: 0,
        dailyGrams: daily,
      }),
    ).toBeNull();
    expect(
      forecastFood({
        bagGrams: food.bagGrams,
        sealedBags: 1,
        openGrams: 0,
        dailyGrams: daily * 2,
      })!.daysRemaining,
    ).toBeCloseTo(food.bagGrams / (daily * 2));
  });
  it("換糧首尾比例、無效日期及跨月日期正確", () => {
    expect(transitionPercent(1, 10)).toBe(10);
    expect(transitionPercent(10, 10)).toBe(100);
    expect(transitionPercent(21, 10)).toBe(100);
    expect(addCalendarDays("2026-11-29", 3)).toBe("2026-12-02");
    expect(addCalendarDays("2026-02-31", 1)).toBeNull();
  });
});
