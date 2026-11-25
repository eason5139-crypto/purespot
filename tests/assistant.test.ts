import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  assistantQuerySchema,
  assistantSettingsSchema,
  defaultAssistantSettings,
  normalizeSearch,
  assistantDocumentScore,
  classifyAssistantQuestion,
  redactAssistantQuestion,
  buildAssistantAnalytics,
  type AssistantMetric,
} from "@/lib/assistant";
import {
  selectAssistantProducts,
  buildAssistantSearchQuery,
} from "@/server/assistantSearch";
import { siteKnowledge } from "@/lib/assistantKnowledge";
import type { Product, ActivePet } from "@/lib/types";
const product = (id: string, patch: Partial<Product> = {}): Product => ({
  id,
  slug: id,
  name: "貓主食",
  subtitle: "",
  type: "CAT",
  kind: "FOOD",
  category: "主食乾糧",
  lifeStages: ["ADULT"],
  ingredients: ["鴨肉", "南瓜"],
  allergens: ["鴨肉"],
  kcalPer100g: 400,
  nutritionDataProvided: true,
  bagGrams: 2000,
  priceNt: 900,
  stock: 20,
  image: "/test.png",
  color: "blue",
  proteinMin: 35,
  moistureMax: 10,
  ashMax: 7,
  batches: [],
  autoshipEligible: true,
  description: "貓咪每日主食",
  isPublished: true,
  ...patch,
});
const pet: ActivePet = {
  id: "p",
  name: "麻糬",
  type: "CAT",
  breed: "米克斯",
  weightKg: 4,
  ageMonths: 30,
  isNeutered: true,
  activityLevel: "MODERATE",
  allergies: ["chicken"],
  goal: "MAINTAIN",
};
describe("小P搜尋的實際選購邊界", () => {
  it("追問換鴨肉時離開上一款鮭魚，保留貓咪、預算與雞肉排除", () => {
    const rows = [
      product("salmon", { name: "鮭魚低敏成貓糧", ingredients: ["鮭魚"] }),
      product("duck", { name: "鴨肉凍乾主食" }),
      product("bad-duck", {
        name: "鴨肉雞油主食",
        ingredients: ["鴨肉", "雞油"],
      }),
    ];
    const q = buildAssistantSearchQuery(
      "那鴨肉的呢",
      [
        {
          question: "不含雞肉，預算1000，鮭魚低敏成貓糧成分",
          productIds: ["salmon"],
        },
      ],
      rows,
    );
    expect(
      selectAssistantProducts(rows, q, { max: 5 }).map((p) => p.id),
    ).toEqual(["duck"]);
  });
  it("這款能定期配送嗎會沿用前一款，而不把產品弄丟", () => {
    const rows = [
      product("salmon", { name: "鮭魚低敏成貓糧", ingredients: ["鮭魚"] }),
      product("duck"),
    ];
    const q = buildAssistantSearchQuery(
      "這款能定期配送嗎",
      [{ question: "鮭魚低敏成貓糧的成分", productIds: ["salmon"] }],
      rows,
    );
    expect(
      selectAssistantProducts(rows, q, { max: 5, previousIds: ["salmon"] }).map(
        (p) => p.id,
      ),
    ).toEqual(["salmon"]);
  });
  it("不含雞肉同時排除雞油與chicken別名，且不混入其他物種或草稿", () => {
    const rows = [
      product("duck"),
      product("fat", { ingredients: ["雞油"] }),
      product("english", { ingredients: ["chicken"] }),
      product("dog", { type: "DOG" }),
      product("draft", { isPublished: false }),
    ];
    expect(
      selectAssistantProducts(rows, "不含雞肉的貓主食", { max: 8 }).map(
        (p) => p.id,
      ),
    ).toEqual(["duck"]);
  });
  it("推薦強制沿用已保存的過敏及年齡條件，且不推薦缺貨", () => {
    const rows = [
      product("safe"),
      product("bad", { ingredients: ["雞肉"] }),
      product("junior", { lifeStages: ["JUNIOR"] }),
      product("out", { stock: 0 }),
    ];
    expect(
      selectAssistantProducts(rows, "推薦麻糬適合的主食", { max: 8, pet }).map(
        (p) => p.id,
      ),
    ).toEqual(["safe"]);
  });
  it("查配方可以看到過敏衝突警示，但不能把衝突產品當推薦", () => {
    const r = selectAssistantProducts(
      [product("chicken", { name: "鮮雞貓主食", ingredients: ["雞肉"] })],
      "鮮雞貓主食成分",
      { max: 5, pet },
    );
    expect(r[0]?.warning).toContain("過敏原");
  });
  it("遵守預算，缺營養資料不使用預設值當成已知數字", () => {
    const r = selectAssistantProducts(
      [
        product("cheap", { priceNt: 600, nutritionDataProvided: false }),
        product("expensive", { priceNt: 1200 }),
      ],
      "貓主食預算800",
      { max: 5 },
    );
    expect(r.map((p) => p.id)).toEqual(["cheap"]);
    expect(r[0]?.proteinMin).toBeNull();
    expect(r[0]?.kcalPer100g).toBeNull();
  });
  it("完整商品名稱優先查該商品，避免混入其他配方", () => {
    const rows = [
      product("salmon", { name: "鮭魚低敏成貓糧" }),
      product("duck", { name: "鴨肉凍乾主食" }),
    ];
    expect(
      selectAssistantProducts(rows, "鮭魚低敏成貓糧蛋白質多少", { max: 5 }).map(
        (p) => p.id,
      ),
    ).toEqual(["salmon"]);
  });
  it("追問這兩款只選同一輪提供的商品，卡片沒有進貨成本", () => {
    const r = selectAssistantProducts(
      [product("a"), product("b"), product("c", { unitCostNt: 500 })],
      "這兩款貓主食差在哪",
      { max: 2, previousIds: ["b", "c"] },
    );
    expect(new Set(r.map((p) => p.id))).toEqual(new Set(["b", "c"]));
    expect(JSON.stringify(r)).not.toContain("unitCost");
  });
});
describe("設定、輸入與問題統計", () => {
  it.each([
    ["忘記密碼怎麼辦", "security"],
    ["我要改收件地址", "addresses"],
    ["購物籃在哪裡", "checkout"],
    ["家庭共買在哪裡", "family"],
    ["想找旅前打包桌", "packing"],
    ["點數要怎麼兌換", "rewards"],
  ])("日常問法能找到入口：%s", (question, id) => {
    const doc = siteKnowledge.find((d) => d.id === id)!;
    expect(
      assistantDocumentScore(
        question,
        doc,
        classifyAssistantQuestion(question),
      ),
    ).toBeGreaterThanOrEqual(4);
  });
  it("拒絕注入外部連結及私帶身分", () => {
    expect(
      assistantSettingsSchema.safeParse({
        ...defaultAssistantSettings,
        knowledge: [
          {
            id: "x",
            title: "問題",
            text: "答案",
            keywords: "",
            href: "//evil.test",
            enabled: true,
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      assistantSettingsSchema.safeParse({
        ...defaultAssistantSettings,
        knowledge: [
          {
            id: "x",
            title: "問題",
            text: "答案",
            keywords: "",
            href: "/admin/orders",
            enabled: true,
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      assistantQuerySchema.safeParse({
        question: "點數",
        requestId: crypto.randomUUID(),
        userId: "other",
      }).success,
    ).toBe(false);
  });
  it("遮蔽問題中的郵件、手機及密碼", () => {
    const redacted = redactAssistantQuestion(
      "我mail是person@example.com，手機0912345678，密碼secret123",
    );
    expect(redacted).not.toContain("person@example");
    expect(redacted).not.toContain("0912345678");
    expect(redacted).not.toContain("secret123");
  });
  it("正規化成份與全形字，依臺灣日期歸類並區分無結果", () => {
    expect(normalizeSearch("貓咪 成份？")).toBe("貓成分");
    const base: AssistantMetric = {
      id: "1",
      question: "找商品",
      category: "products",
      at: "2026-11-24T16:30:00.000Z",
      resultCount: 2,
      member: false,
      ai: "used",
      latencyMs: 500,
    };
    const a = buildAssistantAnalytics(
      [
        base,
        {
          ...base,
          id: "2",
          question: "沒有這商品",
          resultCount: 0,
          ai: "local",
        },
      ],
      7,
      new Date("2026-11-25T05:00:00Z"),
    );
    expect(a.total).toBe(2);
    expect(a.noResults).toBe(1);
    expect(a.aiUsed).toBe(1);
    expect(a.daily.at(-1)).toEqual({ date: "2026-11-25", count: 2 });
  });
});
