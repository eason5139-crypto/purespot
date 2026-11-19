"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Calculator,
  Check,
  CloudRain,
  Compass,
  Heart,
  Instagram,
  MessageCircle,
  PawPrint,
  ShoppingBag,
  Sparkles,
  Sun,
  Wind,
  Award,
  Camera,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { useUiStore } from "@/store/useUiStore";
import { useActivePet, usePetContextStore } from "@/store/usePetContextStore";
import { useCatalogStore } from "@/store/useCatalogStore";
import { useCartStore } from "@/store/useCartStore";
import { matchProduct } from "@/lib/matching";
import { calculatePetNutrition } from "@/lib/nutritionCalculator";
import { triggerFlyToCart, triggerPawBurst } from "@/lib/flyToCart";
import { decimal, money } from "@/lib/utils";
import { petLabels, supportsFoodCalculator } from "@/lib/types";
import type { SiteContent } from "@/lib/siteContent";
import { useSiteContentPreview } from "@/lib/useSiteContentPreview";
import {
  BentoWoodBoxSvg,
  MoodCraftEmblem,
  WaxSealStamp,
} from "@/components/ui/CraftEmblems";
import { MacroKibbleViewer } from "@/components/shop/MacroKibbleViewer";
import { FeedingClockSimulator } from "@/components/shop/FeedingClockSimulator";

const reveal = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

const MOOD_OPTIONS = [
  {
    id: "picky" as const,
    spec: "SPEC 01 · 嗅覺與適口性引導",
    tag: "進食興致低落",
    title: "挑嘴食慾・慢焙原肉香氣",
    petNote:
      "優先以 -40°C 凍乾原肉與高含肉量鮮食罐喚醒嗅覺，不依賴人工誘食噴油。",
    tip: "以酥鬆凍乾主食搭配綿密鮮肉罐拌食，開袋後前 3 分鐘適口性明顯提升。",
    preferredPrimaryIds: [
      "salmon-freeze-cat",
      "duck-freeze-cat",
      "turkey-freeze-cat",
      "chicken-freeze-dog",
      "beef-freeze-dog",
      "lamb-air-dog",
    ],
    preferredCategories: ["凍乾主食", "風乾主食"],
    preferredCompanionIds: [
      "tuna-pumpkin-cat",
      "turkey-carrot-dog",
      "lamb-pea-dog",
      "salmon-spinach-cat",
    ],
    metrics: [
      { label: "原肉開袋香氣", score: 98 },
      { label: "適口引導指數", score: 96 },
      { label: "動物蛋白純度", score: 94 },
      { label: "自然補水協同", score: 89 },
    ],
    keywords: ["凍乾", "酥", "香", "草餅"],
  },
  {
    id: "tummy" as const,
    spec: "SPEC 02 · 消化道溫和負荷",
    tag: "換季排便不穩定",
    title: "敏弱腸胃・單一純淨配方",
    petNote:
      "採用單一新型態動物蛋白與南瓜／地瓜溫和膳食纖維，降低過敏原引發的消化負擔。",
    tip: "已自動排除檔案中的過敏原，建議以溫和機能主食搭配鮮食餐包循序換糧。",
    preferredPrimaryIds: [
      "gentle-salmon-cat",
      "duck-pumpkin-cat",
      "light-turkey-dog",
      "senior-duck-cat",
      "whitefish-air-dog",
    ],
    preferredCategories: ["機能配方", "主食乾糧"],
    preferredCompanionIds: [
      "turkey-zucchini-cat",
      "whitefish-carrot-dog",
      "duck-oat-dog",
      "chicken-pumpkin-cat",
    ],
    metrics: [
      { label: "消化溫和指數", score: 97 },
      { label: "單一肉源純淨度", score: 96 },
      { label: "過敏原安全避忌", score: 99 },
      { label: "腸道纖維平衡", score: 92 },
    ],
    keywords: ["溫和", "輕盈", "南瓜", "地瓜", "低敏"],
  },
  {
    id: "coat" as const,
    spec: "SPEC 03 · 換季皮毛與代謝",
    tag: "理毛頻繁與毛質乾澀",
    title: "豐盈毛質・深海脂酸養護",
    petNote:
      "透過冷壓深海魚油 Omega-3 與高保水菠菜鮮肉罐，兼顧皮膚屏障保水度與排毛代謝。",
    tip: "海島潮濕換季期，建議以深海魚肉主食搭配日常保水湯罐或護掌梳理道具。",
    preferredPrimaryIds: [
      "salmon-cat",
      "whitefish-air-dog",
      "kitten-whitefish-cat",
      "gentle-salmon-cat",
    ],
    preferredCategories: ["主食乾糧", "風乾主食"],
    preferredCompanionIds: [
      "salmon-spinach-cat",
      "dog-paw-balm",
      "rabbit-groom-set",
      "cat-water-fountain",
    ],
    metrics: [
      { label: "Omega-3 脂酸比", score: 97 },
      { label: "毛鱗片保水光澤", score: 94 },
      { label: "換季化毛順暢度", score: 92 },
      { label: "皮膚屏障穩定度", score: 95 },
    ],
    keywords: ["鮭魚", "白魚", "魚油", "菠菜", "梳"],
  },
  {
    id: "energy" as const,
    spec: "SPEC 04 · 高活動量熱量密度",
    tag: "體力充沛好動日常",
    title: "充沛體能・高蛋白質補給",
    petNote:
      "以高密度低溫風乾肉片補足運動後所需支鏈胺基酸，並搭配藏食嗅聞道具釋放精力。",
    tip: "高蛋白主食滿足肌肉修復，餐後搭配嗅聞墊或解謎藏食盤可延長專注互動時間。",
    preferredPrimaryIds: [
      "duck-air-cat",
      "lamb-air-dog",
      "chicken-dog",
      "chicken-air-cat",
      "beef-air-dog",
      "beef-dog",
      "chicken-cat",
    ],
    preferredCategories: ["風乾主食", "主食乾糧"],
    preferredCompanionIds: [
      "cat-puzzle-feeder",
      "dog-snuffle-mat",
      "dog-slow-bowl",
      "rabbit-forage-mat",
      "hamster-forage-box",
    ],
    metrics: [
      { label: "動物蛋白質密度", score: 98 },
      { label: "可利用代謝熱量", score: 95 },
      { label: "肌肉修復支撐力", score: 94 },
      { label: "嗅聞放電滿足度", score: 96 },
    ],
    keywords: ["風乾", "鴨", "羊", "雞", "牛"],
  },
] as const;

const TAIWAN_SEASONS = [
  {
    id: "humid",
    icon: CloudRain,
    badge: "梅雨潮濕期・食材防潮手則",
    title: "台灣相對濕度常逾 80%，乾糧如何維持鮮脆？",
    desc: "海島濕熱氣候容易讓油脂氧化與顆粒軟化。每次取食後務必排出袋內多餘空氣並壓緊雙軌夾鏈，切忌放置於陽台日曬處或廚房熱源旁。",
    points: [
      "開封後最佳鮮食期限為 30 至 45 日",
      "建議連同原包裝放入不透光密封儲糧桶",
      "選擇小克數循環配送，確保每餐皆處於高新鮮度",
    ],
    ctaHref: "/care/refill",
    ctaLabel: "換算家中存糧可食天數",
  },
  {
    id: "summer",
    icon: Sun,
    badge: "盛夏柏油路面・外出護掌提醒",
    title: "手背貼地五秒感燙，便不宜安排白天瀝青路散步",
    desc: "台灣夏季午後地面溫度常突破 55°C。建議將散步時段移至清晨六點前或日落之後，返家後以微濕潔淨棉布擦拭足底並補充常溫潔淨飲水。",
    points: [
      "隨身攜帶不鏽鋼飲水瓶與摺疊盛水器皿",
      "主食可酌量佐以溫水或原肉凍乾湯汁促進補水",
      "出發前善用旅前整理清單核對隨行裝備",
    ],
    ctaHref: "/care/packing",
    ctaLabel: "開啟出遊旅前整理桌",
  },
  {
    id: "breeze",
    icon: Wind,
    badge: "季風轉換期・七日溫和換糧學",
    title: "驟然更換全碗新糧，容易引起消化道適應反應",
    desc: "無論配方營養價值多高，消化菌叢皆需要時間適應蛋白質比例變化。建議透過 7 至 10 天的階梯比例替換，溫和完成飲食銜接。",
    points: [
      "第 1 至 2 日：新糧比例 20% 混合 80% 原食",
      "第 5 至 6 日：新舊各半，留意排便成形狀態",
      "第 7 至 10 日：穩定完成 100% 新配方銜接",
    ],
    ctaHref: "/care/transition",
    ctaLabel: "開啟 7 日換糧陪跑日曆",
  },
] as const;

const CRAFT_FORTUNES = [
  "節氣手記壹：開袋先聞天然肉香，今日宜陪牠多散步十分鐘",
  "節氣手記貳：備好乾淨常溫水碗，佐餐一匙鮮肉凍乾促進補水",
  "節氣手記參：海島空氣微潮，睡前順手壓緊儲糧袋密封條",
  "節氣手記肆：細心梳順換季浮毛，以溫潤陪伴結束今日",
];

export function WarmBrandHomePage({ content }: { content: SiteContent }) {
  const displayContent = useSiteContentPreview(content);
  const products = useCatalogStore((state) => state.products);
  const pet = useActivePet();
  const allPets = usePetContextStore((state) => state.allPets);
  const setActivePet = usePetContextStore((state) => state.setActivePet);
  const addItem = useCartStore((state) => state.addItem);
  const openCalculator = useUiStore((state) => state.openCalculator);

  const [selectedMoodId, setSelectedMoodId] = useState<string>("picky");
  const [seasonTab, setSeasonTab] = useState<string>("humid");
  const [fortuneIdx, setFortuneIdx] = useState<number>(0);
  const [stampCount, setStampCount] = useState<number>(128);
  const [humidity, setHumidity] = useState<number>(82);
  const [roomTemp, setRoomTemp] = useState<number>(28);

  const currentMood =
    MOOD_OPTIONS.find((m) => m.id === selectedMoodId) ?? MOOD_OPTIONS[0];
  const currentSeason =
    TAIWAN_SEASONS.find((s) => s.id === seasonTab) ?? TAIWAN_SEASONS[0];

  const safeForPet = products.filter(
    (p) => p.stock > 0 && matchProduct(p, pet).safe,
  );

  // 為 4 個照護狀態各自精準分配不重複的「主食基底 ＋ 協同佐餐／器物」雙件處方組
  const usedPrimaryIds = new Set<string>();
  const usedCompanionIds = new Set<string>();
  const moodPairMap: Record<
    string,
    {
      primary: (typeof products)[number] | undefined;
      companion: (typeof products)[number] | undefined;
    }
  > = {};

  for (const mood of MOOD_OPTIONS) {
    const primary =
      mood.preferredPrimaryIds
        .map((pid) =>
          safeForPet.find((p) => p.id === pid && !usedPrimaryIds.has(p.id)),
        )
        .find(Boolean) ??
      safeForPet.find(
        (p) =>
          !usedPrimaryIds.has(p.id) &&
          p.kind !== "SUPPLIES" &&
          (mood.preferredCategories as readonly string[]).includes(p.category),
      ) ??
      safeForPet.find(
        (p) =>
          !usedPrimaryIds.has(p.id) &&
          p.kind !== "SUPPLIES" &&
          mood.keywords.some((kw) =>
            `${p.name}${p.subtitle}${p.category}${p.ingredients.join("")}`.includes(
              kw,
            ),
          ),
      ) ??
      safeForPet.find((p) => !usedPrimaryIds.has(p.id)) ??
      safeForPet[0] ??
      products.find((p) => p.stock > 0);

    if (primary) usedPrimaryIds.add(primary.id);

    const companion =
      mood.preferredCompanionIds
        .map((cid) =>
          safeForPet.find(
            (p) =>
              p.id === cid &&
              p.id !== primary?.id &&
              !usedCompanionIds.has(p.id),
          ),
        )
        .find(Boolean) ??
      safeForPet.find(
        (p) =>
          p.id !== primary?.id &&
          !usedCompanionIds.has(p.id) &&
          (p.category === "主食罐頭" ||
            p.category === "鮮食餐包" ||
            p.kind === "SUPPLIES"),
      ) ??
      safeForPet.find((p) => p.id !== primary?.id);

    if (companion) usedCompanionIds.add(companion.id);

    moodPairMap[mood.id] = { primary, companion };
  }

  const currentPair = moodPairMap[currentMood.id];
  const moodMatchedProduct = currentPair?.primary;
  const companionProduct = currentPair?.companion;

  const nutritionResult =
    moodMatchedProduct &&
      moodMatchedProduct.kind !== "SUPPLIES" &&
      supportsFoodCalculator(pet.type) &&
      moodMatchedProduct.kcalPer100g > 0
      ? calculatePetNutrition(
        {
          petType: pet.type,
          weightKg: pet.weightKg,
          ageMonths: pet.ageMonths,
          isNeutered: pet.isNeutered,
          activityLevel: pet.activityLevel,
          isWeightLossGoal: pet.goal === "WEIGHT_LOSS",
          foodKcalPer100g: moodMatchedProduct.kcalPer100g,
        },
        moodMatchedProduct.bagGrams,
        moodMatchedProduct.priceNt,
      )
      : null;

  // 海島溫濕度儲糧防潮物理計算
  const crispRetentionPct = Math.max(
    42,
    Math.min(
      99,
      Math.round(100 - Math.max(0, humidity - 52) * 0.85 - Math.max(0, roomTemp - 22) * 1.15),
    ),
  );
  const optimalFreshDays = Math.max(
    16,
    Math.min(
      45,
      Math.round(45 - Math.max(0, humidity - 55) * 0.45 - Math.max(0, roomTemp - 22) * 0.7),
    ),
  );
  const oxidationRiskLabel =
    humidity >= 80 || roomTemp >= 30
      ? "高濕熱警戒・建議連袋入密封桶並優先選小包裝定期配"
      : humidity >= 70 || roomTemp >= 26
        ? "中度海島潮氣・每次取食務必擠出空氣壓緊雙軌夾鏈"
        : "乾爽穩定・維持陰涼避光保存即可";

  const promotions = displayContent.promotions.filter((item) => item.enabled);
  const benefits = [
    [displayContent.benefit1Title, displayContent.benefit1Text],
    [displayContent.benefit2Title, displayContent.benefit2Text],
    [displayContent.benefit3Title, displayContent.benefit3Text],
    [displayContent.benefit4Title, displayContent.benefit4Text],
  ];

  function handleQuickAddToCart(
    event: React.MouseEvent<HTMLButtonElement>,
    productId: string,
    productName: string,
    productImage: string,
  ) {
    try {
      addItem({
        productId,
        petId: pet.id,
        quantity: 1,
        mode: "ONCE",
        intervalDays: null,
      });
      triggerFlyToCart(event.currentTarget, {
        image: productImage,
        label: productName,
      });
      toast.success(`已為 ${pet.name} 將「${productName}」納入購物籃`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "無法加入購物籃");
    }
  }

  function handleAddPrescriptionCombo(
    event: React.MouseEvent<HTMLButtonElement>,
  ) {
    const btnEl = event.currentTarget;
    const targets = [moodMatchedProduct, companionProduct].filter(
      (x): x is NonNullable<typeof x> => Boolean(x),
    );
    let added = 0;
    targets.forEach((prod, idx) => {
      try {
        addItem({
          productId: prod.id,
          petId: pet.id,
          quantity: 1,
          mode: "ONCE",
          intervalDays: null,
        });
        added++;
        triggerFlyToCart(btnEl, {
          image: prod.image,
          label: prod.name,
          delayMs: idx * 140,
        });
      } catch {
        // skip if out of stock
      }
    });
    if (added > 0) {
      toast.success(
        `已為 ${pet.name} 將「${currentMood.title}」雙件照護處方組納入購物籃`,
      );
    }
  }

  function handleStampFortune(event: React.MouseEvent<HTMLButtonElement>) {
    triggerPawBurst(event.currentTarget);
    setStampCount((c) => c + 1);
    setFortuneIdx((i) => (i + 1) % CRAFT_FORTUNES.length);
  }

  return (
    <main
      id="main-content"
      className="public-editorial overflow-hidden bg-[#faf6f0] text-[#302b26]"
    >
      {/* 日台生活工藝選物所首屏 Hero + 互動適性調配機 */}
      <section
        id="home-hero"
        className="relative isolate overflow-hidden border-b border-[#e4d6c5] bg-[radial-gradient(circle_at_15%_15%,#fffaf0_0%,#f6ede0_52%,#efe2d0_100%)] py-10 sm:py-16"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-24 size-96 rounded-full bg-[#e2a84c]/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 right-10 size-96 rounded-full bg-[#935941]/12 blur-3xl"
        />

        <div className="page-shell relative z-10">
          {/* 頂部：街坊節氣手記籤與封蠟壓印互動 */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-[#dfd0be] pb-4 text-xs font-medium text-[#6f5e50]">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#935941] px-3 py-0.5 text-[11px] font-bold text-white">
                <PawPrint size={11} />
                PURESPOT ・ 日台生活工藝道具店
              </span>
              <span>順應台灣四季，為日常添置看得見產地的飲食與器物</span>
            </div>
            <div className="flex items-center gap-3">
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.93 }}
                onClick={handleStampFortune}
                className="craft-tag inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold text-[#935941] hover:bg-[#fff5e6]"
              >
                <span className="size-2 rounded-full bg-[#ac3b27]" />
                <span>壓印今日節氣手記籤</span>
                <span className="rounded-full bg-[#eadcc9] px-1.5 font-mono text-[11px] text-[#5e442c]">
                  No.{stampCount}
                </span>
              </motion.button>
              <AnimatePresence mode="wait">
                <motion.span
                  key={fortuneIdx}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="hidden rounded-full border border-[#c8d4c3] bg-[#eef2eb] px-3 py-1 text-[11px] font-semibold text-[#4e6752] md:inline-block"
                >
                  {CRAFT_FORTUNES[fortuneIdx]}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>

          <div className="grid items-center gap-10 lg:grid-cols-[1.06fr_0.94fr] lg:gap-12">
            {/* 左欄：道具誌敘事與產地拍立得相片 */}
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-[#dfd0be] bg-[#fffaf2] px-3.5 py-1.5 text-xs font-bold tracking-wider text-[#935941] shadow-2xs">
                <Sparkles size={13} />
                {displayContent.heroEyebrow}
              </div>

              <h1 className="editorial-title mt-5 text-[clamp(2.6rem,5.4vw,4.9rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-[#2c2520]">
                {displayContent.heroTitle}
                <br />
                <span className="text-[#935941]">
                  {displayContent.heroAccent}
                </span>
              </h1>

              <p className="mt-6 max-w-xl border-l-4 border-[#935941] pl-4 text-base leading-8 text-[#5c5046] sm:text-lg">
                {displayContent.heroDescription}
              </p>

              {/* 生活實景圖錄與職人選物吊牌 */}
              <div className="mt-7 grid gap-4 sm:grid-cols-[1.12fr_0.88fr]">
                <motion.div
                  whileHover={{ rotate: -0.8, y: -4 }}
                  className="polaroid-card relative overflow-hidden rounded-2xl p-3"
                >
                  <div className="relative h-52 overflow-hidden rounded-xl bg-[#e6dacb]">
                    <Image
                      src={displayContent.heroImage}
                      alt={displayContent.heroImageAlt}
                      fill
                      priority
                      sizes="(max-width:768px) 100vw, 40vw"
                      className="object-cover object-center transition-transform duration-700 hover:scale-105"
                    />
                    <span className="craft-tag absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold text-[#7c4d38]">
                      <Camera size={12} />
                      LIVING JOURNAL · 台灣日常實景
                    </span>
                  </div>
                  <p className="mt-2.5 flex items-center justify-between px-1 text-xs font-medium text-[#675b4f]">
                    <span>
                      「安穩吃好每一頓飯，就是最長久也最真實的陪伴。」
                    </span>
                    <span className="font-mono text-[10px] text-[#935941]">
                      #01
                    </span>
                  </p>
                </motion.div>

                <div className="craft-letterpress flex flex-col justify-between rounded-2xl p-5">
                  <div>
                    <span className="inline-block rounded-md bg-[#eef2eb] px-2.5 py-1 text-[11px] font-bold text-[#4e6752]">
                      職人選物店的三個約定
                    </span>
                    <ul className="mt-3.5 space-y-2.5 text-xs leading-5 text-[#5a4e44]">
                      <li className="flex items-start gap-2">
                        <Check
                          size={15}
                          className="mt-0.5 shrink-0 text-[#935941]"
                        />
                        <span>
                          <strong>成分清晰溯源：</strong>
                          翻開每張商品溯源筆記，實寸對照顆粒比例與原料結構。
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check
                          size={15}
                          className="mt-0.5 shrink-0 text-[#935941]"
                        />
                        <span>
                          <strong>體質精準過濾：</strong>
                          綁定 {pet.name} 的小檔案，自動篩除不相容肉源與階段配方。
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check
                          size={15}
                          className="mt-0.5 shrink-0 text-[#935941]"
                        />
                        <span>
                          <strong>曲木旬食組配：</strong>
                          主食基底、原肉佐餐與居家器物自由搭配，一次封裝帶走。
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-[#eee3d5] pt-3">
                    <Link
                      href="/shop"
                      className="btn-tactile inline-flex flex-1 items-center justify-center gap-2 bg-[#935941] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#7d4934]"
                    >
                      進入選物本舖
                      <ArrowRight size={14} />
                    </Link>
                    <Link
                      href="/shop#bento-builder"
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#d8c7b4] bg-[#fffaf2] px-3 py-2 text-xs font-bold text-[#6e523e] hover:bg-[#f3e9dc]"
                    >
                      <BentoWoodBoxSvg size={18} />
                      <span>配木盒</span>
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 右欄：立體微縮擬物選食調配機 */}
            <motion.div
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.1 }}
              className="craft-letterpress relative rounded-[2rem] p-6 sm:p-7"
            >
              {/* 頂部紙膠帶細節 */}
              <div
                aria-hidden="true"
                className="washi-tape absolute -top-3.5 left-1/2 h-7 w-36 -translate-x-1/2 rotate-[-1.5deg] rounded-sm"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ece0d1] pb-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.14em] text-[#935941]">
                    <SlidersHorizontal size={12} />
                    30 SEC SELECTION STUDIO · 互動適性選食
                  </span>
                  <h2 className="editorial-title mt-1 text-2xl font-bold text-[#302b26]">
                    為 {pet.name} 挑選今日照護重心
                  </h2>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {allPets.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActivePet(item.id)}
                      className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${item.id === pet.id
                          ? "bg-[#935941] text-white shadow-xs scale-105"
                          : "bg-[#f4ece1] text-[#6e5d4f] hover:bg-[#eadbc9]"
                        }`}
                    >
                      {item.name} ({petLabels[item.type]})
                    </button>
                  ))}
                </div>
              </div>

              {/* 4 個立體微縮擬物狀態卡 */}
              <div
                className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2"
                role="group"
                aria-label="選擇毛孩照護方向"
              >
                {MOOD_OPTIONS.map((mood) => {
                  const active = mood.id === selectedMoodId;
                  return (
                    <motion.button
                      key={mood.id}
                      type="button"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedMoodId(mood.id)}
                      className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-all ${active
                          ? "border-[#935941] bg-[#fdf5ea] shadow-[0_3px_0_#935941]"
                          : "border-[#e6d9c8] bg-[#faf6f0] hover:border-[#c8b299] hover:bg-[#fffaf2]"
                        }`}
                    >
                      <div
                        className={`flex size-12 shrink-0 items-center justify-center rounded-xl border transition-colors ${active
                            ? "border-[#dfc5a8] bg-white shadow-2xs"
                            : "border-[#ebe0d1] bg-[#fffcf7]"
                          }`}
                      >
                        <MoodCraftEmblem variant={mood.id} size={40} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] font-bold tracking-wider text-[#935941]">
                          {mood.spec}
                        </p>
                        <p className="truncate text-sm font-bold text-[#2d241d]">
                          {mood.title}
                        </p>
                        <p className="truncate text-[11px] text-[#7c6a59]">
                          {mood.tag}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* 動態雙件處方組建議卡（主食基底 ＋ 協同佐餐／器物） */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${pet.id}-${currentMood.id}`}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.25 }}
                  className="mt-4 rounded-2xl border border-[#e5d5c3] bg-[#faf5ed] p-4"
                >
                  <div className="rounded-xl border border-[#ece0d1] bg-white px-3.5 py-2.5 text-xs leading-5 text-[#66503e] shadow-2xs">
                    <span className="font-mono text-[10px] font-bold text-[#935941]">
                      {currentMood.spec} ·{" "}
                    </span>
                    {currentMood.petNote}
                  </div>

                  {/* 四維動態營養工藝指標條 */}
                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-[#e5d6c4] bg-[#fffdf9] p-3 sm:grid-cols-4">
                    {currentMood.metrics.map((m) => (
                      <div key={m.label}>
                        <div className="flex items-center justify-between text-[10px] font-bold text-[#5e4f41]">
                          <span className="truncate">{m.label}</span>
                          <span className="font-mono text-[#935941]">
                            {m.score}%
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#efe4d4]">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${m.score}%` }}
                            transition={{ duration: 0.45, ease: "easeOut" }}
                            className="h-full rounded-full bg-[#935941]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 雙件處方組：壹・主食基底 ＋ 貳・協同佐餐／器物 */}
                  <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
                    {moodMatchedProduct && (
                      <div className="flex flex-col justify-between rounded-2xl border border-[#dfd0be] bg-white p-3.5 shadow-2xs">
                        <div className="flex items-start gap-3">
                          <Link
                            href={`/products/${moodMatchedProduct.slug}`}
                            className="group relative size-20 shrink-0 overflow-hidden rounded-xl border border-[#e6d8c8] bg-[#faf5ee] p-1.5"
                          >
                            <Image
                              src={moodMatchedProduct.image}
                              alt={moodMatchedProduct.name}
                              fill
                              sizes="80px"
                              className="object-contain p-1 transition-transform duration-300 group-hover:scale-110"
                            />
                          </Link>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="rounded bg-[#935941] px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                                壹 · 主食基底
                              </span>
                              <span className="rounded bg-[#eef2eb] px-2 py-0.5 text-[10px] font-bold text-[#4e6752]">
                                {moodMatchedProduct.category}
                              </span>
                            </div>
                            <Link
                              href={`/products/${moodMatchedProduct.slug}`}
                              className="editorial-title mt-1.5 block truncate text-base font-bold text-[#302b26] hover:text-[#935941]"
                            >
                              {moodMatchedProduct.name}
                            </Link>
                            <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-[#6b5d51]">
                              {moodMatchedProduct.subtitle}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-[#f0e6d8] pt-2.5">
                          <div>
                            <strong className="font-mono text-base font-bold text-[#935941]">
                              {money(moodMatchedProduct.priceNt)}
                            </strong>
                            {nutritionResult && (
                              <span className="ml-1.5 font-mono text-[10px] font-semibold text-[#6b5d50]">
                                約 {decimal(nutritionResult.dailyGrams, 0)}g/日
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={(e) =>
                              handleQuickAddToCart(
                                e,
                                moodMatchedProduct.id,
                                moodMatchedProduct.name,
                                moodMatchedProduct.image,
                              )
                            }
                            className="rounded-lg border border-[#d8c4ae] bg-[#fffaf2] px-2.5 py-1 text-[11px] font-bold text-[#935941] transition-colors hover:bg-[#935941] hover:text-white"
                          >
                            + 單件加購
                          </button>
                        </div>
                      </div>
                    )}

                    {companionProduct && (
                      <div className="flex flex-col justify-between rounded-2xl border border-[#d6e0d6] bg-white p-3.5 shadow-2xs">
                        <div className="flex items-start gap-3">
                          <Link
                            href={`/products/${companionProduct.slug}`}
                            className="group relative size-20 shrink-0 overflow-hidden rounded-xl border border-[#dce6dc] bg-[#f4f8f4] p-1.5"
                          >
                            <Image
                              src={companionProduct.image}
                              alt={companionProduct.name}
                              fill
                              sizes="80px"
                              className="object-contain p-1 transition-transform duration-300 group-hover:scale-110"
                            />
                          </Link>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="rounded bg-[#4e6752] px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                                貳 · 協同搭配
                              </span>
                              <span className="rounded bg-[#f4efe8] px-2 py-0.5 text-[10px] font-bold text-[#6e5e50]">
                                {companionProduct.category}
                              </span>
                            </div>
                            <Link
                              href={`/products/${companionProduct.slug}`}
                              className="editorial-title mt-1.5 block truncate text-base font-bold text-[#302b26] hover:text-[#4e6752]"
                            >
                              {companionProduct.name}
                            </Link>
                            <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-[#6b5d51]">
                              {companionProduct.subtitle}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-[#e8efe8] pt-2.5">
                          <strong className="font-mono text-base font-bold text-[#4e6752]">
                            {money(companionProduct.priceNt)}
                          </strong>
                          <button
                            type="button"
                            onClick={(e) =>
                              handleQuickAddToCart(
                                e,
                                companionProduct.id,
                                companionProduct.name,
                                companionProduct.image,
                              )
                            }
                            className="rounded-lg border border-[#b8ceb9] bg-[#f3f8f4] px-2.5 py-1 text-[11px] font-bold text-[#3d5c43] transition-colors hover:bg-[#4e6752] hover:text-white"
                          >
                            + 單件加購
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="mt-2.5 text-[11px] text-[#6b5d51]">
                    職人配餐建議：{currentMood.tip}
                  </p>

                  {moodMatchedProduct && (
                    <div className="mt-3.5 flex flex-wrap gap-2 border-t border-[#e6d8c7] pt-3.5">
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={handleAddPrescriptionCombo}
                        className="btn-tactile inline-flex flex-1 items-center justify-center gap-2 bg-[#935941] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#7d4934]"
                      >
                        <ShoppingBag size={15} />
                        一鍵將「{currentMood.title.split("・")[0]}」雙件處方組飛入購物籃 (
                        {money(
                          moodMatchedProduct.priceNt +
                          (companionProduct?.priceNt ?? 0),
                        )}
                        )
                      </motion.button>
                      {moodMatchedProduct.kind !== "SUPPLIES" &&
                        supportsFoodCalculator(pet.type) && (
                          <button
                            type="button"
                            onClick={() =>
                              openCalculator(moodMatchedProduct.id)
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#d6c4b0] bg-white px-3.5 py-2.5 text-xs font-bold text-[#5a4a3c] hover:bg-[#f4ece1]"
                          >
                            <Calculator size={14} className="text-[#935941]" />
                            精算克數
                          </button>
                        )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 全新互動體驗：日台工藝食材剖面與微距檢視室 ＋ 一日餵食時鐘餐碗模擬器 */}
      <section className="border-b border-[#e2d4c4] bg-[#fffdf9] py-14 sm:py-18">
        <div className="page-shell space-y-12">
          <div className="grid items-center gap-8 lg:grid-cols-[0.78fr_1.22fr]">
            <motion.div {...reveal}>
              <span className="editorial-kicker">
                MACRO CRAFT LOUPE ・ 顆粒結構解剖室
              </span>
              <h2 className="editorial-title mt-3 text-3xl font-bold leading-tight text-[#2c2520] sm:text-4xl">
                把看不見的烘焙層次，
                <br />
                <span className="text-[#935941]">用滑桿推開給你看。</span>
              </h2>
              <p className="mt-4 text-sm leading-7 text-[#675b4f]">
                我們將「{moodMatchedProduct?.name ?? "主食乾糧"}
                」切開，以立體三層透視結構與台灣壹圓硬幣 20mm
                實寸對照，讓你清楚確認酥脆度、鮮肉比重與微營養包埋位置。
              </p>
              <div className="mt-6 flex items-center gap-4">
                <WaxSealStamp text="安心溯源" subtext="PURESPOT" size={82} />
                <div className="text-xs leading-6 text-[#695c50]">
                  <p className="font-bold text-[#302b26]">
                    目前檢視：{moodMatchedProduct?.name ?? "精選無穀主食"}
                  </p>
                  <p>切換上方四大照護重心，此處微距剖面亦會同步切換對應配方</p>
                </div>
              </div>
            </motion.div>

            <MacroKibbleViewer product={moodMatchedProduct} />
          </div>

          {/* 原創互動道具：一日餵食時鐘與陶瓷餐碗克數模擬器 */}
          <FeedingClockSimulator />
        </div>
      </section>

      {/* 近期街坊企劃 */}
      {promotions.length > 0 && (
        <section
          id="site-events"
          className="border-b border-[#e2d4c4] bg-[#f4ece0] py-14 sm:py-18"
        >
          <div className="page-shell">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
              <div>
                <span className="editorial-kicker inline-flex items-center gap-2">
                  <Sparkles size={15} /> WORKSHOP BULLETIN ・ 近期選物企劃
                </span>
                <h2 className="editorial-title mt-2 text-3xl font-bold sm:text-4xl">
                  街坊正在進行的生活提案
                </h2>
              </div>
              <span className="rounded-full border border-[#dfd0be] bg-[#fffaf2] px-3.5 py-1 text-xs font-semibold text-[#7a6858]">
                共 {promotions.length} 項常設與季度企劃
              </span>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {promotions.map((item, index) => (
                <motion.div
                  key={item.id}
                  {...reveal}
                  whileHover={{ y: -5 }}
                  className="polaroid-card group flex flex-col overflow-hidden rounded-[1.5rem] p-3.5"
                >
                  <div className="relative h-48 overflow-hidden rounded-xl bg-[#e5d8c8]">
                    <Image
                      src={item.image}
                      alt=""
                      fill
                      sizes="(max-width:768px) 100vw,33vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <span className="craft-tag absolute left-3 top-3 rounded-full px-3 py-1 font-mono text-xs font-bold text-[#935941]">
                      No.0{index + 1}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-3 pt-4">
                    <h3 className="text-lg font-bold leading-7 text-[#302b26]">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-[#695d52]">
                      {item.description}
                    </p>
                    <Link
                      href={item.href}
                      className="mt-auto inline-flex min-h-10 items-center gap-1.5 self-start pt-4 text-sm font-bold text-[#935941] transition-all group-hover:gap-3"
                    >
                      {item.ctaLabel}
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 台灣節氣與潮濕氣候・職人照顧手記 ＋ 海島溫濕度儲糧防潮互動調校儀 */}
      <section className="border-b border-[#e2d4c4] bg-[#fffdf9] py-16 sm:py-22">
        <div className="page-shell">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="editorial-kicker">
                ISLAND CLIMATE GUIDE & HYGROMETER ・ 台灣節氣與儲糧防潮調校儀
              </span>
              <h2 className="editorial-title mt-2 text-3xl font-bold sm:text-4xl">
                順應海島溫濕度的居家照護與儲糧模擬
              </h2>
            </div>
            <div
              className="flex flex-wrap gap-2"
              role="tablist"
              aria-label="台灣季節照護主題"
            >
              {TAIWAN_SEASONS.map((s) => {
                const Icon = s.icon;
                const active = s.id === seasonTab;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setSeasonTab(s.id);
                      if (s.id === "humid") {
                        setHumidity(86);
                        setRoomTemp(26);
                      } else if (s.id === "summer") {
                        setHumidity(78);
                        setRoomTemp(33);
                      } else {
                        setHumidity(64);
                        setRoomTemp(22);
                      }
                    }}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-all ${active
                        ? "border-[#4e6752] bg-[#4e6752] text-white shadow-[0_3px_0_#354838]"
                        : "border-[#dfd0be] bg-[#faf6f0] text-[#5e5246] hover:border-[#935941]"
                      }`}
                  >
                    <Icon size={14} />
                    {s.badge}
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentSeason.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="mt-7 grid items-start gap-8 rounded-[2rem] border-2 border-[#e0d2c0] bg-[#f7f0e4] p-6 sm:p-10 lg:grid-cols-[1.05fr_0.95fr]"
            >
              <div>
                <span className="craft-tag inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-[#4e6752]">
                  {currentSeason.badge}
                </span>
                <h3 className="editorial-title mt-4 text-2xl font-bold text-[#302b26] sm:text-3xl">
                  {currentSeason.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#5e5246] sm:text-base">
                  {currentSeason.desc}
                </p>

                <div className="mt-5 space-y-2.5">
                  {currentSeason.points.map((pt) => (
                    <div
                      key={pt}
                      className="flex items-center gap-3 rounded-xl border border-[#e5d8c7] bg-[#fffdf9] px-3.5 py-2.5 text-xs font-semibold text-[#3f362e]"
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#4e6752] text-white">
                        <Check size={12} />
                      </span>
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href={currentSeason.ctaHref}
                  className="btn-tactile mt-6 inline-flex items-center gap-2 bg-[#935941] px-5 py-3 text-xs font-bold text-white hover:bg-[#7d4934]"
                >
                  {currentSeason.ctaLabel}
                  <ArrowRight size={15} />
                </Link>
              </div>

              {/* 互動式台灣海島溫濕度儲糧防潮調校儀 */}
              <div className="craft-letterpress rounded-2xl p-5 sm:p-6">
                <div className="flex items-center justify-between border-b border-[#e5d6c3] pb-3">
                  <div>
                    <span className="font-mono text-[10px] font-bold tracking-wider text-[#935941]">
                      ISLAND HYGROMETER SIMULATOR
                    </span>
                    <h4 className="editorial-title text-lg font-bold text-[#302b26]">
                      海島溫濕度・儲糧鮮脆度即時模擬儀
                    </h4>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 font-mono text-xs font-bold ${crispRetentionPct >= 80
                        ? "bg-[#eef4ef] text-[#3d5c43]"
                        : crispRetentionPct >= 65
                          ? "bg-[#fcf3dc] text-[#8a5812]"
                          : "bg-[#fbe9e5] text-[#a63a28]"
                      }`}
                  >
                    鮮脆保持 {crispRetentionPct}%
                  </span>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-[#4a3e33]">
                      <span>台灣居家相對濕度 (RH)</span>
                      <span className="font-mono text-[#935941]">
                        {humidity}% RH
                      </span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={95}
                      step={1}
                      value={humidity}
                      onChange={(e) => setHumidity(Number(e.target.value))}
                      aria-label="調整環境相對濕度"
                      className="mt-2 h-2 w-full cursor-pointer accent-[#4e6752]"
                    />
                    <div className="mt-1 flex justify-between font-mono text-[10px] text-[#8a7a6a]">
                      <span>50% 除濕機開啟</span>
                      <span>75% 一般日常</span>
                      <span>95% 梅雨南風天</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-[#4a3e33]">
                      <span>儲糧角落環境室溫</span>
                      <span className="font-mono text-[#935941]">
                        {roomTemp}°C
                      </span>
                    </div>
                    <input
                      type="range"
                      min={16}
                      max={36}
                      step={1}
                      value={roomTemp}
                      onChange={(e) => setRoomTemp(Number(e.target.value))}
                      aria-label="調整室內溫度"
                      className="mt-2 h-2 w-full cursor-pointer accent-[#935941]"
                    />
                    <div className="mt-1 flex justify-between font-mono text-[10px] text-[#8a7a6a]">
                      <span>16°C 冬季寒流</span>
                      <span>26°C 舒適室溫</span>
                      <span>36°C 盛夏西曬</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div className="rounded-xl border border-[#e3d3c0] bg-[#faf5ed] p-3">
                      <span className="block text-[10px] font-bold text-[#7c6a58]">
                        開封後黃金賞味期
                      </span>
                      <strong className="mt-1 block font-mono text-2xl font-bold text-[#302b26]">
                        {optimalFreshDays}{" "}
                        <span className="text-xs font-normal">日內</span>
                      </strong>
                    </div>
                    <div className="rounded-xl border border-[#e3d3c0] bg-[#faf5ed] p-3">
                      <span className="block text-[10px] font-bold text-[#7c6a58]">
                        30 日後顆粒酥脆度
                      </span>
                      <strong className="mt-1 block font-mono text-2xl font-bold text-[#935941]">
                        {crispRetentionPct}%
                      </strong>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#dfd0be] bg-white p-3 text-xs leading-5 text-[#5a4c3f]">
                    <strong className="text-[#935941]">即時診斷建議：</strong>
                    {oxidationRiskLabel}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* 品牌四大堅持 */}
      <section
        id="our-approach"
        className="page-shell grid gap-10 border-b border-[#dfd0be] py-18 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20"
      >
        <motion.div {...reveal}>
          <span className="editorial-kicker">01 / 誠實選材的四項基礎</span>
          <h2 className="editorial-title mt-4 max-w-[510px] text-3xl font-bold leading-[1.28] sm:text-5xl">
            {displayContent.benefitsTitle}
          </h2>
          <p className="mt-5 max-w-md text-base leading-8 text-[#695c50]">
            {displayContent.benefitsDescription}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/transparency"
              className="btn-tactile inline-flex items-center gap-2 bg-[#935941] px-5 py-3 text-xs font-bold text-white"
            >
              查閱 7C 檢驗與透明履歷 <ArrowRight size={15} />
            </Link>
            <Link
              href="/care/ingredients"
              className="inline-flex items-center gap-2 rounded-xl border border-[#d8c7b4] bg-white px-4 py-3 text-xs font-bold text-[#5e4d3f] hover:bg-[#f5ece0]"
            >
              開啟成分放大鏡
            </Link>
          </div>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2">
          {benefits.map(([title, description], index) => (
            <motion.div
              key={title}
              {...reveal}
              whileHover={{ y: -4 }}
              className="rounded-2xl border border-[#e2d3c1] bg-[#fffdf9] p-6 shadow-[0_4px_0_#e2d3c1]"
            >
              <span className="inline-flex size-8 items-center justify-center rounded-xl bg-[#f5ebe0] font-mono text-xs font-bold text-[#935941]">
                0{index + 1}
              </span>
              <h3 className="mt-4 text-lg font-bold text-[#302b26]">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#6b5e52]">
                {description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 互動體驗入口：曲木便當盒、里民手形銘牌、選物羅盤 */}
      <section className="bg-[#f3eadf] py-18 lg:py-24">
        <div className="page-shell">
          <div className="mx-auto max-w-2xl text-center">
            <span className="editorial-kicker">
              02 / CRAFT INTERACTIVE CORNERS
            </span>
            <h2 className="editorial-title mt-3 text-3xl font-bold sm:text-5xl">
              從手做擺盤到社群印記，三個必逛互動角落
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#6b5d50]">
              我們把枯燥的營養試算與挑選步驟，重構為可親手組合、壓印與實測的生活道具體驗。
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <motion.div
              whileHover={{ y: -6, rotate: -0.5 }}
              className="polaroid-card flex flex-col justify-between rounded-[1.8rem] p-6"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[#fdf3e7] px-3 py-1 font-mono text-xs font-bold text-[#935941]">
                    CORNER 01 ・ 旬食組配
                  </span>
                  <BentoWoodBoxSvg size={28} />
                </div>
                <h3 className="editorial-title mt-4 text-2xl font-bold">
                  曲木三格・旬食配餐盒
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#695d52]">
                  於杉木三格配餐盤中自由組合「主食基底、原肉佐餐與日常器物」，即時核算營養天秤配比後整組飛入購物籃。
                </p>
              </div>
              <Link
                href="/shop#bento-builder"
                className="btn-tactile mt-6 inline-flex items-center justify-center gap-2 bg-[#935941] px-4 py-3 text-xs font-bold text-white"
              >
                前往為 {pet.name} 搭配木盒 <ArrowRight size={15} />
              </Link>
            </motion.div>

            <motion.div
              whileHover={{ y: -6, rotate: 0.5 }}
              className="polaroid-card flex flex-col justify-between rounded-[1.8rem] p-6"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[#eef2eb] px-3 py-1 font-mono text-xs font-bold text-[#4e6752]">
                    CORNER 02 ・ 榮譽銘牌
                  </span>
                  <Award size={24} className="text-[#4e6752]" />
                </div>
                <h3 className="editorial-title mt-4 text-2xl font-bold">
                  台灣街坊毛孩・里民手形銘牌
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#695d52]">
                  鑄造專屬的活版印刷里民銘牌，壓蓋朱紅火漆封蠟印章，並於街坊拍立得生活牆與台灣家庭互相擊掌致意。
                </p>
              </div>
              <Link
                href="/community#id-card-studio"
                className="btn-tactile mt-6 inline-flex items-center justify-center gap-2 bg-[#4e6752] px-4 py-3 text-xs font-bold text-white !shadow-[0_4px_0_#334636]"
              >
                製作里民手形銘牌 <ArrowRight size={15} />
              </Link>
            </motion.div>

            <motion.div
              whileHover={{ y: -6, rotate: -0.5 }}
              className="polaroid-card flex flex-col justify-between rounded-[1.8rem] p-6"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[#fcf4df] px-3 py-1 font-mono text-xs font-bold text-[#8a5a14]">
                    CORNER 03 ・ 智慧指南
                  </span>
                  <Compass size={24} className="text-[#8a5a14]" />
                </div>
                <h3 className="editorial-title mt-4 text-2xl font-bold">
                  選物羅盤與探索手冊
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#695d52]">
                  依預算範圍、居家情境與避開食材提出三組具備營養推論的建議清單，兼備七日換糧與存糧預報道具。
                </p>
              </div>
              <Link
                href="/care/compass"
                className="btn-tactile mt-6 inline-flex items-center justify-center gap-2 bg-[#935941] px-4 py-3 text-xs font-bold text-white"
              >
                <Compass size={15} />
                開啟選物羅盤 <ArrowRight size={15} />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 家庭共管與社群故事 */}
      <section
        id="community-story"
        className="border-t border-[#dfd0be] bg-[#faf6f0] py-18 lg:py-24"
      >
        <div className="page-shell grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="polaroid-card relative min-h-[380px] overflow-hidden rounded-[2rem] p-4 lg:min-h-[460px]">
            <div className="relative h-full min-h-[350px] overflow-hidden rounded-2xl bg-[#e3d5c5]">
              <Image
                src={displayContent.communityImage}
                alt="毛孩家庭日常與 PURESPOT 選物"
                fill
                sizes="(max-width:1024px) 100vw,50vw"
                className="object-cover"
              />
            </div>
          </div>
          <motion.div {...reveal}>
            <span className="editorial-kicker">03 / COMMUNITY JOURNAL</span>
            <h2 className="editorial-title mt-4 text-3xl font-bold leading-[1.25] sm:text-5xl">
              {displayContent.communityTitle}
            </h2>
            <p className="mt-5 max-w-lg leading-8 text-[#695d52]">
              {displayContent.communityDescription}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/community"
                className="btn-tactile inline-flex min-h-12 items-center gap-2.5 bg-[#935941] px-6 text-sm font-bold text-white"
              >
                <Heart size={16} />
                走進街坊生活誌 <ArrowRight size={16} />
              </Link>
              <Link
                href="/community/connect?channel=INSTAGRAM"
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#d8c7b4] bg-white px-5 text-sm font-semibold text-[#5a4a3c] hover:bg-[#f4ece1]"
              >
                <Instagram size={17} className="text-[#935941]" /> IG 分享排版器
              </Link>
              <Link
                href="/community/connect?channel=LINE"
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#d8c7b4] bg-white px-5 text-sm font-semibold text-[#5a4a3c] hover:bg-[#f4ece1]"
              >
                <MessageCircle size={17} className="text-[#4e6752]" /> LINE
                分享卡
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
