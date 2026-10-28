import type { Product } from "./types";

// 展示選品的名稱、定價和圖片均可在後台逐項修改；正式販售前需核對實品資訊。
const entries = [
  ["hamster-grain", "倉鼠綜合穀物餐", "倉鼠", "HAMSTER", "小動物主食", 120, 180],
  ["hamster-seed", "倉鼠田園種籽餐", "倉鼠", "HAMSTER", "小動物主食", 120, 190],
  ["hamster-pellet", "倉鼠日常顆粒餐", "倉鼠", "HAMSTER", "小動物主食", 150, 220],
  ["rabbit-timothy", "兔兔提摩西草餐", "兔兔", "RABBIT", "小動物主食", 500, 360],
  ["rabbit-pellet", "兔兔日常牧草顆粒", "兔兔", "RABBIT", "小動物主食", 600, 420],
  ["cat-fish-treat", "貓咪魚香小點", "貓咪", "CAT", "零食點心", 80, 160],
  ["dog-chicken-treat", "狗狗雞肉小點", "狗狗", "DOG", "零食點心", 100, 180],
  ["hamster-apple-treat", "倉鼠蘋果小點", "倉鼠", "HAMSTER", "零食點心", 40, 110],
  ["rabbit-herb-treat", "兔兔香草小點", "兔兔", "RABBIT", "零食點心", 60, 130],
  ["dog-pumpkin-treat", "狗狗南瓜小點", "狗狗", "DOG", "零食點心", 100, 175],
  ["cat-feather-toy", "貓咪羽毛逗趣棒", "貓咪", "CAT", "玩具互動", 95, 290],
  ["dog-rope-toy", "狗狗棉繩拉拉玩具", "狗狗", "DOG", "玩具互動", 180, 320],
  ["hamster-tunnel", "倉鼠探索隧道", "倉鼠", "HAMSTER", "玩具互動", 120, 240],
  ["rabbit-ball", "兔兔編織探索球", "兔兔", "RABBIT", "玩具互動", 90, 230],
  ["cat-scratch-ball", "貓咪抓抓滾球", "貓咪", "CAT", "玩具互動", 150, 350],
  ["cat-cozy-bed", "貓咪暖暖休憩窩", "貓咪", "CAT", "居家用品", 850, 1180],
  ["dog-soft-mat", "狗狗柔軟睡墊", "狗狗", "DOG", "居家用品", 1200, 1490],
  ["hamster-house", "倉鼠木紋小屋", "倉鼠", "HAMSTER", "居家用品", 260, 390],
  ["rabbit-hideout", "兔兔安靜躲藏屋", "兔兔", "RABBIT", "居家用品", 880, 990],
  ["cat-food-bowl", "貓咪陶瓷點心碗", "貓咪", "CAT", "居家用品", 520, 680],
  ["cat-groom-brush", "貓咪柔毛梳", "貓咪", "CAT", "清潔照護", 180, 420],
  ["dog-groom-brush", "狗狗日常梳毛刷", "狗狗", "DOG", "清潔照護", 210, 450],
  ["hamster-sand-bath", "倉鼠砂浴小屋", "倉鼠", "HAMSTER", "清潔照護", 320, 460],
  ["rabbit-litter-tray", "兔兔日常便盆", "兔兔", "RABBIT", "清潔照護", 480, 590],
  ["dog-towel", "狗狗外出擦拭巾", "狗狗", "DOG", "清潔照護", 170, 280],
  ["cat-carrier", "貓咪輕巧外出包", "貓咪", "CAT", "外出用品", 950, 1680],
  ["dog-travel-bottle", "狗狗隨行飲水瓶", "狗狗", "DOG", "外出用品", 250, 520],
  ["hamster-travel-box", "倉鼠短程攜帶盒", "倉鼠", "HAMSTER", "外出用品", 360, 490],
  ["rabbit-carrier", "兔兔安心外出籠", "兔兔", "RABBIT", "外出用品", 1380, 1880],
  ["dog-walk-pouch", "狗狗散步收納包", "狗狗", "DOG", "外出用品", 220, 460],
] as const;

export const lifestyleProducts: Product[] = entries.map(([id, name, petLabel, type, category, bagGrams, priceNt], index) => {
  const kind = ["小動物主食", "零食點心"].includes(category) ? "FOOD" : "SUPPLIES";
  const smallPet = type === "HAMSTER" || type === "RABBIT";
  return {
    id, slug: id, name, subtitle: `${petLabel}的${kind === "FOOD" ? "餐桌選擇" : "生活提案"}・概念選品`,
    type, kind, category, lifeStages: ["JUNIOR", "ADULT", "SENIOR"],
    ingredients: kind === "FOOD" ? [name.replace(/^(貓咪|狗狗|倉鼠|兔兔)/, "")] : [],
    allergens: [], kcalPer100g: kind === "FOOD" && !smallPet ? 350 : 0,
    bagGrams, priceNt, stock: 12 + ((index * 7) % 18),
    image: `/images/products/${id}.svg`, color: ["amber", "cyan", "blue"][index % 3] as Product["color"],
    proteinMin: kind === "FOOD" && !smallPet ? 20 : 0,
    moistureMax: kind === "FOOD" && !smallPet ? 12 : 0,
    ashMax: kind === "FOOD" && !smallPet ? 8 : 0,
    batches: [], autoshipEligible: false,
    description: `${name}，為${petLabel}的${kind === "FOOD" ? "日常餐桌" : "每一天"}增添一點期待。此為展示選品，圖片、材質、配方、價格及規格皆為概念資料；正式上架前請以實品資訊更新。`,
  };
});
