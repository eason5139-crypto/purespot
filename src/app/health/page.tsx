"use client";
import Link from "next/link";
import {
  Cat,
  Dog,
  Scale,
  CalendarDays,
  ShieldCheck,
  Calculator,
  Flame,
  Activity,
  HeartPulse,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { useActivePet } from "@/store/usePetContextStore";
import { useUiStore } from "@/store/useUiStore";
import { useCatalogStore } from "@/store/useCatalogStore";
import { matchProduct } from "@/lib/matching";
import { calculatePetNutrition } from "@/lib/nutritionCalculator";
import { Button } from "@/components/ui/button";
import { PetWeightTrendChart } from "@/components/analytics/PetWeightTrendChart";
import { petLabels, supportsFoodCalculator } from "@/lib/types";

export default function HealthPage() {
  const products = useCatalogStore((s) => s.products);
  const pet = useActivePet();
  const edit = useUiStore((s) => s.setPetEditorOpen);
  const calc = useUiStore((s) => s.openCalculator);

  if (!supportsFoodCalculator(pet.type)) return (
    <main id="main-content" className="page-shell py-16">
      <span className="eyebrow">毛孩生活檔案</span>
      <h1 className="mt-3 text-3xl font-semibold">{pet.name}的日常</h1>
      <p className="mt-5 max-w-xl leading-8 text-slate-400">{petLabels[pet.type]}的飲食需求與貓狗不同，因此這裡不套用貓狗熱量公式。你仍可管理牠的資料，並挑選適合的食物與用品。</p>
      <div className="mt-7 flex gap-3"><Button onClick={() => edit(true)}>編輯毛孩資料</Button><Link href="/shop" className="inline-flex min-h-11 items-center rounded-lg border border-white/20 px-5 text-sm">逛逛適用選物</Link></div>
    </main>
  );

  const defaultProduct = products[0]!;
  const matchedProduct =
    products.find((p) => matchProduct(p, pet).safe) ?? defaultProduct;

  const Icon = pet.type === "CAT" ? Cat : Dog;

  // 營養學公式計算：RER 與 DER
  let nutrition = null;
  try {
    nutrition = calculatePetNutrition(
      {
        petType: pet.type,
        weightKg: pet.weightKg,
        ageMonths: pet.ageMonths,
        isNeutered: pet.isNeutered,
        activityLevel: pet.activityLevel,
        isWeightLossGoal: pet.goal === "WEIGHT_LOSS",
        foodKcalPer100g: matchedProduct.kcalPer100g,
      },
      matchedProduct.bagGrams,
      matchedProduct.priceNt,
    );
  } catch {
    nutrition = null;
  }

  const activityLabels: Record<string, string> = {
    SEDENTARY: "低活動量 / 室內休閒",
    MODERATE: "正常活動量 / 每日散步",
    HIGH: "高活動量 / 戶外奔跑",
    ATHLETIC: "工作犬 / 極高耗能",
  };

  return (
    <main id="main-content" className="page-shell py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow flex items-center gap-1.5">
            <HeartPulse size={14} />
            健康指標分析
          </span>
          <h1 className="mt-2 text-3xl font-semibold">{pet.name}的健康儀表板</h1>
          <p className="mt-2 text-slate-400">
            結合生理特徵、能量代謝公式與即時體態監控。
          </p>
        </div>

        <Button variant="secondary" onClick={() => edit(true)}>
          編輯毛孩資料
        </Button>
      </div>

      {/* 核心生理卡片 */}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="panel p-6"
        >
          <div className="flex items-center justify-between">
            <Icon size={28} className="text-cyan-300" />
            <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-slate-400">
              {pet.type === "CAT" ? "貓咪" : "狗狗"}
            </span>
          </div>
          <h2 className="mt-4 text-lg font-semibold">{pet.name}</h2>
          <p className="mt-1 text-sm text-slate-400">
            {pet.breed} · {pet.isNeutered ? "已結紮" : "未結紮"}
          </p>
          <p className="mt-4 text-xs text-slate-500">
            目標：{pet.goal === "WEIGHT_LOSS" ? "健康減重" : "體重維持"}
          </p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="panel p-6"
        >
          <div className="flex items-center justify-between">
            <Scale size={28} className="text-cyan-300" />
            <span className="rounded-md bg-cyan-400/10 px-2 py-0.5 text-xs text-cyan-300">
              最新紀錄
            </span>
          </div>
          <p className="mt-4 text-xs text-slate-400">目前體重</p>
          <p className="mt-1 font-mono text-3xl font-semibold">
            {pet.weightKg}
            <span className="ml-1.5 text-sm font-normal text-slate-400">公斤</span>
          </p>
          <p className="mt-4 text-xs text-slate-500">
            活動度：{activityLabels[pet.activityLevel] || "標準"}
          </p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="panel p-6"
        >
          <div className="flex items-center justify-between">
            <CalendarDays size={28} className="text-amber-300" />
            <span className="rounded-md bg-amber-400/10 px-2 py-0.5 text-xs text-amber-300">
              生理年齡
            </span>
          </div>
          <p className="mt-4 text-xs text-slate-400">陪伴的日子</p>
          <p className="mt-1 font-mono text-3xl font-semibold">
            {Math.floor(pet.ageMonths / 12)}
            <span className="mx-1 text-sm font-normal text-slate-400">歲</span>
            {pet.ageMonths % 12}
            <span className="text-sm font-normal text-slate-400">個月</span>
          </p>
          <p className="mt-4 text-xs text-slate-500">
            生長階段：
            {pet.ageMonths < 12
              ? "幼年成長期"
              : pet.ageMonths >= 84
                ? "高齡熟齡期"
                : "成犬成貓期"}
          </p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="panel p-6"
        >
          <div className="flex items-center justify-between">
            <Flame size={28} className="text-emerald-300" />
            <span className="rounded-md bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-300">
              代謝基準 (DER)
            </span>
          </div>
          <p className="mt-4 text-xs text-slate-400">每日建議攝取</p>
          <p className="mt-1 font-mono text-3xl font-semibold text-emerald-300">
            {nutrition ? Math.round(nutrition.der) : "—"}
            <span className="ml-1.5 text-sm font-normal text-slate-400">kcal</span>
          </p>
          <p className="mt-4 text-xs text-slate-500">
            靜止能量 (RER): {nutrition ? Math.round(nutrition.rer) : "—"} kcal
          </p>
        </motion.section>
      </div>

      {/* TradingView Lightweight Charts 體重走勢圖 */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        className="mt-8"
      >
        <PetWeightTrendChart
          petName={pet.name}
          currentWeightKg={pet.weightKg}
          goal={pet.goal}
        />
      </motion.div>

      {/* 營養建議與食量試算 */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25 }}
          className="panel p-7"
        >
          <div className="flex items-center gap-2">
            <Activity size={20} className="text-cyan-300" />
            <h2 className="text-lg font-semibold">專屬配糧與代謝分析</h2>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            依據 FEDIAF 與 WSAVA 營養指引，精準匹配日常能量耗損。
          </p>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-white/5 p-4">
              <div>
                <p className="text-sm font-medium">每日建議乾糧克數</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  以目前適配商品 {matchedProduct.name} 計算
                </p>
              </div>
              <span className="font-mono text-2xl font-bold text-cyan-300">
                {nutrition ? Math.round(nutrition.dailyGrams) : "—"}{" "}
                <span className="text-sm font-normal text-slate-400">克 / 天</span>
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-white/5 p-4">
              <div>
                <p className="text-sm font-medium">單包建議食用天數</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  規格：{matchedProduct.bagGrams / 1000} 公斤裝
                </p>
              </div>
              <span className="font-mono text-2xl font-bold text-slate-200">
                {nutrition ? Math.round(nutrition.bagDurationDays) : "—"}{" "}
                <span className="text-sm font-normal text-slate-400">天</span>
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-white/5 p-4">
              <div>
                <p className="text-sm font-medium">循環補貨週期推薦</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  預留緩衝天數，避免斷糧
                </p>
              </div>
              <span className="font-mono text-2xl font-bold text-emerald-300">
                每 {nutrition?.recommendedIntervalDays ?? 28}{" "}
                <span className="text-sm font-normal text-slate-400">天一配送</span>
              </span>
            </div>
          </div>

          <Button
            className="mt-6 w-full"
            onClick={() => calc(matchedProduct.id)}
          >
            <Calculator />
            開啟精準營養計算機
          </Button>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.3 }}
          className="panel p-7"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-emerald-300" />
            <h2 className="text-lg font-semibold">飲食偏好與過敏原過濾</h2>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            全站商品皆依據 {pet.name} 的飲食限制進行自動安全標註。
          </p>

          <div className="my-6">
            <p className="text-xs text-slate-400">已登錄之過敏原項目</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {pet.allergies.length ? (
                pet.allergies.map((a) => (
                  <span
                    key={a}
                    className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3.5 py-1.5 text-sm font-medium text-amber-200"
                  >
                    避開 {a}
                  </span>
                ))
              ) : (
                <span className="rounded-lg bg-white/5 px-3 py-1.5 text-sm text-slate-400">
                  尚未設定過敏原
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <Sparkles size={16} className="text-cyan-300" />
              目前最適配商品
            </div>
            <p className="mt-2 text-sm text-slate-300">
              {matchedProduct.name} ({matchedProduct.subtitle})
            </p>
            <p className="mt-1 text-xs text-slate-400">
              粗蛋白保證值 {matchedProduct.proteinMin}% · 熱量{" "}
              {matchedProduct.kcalPer100g} kcal/100g
            </p>
          </div>

          <p className="mt-6 text-xs leading-6 text-slate-500">
            提示：若毛孩體重、活動量或健康目標有調整，請隨時點選「編輯毛孩資料」或更新配糧試算，系統將自動同步購物袋與補貨建議。
          </p>
        </motion.section>
      </div>
    </main>
  );
}
