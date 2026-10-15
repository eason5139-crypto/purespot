import { describe, it, expect } from "vitest";
import { calculatePetNutrition } from "../src/lib/nutritionCalculator";
const base = {
  petType: "DOG" as const,
  weightKg: 10,
  ageMonths: 24,
  isNeutered: true,
  activityLevel: "MODERATE" as const,
  isWeightLossGoal: false,
  foodKcalPer100g: 400,
};
describe("科學配糧與預測補貨", () => {
  it("使用未過早四捨五入的 RER 與 DER", () => {
    const result = calculatePetNutrition(base, 2000, 980);
    expect(result.rer).toBeCloseTo(393.6389, 3);
    expect(result.der).toBeCloseTo(result.rer * 1.6, 8);
    expect(result.dailyGrams).toBeCloseTo(result.der / 4, 8);
  });
  it("已結紮成貓採用 1.2 倍，幼貓採用 2.5 倍", () => {
    expect(
      calculatePetNutrition({ ...base, petType: "CAT", weightKg: 4.5 }).factor,
    ).toBe(1.2);
    expect(
      calculatePetNutrition({ ...base, petType: "CAT", ageMonths: 6 }).factor,
    ).toBe(2.5);
  });
  it("幼犬以四個月分齡", () => {
    expect(calculatePetNutrition({ ...base, ageMonths: 3 }).factor).toBe(3);
    expect(calculatePetNutrition({ ...base, ageMonths: 4 }).factor).toBe(2);
  });
  it.each([NaN, Infinity, 0, -2, 91])("拒絕無效體重 %s", (weightKg) => {
    expect(() => calculatePetNutrition({ ...base, weightKg })).toThrow();
  });
  it("拒絕零熱量與負包裝", () => {
    expect(() =>
      calculatePetNutrition({ ...base, foodKcalPer100g: 0 }),
    ).toThrow();
    expect(() => calculatePetNutrition(base, -1)).toThrow();
  });
  it("成長期不能自動減重", () => {
    expect(() =>
      calculatePetNutrition({ ...base, ageMonths: 6, isWeightLossGoal: true }),
    ).toThrow("成長期");
  });
  it("小包裝自動增加包數，覆蓋週期與三天缓衝", () => {
    const r = calculatePetNutrition({ ...base, weightKg: 70 }, 500, 99);
    expect(r.recommendedIntervalDays).toBe(14);
    expect(r.bagsPerDelivery).toBeGreaterThan(1);
    expect(r.coverageDays).toBeGreaterThanOrEqual(17);
  });
  it("月消耗使用 30 日實際比例，價格依整數單價打折", () => {
    const r = calculatePetNutrition(base, 2000, 999);
    expect(r.monthlyBagCount).toBeCloseTo((r.dailyGrams * 30) / 2000);
    expect(r.autoshipDailyCostNt).toBeCloseTo((r.dailyGrams * 899) / 2000);
  });
  it("極端體重下都不會在預定下一期前斷糧", () => {
    for (const weightKg of [0.5, 1, 4.5, 10, 20, 50, 90]) {
      const r = calculatePetNutrition({ ...base, weightKg });
      expect((r.bagsPerDelivery * 2000) / r.dailyGrams).toBeGreaterThanOrEqual(
        r.recommendedIntervalDays + 3,
      );
    }
  });
});
