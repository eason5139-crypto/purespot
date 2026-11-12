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

const reveal = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

const MOOD_OPTIONS = [
  {
    id: "picky",
    emoji: "😼",
    tag: "聞一聞就走",
    title: "家有挑嘴小老闆",
    petOs: "「不是我不餓，是今天這碗少了一點靈魂肉香啦！」",
    tip: "優先挑選單一高肉量或凍乾佐餐，開袋香氣更有感。",
    keywords: ["鮭魚", "凍乾", "鮮肉", "肉", "草餅"],
  },
  {
    id: "tummy",
    emoji: "🌱",
    tag: "便便愛搞怪",
    title: "呵護玻璃小肚肚",
    petOs: "「換季肚子咕嚕咕嚕，給我單純好消化的溫柔配方～」",
    tip: "避開已知過敏原、選擇成分單純且標示清楚的主食。",
    keywords: ["低敏", "腸", "益生", "單一", "草"],
  },
  {
    id: "coat",
    emoji: "🧶",
    tag: "換毛季狂舔",
    title: "毛髮蓬鬆順順排",
    petOs: "「摸起來要像剛曬過太陽的棉被一樣軟綿綿！」",
    tip: "補充優質魚油或天然纖維，幫毛孩度過台灣換季掉毛期。",
    keywords: ["鮭魚", "魚", "化毛", "牧草", "梳"],
  },
  {
    id: "energy",
    emoji: "⚡",
    tag: "半夜三點跑酷",
    title: "電力滿格放電王",
    petOs: "「陪我玩十分鐘！不然我今晚三點準時在客廳開運動會！」",
    tip: "高蛋白補足活力，再搭一個耐咬玩具把多餘精力放光光。",
    keywords: ["雞", "牛", "玩具", "咬", "跑"],
  },
] as const;

const TAIWAN_SEASONS = [
  {
    id: "humid",
    icon: CloudRain,
    badge: "台灣潮濕梅雨・保存守則",
    title: "濕度動輒 80%！飼料怎麼放才不軟掉？",
    desc: "台灣海島氣候容易讓乾糧受潮變質。每次倒完飯記得把空氣擠出、夾鏈壓緊，也別放在陽台或廚房瓦斯爐旁喔！",
    points: ["開封後黃金賞味期 30–45 天", "建議連同原袋放進密封儲糧桶", "小包裝定期配，永遠吃最新鮮的那一包"],
    ctaHref: "/care/refill",
    ctaLabel: "算算家裡存糧還能吃幾天",
  },
  {
    id: "summer",
    icon: Sun,
    badge: "夏日午後柏油路・肉球警報",
    title: "手背貼地 5 秒覺得燙，就不能帶狗狗出門走！",
    desc: "台灣夏天午後地面溫度常超過 55°C。把散步改到清晨六點或太陽下山後，回家記得先擦腳腳、喝口涼水。",
    points: ["隨身水壺與折疊碗必備", "濕糧或凍乾泡水，騙水喝超有效", "出門前先用打包桌點名隨身小物"],
    ctaHref: "/care/packing",
    ctaLabel: "打開出門旅前打包桌",
  },
  {
    id: "breeze",
    icon: Wind,
    badge: "換季溫差大・溫柔換糧學",
    title: "直接整碗換新糧？小心主子軟便抗議！",
    desc: "不管新飼料多好，腸胃都需要時間認識新朋友。給牠 7 到 10 天慢慢調整比例，肚子才不會鬧脾氣。",
    points: ["第 1–2 天：新糧 20% + 舊糧 80%", "第 5–6 天：新舊各半觀察便便形狀", "第 7–10 天：安心完成 100% 轉換"],
    ctaHref: "/care/transition",
    ctaLabel: "打開 7 日換糧陪跑日曆",
  },
] as const;

const FORTUNES = [
  "💮 今日大吉：主子心情超好，適合偷偷剪指甲",
  "💮 今日上上籤：加一顆凍乾，呼嚕聲放大 200%",
  "💮 今日宜：巷口公園散步多繞一圈",
  "💮 今日小確幸：開袋瞬間獲得閃亮崇拜眼神",
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
  const [patsCount, setPatsCount] = useState<number>(128);

  const currentMood =
    MOOD_OPTIONS.find((m) => m.id === selectedMoodId) ?? MOOD_OPTIONS[0];
  const currentSeason =
    TAIWAN_SEASONS.find((s) => s.id === seasonTab) ?? TAIWAN_SEASONS[0];

  // 為目前毛孩與選中心情挑出最合適的安全商品
  const safeForPet = products.filter(
    (p) => p.stock > 0 && matchProduct(p, pet).safe,
  );
  const moodMatchedProduct =
    safeForPet.find((p) =>
      currentMood.keywords.some((kw) =>
        `${p.name}${p.subtitle}${p.category}${p.ingredients.join("")}`.includes(
          kw,
        ),
      ),
    ) ??
    safeForPet[0] ??
    products.find((p) => p.stock > 0);

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
      toast.success(`已幫 ${pet.name} 把「${productName}」放進菜籃！`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "無法加入菜籃");
    }
  }

  function handlePatPet(event: React.MouseEvent<HTMLButtonElement>) {
    triggerPawBurst(event.currentTarget);
    setPatsCount((c) => c + 1);
    setFortuneIdx((i) => (i + 1) % FORTUNES.length);
  }

  return (
    <main
      id="main-content"
      className="public-editorial overflow-hidden bg-[#faf6f0] text-[#302b26]"
    >
      {/* 溫暖台灣選物所首屏 Hero + 互動心情點餐機 */}
      <section
        id="home-hero"
        className="relative isolate overflow-hidden border-b border-[#e4d6c5] bg-[radial-gradient(circle_at_15%_15%,#fffaf0_0%,#f6ede0_52%,#efe2d0_100%)] py-10 sm:py-16"
      >
        {/* 溫暖背景光暈裝飾 */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-24 size-96 rounded-full bg-[#e2a84c]/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 right-10 size-96 rounded-full bg-[#935941]/12 blur-3xl"
        />

        <div className="page-shell relative z-10">
          {/* 頂部台灣街坊溫度列 */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-[#dfd0be] pb-4 text-xs font-medium text-[#6f5e50]">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#935941] px-2.5 py-0.5 text-[11px] font-bold text-white">
                <PawPrint size={11} />
                台灣毛孩日常選物所
              </span>
              <span>巷口散步回來，吃一碗看得見來源的好飯</span>
            </div>
            <div className="flex items-center gap-3">
              <motion.button
                type="button"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.94 }}
                onClick={handlePatPet}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#d8c4ae] bg-[#fffcf7] px-3 py-1 text-xs font-semibold text-[#935941] shadow-2xs hover:bg-[#fff5e6]"
              >
                <span>👋 摸摸頭抽今日毛孩籤</span>
                <span className="rounded-full bg-[#f5ebe0] px-1.5 font-mono text-[11px]">
                  {patsCount}
                </span>
              </motion.button>
              <span className="hidden rounded-full bg-[#eef2eb] px-3 py-1 text-[11px] font-semibold text-[#4e6752] md:inline-block">
                {FORTUNES[fortuneIdx]}
              </span>
            </div>
          </div>

          <div className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12">
            {/* 左欄：主視覺故事與拍立得畫框 */}
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-[#dfd0be] bg-[#fffaf2] px-3.5 py-1.5 text-xs font-bold tracking-wider text-[#935941] shadow-2xs">
                <Sparkles size={13} />
                {displayContent.heroEyebrow}
              </div>

              <h1 className="editorial-title mt-5 text-[clamp(2.6rem,5.6vw,5.1rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-[#2c2520]">
                {displayContent.heroTitle}
                <br />
                <span className="text-[#935941]">{displayContent.heroAccent}</span>
              </h1>

              <p className="mt-6 max-w-xl border-l-4 border-[#935941] pl-4 text-base leading-8 text-[#5c5046] sm:text-lg">
                {displayContent.heroDescription}
              </p>

              {/* 拍立得生活實景小卡組 */}
              <div className="mt-7 grid gap-4 sm:grid-cols-[1.15fr_0.85fr]">
                <motion.div
                  whileHover={{ rotate: -1, y: -4 }}
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
                    <span className="absolute left-3 top-3 rounded-full bg-[#fffaf2]/95 px-3 py-1 text-[11px] font-bold text-[#935941] shadow-xs">
                      📸 台灣毛孩家庭日常
                    </span>
                  </div>
                  <p className="mt-2.5 flex items-center justify-between px-1 text-xs font-medium text-[#675b4f]">
                    <span>「吃飽飽、睡好覺，就是每天最重要的小事。」</span>
                    <span className="font-mono text-[11px] text-[#935941]">#PURESPOT日常</span>
                  </p>
                </motion.div>

                <div className="flex flex-col justify-between rounded-2xl border border-[#e0d1bf] bg-[#fffcf7] p-5 shadow-xs">
                  <div>
                    <span className="inline-block rounded-md bg-[#eef2eb] px-2.5 py-1 text-[11px] font-bold text-[#4e6752]">
                      為什麼年輕飼主都愛逛？
                    </span>
                    <ul className="mt-3.5 space-y-2.5 text-xs leading-5 text-[#5a4e44]">
                      <li className="flex items-start gap-2">
                        <Check size={15} className="mt-0.5 shrink-0 text-[#935941]" />
                        <span>
                          <strong>成分講人話：</strong>翻開卡片背面，3 秒看懂每種原料對毛孩的好處。
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check size={15} className="mt-0.5 shrink-0 text-[#935941]" />
                        <span>
                          <strong>過敏自動擋：</strong>綁定 {pet.name} 的小檔案，不適合的成分直接幫你把關。
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check size={15} className="mt-0.5 shrink-0 text-[#935941]" />
                        <span>
                          <strong>便當自由配：</strong>主食＋凍乾＋玩具自己搭，整盒打包直接飛進菜籃！
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-[#eee3d5]">
                    <Link
                      href="/shop"
                      className="btn-tactile inline-flex flex-1 items-center justify-center gap-2 bg-[#935941] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#7d4934]"
                    >
                      逛逛柑仔選物店
                      <ArrowRight size={14} />
                    </Link>
                    <Link
                      href="/shop#bento-builder"
                      className="inline-flex items-center justify-center rounded-xl border border-[#d8c7b4] bg-[#fffaf2] px-3 py-2.5 text-xs font-bold text-[#6e523e] hover:bg-[#f3e9dc]"
                    >
                      🍱 配便當
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 右欄：互動「毛孩今日心情點餐機」 */}
            <motion.div
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.1 }}
              className="relative rounded-[2rem] border-2 border-[#dccab6] bg-[#fffdf9] p-6 shadow-[0_22px_50px_-24px_rgba(110,72,48,0.22),0_6px_0_#dfd0be] sm:p-7"
            >
              {/* 頂部紙膠帶裝飾 */}
              <div
                aria-hidden="true"
                className="washi-tape absolute -top-3.5 left-1/2 h-7 w-36 -translate-x-1/2 rotate-[-1.5deg] rounded-sm"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ece0d1] pb-4">
                <div>
                  <span className="text-[11px] font-bold tracking-wider text-[#935941]">
                    🎯 30 秒互動點餐機
                  </span>
                  <h2 className="editorial-title mt-0.5 text-2xl font-bold text-[#302b26]">
                    今天 {pet.name} 看起來什麼心情？
                  </h2>
                </div>
                {/* 快速切換毛孩 */}
                <div className="flex flex-wrap gap-1.5">
                  {allPets.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActivePet(item.id)}
                      className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                        item.id === pet.id
                          ? "bg-[#935941] text-white shadow-xs scale-105"
                          : "bg-[#f4ece1] text-[#6e5d4f] hover:bg-[#eadbc9]"
                      }`}
                    >
                      {item.name} ({petLabels[item.type]})
                    </button>
                  ))}
                </div>
              </div>

              {/* 4 個心情按鈕 */}
              <div
                className="mt-4 grid grid-cols-2 gap-2.5"
                role="group"
                aria-label="選擇毛孩今日心情"
              >
                {MOOD_OPTIONS.map((mood) => {
                  const active = mood.id === selectedMoodId;
                  return (
                    <motion.button
                      key={mood.id}
                      type="button"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setSelectedMoodId(mood.id)}
                      className={`flex items-center gap-2.5 rounded-2xl border p-3 text-left transition-all ${
                        active
                          ? "border-[#935941] bg-[#fdf3e7] shadow-[0_3px_0_#935941]"
                          : "border-[#e6d9c8] bg-[#faf6f0] hover:border-[#c8b299] hover:bg-[#fffaf2]"
                      }`}
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-2xs">
                        {mood.emoji}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-[#8c6d58]">
                          {mood.tag}
                        </p>
                        <p className="truncate text-sm font-bold text-[#302b26]">
                          {mood.title}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* 動態推薦結果卡 */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${pet.id}-${currentMood.id}`}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.25 }}
                  className="mt-4 rounded-2xl border border-[#e5d5c3] bg-[#faf5ed] p-4"
                >
                  <p className="rounded-xl bg-white px-3.5 py-2 text-xs font-medium italic text-[#735742] shadow-2xs">
                    💬 {pet.name} OS：{currentMood.petOs}
                  </p>

                  {moodMatchedProduct && (
                    <div className="mt-3.5 flex flex-col gap-4 sm:flex-row sm:items-center">
                      <Link
                        href={`/products/${moodMatchedProduct.slug}`}
                        className="relative size-24 shrink-0 overflow-hidden rounded-2xl border border-[#e2d3c1] bg-white p-2 shadow-2xs group"
                      >
                        <Image
                          src={moodMatchedProduct.image}
                          alt={moodMatchedProduct.name}
                          fill
                          sizes="96px"
                          className="object-contain p-1.5 transition-transform duration-300 group-hover:scale-110"
                        />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full bg-[#eef2eb] px-2.5 py-0.5 text-[11px] font-bold text-[#4e6752]">
                            ✓ {pet.name} 安心適配
                          </span>
                          <span className="text-xs text-[#8a7a6b]">
                            {moodMatchedProduct.category}
                          </span>
                        </div>
                        <Link
                          href={`/products/${moodMatchedProduct.slug}`}
                          className="editorial-title mt-1 block text-xl font-bold text-[#302b26] hover:text-[#935941]"
                        >
                          {moodMatchedProduct.name}
                        </Link>
                        <p className="mt-1 text-xs leading-5 text-[#6b5d51]">
                          {currentMood.tip}
                        </p>
                        <div className="mt-2 flex flex-wrap items-baseline gap-3">
                          <strong className="font-mono text-lg font-bold text-[#935941]">
                            {money(moodMatchedProduct.priceNt)}
                          </strong>
                          {nutritionResult && (
                            <span className="rounded-md bg-[#fffaf0] border border-[#e3d3c1] px-2 py-0.5 text-[11px] font-semibold text-[#5b4d40]">
                              🍚 {pet.name} 每日約吃{" "}
                              <strong>{decimal(nutritionResult.dailyGrams, 0)}g</strong>（約{" "}
                              {money(nutritionResult.autoshipDailyCostNt)}/天）
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {moodMatchedProduct && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-[#e6d8c7] pt-3.5">
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={(e) =>
                          handleQuickAddToCart(
                            e,
                            moodMatchedProduct.id,
                            moodMatchedProduct.name,
                            moodMatchedProduct.image,
                          )
                        }
                        className="btn-tactile inline-flex flex-1 items-center justify-center gap-2 bg-[#935941] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#7d4934]"
                      >
                        <ShoppingBag size={15} />
                        幫 {pet.name} 放進菜籃（點我飛入！）
                      </motion.button>
                      {moodMatchedProduct.kind !== "SUPPLIES" &&
                        supportsFoodCalculator(pet.type) && (
                          <button
                            type="button"
                            onClick={() => openCalculator(moodMatchedProduct.id)}
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

      {/* 本期街坊活動區 */}
      {promotions.length > 0 && (
        <section
          id="site-events"
          className="border-b border-[#e2d4c4] bg-[#f4ece0] py-14 sm:py-18"
        >
          <div className="page-shell">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
              <div>
                <span className="editorial-kicker inline-flex items-center gap-2">
                  <Sparkles size={15} /> 柑仔店佈告欄・近期好康
                </span>
                <h2 className="editorial-title mt-2 text-3xl font-bold sm:text-4xl">
                  街坊都在參加的毛孩企劃
                </h2>
              </div>
              <span className="rounded-full bg-[#fffaf2] border border-[#dfd0be] px-3.5 py-1 text-xs font-semibold text-[#7a6858]">
                正在進行 {promotions.length} 個溫暖提案
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
                    <span className="absolute left-3 top-3 rounded-full bg-[#fffaf2]/95 px-3 py-1 text-xs font-bold text-[#935941] shadow-xs">
                      企劃 0{index + 1}
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

      {/* 台灣節氣與潮濕氣候・互動照護黑板 */}
      <section className="border-b border-[#e2d4c4] bg-[#fffdf9] py-16 sm:py-22">
        <div className="page-shell">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="editorial-kicker">台灣在地飼主筆記</span>
              <h2 className="editorial-title mt-2 text-3xl font-bold sm:text-4xl">
                住台灣的毛孩，需要一點特別的貼心
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
                    onClick={() => setSeasonTab(s.id)}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-all ${
                      active
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
              className="mt-7 grid items-center gap-8 rounded-[2rem] border-2 border-[#e0d2c0] bg-[#f7f0e4] p-6 sm:p-10 lg:grid-cols-[1.15fr_0.85fr]"
            >
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fffaf2] px-3 py-1 text-xs font-bold text-[#4e6752]">
                  🌿 {currentSeason.badge}
                </span>
                <h3 className="editorial-title mt-4 text-2xl font-bold text-[#302b26] sm:text-3xl">
                  {currentSeason.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#5e5246] sm:text-base">
                  {currentSeason.desc}
                </p>
                <Link
                  href={currentSeason.ctaHref}
                  className="btn-tactile mt-6 inline-flex items-center gap-2 bg-[#935941] px-5 py-3 text-xs font-bold text-white hover:bg-[#7d4934]"
                >
                  {currentSeason.ctaLabel}
                  <ArrowRight size={15} />
                </Link>
              </div>
              <div className="space-y-3 rounded-2xl border border-[#dfd0be] bg-[#fffdf9] p-5 shadow-xs">
                <p className="text-xs font-bold tracking-wider text-[#935941]">
                  ✓ 店長幫你畫重點：
                </p>
                {currentSeason.points.map((pt) => (
                  <div
                    key={pt}
                    className="flex items-center gap-3 rounded-xl bg-[#faf5ed] px-3.5 py-2.5 text-xs font-semibold text-[#3f362e]"
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#4e6752] text-white">
                      <Check size={12} />
                    </span>
                    <span>{pt}</span>
                  </div>
                ))}
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
          <span className="editorial-kicker">01 / 我們的憨直堅持</span>
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
              查看 7C 檢驗與透明履歷 <ArrowRight size={15} />
            </Link>
            <Link
              href="/care/ingredients"
              className="inline-flex items-center gap-2 rounded-xl border border-[#d8c7b4] bg-white px-4 py-3 text-xs font-bold text-[#5e4d3f] hover:bg-[#f5ece0]"
            >
              打開成分放大鏡
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
              <p className="mt-2 text-sm leading-6 text-[#6b5e52]">{description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 互動玩樂任意門（便當自由配、榮譽里民證、選物羅盤） */}
      <section className="bg-[#f3eadf] py-18 lg:py-24">
        <div className="page-shell">
          <div className="text-center max-w-2xl mx-auto">
            <span className="editorial-kicker">02 / 邊逛邊玩的選物體驗</span>
            <h2 className="editorial-title mt-3 text-3xl font-bold sm:text-5xl">
              買飼料不再像交功課，三個角落帶毛孩一起玩！
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#6b5d50]">
              我們把枯燥的營養數據跟選物流程，變成可以自己動手配、蓋印章、印里民證的互動小店。
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <motion.div
              whileHover={{ y: -6, rotate: -0.5 }}
              className="polaroid-card flex flex-col justify-between rounded-[1.8rem] p-6"
            >
              <div>
                <span className="inline-block rounded-full bg-[#fdf3e7] px-3 py-1 text-xs font-bold text-[#935941]">
                  🍱 人氣 NO.1 互動
                </span>
                <h3 className="editorial-title mt-4 text-2xl font-bold">
                  毛孩命定便當盒 DIY
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#695d52]">
                  像在包台灣鐵路便當一樣！自選「1 主食 + 1 凍乾加菜 + 1 飯後玩具」，湊滿三格享組合驚喜，一鍵整盒飛進菜籃。
                </p>
              </div>
              <Link
                href="/shop#bento-builder"
                className="btn-tactile mt-6 inline-flex items-center justify-center gap-2 bg-[#935941] px-4 py-3 text-xs font-bold text-white"
              >
                去幫 {pet.name} 包便當 <ArrowRight size={15} />
              </Link>
            </motion.div>

            <motion.div
              whileHover={{ y: -6, rotate: 0.5 }}
              className="polaroid-card flex flex-col justify-between rounded-[1.8rem] p-6"
            >
              <div>
                <span className="inline-block rounded-full bg-[#eef2eb] px-3 py-1 text-xs font-bold text-[#4e6752]">
                  🪪 社群發限動必備
                </span>
                <h3 className="editorial-title mt-4 text-2xl font-bold">
                  台灣毛孩榮譽里民證
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#695d52]">
                  幫家裡的「半夜跑酷選手」或「全里最會裝餓代表」印一張專屬榮譽身分證，還能去街坊拍立得牆給別人家毛孩摸摸頭！
                </p>
              </div>
              <Link
                href="/community#id-card-studio"
                className="btn-tactile mt-6 inline-flex items-center justify-center gap-2 bg-[#4e6752] px-4 py-3 text-xs font-bold text-white !shadow-[0_4px_0_#334636]"
              >
                30 秒印製毛孩里民證 <ArrowRight size={15} />
              </Link>
            </motion.div>

            <motion.div
              whileHover={{ y: -6, rotate: -0.5 }}
              className="polaroid-card flex flex-col justify-between rounded-[1.8rem] p-6"
            >
              <div>
                <span className="inline-block rounded-full bg-[#fcf4df] px-3 py-1 text-xs font-bold text-[#8a5a14]">
                  🧭 選擇困難救星
                </span>
                <h3 className="editorial-title mt-4 text-2xl font-bold">
                  選物羅盤 ＆ 探索護照
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#695d52]">
                  不知道怎麼挑？用選物羅盤輸入預算與情境，直接給你三種有根據的提案；完成三關小任務還能收集探索印章！
                </p>
              </div>
              <Link
                href="/care/compass"
                className="btn-tactile mt-6 inline-flex items-center justify-center gap-2 bg-[#935941] px-4 py-3 text-xs font-bold text-white"
              >
                <Compass size={15} />
                打開選物羅盤 <ArrowRight size={15} />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 家庭共管與社群溫暖故事 */}
      <section
        id="community-story"
        className="border-t border-[#dfd0be] bg-[#faf6f0] py-18 lg:py-24"
      >
        <div className="page-shell grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="polaroid-card relative min-h-[380px] overflow-hidden rounded-[2rem] p-4 lg:min-h-[460px]">
            <div className="relative h-full min-h-[350px] overflow-hidden rounded-2xl bg-[#e3d5c5]">
              <Image
                src={displayContent.communityImage}
                alt="毛孩社群與 PURESPOT 商品"
                fill
                sizes="(max-width:1024px) 100vw,50vw"
                className="object-cover"
              />
            </div>
          </div>
          <motion.div {...reveal}>
            <span className="editorial-kicker">03 / 街坊毛孩交流圈</span>
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
                走進街坊毛孩牆 <ArrowRight size={16} />
              </Link>
              <Link
                href="/community/connect?channel=INSTAGRAM"
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#d8c7b4] bg-white px-5 text-sm font-semibold text-[#5a4a3c] hover:bg-[#f4ece1]"
              >
                <Instagram size={17} className="text-[#935941]" /> IG 限動排版器
              </Link>
              <Link
                href="/community/connect?channel=LINE"
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#d8c7b4] bg-white px-5 text-sm font-semibold text-[#5a4a3c] hover:bg-[#f4ece1]"
              >
                <MessageCircle size={17} className="text-[#4e6752]" /> LINE 分享小卡
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
