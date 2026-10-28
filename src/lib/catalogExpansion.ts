import type { Product } from "./types";

type Spec = {
  id: string;
  name: string;
  subtitle: string;
  type: Product["type"];
  category: string;
  ingredients: [string, string];
  kcalPer100g: number;
  bagGrams: number;
  priceNt: number;
  proteinMin: number;
  moistureMax: number;
  ashMax: number;
  lifeStages?: Product["lifeStages"];
};

// 全部為可在後台修改的展示商品；尚未提供正式配方、定價或檢驗證明。
const specs: Spec[] = [
  { id: "duck-pumpkin-cat", name: "鴨肉南瓜成貓乾糧", subtitle: "鴨肉香氣・日常主食靈感", type: "CAT", category: "主食乾糧", ingredients: ["鴨肉", "南瓜"], kcalPer100g: 390, bagGrams: 2000, priceNt: 930, proteinMin: 36, moistureMax: 10, ashMax: 8 },

  { id: "tuna-pumpkin-cat", name: "鮪魚南瓜主食罐", subtitle: "細緻肉泥・鮮甜南瓜", type: "CAT", category: "主食罐頭", ingredients: ["鮪魚", "南瓜"], kcalPer100g: 105, bagGrams: 85, priceNt: 68, proteinMin: 11, moistureMax: 80, ashMax: 3 },
  { id: "turkey-carrot-dog", name: "火雞胡蘿蔔主食罐", subtitle: "柔軟肉塊・餐桌好滋味", type: "DOG", category: "主食罐頭", ingredients: ["火雞肉", "胡蘿蔔"], kcalPer100g: 115, bagGrams: 180, priceNt: 95, proteinMin: 9, moistureMax: 78, ashMax: 3 },
  { id: "chicken-squash-cat", name: "雞肉櫛瓜主食罐", subtitle: "綿密口感・雞肉與蔬菜", type: "CAT", category: "主食罐頭", ingredients: ["雞肉", "櫛瓜"], kcalPer100g: 108, bagGrams: 85, priceNt: 65, proteinMin: 11, moistureMax: 80, ashMax: 3 },
  { id: "lamb-pea-dog", name: "羊肉豌豆主食罐", subtitle: "濃郁羊肉・適口新選擇", type: "DOG", category: "主食罐頭", ingredients: ["羊肉", "豌豆"], kcalPer100g: 118, bagGrams: 180, priceNt: 105, proteinMin: 9, moistureMax: 78, ashMax: 3 },
  { id: "salmon-spinach-cat", name: "鮭魚菠菜主食罐", subtitle: "魚肉香氣・細嫩好入口", type: "CAT", category: "主食罐頭", ingredients: ["鮭魚", "菠菜"], kcalPer100g: 112, bagGrams: 85, priceNt: 72, proteinMin: 10, moistureMax: 81, ashMax: 3 },

  { id: "beef-sweetpotato-dog", name: "牛肉地瓜鮮食餐包", subtitle: "肉香與甘甜・餐餐有期待", type: "DOG", category: "鮮食餐包", ingredients: ["牛肉", "地瓜"], kcalPer100g: 145, bagGrams: 150, priceNt: 129, proteinMin: 12, moistureMax: 72, ashMax: 3 },
  { id: "chicken-pumpkin-cat", name: "雞肉南瓜鮮食餐包", subtitle: "軟嫩雞肉・溫暖南瓜", type: "CAT", category: "鮮食餐包", ingredients: ["雞肉", "南瓜"], kcalPer100g: 150, bagGrams: 100, priceNt: 109, proteinMin: 13, moistureMax: 73, ashMax: 3 },
  { id: "whitefish-carrot-dog", name: "白魚胡蘿蔔鮮食餐包", subtitle: "清爽魚香・輕巧餐包", type: "DOG", category: "鮮食餐包", ingredients: ["白魚", "胡蘿蔔"], kcalPer100g: 130, bagGrams: 150, priceNt: 119, proteinMin: 11, moistureMax: 75, ashMax: 3 },
  { id: "duck-oat-dog", name: "鴨肉燕麥鮮食餐包", subtitle: "鴨肉與燕麥・柔和口感", type: "DOG", category: "鮮食餐包", ingredients: ["鴨肉", "燕麥"], kcalPer100g: 148, bagGrams: 150, priceNt: 135, proteinMin: 12, moistureMax: 72, ashMax: 3 },
  { id: "turkey-zucchini-cat", name: "火雞櫛瓜鮮食餐包", subtitle: "細緻火雞・新鮮蔬菜感", type: "CAT", category: "鮮食餐包", ingredients: ["火雞肉", "櫛瓜"], kcalPer100g: 140, bagGrams: 100, priceNt: 115, proteinMin: 12, moistureMax: 74, ashMax: 3 },

  { id: "salmon-freeze-cat", name: "鮭魚凍乾主食", subtitle: "酥鬆顆粒・鮮明魚香", type: "CAT", category: "凍乾主食", ingredients: ["鮭魚", "魚油"], kcalPer100g: 440, bagGrams: 300, priceNt: 690, proteinMin: 45, moistureMax: 6, ashMax: 9 },
  { id: "chicken-freeze-dog", name: "雞肉凍乾主食", subtitle: "輕脆口感・雞肉原香", type: "DOG", category: "凍乾主食", ingredients: ["雞肉", "南瓜"], kcalPer100g: 430, bagGrams: 500, priceNt: 790, proteinMin: 38, moistureMax: 6, ashMax: 9 },
  { id: "duck-freeze-cat", name: "鴨肉凍乾主食", subtitle: "一口酥香・鴨肉新選", type: "CAT", category: "凍乾主食", ingredients: ["鴨肉", "地瓜"], kcalPer100g: 435, bagGrams: 300, priceNt: 720, proteinMin: 42, moistureMax: 6, ashMax: 9 },
  { id: "beef-freeze-dog", name: "牛肉凍乾主食", subtitle: "濃郁肉香・輕巧開飯", type: "DOG", category: "凍乾主食", ingredients: ["牛肉", "豌豆"], kcalPer100g: 450, bagGrams: 500, priceNt: 850, proteinMin: 40, moistureMax: 6, ashMax: 9 },
  { id: "turkey-freeze-cat", name: "火雞凍乾主食", subtitle: "細緻肉香・酥鬆口感", type: "CAT", category: "凍乾主食", ingredients: ["火雞肉", "南瓜"], kcalPer100g: 438, bagGrams: 300, priceNt: 705, proteinMin: 43, moistureMax: 6, ashMax: 9 },

  { id: "lamb-air-dog", name: "羊肉風乾主食", subtitle: "慢慢風乾・濃厚羊肉香", type: "DOG", category: "風乾主食", ingredients: ["羊肉", "南瓜"], kcalPer100g: 390, bagGrams: 800, priceNt: 1180, proteinMin: 33, moistureMax: 12, ashMax: 8 },
  { id: "chicken-air-cat", name: "雞肉風乾主食", subtitle: "小片好入口・雞肉原味", type: "CAT", category: "風乾主食", ingredients: ["雞肉", "燕麥"], kcalPer100g: 395, bagGrams: 500, priceNt: 980, proteinMin: 37, moistureMax: 12, ashMax: 8 },
  { id: "whitefish-air-dog", name: "白魚風乾主食", subtitle: "清爽魚香・輕盈口感", type: "DOG", category: "風乾主食", ingredients: ["白魚", "地瓜"], kcalPer100g: 380, bagGrams: 800, priceNt: 1120, proteinMin: 32, moistureMax: 12, ashMax: 8 },
  { id: "duck-air-cat", name: "鴨肉風乾主食", subtitle: "薄片肉香・日常新口味", type: "CAT", category: "風乾主食", ingredients: ["鴨肉", "豌豆"], kcalPer100g: 392, bagGrams: 500, priceNt: 1030, proteinMin: 36, moistureMax: 12, ashMax: 8 },
  { id: "beef-air-dog", name: "牛肉風乾主食", subtitle: "紮實肉香・開袋就期待", type: "DOG", category: "風乾主食", ingredients: ["牛肉", "胡蘿蔔"], kcalPer100g: 400, bagGrams: 800, priceNt: 1240, proteinMin: 35, moistureMax: 12, ashMax: 8 },

  { id: "gentle-salmon-cat", name: "鮭魚溫和配方主食", subtitle: "單一魚肉風味・日常新提案", type: "CAT", category: "機能配方", ingredients: ["鮭魚", "地瓜"], kcalPer100g: 370, bagGrams: 1500, priceNt: 890, proteinMin: 34, moistureMax: 10, ashMax: 8 },
  { id: "light-turkey-dog", name: "火雞輕盈配方主食", subtitle: "火雞與蔬菜・輕巧日常", type: "DOG", category: "機能配方", ingredients: ["火雞肉", "南瓜"], kcalPer100g: 340, bagGrams: 2000, priceNt: 990, proteinMin: 28, moistureMax: 10, ashMax: 8 },
  { id: "senior-duck-cat", name: "鴨肉熟齡配方主食", subtitle: "熟齡階段・鴨肉好滋味", type: "CAT", category: "機能配方", ingredients: ["鴨肉", "燕麥"], kcalPer100g: 355, bagGrams: 1500, priceNt: 920, proteinMin: 32, moistureMax: 10, ashMax: 8, lifeStages: ["SENIOR"] },
  { id: "puppy-chicken-dog", name: "鮮雞幼犬配方主食", subtitle: "成長階段・雞肉餐桌靈感", type: "DOG", category: "機能配方", ingredients: ["雞肉", "糙米"], kcalPer100g: 395, bagGrams: 2000, priceNt: 1080, proteinMin: 33, moistureMax: 10, ashMax: 8, lifeStages: ["JUNIOR"] },
  { id: "kitten-whitefish-cat", name: "白魚幼貓配方主食", subtitle: "小小成長期・細緻魚香", type: "CAT", category: "機能配方", ingredients: ["白魚", "南瓜"], kcalPer100g: 405, bagGrams: 1500, priceNt: 960, proteinMin: 39, moistureMax: 10, ashMax: 8, lifeStages: ["JUNIOR"] },
];

const fish = new Set(["鮭魚", "鮪魚", "白魚", "魚油"]);
const colors = ["amber", "cyan", "blue"] as const;
const categoryDescription: Record<string, string> = {
  主食乾糧: "適合習慣乾爽顆粒口感的日常餐桌。",
  主食罐頭: "以柔軟濕潤的口感，讓開飯時刻多一種選擇。",
  鮮食餐包: "方便分餐的餐包形式，適合想變換餐桌節奏的家庭。",
  凍乾主食: "酥鬆輕巧的凍乾形式，可依包裝指示搭配飲水。",
  風乾主食: "風乾質地保留紮實咀嚼感，讓每日主食更有變化。",
  機能配方: "依生命階段與日常偏好整理的配方概念。",
};

export const supplementalProducts: Product[] = specs.map((spec, index) => ({
  id: spec.id,
  slug: spec.id,
  name: spec.name,
  subtitle: spec.subtitle,
  type: spec.type,
  category: spec.category,
  lifeStages: spec.lifeStages ?? ["ADULT", "SENIOR"],
  ingredients: [spec.ingredients[0], spec.ingredients[1], "維生素與礦物質"],
  allergens: fish.has(spec.ingredients[0]) ? ["魚類"] : [spec.ingredients[0]],
  kcalPer100g: spec.kcalPer100g,
  bagGrams: spec.bagGrams,
  priceNt: spec.priceNt,
  stock: 18 + ((index * 7) % 23),
  image: `/images/products/${spec.id}.svg`,
  color: colors[index % colors.length]!,
  proteinMin: spec.proteinMin,
  moistureMax: spec.moistureMax,
  ashMax: spec.ashMax,
  batches: [],
  autoshipEligible: true,
  description: `${spec.ingredients[0]}搭配${spec.ingredients[1]}的${spec.category}展示選品。${categoryDescription[spec.category]}成分、營養、價格與包裝皆為概念資料，正式上架前仍需核對實品標示。`,
}));
