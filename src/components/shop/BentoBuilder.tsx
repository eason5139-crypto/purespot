"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Dices,
  Plus,
  ShoppingBag,
  Sparkles,
  Utensils,
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

export function BentoBuilder() {
  const pet = useActivePet();
  const products = useCatalogStore((s) => s.products);
  const addItem = useCartStore((s) => s.addItem);

  // 篩選出對目前毛孩安全且有庫存的商品
  const safeProducts = useMemo(
    () => products.filter((p) => p.stock > 0 && matchProduct(p, pet).safe),
    [products, pet],
  );

  // 分成三個便當格候選池
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
  const [activeSlot, setActiveSlot] = useState<"main" | "side" | "treat">("main");

  // 當毛孩切換時，自動幫牠預選一組預設便當
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

  const reaction =
    filledCount === 3
      ? {
          score: 100,
          emoji: "😻",
          text: `${pet.name} 呼嚕嚕滿分！「這盒便當有飯有肉又有得玩，老闆快買單！」`,
          color: "bg-[#4e6752] text-white",
        }
      : filledCount === 2
        ? {
            score: 82,
            emoji: "✨",
            text: `${pet.name} 眼睛發亮！「再多選一格飯後小確幸就完美囉～」`,
            color: "bg-[#935941] text-white",
          }
        : {
            score: 55,
            emoji: "🐾",
            text: `點擊下方便當格，幫 ${pet.name} 搭配專屬的一日營養便當！`,
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
    toast.success(`🎲 已為 ${pet.name} 隨機搖出一盒驚喜便當！`);
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
        // 略過超買或重複限制
      }
    });

    if (addedCount > 0) {
      toast.success(
        `🍱 已將 ${pet.name} 的「專屬便當 (${addedCount} 件)」打包飛進菜籃！`,
      );
    } else {
      toast.error("便當商品無法加入，請檢查庫存");
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
      className="my-12 scroll-mt-28 rounded-[2.2rem] border-2 border-[#dccab5] bg-[linear-gradient(135deg,#fffcf7_0%,#f5ebdd_100%)] p-6 shadow-[0_24px_60px_-32px_rgba(110,72,48,0.22),0_6px_0_#dfd0be] sm:p-9"
    >
      {/* 標題與隨機按鈕 */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e4d5c3] pb-5">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#935941]/12 px-3 py-1 text-xs font-bold text-[#935941]">
            <Utensils size={13} />
            台灣柑仔店原創互動・毛孩便當自由配
          </span>
          <h2
            id="bento-heading"
            className="editorial-title mt-2 text-2xl font-bold text-[#302b26] sm:text-4xl"
          >
            幫 {pet.name} 包一盒今日命定便當 🍱
          </h2>
          <p className="mt-1 text-xs text-[#6e5e50] sm:text-sm">
            已自動過濾 {petLabels[pet.type]} 適配與過敏原，點選三格自由搭配主食、加菜與飯後小確幸！
          </p>
        </div>

        <motion.button
          type="button"
          whileHover={{ scale: 1.04, rotate: -2 }}
          whileTap={{ scale: 0.94, rotate: 6 }}
          onClick={handleRandomize}
          className="inline-flex items-center gap-2 rounded-2xl border-2 border-[#935941] bg-[#fffaf2] px-4 py-2.5 text-xs font-bold text-[#935941] shadow-[0_3px_0_#935941] transition-colors hover:bg-[#fdf2e4]"
        >
          <Dices size={16} />
          手氣搖一搖・隨機配一盒
        </motion.button>
      </div>

      {/* 主體：左邊木質便當盒三格 + 右邊食材候選盤 */}
      <div className="mt-6 grid gap-7 lg:grid-cols-[1.08fr_0.92fr]">
        {/* 左側：木質便當盒 */}
        <div className="rounded-[1.8rem] border-4 border-[#c9a986] bg-[#e9d5bc] p-4 shadow-inner sm:p-5">
          <div className="mb-3 flex items-center justify-between px-1">
            <span className="text-xs font-bold tracking-wider text-[#6b4c35]">
              🥢 {pet.name} 的專屬木盒便當（點格子可切換菜色）
            </span>
            <span
              className={`rounded-full px-3 py-0.5 text-xs font-bold shadow-2xs ${reaction.color}`}
            >
              滿足度 {reaction.score}%
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1.15fr_0.85fr]">
            {/* 第一大格：主食打底 */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              onClick={() => setActiveSlot("main")}
              className={`relative flex min-h-[230px] cursor-pointer flex-col justify-between rounded-2xl border-2 p-4 transition-all ${
                activeSlot === "main"
                  ? "border-[#935941] bg-[#fffdf9] ring-4 ring-[#935941]/15"
                  : "border-[#d8bfa3] bg-[#faf4eb] hover:bg-[#fffdf9]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="rounded-lg bg-[#935941] px-2.5 py-0.5 text-[11px] font-bold text-white">
                  1. 主食打底
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
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
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
                    <p className="text-xs font-mono font-semibold text-[#935941]">
                      {money(selectedMain.priceNt)}
                    </p>
                  </motion.div>
                ) : (
                  <div className="my-auto py-8 text-center text-xs text-[#8c7865]">
                    + 點擊從右側挑一款主食
                  </div>
                )}
              </AnimatePresence>

              <span className="text-center text-[11px] font-medium text-[#7e6d5d]">
                {activeSlot === "main" ? "👉 正在挑選主食..." : "點擊更換主食"}
              </span>
            </motion.div>

            {/* 右側上下兩格：加菜 + 飯後小確幸 */}
            <div className="grid gap-3">
              {/* 第二格：原肉加菜 */}
              <motion.div
                whileHover={{ scale: 1.01 }}
                onClick={() => setActiveSlot("side")}
                className={`relative flex min-h-[110px] cursor-pointer flex-col justify-between rounded-2xl border-2 p-3.5 transition-all ${
                  activeSlot === "side"
                    ? "border-[#4e6752] bg-[#fffdf9] ring-4 ring-[#4e6752]/15"
                    : "border-[#d8bfa3] bg-[#faf4eb] hover:bg-[#fffdf9]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-[#4e6752] px-2 py-0.5 text-[10px] font-bold text-white">
                    2. 營養加菜
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
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
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
                      + 點擊挑一款凍乾或副食
                    </p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* 第三格：飯後小確幸 */}
              <motion.div
                whileHover={{ scale: 1.01 }}
                onClick={() => setActiveSlot("treat")}
                className={`relative flex min-h-[110px] cursor-pointer flex-col justify-between rounded-2xl border-2 p-3.5 transition-all ${
                  activeSlot === "treat"
                    ? "border-[#c98835] bg-[#fffdf9] ring-4 ring-[#c98835]/15"
                    : "border-[#d8bfa3] bg-[#faf4eb] hover:bg-[#fffdf9]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-[#c98835] px-2 py-0.5 text-[10px] font-bold text-white">
                    3. 飯後小確幸
                  </span>
                  {selectedTreat && (
                    <button
                      type="button"
                      aria-label="移除用品"
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
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
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
                      + 點擊挑一款玩具或用品
                    </p>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>

          {/* 便當底部毛孩反應語錄 */}
          <div className="mt-3.5 flex items-center gap-2 rounded-xl bg-[#fffdf9] px-3.5 py-2.5 text-xs font-semibold text-[#4a3e35] shadow-2xs">
            <span className="text-base">{reaction.emoji}</span>
            <span>{reaction.text}</span>
          </div>
        </div>

        {/* 右側：菜色選擇盤與一鍵打包 */}
        <div className="flex flex-col justify-between rounded-[1.8rem] border border-[#dfd0be] bg-[#fffdf9] p-5">
          <div>
            <div className="flex flex-wrap gap-1.5 border-b border-[#ece0d1] pb-3">
              {(
                [
                  { id: "main", label: "1. 換主食打底" },
                  { id: "side", label: "2. 換營養加菜" },
                  { id: "treat", label: "3. 換飯後用品" },
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

            <div className="mt-3.5 grid max-h-[225px] grid-cols-2 gap-2.5 overflow-y-auto pr-1">
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#7c6d5f]">
                  已選 {filledCount} 樣便當菜色
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
                整盒便當打包飛入菜籃！
                <Sparkles size={15} />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

