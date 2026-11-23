"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ShieldCheck,
  TriangleAlert,
  Plus,
  FlaskConical,
  Heart,
  Scale,
  RotateCcw,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import { useActivePet } from "@/store/usePetContextStore";
import { useCartStore } from "@/store/useCartStore";
import { useUiStore } from "@/store/useUiStore";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { useCompareStore } from "@/store/useCompareStore";
import { matchProduct } from "@/lib/matching";
import { triggerFlyToCart, triggerPawBurst } from "@/lib/flyToCart";
import { money, packageSize } from "@/lib/utils";
import type { Product } from "@/lib/types";
import { petLabels, supportsFoodCalculator } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function ProductCard({ product }: { product: Product }) {
  const reducedMotion = useReducedMotion();
  const router = useRouter();
  const pet = useActivePet();
  const fit = matchProduct(product, pet);
  const canCalculate =
    product.kind !== "SUPPLIES" &&
    supportsFoodCalculator(product.type) &&
    product.kcalPer100g > 0;
  const add = useCartStore((s) => s.addItem);
  const calculator = useUiStore((s) => s.openCalculator);
  const isFavorite = useFavoritesStore((s) => s.ids.includes(product.id));
  const toggleFavorite = useFavoritesStore((s) => s.toggle);
  const isCompared = useCompareStore((s) => s.ids.includes(product.id));
  const addCompare = useCompareStore((s) => s.add);
  const removeCompare = useCompareStore((s) => s.remove);

  const [flipped, setFlipped] = useState(false);
  const [tilt, setTilt] = useState<{
    rx: number;
    ry: number;
    gx: number;
    gy: number;
    active: boolean;
  }>({ rx: 0, ry: 0, gx: 50, gy: 50, active: false });

  function handlePointerMove(e: React.PointerEvent<HTMLElement>) {
    if (reducedMotion || e.pointerType === "touch") return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const ry = (px - 0.5) * 9;
    const rx = (0.5 - py) * 9;
    setTilt({
      rx,
      ry,
      gx: Math.round(px * 100),
      gy: Math.round(py * 100),
      active: true,
    });
  }

  function handlePointerLeave() {
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 50, active: false });
  }

  function addToCart(event: React.MouseEvent<HTMLButtonElement>) {
    try {
      add({
        productId: product.id,
        petId: pet.id,
        quantity: 1,
        mode: "ONCE",
        intervalDays: null,
      });
      triggerFlyToCart(event.currentTarget, {
        image: product.image,
        label: product.name,
      });
      toast.success(`已為 ${pet.name} 將「${product.name}」納入購物籃`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加入失敗");
    }
  }

  function handleFavoriteClick(event: React.MouseEvent<HTMLButtonElement>) {
    triggerPawBurst(event.currentTarget);
    toggleFavorite(product.id);
    toast.success(isFavorite ? "已從願望清單移除" : "已收入毛孩願望清單");
  }

  return (
    <motion.article
      layout
      whileHover={reducedMotion ? undefined : { y: -3 }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{
        transform: tilt.active
          ? `perspective(950px) rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg)`
          : undefined,
      }}
      className="product-card polaroid-card group relative flex flex-col overflow-hidden rounded-[1.6rem] transition-all duration-200 hover:border-[#935941]"
    >
      {/* 3D 活版暖金浮雕反光折射層 */}
      {tilt.active && (
        <div
          aria-hidden="true"
          style={{
            background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,244,218,0.42) 0%, rgba(215,175,110,0.10) 42%, transparent 72%)`,
          }}
          className="pointer-events-none absolute inset-0 z-20 transition-opacity duration-150"
        />
      )}
      <div className="relative aspect-[1.02] overflow-hidden bg-[#efe6da]">
        <Link
          href={`/products/${product.slug}`}
          aria-label={`查看${product.name}`}
        >
          <Image
            src={product.image}
            alt={`${product.name}商品形象照`}
            fill
            sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,25vw"
            className="object-contain p-5 transition-transform duration-500 group-hover:scale-108"
          />
        </Link>

        {/* 頂部物種與適配標籤 */}
        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-1">
          <span className="rounded-full border border-[#dfd0be] bg-[#fffcf7]/95 px-2.5 py-1 text-xs font-bold text-[#6b5547] shadow-2xs">
            {petLabels[product.type]} ·{" "}
            {product.kind === "SUPPLIES" ? "道具" : "膳食"}
          </span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={`${pet.id}-${fit.label}`}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className={`flex max-w-[78%] items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold backdrop-blur-md ${
                fit.safe
                  ? "border-[#a8b5a2] bg-[#edf2ea]/95 text-[#3e5942]"
                  : fit.conflicts.length && fit.sameSpecies
                    ? "border-[#d7b299] bg-[#f8ebe2]/95 text-[#80543c]"
                    : "border-[#d4c7ba] bg-[#f5eee6]/95 text-[#756b61]"
              }`}
            >
              {fit.safe ? (
                <ShieldCheck size={12} className="shrink-0" />
              ) : (
                <TriangleAlert size={12} className="shrink-0" />
              )}
              {fit.label}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* 左下收藏按鈕 */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.85 }}
          aria-label={
            isFavorite ? `取消收藏${product.name}` : `收藏${product.name}`
          }
          aria-pressed={isFavorite}
          onClick={handleFavoriteClick}
          className={`absolute bottom-3 left-3 z-20 flex size-10 items-center justify-center rounded-full border bg-[#fffaf4]/95 shadow-sm transition-colors ${
            isFavorite
              ? "border-[#c85a48] text-[#c85a48]"
              : "border-[#dfd0c0] text-[#705f51] hover:text-[#935941]"
          }`}
        >
          <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
        </motion.button>

        {/* 右下「翻閱溯源手記」互動按鈕 */}
        <button
          type="button"
          onClick={() => setFlipped((v) => !v)}
          className="absolute bottom-3 right-3 z-20 inline-flex items-center gap-1 rounded-full border border-[#d4c2ae] bg-[#fffcf7]/95 px-2.5 py-1.5 text-[11px] font-bold text-[#78523d] shadow-xs transition-transform hover:scale-105 active:scale-95"
        >
          <RotateCcw size={12} />
          {flipped ? "返回正面" : "翻閱溯源手記"}
        </button>

        {/* 翻轉背面：活版印刷風產地溯源與微距剖面小卡 */}
        <AnimatePresence>
          {flipped && (
            <motion.div
              initial={{ opacity: 0, rotateY: 75, scale: 0.95 }}
              animate={{ opacity: 1, rotateY: 0, scale: 1 }}
              exit={{ opacity: 0, rotateY: -60, scale: 0.95 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="craft-letterpress absolute inset-0 z-10 flex flex-col justify-between bg-[#fffcf7]/98 p-4 text-xs text-[#302b26] backdrop-blur-md"
            >
              <div>
                <div className="flex items-center justify-between border-b border-[#e8dac9] pb-2">
                  <span className="inline-flex items-center gap-1 font-bold text-[#935941]">
                    <Sparkles size={13} />
                    商品資料
                  </span>
                  <span className="rounded-full bg-[#eef2eb] px-2 py-0.5 font-mono text-[10px] font-bold text-[#4e6752]">
                    {petLabels[product.type]}適用
                  </span>
                </div>
                <p className="mt-2.5 leading-5 text-[#5a4e43]">
                  {product.description}
                </p>

                {product.kind !== "SUPPLIES" ? (
                  <div className="mt-3 rounded-xl border border-[#e6d7c5] bg-[#faf4eb] p-2.5">
                    <p className="font-mono text-[10px] font-bold text-[#755843]">
                      營養標示
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="text-[11px] text-[#66584b]">
                        粗蛋白 {product.proteinMin}% · 水分 {product.moistureMax}%
                        <br />{product.kcalPer100g} kcal / 100g
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-[#e6d7c5] bg-[#faf4eb] p-2.5">
                    <p className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-[#755843]">
                      <Sparkles size={11} />
                      材質與商品資訊
                    </p>
                    <p className="mt-1 text-[11px] text-[#66584b]">
                      {product.ingredients.join("、") || "查看商品詳情了解規格"}
                    </p>
                  </div>
                )}
              </div>

              <div className="pb-9 text-[11px] text-[#7c6e60]">
                核心成分：{product.ingredients.slice(0, 4).join("、")}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-center justify-between text-xs text-[#7d7165]">
          <span>
            {product.kind === "SUPPLIES"
              ? "單件"
              : packageSize(product.bagGrams)}{" "}
            · {product.category}
          </span>
          {product.kind !== "SUPPLIES" && (
            <span className="flex items-center gap-1 font-semibold text-[#4e6752]">
              <FlaskConical size={12} />
              {product.batches.length ? "批次履歷" : "配方公開"}
            </span>
          )}
        </div>
        <Link
          href={`/products/${product.slug}`}
          className="editorial-title text-xl font-bold tracking-tight text-[#302b26] hover:text-[#935941]"
        >
          {product.name}
        </Link>
        <div className="my-4 mt-auto flex items-baseline gap-2 pt-3">
          <strong className="font-mono text-2xl font-bold text-[#302b26]">
            {money(product.priceNt)}
          </strong>
          {product.autoshipEligible && (
            <span className="rounded-full bg-[#fdf3e7] px-2 py-0.5 text-xs font-bold text-[#935941]">
              定期配 {money(Math.round(product.priceNt * 0.9))}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1 text-xs sm:text-sm"
            onClick={() =>
              canCalculate
                ? calculator(product.id)
                : router.push(`/products/${product.slug}`)
            }
            disabled={canCalculate && !fit.safe}
          >
            {canCalculate ? "試算專屬食量" : "查看商品詳情"}
          </Button>
          <motion.button
            type="button"
            whileHover={{ scale: 1.06, y: -2 }}
            whileTap={{ scale: 0.9, y: 2 }}
            disabled={!fit.safe || product.stock === 0}
            onClick={addToCart}
            aria-label={`將${product.name}納入購物籃`}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#935941] px-3.5 text-xs font-bold text-white shadow-[0_3px_0_#6e3f2c] transition-colors hover:bg-[#7d4934] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ShoppingBag size={15} />
            <Plus size={14} />
          </motion.button>
        </div>
        <button
          type="button"
          aria-pressed={isCompared}
          onClick={() => {
            if (isCompared) {
              removeCompare(product.id);
              return;
            }
            if (!addCompare(product.id)) toast.error("最多比較 3 款商品");
          }}
          className="mt-3 inline-flex min-h-8 items-center gap-1.5 text-xs font-semibold text-[#856650] underline-offset-4 hover:text-[#935941] hover:underline"
        >
          <Scale size={14} />
          {isCompared ? "已加入比對 · 點擊移除" : "加入規格比對"}
        </button>
      </div>
    </motion.article>
  );
}
