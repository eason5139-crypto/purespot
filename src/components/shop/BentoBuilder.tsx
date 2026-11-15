"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Dices,
  Plus,
  Scale,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useActivePet } from "@/store/usePetContextStore";
import { useCatalogStore } from "@/store/useCatalogStore";
import { useCartStore } from "@/store/useCartStore";
import { matchProduct } from "@/lib/matching";
import { triggerFlyToCart } from "@/lib/flyToCart";
import { money } from "@/lib/utils";
import { petLabels, type Product } from "@/lib/types";
import { BentoWoodBoxSvg } from "@/components/ui/CraftEmblems";

export function BentoBuilder() {
  const pet = useActivePet();
  const products = useCatalogStore((s) => s.products);
  const addItem = useCartStore((s) => s.addItem);

  // 篩選出對目前毛孩安全且有庫存的商品
  const safeProducts = useMemo(
    () => products.filter((p) => p.stock > 0 && matchProduct(p, pet).safe),
    [products, pet],
  );

  // 分成三個曲木配餐格候選池
  const mainPool = useMemo(
    () =>
      safeProducts.filter(
        (p) =>
          (p.kind ?? "FOOD") === "FOOD" &&
          (p.category.includes("主食") ||
            p.category.includes("乾糧") ||
            p.category.includes("鮮食") ||
            p.kcalPer100g >= 300),
      ),
    [safeProducts],
  );

  const sidePool = useMemo(() => {
    const foodExtras = safeProducts.filter(
      (p) =>
        (p.kind ?? "FOOD") === "FOOD" &&
        !mainPool.some((m) => m.id === p.id),
    );
    return foodExtras.length > 0 ? foodExtras : safeProducts.slice(0, 6);
  }, [safeProducts, mainPool]);

  const treatPool = useMemo(() => {
    const supplies = safeProducts.filter((p) => p.kind === "SUPPLIES");
    return supplies.length > 0 ? supplies : safeProducts.slice(-6);
  }, [safeProducts]);

  const [mainId, setMainId] = useState<string | null>(null);
  const [sideId, setSideId] = useState<string | null>(null);
  const [treatId, setTreatId] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<"main" | "side" | "treat">(
    "main",
  );

  // 當毛孩切換時，自動預選一組預設配餐盒
  useEffect(() => {
    setMainId(mainPool[0]?.id ?? safeProducts[0]?.id ?? null);
    setSideId(sidePool[0]?.id ?? safeProducts[1]?.id ?? null);
    setTreatId(treatPool[0]?.id ?? safeProducts[2]?.id ?? null);
  }, [pet.id, mainPool, sidePool, treatPool, safeProducts]);

  const selectedMain = safeProducts.find((p) => p.id === mainId) ?? null;
  const selectedSide = safeProducts.find((p) => p.id === sideId) ?? null;
  const selectedTreat = safeProducts.find((p) => p.id === treatId) ?? null;

  const selectedList = [selectedMain, selectedSide, selectedTreat].filter(
    (item): item is Product => item !== null,
  );
  const filledCount = selectedList.length;
  const totalNt = selectedList.reduce((sum, p) => sum + p.priceNt, 0);

  // 營養天秤配比計算
  const proteinRatio = useMemo(() => {
    const foods = [selectedMain, selectedSide].filter(
      (p): p is Product => p !== null && p.kind !== "SUPPLIES",
    );
    if (!foods.length) return 42;
    const avg =
      foods.reduce((acc, f) => acc + (f.proteinMin || 32), 0) / foods.length;
    return Math.min(98, Math.max(55, Math.round(avg * 2.1)));
  }, [selectedMain, selectedSide]);

  const energyScore = useMemo(() => {
    const kcal = selectedMain?.kcalPer100g || 360;
    return Math.min(96, Math.max(58, Math.round((kcal / 420) * 86)));
  }, [selectedMain]);

  const enrichmentScore = selectedTreat ? 96 : filledCount === 2 ? 72 : 45;

  const reaction =
    filledCount === 3
      ? {
          score: 100,
          text: `${pet.name} 三格配比完整：兼具主食營養、風味佐餐與日常互動需求。`,
          color: "bg-[#4e6752] text-white",
        }
      : filledCount === 2
        ? {
            score: 82,
            text: `飲食結構已完整，可再搭配第三格居家器物使整套照護更全面。`,
            color: "bg-[#935941] text-white",
          }
        : {
            score: 55,
            text: `點選左側杉木格位，為 ${pet.name} 逐項組合專屬旬食餐盤。`,
            color: "bg-[#d49b4b] text-[#302b26]",
          };

  function handleRandomize() {
    if (mainPool.length) {
      const rMain = mainPool[Math.floor(Math.random() * mainPool.length)];
      if (rMain) setMainId(rMain.id);
    }
    if (sidePool.length) {
      const rSide = sidePool[Math.floor(Math.random() * sidePool.length)];
      if (rSide) setSideId(rSide.id);
    }
    if (treatPool.length) {
      const rTreat = treatPool[Math.floor(Math.random() * treatPool.length)];
      if (rTreat) setTreatId(rTreat.id);
    }
    toast.success(`已為 ${pet.name} 重新編排一組旬食配餐盒`);
  }

  function handleAddBentoToCart(event: React.MouseEvent<HTMLButtonElement>) {
    if (selectedList.length === 0) return;
    const btnEl = event.currentTarget;
    let addedCount = 0;

    selectedList.forEach((prod, index) => {
      try {
        addItem({
          productId: prod.id,
          petId: pet.id,
          quantity: 1,
          mode: "ONCE",
          intervalDays: null,
        });
        addedCount++;
        triggerFlyToCart(btnEl, {
          image: prod.image,
          label: prod.name,
          delayMs: index * 140,
        });
      } catch {
        // 略過超買或庫存限制
      }
    });

    if (addedCount > 0) {
      toast.success(
        `已將 ${pet.name} 的「旬食木盒組合 (${addedCount} 件)」封裝納入購物籃`,
      );
    } else {
      toast.error("組合商品目前無法加入，請確認庫存");
    }
  }

  const currentPool =
    activeSlot === "main"
      ? mainPool
      : activeSlot === "side"
        ? sidePool
        : treatPool;
  const currentSelectedId =
    activeSlot === "main"
      ? mainId
      : activeSlot === "side"
        ? sideId
        : treatId;

  function selectFromPool(id: string) {
    if (activeSlot === "main") setMainId(id);
    else if (activeSlot === "side") setSideId(id);
    else setTreatId(id);
  }

  return (
    <section
      id="bento-builder"
      aria-labelledby="bento-heading"
      className="craft-letterpress my-12 scroll-mt-28 rounded-[2.2rem] p-6 sm:p-9"
    >
      {/* 標題與隨機搭配按鈕 */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e4d5c3] pb-5">
        <div className="flex items-start gap-3.5">
          <div className="hidden rounded-2xl border border-[#e2d0ba] bg-[#faf2e6] p-2.5 sm:block">
            <BentoWoodBoxSvg size={38} />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#935941]/12 px-3 py-1 font-mono text-[11px] font-bold tracking-wider text-[#935941]">
              CUSTOM MEAL TRAY ・ 日台工藝生活組配
            </span>
            <h2
              id="bento-heading"
              className="editorial-title mt-2 text-2xl font-bold text-[#302b26] sm:text-4xl"
            >
              曲木三格・旬食配餐盒：{pet.name} 的專屬搭配
            </h2>
            <p className="mt-1 text-xs text-[#6e5e50] sm:text-sm">
              已依 {petLabels[pet.type]} 體質與過敏原預先篩選，自由挑選「壹・主食基底」、「貳・原肉佐餐」與「參・日常器物」。
            </p>
          </div>
        </div>

        <motion.button
          type="button"
          whileHover={{ scale: 1.03, rotate: -1 }}
          whileTap={{ scale: 0.95, rotate: 3 }}
          onClick={handleRandomize}
          className="inline-flex items-center gap-2 rounded-2xl border-2 border-[#935941] bg-[#fffaf2] px-4 py-2.5 text-xs font-bold text-[#935941] shadow-[0_3px_0_#935941] transition-colors hover:bg-[#fdf2e4]"
        >
          <Dices size={16} />
          職人隨機試配
        </motion.button>
      </div>

      {/* 主體：左邊杉木三格配餐盤 + 右邊選品與營養天秤 */}
      <div className="mt-6 grid gap-7 lg:grid-cols-[1.08fr_0.92fr]">
        {/* 左側：溫潤曲木三格餐盤 */}
        <div className="rounded-[1.8rem] border-4 border-[#c9a986] bg-[#e9d5bc] p-4 shadow-inner sm:p-5">
          <div className="mb-3 flex items-center justify-between px-1">
            <span className="font-serif text-xs font-bold tracking-wider text-[#5c3e27]">
              {pet.name} 專用杉木配餐盤（點選格位更換品項）
            </span>
            <span
              className={`rounded-full px-3 py-0.5 font-mono text-xs font-bold shadow-2xs ${reaction.color}`}
            >
              適配完整度 {reaction.score}%
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1.15fr_0.85fr]">
            {/* 壹・主食基底 */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              onClick={() => setActiveSlot("main")}
              className={`relative flex min-h-[235px] cursor-pointer flex-col justify-between rounded-2xl border-2 p-4 transition-all ${
                activeSlot === "main"
                  ? "border-[#935941] bg-[#fffdf9] ring-4 ring-[#935941]/15"
                  : "border-[#d8bfa3] bg-[#faf4eb] hover:bg-[#fffdf9]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="rounded-lg bg-[#935941] px-2.5 py-0.5 text-[11px] font-bold text-white">
                  壹 · 主食基底
                </span>
                {selectedMain && (
                  <button
                    type="button"
                    aria-label="移除主食"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMainId(null);
                    }}
                    className="rounded-full p-1 text-[#8a7a6b] hover:bg-[#f2e8dc]"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <AnimatePresence mode="wait">
                {selectedMain ? (
                  <motion.div
                    key={selectedMain.id}
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.85, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 360, damping: 22 }}
                    className="my-2 flex flex-col items-center text-center"
                  >
                    <div className="relative size-28 overflow-hidden rounded-2xl bg-[#f4ece1] p-2">
                      <Image
                        src={selectedMain.image}
                        alt={selectedMain.name}
                        fill
                        sizes="112px"
                        className="object-contain p-1"
                      />
                    </div>
                    <p className="mt-2.5 text-sm font-bold text-[#302b26]">
                      {selectedMain.name}
                    </p>
                    <p className="font-mono text-xs font-semibold text-[#935941]">
                      {money(selectedMain.priceNt)}
                    </p>
                  </motion.div>
                ) : (
                  <div className="my-auto py-8 text-center text-xs text-[#8c7865]">
                    + 點擊於右側挑選主食基底
                  </div>
                )}
              </AnimatePresence>

              <span className="text-center text-[11px] font-medium text-[#7e6d5d]">
                {activeSlot === "main" ? "正在檢視主食基底池" : "點擊切換此格"}
              </span>
            </motion.div>

            {/* 右側上下兩格：貳・原肉佐餐 + 參・日常器物 */}
            <div className="grid gap-3">
              <motion.div
                whileHover={{ scale: 1.01 }}
                onClick={() => setActiveSlot("side")}
                className={`relative flex min-h-[112px] cursor-pointer flex-col justify-between rounded-2xl border-2 p-3.5 transition-all ${
                  activeSlot === "side"
                    ? "border-[#4e6752] bg-[#fffdf9] ring-4 ring-[#4e6752]/15"
                    : "border-[#d8bfa3] bg-[#faf4eb] hover:bg-[#fffdf9]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-[#4e6752] px-2 py-0.5 text-[10px] font-bold text-white">
                    貳 · 原肉佐餐
                  </span>
                  {selectedSide && (
                    <button
                      type="button"
                      aria-label="移除配菜"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSideId(null);
                      }}
                      className="rounded-full p-0.5 text-[#8a7a6b] hover:bg-[#f2e8dc]"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {selectedSide ? (
                    <motion.div
                      key={selectedSide.id}
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.85, opacity: 0 }}
                      className="mt-2 flex items-center gap-2.5"
                    >
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-[#f4ece1]">
                        <Image
                          src={selectedSide.image}
                          alt={selectedSide.name}
                          fill
                          sizes="56px"
                          className="object-contain p-1"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[#302b26]">
                          {selectedSide.name}
                        </p>
                        <p className="font-mono text-xs font-semibold text-[#4e6752]">
                          {money(selectedSide.priceNt)}
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <p className="py-3 text-center text-xs text-[#8c7865]">
                      + 點擊挑選凍乾或副食
                    </p>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.01 }}
                onClick={() => setActiveSlot("treat")}
                className={`relative flex min-h-[112px] cursor-pointer flex-col justify-between rounded-2xl border-2 p-3.5 transition-all ${
                  activeSlot === "treat"
                    ? "border-[#b5813a] bg-[#fffdf9] ring-4 ring-[#b5813a]/15"
                    : "border-[#d8bfa3] bg-[#faf4eb] hover:bg-[#fffdf9]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-[#b5813a] px-2 py-0.5 text-[10px] font-bold text-white">
                    參 · 日常器物
                  </span>
                  {selectedTreat && (
                    <button
                      type="button"
                      aria-label="移除器物"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTreatId(null);
                      }}
                      className="rounded-full p-0.5 text-[#8a7a6b] hover:bg-[#f2e8dc]"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {selectedTreat ? (
                    <motion.div
                      key={selectedTreat.id}
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.85, opacity: 0 }}
                      className="mt-2 flex items-center gap-2.5"
                    >
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-[#f4ece1]">
                        <Image
                          src={selectedTreat.image}
                          alt={selectedTreat.name}
                          fill
                          sizes="56px"
                          className="object-contain p-1"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[#302b26]">
                          {selectedTreat.name}
                        </p>
                        <p className="font-mono text-xs font-semibold text-[#935941]">
                          {money(selectedTreat.priceNt)}
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <p className="py-3 text-center text-xs text-[#8c7865]">
                      + 點擊挑選玩具或生活道具
                    </p>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>

          {/* 營養平衡天秤刻度條 */}
          <div className="mt-3.5 rounded-xl border border-[#d6c2a8] bg-[#fffdf9] p-3.5 shadow-2xs">
            <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-[#6e523e]">
              <span className="inline-flex items-center gap-1.5">
                <Scale size={13} className="text-[#935941]" />
                營養與生活平衡天秤
              </span>
              <span className="font-mono text-[#7c6a59]">
                {reaction.text}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2.5 text-[11px]">
              {[
                { label: "動物蛋白配比", val: proteinRatio, bar: "bg-[#935941]" },
                { label: "代謝熱量密度", val: energyScore, bar: "bg-[#4e6752]" },
                { label: "日常舒壓適配", val: enrichmentScore, bar: "bg-[#b5813a]" },
              ].map((m) => (
                <div key={m.label}>
                  <div className="mb-1 flex justify-between font-medium text-[#5c4e41]">
                    <span>{m.label}</span>
                    <span className="font-mono font-bold">{m.val}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#efe4d4]">
                    <motion.div
                      animate={{ width: `${m.val}%` }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className={`h-full rounded-full ${m.bar}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右側：格位候選清單與一鍵封裝 */}
        <div className="flex flex-col justify-between rounded-[1.8rem] border border-[#dfd0be] bg-[#fffdf9] p-5">
          <div>
            <div className="flex flex-wrap gap-1.5 border-b border-[#ece0d1] pb-3">
              {(
                [
                  { id: "main", label: "壹 · 更換主食基底" },
                  { id: "side", label: "貳 · 更換原肉佐餐" },
                  { id: "treat", label: "參 · 更換日常器物" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSlot(tab.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                    activeSlot === tab.id
                      ? "bg-[#935941] text-white shadow-xs"
                      : "bg-[#f4ece1] text-[#6d5c4e] hover:bg-[#eadbc9]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-3.5 grid max-h-[240px] grid-cols-2 gap-2.5 overflow-y-auto pr-1">
              {currentPool.slice(0, 8).map((item) => {
                const isSelected = currentSelectedId === item.id;
                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => selectFromPool(item.id)}
                    className={`flex items-center gap-2.5 rounded-xl border p-2 text-left transition-all ${
                      isSelected
                        ? "border-[#935941] bg-[#fdf3e7] shadow-2xs"
                        : "border-[#e6d8c8] bg-[#faf6f0] hover:border-[#c8b29b]"
                    }`}
                  >
                    <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-white">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="44px"
                        className="object-contain p-1"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-[#302b26]">
                        {item.name}
                      </p>
                      <p className="font-mono text-[11px] font-semibold text-[#935941]">
                        {money(item.priceNt)}
                      </p>
                    </div>
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded-full text-white ${
                        isSelected ? "bg-[#935941]" : "bg-[#dfd0be]"
                      }`}
                    >
                      {isSelected ? <Check size={11} /> : <Plus size={11} />}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 border-t border-[#ece0d1] pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-[#7c6d5f]">
                  已組合 {filledCount} 項旬食與道具
                </p>
                <p className="font-mono text-2xl font-bold text-[#302b26]">
                  {money(totalNt)}
                </p>
              </div>
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.94 }}
                disabled={filledCount === 0}
                onClick={handleAddBentoToCart}
                className="btn-tactile inline-flex items-center gap-2 bg-[#935941] px-6 py-3.5 text-sm font-bold text-white hover:bg-[#7d4934] disabled:opacity-40"
              >
                <ShoppingBag size={17} />
                整組封裝飛入購物籃
                <Sparkles size={15} />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
