import type { ActivityLevel, IntervalDays, PetType } from "./types";
export interface NutritionInput {
  petType: PetType;
  weightKg: number;
  ageMonths: number;
  isNeutered: boolean;
  activityLevel: ActivityLevel;
  isWeightLossGoal: boolean;
  foodKcalPer100g: number;
}
export interface NutritionResult {
  rer: number;
  der: number;
  factor: number;
  dailyGrams: number;
  monthlyBagCount: number;
  monthlyWholeBags: number;
  dailyCostEstimateNt: number;
  autoshipDailyCostNt: number;
  bagDurationDays: number;
  recommendedIntervalDays: IntervalDays;
  bagsPerDelivery: number;
  coverageDays: number;
  savingsPerBagNt: number;
}
export const DELIVERY_INTERVALS = [14, 28, 42, 56] as const;
export const DELIVERY_BUFFER_DAYS = 3;
export function calculatePetNutrition(
  input: NutritionInput,
  bagGrams = 2000,
  bagPriceNt = 980,
): NutritionResult {
  if (
    ![
      input.weightKg,
      input.foodKcalPer100g,
      bagGrams,
      bagPriceNt,
      input.ageMonths,
    ].every(Number.isFinite)
  )
    throw new Error("請輸入有效的體重與商品數值");
  if (
    input.weightKg < 0.5 ||
    input.weightKg > 90 ||
    input.ageMonths < 1 ||
    input.ageMonths > 360 ||
    input.foodKcalPer100g <= 0 ||
    bagGrams <= 0 ||
    bagPriceNt <= 0
  )
    throw new Error("體重、年齡、熱量、包裝或售價超出允許範圍");
  if (input.ageMonths < 12 && input.isWeightLossGoal)
    throw new Error("成長期毛孩不提供自動減重試算，請先諮詢獸醫");
  const rer = 70 * input.weightKg ** 0.75;
  let factor: number;
  // 幼犬以四個月分齡；不把活動量與結紮係數重複相乘。
  if (input.petType === "DOG") {
    if (input.ageMonths < 4) factor = 3;
    else if (input.ageMonths < 12) factor = 2;
    else if (input.isWeightLossGoal) factor = 1.2;
    else if (["HIGH", "ATHLETIC"].includes(input.activityLevel)) factor = 2.4;
    else if (input.activityLevel === "SEDENTARY")
      factor = input.isNeutered ? 1.4 : 1.6;
    else factor = input.isNeutered ? 1.6 : 1.8;
  } else {
    if (input.ageMonths < 12) factor = 2.5;
    else if (input.isWeightLossGoal) factor = 1;
    else if (input.activityLevel === "SEDENTARY")
      factor = input.isNeutered ? 1.1 : 1.3;
    else factor = input.isNeutered ? 1.2 : 1.4;
  }
  const der = rer * factor;
  const dailyGrams = (der / input.foodKcalPer100g) * 100;
  const bagDurationDays = bagGrams / dailyGrams;
  // 優先選擇單包可覆盖且預留三天的最大週期；短於兩週時增加每期包數。
  const recommendedIntervalDays =
    [...DELIVERY_INTERVALS]
      .reverse()
      .find((days) => days <= bagDurationDays - DELIVERY_BUFFER_DAYS) ?? 14;
  const bagsPerDelivery = Math.max(
    1,
    Math.ceil(
      (recommendedIntervalDays + DELIVERY_BUFFER_DAYS) / bagDurationDays,
    ),
  );
  const dailyCostEstimateNt = (dailyGrams * bagPriceNt) / bagGrams;
  const discountedPrice = Math.round(bagPriceNt * 0.9);
  return {
    rer,
    der,
    factor,
    dailyGrams,
    monthlyBagCount: (dailyGrams * 30) / bagGrams,
    monthlyWholeBags: Math.ceil((dailyGrams * 30) / bagGrams),
    dailyCostEstimateNt,
    autoshipDailyCostNt: (dailyGrams * discountedPrice) / bagGrams,
    bagDurationDays,
    recommendedIntervalDays,
    bagsPerDelivery,
    coverageDays: bagDurationDays * bagsPerDelivery,
    savingsPerBagNt: bagPriceNt - discountedPrice,
  };
}
