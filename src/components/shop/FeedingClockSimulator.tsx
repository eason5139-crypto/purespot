"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  Droplets,
  Flame,
  Scale,
  ShoppingBag,
  Sparkles,
  Sun,
  Sunset,
  Moon,
  Coffee,
} from "lucide-react";
import { toast } from "sonner";
import { useActivePet } from "@/store/usePetContextStore";
import { useCatalogStore } from "@/store/useCatalogStore";
import { useCartStore } from "@/store/useCartStore";
import { matchProduct } from "@/lib/matching";
import { calculatePetNutrition } from "@/lib/nutritionCalculator";
import { triggerFlyToCart } from "@/lib/flyToCart";
import { petLabels, supportsFoodCalculator } from "@/lib/types";

const TIME_SLOTS = [
  {
    id: "morning",
    time: "07:30",
    name: "晨間・朝定食",
    ratioOfDay: 0.42,
    defaultWetPercent: 25,
    icon: Sun,
    note: "晨起胃排空後消化吸收力最佳，建議以高蛋白乾糧為基底，拌入少量溫水或主食罐喚醒嗅覺。",
  },
  {
    id: "noon",
    time: "13:00",
    name: "午後・慢食嗅聞",
    ratioOfDay: 0.14,
    defaultWetPercent: 10,
    icon: Coffee,
    note: "午後將少量凍乾或風乾肉片藏於嗅聞墊或解謎盤中，藉由尋食動腦消耗精力、穩定情緒。",
  },
  {
    id: "evening",
    time: "19:00",
    name: "晚間・夕定食",
    ratioOfDay: 0.36,
    defaultWetPercent: 40,
    icon: Sunset,
    note: "散步或互動後的主餐，提高濕食餐包或主食罐比重，補充優質動物胺基酸與天然水分。",
  },
  {
    id: "night",
    time: "22:00",
    name: "睡前・溫潤補水",
    ratioOfDay: 0.08,
    defaultWetPercent: 60,
    icon: Moon,
    note: "睡前小份量溫和肉泥或泡水凍乾，延長夜間飽足感，減少清晨提早討食或空腹嘔吐。",
  },
] as const;

export function FeedingClockSimulator() {
  const pet = useActivePet();
  const products = useCatalogStore((s) => s.products);
  const addItem = useCartStore((s) => s.addItem);

  const [slotId, setSlotId] = useState<(typeof TIME_SLOTS)[number]["id"]>(
    "morning",
  );
  const [wetPercent, setWetPercent] = useState<number>(25);

  const currentSlot =
    TIME_SLOTS.find((s) => s.id === slotId) ?? TIME_SLOTS[0]!;

  // 選出適合該毛孩的安全乾糧與濕食
  const { safeDry, safeWet } = useMemo(() => {
    const safeList = products.filter(
      (p) => p.stock > 0 && matchProduct(p, pet).safe,
    );
    const dry =
      safeList.find(
        (p) =>
          p.category === "主食乾糧" ||
          p.category === "風乾主食" ||
          p.category === "機能配方",
      ) ?? safeList[0];
    const wet =
      safeList.find(
        (p) =>
          p.category === "主食罐頭" ||
          p.category === "鮮食餐包" ||
          p.category === "凍乾主食",
      ) ?? safeList[1] ?? safeList[0];
    return { safeDry: dry, safeWet: wet };
  }, [products, pet]);

  const dailyKcal = useMemo(() => {
    if (!supportsFoodCalculator(pet.type)) {
      return Math.round(pet.weightKg * 65);
    }
    const res = calculatePetNutrition(
      {
        petType: pet.type,
        weightKg: pet.weightKg,
        ageMonths: pet.ageMonths,
        isNeutered: pet.isNeutered,
        activityLevel: pet.activityLevel,
        isWeightLossGoal: pet.goal === "WEIGHT_LOSS",
        foodKcalPer100g: safeDry?.kcalPer100g || 380,
      },
      safeDry?.bagGrams || 2000,
      safeDry?.priceNt || 980,
    );
    return res.der;
  }, [pet, safeDry]);

  const slotKcal = Math.round(dailyKcal * currentSlot.ratioOfDay);
  const dryKcal = Math.round(slotKcal * ((100 - wetPercent) / 100));
  const wetKcal = slotKcal - dryKcal;

  const dryGrams = Math.max(
    1,
    Math.round((dryKcal / (safeDry?.kcalPer100g || 380)) * 100),
  );
  const wetGrams =
    wetPercent === 0
      ? 0
      : Math.max(
          1,
          Math.round((wetKcal / (safeWet?.kcalPer100g || 115)) * 100),
        );

  const dailyWaterMl = Math.round(pet.weightKg * 55);
  const foodMoistureMl = Math.round(wetGrams * 0.76 + dryGrams * 0.08);
  const drinkingGoalMl = Math.max(40, dailyWaterMl - foodMoistureMl * 2);

  function handleSelectSlot(slot: (typeof TIME_SLOTS)[number]) {
    setSlotId(slot.id);
    setWetPercent(slot.defaultWetPercent);
  }

  function handleAddMealCombo(e: React.MouseEvent<HTMLButtonElement>) {
    const btn = e.currentTarget;
    const targets = [safeDry, wetPercent > 0 ? safeWet : null].filter(
      (x): x is NonNullable<typeof x> => Boolean(x),
    );
    let count = 0;
    targets.forEach((prod, idx) => {
      try {
        addItem({
          productId: prod.id,
          petId: pet.id,
          quantity: 1,
          mode: "ONCE",
          intervalDays: null,
        });
        count++;
        triggerFlyToCart(btn, {
          image: prod.image,
          label: prod.name,
          delayMs: idx * 140,
        });
      } catch {
        // ignore stock overflow
      }
    });
    if (count > 0) {
      toast.success(
        `已將 ${pet.name} 的「${currentSlot.name}」乾濕配餐組合納入購物籃`,
      );
    }
  }

  // 計算碗內視覺顆粒數量
  const kibbleDotsCount = Math.max(4, Math.min(26, Math.round((100 - wetPercent) / 4)));

  return (
    <div className="craft-letterpress rounded-[2rem] p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e4d5c3] pb-5">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#935941]/12 px-3 py-1 font-mono text-[11px] font-bold tracking-wider text-[#935941]">
            <Clock size={12} />
            DAILY FEEDING CLOCK & BOWL SIMULATOR · 一日餐桌時鐘與克數模擬器
          </span>
          <h3 className="editorial-title mt-2 text-2xl font-bold text-[#302b26] sm:text-3xl">
            {pet.name} 的四時定食時鐘與乾濕混搭餐碗
          </h3>
          <p className="mt-1 text-xs text-[#6b5d50] sm:text-sm">
            依據 {pet.name}（{petLabels[pet.type]} · {pet.weightKg}kg · 全日目標{" "}
            <strong className="font-mono text-[#935941]">
              {dailyKcal} kcal
            </strong>
            ）動態模擬各時段餐碗配比與自然補水量。
          </p>
        </div>

        {/* 時段切換膠囊 */}
        <div
          className="flex flex-wrap gap-1.5"
          role="tablist"
          aria-label="選擇一日餵食時段"
        >
          {TIME_SLOTS.map((slot) => {
            const Icon = slot.icon;
            const active = slot.id === slotId;
            return (
              <button
                key={slot.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleSelectSlot(slot)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                  active
                    ? "border-[#935941] bg-[#935941] text-white shadow-xs"
                    : "border-[#dfd0be] bg-[#fffaf2] text-[#68594b] hover:border-[#935941]"
                }`}
              >
                <Icon size={13} />
                <span className="font-mono">{slot.time}</span>
                <span>{slot.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid items-center gap-7 lg:grid-cols-[0.95fr_1.05fr]">
        {/* 左欄：互動式俯視陶瓷木座雙碗 SVG 模擬器 */}
        <div className="relative flex flex-col items-center rounded-2xl border border-[#e3d3c0] bg-[radial-gradient(circle_at_50%_40%,#fffdf9_0%,#f5eadc_100%)] p-5">
          <div className="mb-2 flex w-full items-center justify-between text-[11px] font-bold text-[#7c6a58]">
            <span className="font-mono">
              {currentSlot.time} · {currentSlot.name}
            </span>
            <span className="rounded-full bg-[#fffaf2] px-2.5 py-0.5 font-mono text-[#935941] border border-[#dfd0be]">
              占全日熱量 {Math.round(currentSlot.ratioOfDay * 100)}% ({slotKcal}{" "}
              kcal)
            </span>
          </div>

          <svg
            viewBox="0 0 380 230"
            className="w-full max-w-[360px] drop-shadow-[0_12px_20px_rgba(95,60,35,0.16)]"
            role="img"
            aria-label={`${pet.name} 的陶瓷餐碗與水盅配比模擬圖`}
          >
            {/* 底部實木托盤 */}
            <rect
              x="16"
              y="22"
              width="348"
              height="186"
              rx="28"
              fill="#d8b994"
              stroke="#9c754d"
              strokeWidth="2.5"
            />
            <rect
              x="24"
              y="30"
              width="332"
              height="170"
              rx="22"
              fill="#e6cba8"
              stroke="#b8926a"
              strokeWidth="1.2"
            />

            {/* 左側：主食陶瓷大碗 */}
            <circle
              cx="132"
              cy="115"
              r="76"
              fill="#fffdf8"
              stroke="#8c6d50"
              strokeWidth="3"
            />
            <circle
              cx="132"
              cy="115"
              r="65"
              fill="#f7efe4"
              stroke="#d9c7b2"
              strokeWidth="1.5"
            />

            {/* 濕食佐餐扇形區塊（依 wetPercent 動態縮放） */}
            {wetPercent > 0 && (
              <g>
                <circle
                  cx="132"
                  cy="115"
                  r={Math.min(60, 22 + wetPercent * 0.6)}
                  fill="#d97b59"
                  opacity="0.88"
                />
                <circle
                  cx="122"
                  cy="106"
                  r={Math.min(34, 10 + wetPercent * 0.35)}
                  fill="#e89a78"
                  opacity="0.75"
                />
                {/* 南瓜與草本點綴 */}
                <circle cx="142" cy="122" r="5" fill="#e6b44c" />
                <circle cx="120" cy="126" r="4" fill="#6b8e63" />
                <circle cx="145" cy="105" r="3.5" fill="#6b8e63" />
              </g>
            )}

            {/* 慢焙乾糧顆粒（依乾糧比例動態分布） */}
            {Array.from({ length: kibbleDotsCount }).map((_, idx) => {
              const angle = (idx / kibbleDotsCount) * Math.PI * 2;
              const radius =
                wetPercent > 35
                  ? 44 + (idx % 2) * 11
                  : 18 + (idx % 3) * 16;
              const kx = 132 + Math.cos(angle) * radius;
              const ky = 115 + Math.sin(angle) * radius;
              return (
                <g key={idx}>
                  <circle
                    cx={kx}
                    cy={ky}
                    r="6.2"
                    fill="#7c4b30"
                    stroke="#59331e"
                    strokeWidth="1"
                  />
                  <circle cx={kx - 1.5} cy={ky - 1.5} r="1.5" fill="#b57d5c" />
                </g>
              );
            })}

            {/* 右側：清泉陶瓷飲水盅 */}
            <circle
              cx="284"
              cy="115"
              r="54"
              fill="#fffdf8"
              stroke="#8c6d50"
              strokeWidth="2.5"
            />
            <circle
              cx="284"
              cy="115"
              r="44"
              fill="#dfeff6"
              stroke="#b4d3e0"
              strokeWidth="1.5"
            />
            {/* 水波紋 */}
            <circle
              cx="284"
              cy="115"
              r="28"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeDasharray="6 4"
              opacity="0.8"
            />
            <circle
              cx="274"
              cy="102"
              r="6"
              fill="#ffffff"
              opacity="0.65"
            />

            {/* 碗底標籤 */}
            <text
              x="132"
              y="204"
              textAnchor="middle"
              fill="#5a432e"
              fontSize="10"
              fontWeight="bold"
            >
              乾糧 {dryGrams}g ＋ 濕食 {wetGrams}g
            </text>
            <text
              x="284"
              y="184"
              textAnchor="middle"
              fill="#3d6375"
              fontSize="10"
              fontWeight="bold"
            >
              全日飲水 {drinkingGoalMl}ml
            </text>
          </svg>

          {/* 乾濕食熱量配比拖曳滑桿 */}
          <div className="mt-3 w-full rounded-xl border border-[#dfd0be] bg-white p-3.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#302b26]">
              <span>拖曳調整本餐「乾糧 vs 鮮肉濕食」熱量配比</span>
              <span className="font-mono text-[#935941]">
                乾糧 {100 - wetPercent}% / 濕食 {wetPercent}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={65}
              step={5}
              value={wetPercent}
              onChange={(e) => setWetPercent(Number(e.target.value))}
              aria-label="調整乾濕食配比"
              className="mt-2.5 h-2 w-full cursor-pointer accent-[#935941]"
            />
            <div className="mt-1 flex justify-between font-mono text-[10px] text-[#8a7a6a]">
              <span>0% 純乾糧定食</span>
              <span>30% 黃金混搭</span>
              <span>65% 濕食高補水</span>
            </div>
          </div>
        </div>

        {/* 右欄：本餐精算克數、推薦雙品與一鍵加購 */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#e3d3c0] bg-[#fffaf2] p-4">
            <p className="font-mono text-[11px] font-bold tracking-wider text-[#935941]">
              TIME SLOT NOTE · {currentSlot.time} 職人餵食手記
            </p>
            <p className="mt-1 text-xs leading-6 text-[#594b3e] sm:text-sm">
              {currentSlot.note}
            </p>
          </div>

          {/* 三格量化克數指標 */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-2xl border border-[#e5d6c4] bg-white p-3.5">
              <span className="flex items-center gap-1 text-[11px] font-bold text-[#7c6a58]">
                <Scale size={12} className="text-[#935941]" />
                本餐主食乾糧
              </span>
              <p className="mt-1.5 font-mono text-2xl font-bold text-[#302b26]">
                {dryGrams}
                <span className="ml-0.5 text-xs font-normal">g</span>
              </p>
              <span className="mt-0.5 block truncate text-[10px] text-[#8a7a6a]">
                約 {dryKcal} kcal ({safeDry?.name || "主食糧"})
              </span>
            </div>

            <div className="rounded-2xl border border-[#e5d6c4] bg-white p-3.5">
              <span className="flex items-center gap-1 text-[11px] font-bold text-[#7c6a58]">
                <Flame size={12} className="text-[#c86446]" />
                本餐濕食佐餐
              </span>
              <p className="mt-1.5 font-mono text-2xl font-bold text-[#935941]">
                {wetGrams}
                <span className="ml-0.5 text-xs font-normal">g</span>
              </p>
              <span className="mt-0.5 block truncate text-[10px] text-[#8a7a6a]">
                約 {wetKcal} kcal ({safeWet?.name || "鮮食佐餐"})
              </span>
            </div>

            <div className="rounded-2xl border border-[#cfe0d8] bg-[#f3f8f6] p-3.5">
              <span className="flex items-center gap-1 text-[11px] font-bold text-[#3b6254]">
                <Droplets size={12} className="text-[#3b6254]" />
                餐點含水與飲水
              </span>
              <p className="mt-1.5 font-mono text-2xl font-bold text-[#2b4c40]">
                +{foodMoistureMl}
                <span className="ml-0.5 text-xs font-normal">ml</span>
              </p>
              <span className="mt-0.5 block truncate text-[10px] text-[#53786a]">
                由濕食自然攝取水分
              </span>
            </div>
          </div>

          {/* 推薦搭配雙品與一鍵飛入購物籃 */}
          <div className="rounded-2xl border border-[#dfd0be] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold text-[#935941]">
                  本時段安全適配雙件組（已排除 {pet.name} 過敏原）
                </span>
                <p className="mt-0.5 text-sm font-bold text-[#302b26]">
                  {safeDry?.name}
                  {wetPercent > 0 && safeWet ? ` ＋ ${safeWet.name}` : ""}
                </p>
              </div>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleAddMealCombo}
                className="btn-tactile inline-flex items-center gap-2 bg-[#935941] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#7d4934]"
              >
                <ShoppingBag size={14} />
                將本時段配餐組合飛入購物籃
                <Sparkles size={13} />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
