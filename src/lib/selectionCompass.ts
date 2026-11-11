import { z } from "zod";
import { allergenConflicts } from "./allergenMatch";
import { dailyFoodGrams, isMainFood } from "./careTools";
import { matchProduct } from "./matching";
import { supportsFoodCalculator, type ActivePet, type Product } from "./types";

export const compassIntentSchema = z.object({
  kind: z.enum(["ALL", "FOOD", "SUPPLIES"]).default("ALL"),
  scenario: z.enum(["DAILY", "TRIP", "NEW_PET", "REFILL"]).default("DAILY"),
  budgetNt: z.number().int().min(1).max(100000).nullable().default(null),
  avoid: z.array(z.string().trim().min(1).max(30)).max(12).default([]),
  prefer: z.array(z.string().trim().min(1).max(30)).max(8).default([]),
  remainingGrams: z.number().int().min(0).max(50000).nullable().default(null),
});
export type CompassIntent = z.infer<typeof compassIntentSchema>;

export type CompassCard = {
  role: "FIT" | "VALUE" | "MOMENT";
  title: string;
  product: Product;
  reasons: string[];
  dailyGrams: number | null;
  dailyCostNt: number | null;
  refillInDays: number | null;
  dataNote: string;
};

function normalized(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase();
}

function preferenceScore(
  product: Product,
  intent: CompassIntent,
  suggestedIds: string[],
) {
  const text = normalized(
    `${product.name} ${product.subtitle} ${product.category} ${product.ingredients.join(" ")}`,
  );
  const preference = intent.prefer.reduce(
    (sum, word) => sum + (text.includes(normalized(word)) ? 5 : 0),
    0,
  );
  const suggestionIndex = suggestedIds.indexOf(product.id);
  const aiWeight = suggestionIndex < 0 ? 0 : Math.max(0, 5 - suggestionIndex);
  const scenarioWeight =
    intent.scenario === "TRIP"
      ? product.kind === "SUPPLIES"
        ? 8
        : 0
      : intent.scenario === "REFILL"
        ? product.autoshipEligible && isMainFood(product)
          ? 8
          : 0
        : isMainFood(product)
          ? 4
          : 0;
  return preference + aiWeight + scenarioWeight;
}

export function eligibleCompassProducts(
  products: Product[],
  pet: ActivePet,
  intent: CompassIntent,
) {
  const counts = {
    species: 0,
    age: 0,
    allergy: 0,
    data: 0,
    stock: 0,
    budget: 0,
  };
  const eligible: Product[] = [];
  const excluded = new Set<string>();
  for (const product of products) {
    if (excluded.has(product.id) || product.isPublished === false) continue;
    excluded.add(product.id);
    if (product.type !== pet.type) {
      counts.species++;
      continue;
    }
    if (!product.stock || product.stock < 0) {
      counts.stock++;
      continue;
    }
    if (
      !product.image ||
      product.priceNt <= 0 ||
      !Number.isFinite(product.priceNt) ||
      (product.kind !== "SUPPLIES" && !product.ingredients.length)
    ) {
      counts.data++;
      continue;
    }
    if (intent.kind !== "ALL" && (product.kind ?? "FOOD") !== intent.kind)
      continue;
    const match = matchProduct(product, pet);
    if (product.kind !== "SUPPLIES" && !match.sameStage) {
      counts.age++;
      continue;
    }
    const conflicts = allergenConflicts(
      intent.avoid,
      product.allergens,
      product.ingredients,
    );
    if (match.conflicts.length || conflicts.length) {
      counts.allergy++;
      continue;
    }
    if (intent.budgetNt !== null && product.priceNt > intent.budgetNt) {
      counts.budget++;
      continue;
    }
    eligible.push(product);
  }
  return { eligible, counts };
}

export function buildCompassRecommendations(
  products: Product[],
  pet: ActivePet,
  intent: CompassIntent,
  suggestedIds: string[] = [],
) {
  const { eligible, counts } = eligibleCompassProducts(products, pet, intent);
  const ranked = [...eligible].sort(
    (a, b) =>
      preferenceScore(b, intent, suggestedIds) -
        preferenceScore(a, intent, suggestedIds) ||
      Number(isMainFood(b)) - Number(isMainFood(a)) ||
      a.priceNt - b.priceNt ||
      a.name.localeCompare(b.name),
  );
  const picks: Product[] = [];
  if (ranked[0]) picks.push(ranked[0]);
  const remaining = () =>
    eligible.filter((product) => !picks.some((pick) => pick.id === product.id));
  const value = remaining().sort((a, b) => a.priceNt - b.priceNt)[0];
  if (value) picks.push(value);
  const moment = remaining().sort(
    (a, b) =>
      preferenceScore(b, intent, suggestedIds) -
        preferenceScore(a, intent, suggestedIds) || a.priceNt - b.priceNt,
  )[0];
  if (moment) picks.push(moment);

  const roles: CompassCard["role"][] = ["FIT", "VALUE", "MOMENT"];
  const titles = ["最合拍的選擇", "較輕鬆的預算", "此刻也適合"];
  const cards: CompassCard[] = picks.map((product, index) => {
    const grams =
      product.nutritionDataProvided === false ||
      !supportsFoodCalculator(pet.type)
        ? null
        : dailyFoodGrams(product, pet);
    const dailyCostNt =
      grams !== null && product.bagGrams > 0
        ? Math.round((grams * product.priceNt) / product.bagGrams)
        : null;
    const refillInDays =
      intent.scenario === "REFILL" &&
      intent.remainingGrams !== null &&
      grams !== null &&
      grams > 0
        ? Math.floor(intent.remainingGrams / grams)
        : null;
    const reasons = [
      `適用${pet.name}的物種${product.kind === "SUPPLIES" ? "" : "與年齡"}`,
      "未與目前記錄的過敏原衝突",
    ];
    if (intent.scenario === "TRIP" && product.kind === "SUPPLIES")
      reasons.push("符合出門用品情境");
    if (intent.scenario === "REFILL" && product.autoshipEligible)
      reasons.push("可安排定期補貨");
    if (intent.budgetNt !== null)
      reasons.push(
        `單件價格在 NT$${intent.budgetNt.toLocaleString("zh-TW")} 預算內`,
      );
    if (
      intent.prefer.some((term) =>
        normalized(`${product.name} ${product.ingredients.join(" ")}`).includes(
          normalized(term),
        ),
      )
    )
      reasons.push("包含你偏好的品項或成分");
    const verifiedBatch = product.batches.some(
      (batch) => batch.isDemo === false && Boolean(batch.reportUrl),
    );
    const dataNote =
      product.kind === "SUPPLIES"
        ? "以商品登載規格比對"
        : verifiedBatch
          ? "有附來源的批次資料；成分仍以商品標示為準"
          : "依商品登載成分比對；批次來源尚待核實";
    return {
      role: roles[index]!,
      title: titles[index]!,
      product,
      reasons,
      dailyGrams: grams,
      dailyCostNt,
      refillInDays,
      dataNote,
    };
  });
  return { cards, availableCount: eligible.length, excluded: counts };
}
