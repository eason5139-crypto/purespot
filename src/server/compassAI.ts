import "server-only";

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import {
  compassIntentSchema,
  type CompassIntent,
} from "@/lib/selectionCompass";
import type { ActivePet, Product } from "@/lib/types";

const aiOutputSchema = z.object({
  kind: z.enum(["ALL", "FOOD", "SUPPLIES"]).optional(),
  scenario: z.enum(["DAILY", "TRIP", "NEW_PET", "REFILL"]).optional(),
  budgetNt: z.number().int().min(1).max(100000).nullable().optional(),
  avoid: z.array(z.string().trim().min(1).max(30)).max(12).optional(),
  prefer: z.array(z.string().trim().min(1).max(30)).max(8).optional(),
  remainingGrams: z.number().int().min(0).max(50000).nullable().optional(),
  rankedProductIds: z.array(z.string().max(100)).max(10).optional(),
  followUp: z.string().max(120).nullable().optional(),
});

function localInterpretation(query: string, base: CompassIntent) {
  const text = query.toLocaleLowerCase();
  const avoid = [...base.avoid];
  for (const term of [
    "雞肉",
    "牛肉",
    "魚類",
    "大豆",
    "乳製品",
    "小麥",
    "雞蛋",
    "豬肉",
    "鴨肉",
  ]) {
    if (
      new RegExp(`(?:不要|不吃|不含|過敏|避開|避免|無)\\s*${term}`).test(
        text,
      ) &&
      !avoid.includes(term)
    )
      avoid.push(term);
  }
  const budget =
    text.match(/(?:預算|以內|以下|不超過|低於)\s*(?:nt\$?|\$)?\s*(\d{2,6})/i) ??
    text.match(/(?:nt\$?|\$)\s*(\d{2,6})\s*(?:以內|以下)?/i);
  const budgetNt = budget ? Number(budget[1]) : base.budgetNt;
  const remaining = text.match(/(?:剩下|剩餘|還有)\s*(\d{1,5})\s*(?:克|g)/i);
  return compassIntentSchema.parse({
    ...base,
    kind: /用品|玩具|外出|牽繩|胸背/.test(text)
      ? "SUPPLIES"
      : /飼料|食物|主食|罐頭/.test(text)
        ? "FOOD"
        : base.kind,
    scenario: /補貨|快吃完|剩餘|剩下/.test(text)
      ? "REFILL"
      : /旅行|旅遊|出門|郊遊/.test(text)
        ? "TRIP"
        : base.scenario,
    budgetNt: budgetNt && budgetNt <= 100000 ? budgetNt : base.budgetNt,
    remainingGrams: remaining ? Number(remaining[1]) : base.remainingGrams,
    avoid,
  });
}

export async function interpretCompassQuery(
  query: string,
  base: CompassIntent,
  pet: ActivePet,
  candidateProducts: Product[],
) {
  const fallback = localInterpretation(query, base);
  const key = process.env.GEMINI_API_KEY;
  if (!key || !query.trim())
    return {
      intent: fallback,
      suggestedIds: [] as string[],
      aiUsed: false,
      followUp: null as string | null,
    };
  const candidates = candidateProducts.slice(0, 30).map((product) => ({
    id: product.id,
    name: product.name,
    kind: product.kind ?? "FOOD",
    category: product.category,
    priceNt: product.priceNt,
    ingredients: product.ingredients.slice(0, 12),
  }));
  try {
    const ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: { apiVersion: "v1beta", timeout: 25000 },
    });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: JSON.stringify({
        question: query,
        currentFilters: base,
        pet: {
          type: pet.type,
          ageMonths: pet.ageMonths,
          allergies: pet.allergies,
        },
        candidates,
      }),
      config: {
        systemInstruction:
          "你是 PURESPOT 選物羅盤的需求理解器。只輸出 JSON。從買家中文敘述擷取購買情境、品類、單件預算、明確想避開的成分、偏好的成分或商品、已剩餘飼料克數。不要推測未提及的疾病或過敏，不要給醫療建議。從提供的候選商品 ID 排出最多 10 個較符合意圖的 ID；不可捏造 ID。不能做最終安全判定或付款。欄位為 kind,scenario,budgetNt,avoid,prefer,remainingGrams,rankedProductIds,followUp。若無資料則用 null、空陣列或沿用 currentFilters。followUp 只在必要資訊缺失且會影響推薦時提出一句簡短問題，否則 null。",
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
        temperature: 0.2,
        maxOutputTokens: 1500,
      },
    });
    const parsed = aiOutputSchema.parse(JSON.parse(response.text ?? "{}"));
    const intent = compassIntentSchema.parse({
      ...fallback,
      ...parsed,
      // A buyer's explicit or saved avoidance terms cannot be removed by AI.
      avoid: [...new Set([...fallback.avoid, ...(parsed.avoid ?? [])])],
      // A follow-up may intentionally replace an earlier selection.
      kind: parsed.kind ?? fallback.kind,
      scenario: parsed.scenario ?? fallback.scenario,
      budgetNt:
        parsed.budgetNt !== undefined ? parsed.budgetNt : fallback.budgetNt,
      remainingGrams:
        parsed.remainingGrams !== undefined
          ? parsed.remainingGrams
          : fallback.remainingGrams,
    });
    const allowed = new Set(candidates.map((product) => product.id));
    return {
      intent,
      suggestedIds: [...new Set(parsed.rankedProductIds ?? [])].filter((id) =>
        allowed.has(id),
      ),
      aiUsed: true,
      followUp: parsed.followUp ?? null,
    };
  } catch (error) {
    const failure = error as { name?: string; status?: number; code?: string };
    console.warn("Compass Gemini fallback", {
      name: failure.name,
      status: failure.status,
      code: failure.code,
    });
    return {
      intent: fallback,
      suggestedIds: [] as string[],
      aiUsed: false,
      followUp: null as string | null,
    };
  }
}
