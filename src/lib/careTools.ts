import { calculatePetNutrition } from "./nutritionCalculator";
import { matchProduct } from "./matching";
import { supportsFoodCalculator, type ActivePet, type Product } from "./types";

export function isMainFood(product: Product) {
  return (
    product.kind !== "SUPPLIES" &&
    product.autoshipEligible &&
    product.kcalPer100g > 0 &&
    product.bagGrams > 0 &&
    product.category !== "零食點心"
  );
}

export function suitableMainFoods(products: Product[], pet: ActivePet) {
  return products.filter(
    (product) =>
      isMainFood(product) &&
      product.stock > 0 &&
      matchProduct(product, pet).safe,
  );
}

export function dailyFoodGrams(
  product: Product,
  pet: ActivePet,
): number | null {
  if (
    !supportsFoodCalculator(pet.type) ||
    !matchProduct(product, pet).safe ||
    !isMainFood(product)
  )
    return null;
  try {
    return calculatePetNutrition(
      {
        petType: pet.type,
        weightKg: pet.weightKg,
        ageMonths: pet.ageMonths,
        isNeutered: pet.isNeutered,
        activityLevel: pet.activityLevel,
        isWeightLossGoal: pet.goal === "WEIGHT_LOSS",
        foodKcalPer100g: product.kcalPer100g,
      },
      product.bagGrams,
      product.priceNt,
    ).dailyGrams;
  } catch {
    return null;
  }
}

export function forecastFood({
  bagGrams,
  sealedBags,
  openGrams,
  dailyGrams,
  leadDays = 5,
}: {
  bagGrams: number;
  sealedBags: number;
  openGrams: number;
  dailyGrams: number;
  leadDays?: number;
}) {
  if (
    ![bagGrams, sealedBags, openGrams, dailyGrams, leadDays].every(
      Number.isFinite,
    ) ||
    bagGrams <= 0 ||
    dailyGrams <= 0 ||
    sealedBags < 0 ||
    !Number.isInteger(sealedBags) ||
    openGrams < 0 ||
    openGrams > bagGrams ||
    leadDays < 0
  )
    return null;
  const totalGrams = sealedBags * bagGrams + openGrams;
  if (!totalGrams) return null;
  const daysRemaining = totalGrams / dailyGrams;
  const reminderInDays = Math.max(0, Math.floor(daysRemaining - leadDays));
  return {
    totalGrams,
    daysRemaining,
    reminderInDays,
    weather:
      daysRemaining <= leadDays
        ? ("rain" as const)
        : daysRemaining <= leadDays + 7
          ? ("cloud" as const)
          : ("sun" as const),
  };
}

export function transitionPercent(day: number, durationDays: number) {
  if (
    !Number.isInteger(day) ||
    !Number.isInteger(durationDays) ||
    durationDays < 2 ||
    durationDays > 21
  )
    return 0;
  return Math.min(
    100,
    Math.max(0, Math.round(((day / durationDays) * 100) / 5) * 5),
  );
}

export function addCalendarDays(date: string, days: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T12:00:00+08:00`);
  if (
    !Number.isFinite(parsed.getTime()) ||
    !Number.isInteger(days) ||
    taipeiDate(parsed) !== date
  )
    return null;
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return taipeiDate(parsed);
}

export function taipeiDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Taipei",
  }).formatToParts(date);
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
