import type { Product } from "./types";

type Item = {
  id: string; name: string; type: Product["type"]; category: string;
  subtitle: string; weight: number; price: number; description: string;
};

const items: Item[] = [
  { id: "cat-water-fountain", name: "貓咪靜音循環飲水器", type: "CAT", category: "飲水餐具", subtitle: "讓喝水成為每天的小習慣", weight: 900, price: 1280, description: "以柔和水流和簡潔外型融入家中，方便安排貓咪的日常飲水角落。" },
  { id: "dog-slow-bowl", name: "狗狗慢食迷宮碗", type: "DOG", category: "飲水餐具", subtitle: "讓開飯多一點探索樂趣", weight: 420, price: 590, description: "迷宮紋路讓進食節奏更有變化，適合喜歡探索食物的狗狗。" },
  { id: "hamster-glass-bottle", name: "倉鼠玻璃飲水瓶", type: "HAMSTER", category: "飲水餐具", subtitle: "小小日常，也好好安排", weight: 240, price: 420, description: "透明瓶身方便觀察水量，木質固定架讓小動物居住空間更整齊。" },
  { id: "rabbit-hay-feeder", name: "兔兔木質牧草架", type: "RABBIT", category: "飲水餐具", subtitle: "把牧草放在牠習慣的位置", weight: 860, price: 780, description: "開放式牧草架方便補充與整理，保留兔兔自在取食的空間。" },
  { id: "cat-raised-bowl", name: "貓咪高腳陶瓷餐碗", type: "CAT", category: "飲水餐具", subtitle: "餐桌也有溫柔的高度", weight: 680, price: 720, description: "陶瓷碗搭配木質底座，讓開飯角落看起來乾淨而有溫度。" },

  { id: "dog-snuffle-mat", name: "狗狗森林嗅聞墊", type: "DOG", category: "舒壓嗅聞", subtitle: "把尋找變成一場小探險", weight: 520, price: 690, description: "在布條之間藏入少量點心，陪狗狗享受聞聞找找的互動時間。" },
  { id: "cat-puzzle-feeder", name: "貓咪解謎藏食盤", type: "CAT", category: "舒壓嗅聞", subtitle: "開飯前先動一點小腦筋", weight: 430, price: 620, description: "滑動格與藏食空間讓貓咪用爪子探索，讓日常互動更有趣。" },
  { id: "rabbit-forage-mat", name: "兔兔尋草探索墊", type: "RABBIT", category: "舒壓嗅聞", subtitle: "草香藏在每一處小角落", weight: 480, price: 590, description: "天然質感的編織墊提供藏草角落，讓兔兔探索自己的小天地。" },
  { id: "hamster-forage-box", name: "倉鼠尋寶探索盒", type: "HAMSTER", category: "舒壓嗅聞", subtitle: "小盒子裡有大大的好奇心", weight: 320, price: 460, description: "圓角木盒提供多個探索孔洞，讓倉鼠在熟悉的環境中慢慢尋找。" },
  { id: "dog-lick-mat", name: "狗狗安心舔食墊", type: "DOG", category: "舒壓嗅聞", subtitle: "留一段安靜的舔食時光", weight: 260, price: 390, description: "紋路矽膠墊可搭配適合狗狗的食物，為餐點增添不同的互動方式。" },

  { id: "dog-reflective-harness", name: "狗狗夜行反光胸背", type: "DOG", category: "戶外安全", subtitle: "晚上的散步也從容", weight: 350, price: 1180, description: "深藍織帶與反光細節適合晚間散步，穿戴前請確認尺寸與貼合度。" },
  { id: "cat-safety-harness", name: "貓咪防脫外出胸背", type: "CAT", category: "戶外安全", subtitle: "探索世界前，先調整好貼合度", weight: 220, price: 980, description: "輕巧的胸背設計方便調整，外出前仍需確認貓咪適應情況與扣具。" },
  { id: "dog-car-seatbelt", name: "狗狗車用安全牽引帶", type: "DOG", category: "戶外安全", subtitle: "一起出發前的小準備", weight: 180, price: 590, description: "車內使用的短牽引帶，使用前請確認車款、扣具與胸背相容性。" },
  { id: "rabbit-shade-carrier", name: "兔兔透氣遮陽外出籠", type: "RABBIT", category: "戶外安全", subtitle: "短程移動也留一點安靜", weight: 1380, price: 1980, description: "透氣網面與遮陽設計讓短程移動的空間更柔和，仍須留意溫度與通風。" },
  { id: "dog-led-collar", name: "狗狗夜間微光項圈", type: "DOG", category: "戶外安全", subtitle: "在夜色裡也看見牠", weight: 160, price: 720, description: "柔和發光細節讓夜間散步更容易辨識，請依頸圍選擇適合尺寸。" },

  { id: "dog-paw-balm", name: "狗狗掌心日常保養膏", type: "DOG", category: "日常保養", subtitle: "散步回家後的溫柔照顧", weight: 80, price: 390, description: "為日常清潔與照顧流程準備的小罐保養品，使用前請核對實際成分標示。" },
  { id: "cat-dental-kit", name: "貓咪口腔清潔組", type: "CAT", category: "日常保養", subtitle: "把清潔慢慢練成習慣", weight: 140, price: 520, description: "小巧刷具與收納盒適合循序練習，使用時以貓咪接受度為準。" },
  { id: "rabbit-groom-set", name: "兔兔換毛梳理組", type: "RABBIT", category: "日常保養", subtitle: "輕輕梳，慢慢陪", weight: 260, price: 650, description: "軟刷與細梳協助整理日常毛髮，使用時避免拉扯皮膚。" },
  { id: "hamster-nail-care", name: "倉鼠指甲護理組", type: "HAMSTER", category: "日常保養", subtitle: "小工具也要剛剛好", weight: 90, price: 380, description: "小尺寸修剪工具與護理銼，操作前請先確認適用方式與毛孩狀態。" },
  { id: "dog-ear-cleanser", name: "狗狗耳部日常清潔液", type: "DOG", category: "日常保養", subtitle: "維持舒服的日常清潔節奏", weight: 180, price: 450, description: "耳部日常清潔用品，正式使用前請確認實際成分與說明；如有不適應尋求專業意見。" },
];

export const moreProducts: Product[] = items.map((item, index) => ({
  id: item.id,
  slug: item.id,
  name: item.name,
  subtitle: item.subtitle,
  type: item.type,
  kind: "SUPPLIES",
  category: item.category,
  lifeStages: ["JUNIOR", "ADULT", "SENIOR"],
  ingredients: [],
  allergens: [],
  kcalPer100g: 0,
  bagGrams: item.weight,
  priceNt: item.price,
  stock: 14 + ((index * 5) % 19),
  image: `/images/products-v2/${item.id}.webp`,
  color: ["cyan", "blue", "amber"][index % 3] as Product["color"],
  proteinMin: 0, moistureMax: 0, ashMax: 0,
  batches: [],
  autoshipEligible: false,
  description: item.description,
}));
