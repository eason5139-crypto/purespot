"use client";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  Calculator,
  Repeat2,
  Info,
  ShieldCheck,
  TriangleAlert,
  Package,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useActivePet, usePetContextStore } from "@/store/usePetContextStore";
import { useCartStore } from "@/store/useCartStore";
import { useUiStore } from "@/store/useUiStore";
import {
  calculatePetNutrition,
  DELIVERY_INTERVALS,
  DELIVERY_BUFFER_DAYS,
} from "@/lib/nutritionCalculator";
import { getProduct } from "@/lib/catalog";
import { matchProduct } from "@/lib/matching";
import { decimal, money } from "@/lib/utils";
import type { IntervalDays } from "@/lib/types";
export function NutritionCalculatorModal() {
  const pet = useActivePet();
  const productId = useUiStore((s) => s.calculatorProductId);
  const close = useUiStore((s) => s.openCalculator);
  const openCart = useUiStore((s) => s.setCartOpen);
  const updatePet = usePetContextStore((s) => s.updatePet);
  const add = useCartStore((s) => s.addItem);
  const product = getProduct(productId ?? "");
  const [manualInterval, setManualInterval] = useState<IntervalDays | null>(
    null,
  );
  const calculation = useMemo(() => {
    if (!product) return { result: null, error: "找不到商品" };
    try {
      return {
        result: calculatePetNutrition(
          {
            petType: pet.type,
            weightKg: pet.weightKg,
            ageMonths: pet.ageMonths,
            isNeutered: pet.isNeutered,
            activityLevel: pet.activityLevel,
            isWeightLossGoal: pet.goal === "WEIGHT_LOSS",
            foodKcalPer100g: product.kcalPer100g,
          },
          product.bagGrams,
          product.priceNt,
        ),
        error: "",
      };
    } catch (e) {
      return {
        result: null,
        error: e instanceof Error ? e.message : "無法計算",
      };
    }
  }, [pet, product]);
  if (!product) return null;
  const { result, error } = calculation;
  const fit = matchProduct(product, pet);
  const interval = manualInterval ?? result?.recommendedIntervalDays ?? 14;
  const bags = result
    ? Math.max(
        1,
        Math.ceil((interval + DELIVERY_BUFFER_DAYS) / result.bagDurationDays),
      )
    : 0;
  function queue() {
    if (!result || !product || !fit.safe) return;
    try {
      add({
        productId: product.id,
        petId: pet.id,
        quantity: bags,
        mode: "AUTOSHIP",
        intervalDays: interval,
      });
      close(null);
      openCart(true);
      toast.success(`已加入每 ${interval} 天 ${bags} 包的循環補貨選購`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "無法加入購物車");
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close(null);
      }}
    >
      <DialogContent>
        <div className="mb-5 flex items-center gap-3">
          <span className="rounded-xl bg-cyan-400/10 p-3 text-cyan-300">
            <Calculator />
          </span>
          <div>
            <DialogTitle className="pr-10 text-2xl font-semibold">
              {pet.name}的專屬配糧計畫
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-slate-400">
              滑一下，找到每天剛剛好的份量。
            </DialogDescription>
          </div>
        </div>
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.025] p-3">
          <Image
            src={product.image}
            alt="商品包裝概念示意"
            width={64}
            height={64}
            className="rounded-xl"
          />
          <div className="flex-1">
            <p className="font-medium">{product.name}</p>
            <p className="mt-1 text-xs text-slate-400">
              {product.bagGrams / 1000} 公斤 / 包 · {product.kcalPer100g} 大卡 /
              100 克
            </p>
          </div>
          <span className="font-mono text-cyan-300">
            {money(Math.round(product.priceNt * 0.9))}
            <span className="block text-right text-xs text-slate-500">
              循環價 / 包
            </span>
          </span>
        </div>
        <div className="grid gap-7 md:grid-cols-2">
          <div>
            <div className="flex items-center justify-between">
              <label id="weight-label" className="text-sm text-slate-300">
                目前體重
              </label>
              <span className="font-mono text-3xl text-cyan-300">
                {decimal(pet.weightKg)}
                <span className="ml-1 text-sm text-slate-400">公斤</span>
              </span>
            </div>
            <Slider
              aria-labelledby="weight-label"
              aria-label="毛孩體重"
              className="my-4"
              min={0.5}
              max={pet.type === "CAT" ? Math.max(15, pet.weightKg) : 90}
              step={0.1}
              value={[pet.weightKg]}
              onValueChange={(values) => {
                const weightKg = values[0];
                if (weightKg !== undefined) {
                  updatePet(pet.id, { weightKg });
                  setManualInterval(null);
                }
              }}
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>0.5 公斤</span>
              <span>
                {pet.type === "CAT" ? Math.max(15, pet.weightKg) : 90} 公斤
              </span>
            </div>
            <label className="field-label mt-5">
              目前狀態
              <select
                className="input"
                value={pet.activityLevel}
                onChange={(e) => {
                  updatePet(pet.id, {
                    activityLevel: e.target.value as typeof pet.activityLevel,
                  });
                  setManualInterval(null);
                }}
              >
                <option value="SEDENTARY">悠閒少動</option>
                <option value="MODERATE">一般活動</option>
                <option value="HIGH">活潑好動</option>
                <option value="ATHLETIC">高強度活動</option>
              </select>
            </label>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-cyan-400"
                checked={pet.isNeutered}
                onChange={(e) =>
                  updatePet(pet.id, { isNeutered: e.target.checked })
                }
              />
              已結紮
            </label>
            <div className="mt-5 rounded-xl bg-cyan-400/5 p-3 text-xs leading-6 text-slate-400">
              <Info size={14} className="mb-1 text-cyan-300" />
              靜止熱量 = 70 × 體重⁰·⁷⁵
              <br />
              每日需求 = 靜止熱量 × {result?.factor ?? "—"}
              <br />
              依毛孩年齡、結紮與活動狀態選用係數。
            </div>
          </div>
          <div className="space-y-3">
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5">
              <p className="text-sm text-cyan-100">每日建議餵食</p>
              <motion.p
                key={Math.round(result?.dailyGrams ?? 0)}
                initial={{ opacity: 0.6, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 font-mono text-5xl text-cyan-300"
                data-testid="daily-grams"
              >
                {result ? decimal(result.dailyGrams, 0) : "—"}
                <span className="ml-2 font-sans text-sm text-slate-400">
                  克
                </span>
              </motion.p>
              <p className="mt-2 text-xs text-slate-400">
                約 {result ? decimal(result.der, 0) : "—"} 大卡 / 日
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 p-4">
                <Package size={16} className="mb-2 text-slate-500" />
                <p className="text-xs text-slate-400">每月消耗</p>
                <p className="mt-1 text-xl">
                  {result ? decimal(result.monthlyBagCount) : "—"}
                  <span className="ml-1 text-xs text-slate-400">包</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">以 30 天估算</p>
              </div>
              <div className="rounded-xl border border-white/10 p-4">
                <CalendarDays size={16} className="mb-2 text-slate-500" />
                <p className="text-xs text-slate-400">日均花費</p>
                <p className="mt-1 text-xl text-emerald-300">
                  {result ? money(result.autoshipDailyCostNt) : "—"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  原價 {result ? money(result.dailyCostEstimateNt) : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
        {error && (
          <p role="alert" className="mt-4 text-sm text-rose-300">
            {error}
          </p>
        )}
        <div className="mt-6 border-t border-white/10 pt-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">適合你的補貨節奏</h3>
            <span className="text-xs text-emerald-300">預留 3 天緩衝</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {DELIVERY_INTERVALS.map((days) => (
              <Button
                key={days}
                variant={interval === days ? "default" : "secondary"}
                onClick={() => setManualInterval(days)}
                aria-pressed={interval === days}
              >
                {days / 7} 週
              </Button>
            ))}
          </div>
          <p className="mt-3 text-sm text-slate-400">
            每 {interval} 天配送{" "}
            <strong className="text-white">{bags} 包</strong>，每期商品金額{" "}
            <strong className="text-white">
              {money(Math.round(product.priceNt * 0.9) * bags)}
            </strong>
            。
            {result && (
              <span>單包約吃 {decimal(result.bagDurationDays, 0)} 天。</span>
            )}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            包裝整數進位可能累積餘量，可依實際庫存順延；運費於購物車計算。
          </p>
          <div
            className={`my-4 flex items-center gap-2 text-sm ${fit.safe ? "text-emerald-300" : "text-amber-300"}`}
          >
            {fit.safe ? <ShieldCheck size={16} /> : <TriangleAlert size={16} />}
            {fit.label}
          </div>
          <Button
            className="w-full"
            size="lg"
            onClick={queue}
            disabled={!result || !fit.safe || bags > product.stock}
          >
            <Repeat2 />
            依此週期設定自動循環補貨（享 9 折）
          </Button>
          <p className="mt-3 text-center text-xs leading-5 text-slate-500">
            以上是健康毛孩的飲食起始估算；疾病、孕哺與減重需求請由獸醫評估。加入購物車不會立即扣款。
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
