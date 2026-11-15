"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Calculator,
  ChevronRight,
  ExternalLink,
  Repeat2,
  ShieldCheck,
  ShoppingBag,
  Heart,
  Sparkles,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { NutritionalTrendChart } from "@/components/analytics/NutritionalTrendChart";
import { MacroKibbleViewer } from "@/components/shop/MacroKibbleViewer";
import { useActivePet } from "@/store/usePetContextStore";
import { useCartStore } from "@/store/useCartStore";
import { useUiStore } from "@/store/useUiStore";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { matchProduct } from "@/lib/matching";
import { triggerFlyToCart, triggerPawBurst } from "@/lib/flyToCart";
import { money, packageSize } from "@/lib/utils";
import type { Product } from "@/lib/types";
import { petLabels, supportsFoodCalculator } from "@/lib/types";

export function ProductDetail({ product }: { product: Product }) {
  const images = [product.image, ...(product.gallery ?? [])].filter(Boolean);
  const [activeImage, setActiveImage] = useState(images[0] ?? product.image);

  const pet = useActivePet();
  const fit = matchProduct(product, pet);
  const isSupply = product.kind === "SUPPLIES";
  const canCalculate =
    !isSupply && supportsFoodCalculator(product.type) && product.kcalPer100g > 0;
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useUiStore((state) => state.setCartOpen);
  const openPetEditor = useUiStore((state) => state.setPetEditorOpen);
  const openCalculator = useUiStore((state) => state.openCalculator);
  const isFavorite = useFavoritesStore((state) =>
    state.ids.includes(product.id),
  );
  const toggleFavorite = useFavoritesStore((state) => state.toggle);
  const available = product.stock > 0 && fit.safe;

  function addOnce(event: React.MouseEvent<HTMLButtonElement>) {
    if (!available) return;
    try {
      addItem({
        productId: product.id,
        petId: pet.id,
        quantity: 1,
        mode: "ONCE",
        intervalDays: null,
      });
      triggerFlyToCart(event.currentTarget, {
        image: activeImage,
        label: product.name,
      });
      toast.success(`已為 ${pet.name} 將「${product.name}」納入購物籃`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "無法加入商品");
    }
  }

  function handleFavorite(event: React.MouseEvent<HTMLButtonElement>) {
    triggerPawBurst(event.currentTarget);
    toggleFavorite(product.id);
    toast.success(isFavorite ? "已從願望清單移除" : "已收入毛孩願望清單");
  }

  return (
    <main
      id="main-content"
      className="min-h-screen bg-[#faf6f0] text-[#302b26]"
    >
      <div className="page-shell pb-24 pt-8 md:pt-12">
        <nav
          aria-label="麵包屑"
          className="mb-8 flex items-center gap-2 text-xs font-medium text-[#7c746c]"
        >
          <Link className="hover:text-[#935941]" href="/shop">
            選物本舖
          </Link>
          <ChevronRight aria-hidden="true" size={13} />
          <span className="font-bold text-[#433c35]">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,.92fr)] lg:gap-14">
          <div>
            <div className="polaroid-card relative aspect-[1.04] overflow-hidden rounded-[2rem] p-4">
              <div className="relative size-full overflow-hidden rounded-2xl bg-[#efe6da]">
                <Image
                  src={activeImage}
                  alt={`${product.name}商品形象照`}
                  fill
                  priority
                  className="object-contain p-8 transition-transform duration-500 hover:scale-105 md:p-12"
                  sizes="(max-width: 1024px) 100vw, 55vw"
                />
                <span className="craft-tag absolute left-4 top-4 rounded-full px-3.5 py-1.5 text-[11px] font-bold tracking-wider text-[#935941]">
                  PURESPOT 台灣嚴選
                </span>
              </div>
            </div>

            {images.length > 1 && (
              <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                {images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    aria-label={`查看商品圖片 ${index + 1}`}
                    aria-pressed={activeImage === image}
                    onClick={() => setActiveImage(image)}
                    className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-[#ebe5da] transition-all hover:opacity-85 ${
                      activeImage === image
                        ? "border-[#935941] shadow-sm"
                        : "border-transparent"
                    }`}
                  >
                    <Image
                      src={image}
                      alt=""
                      fill
                      className="object-contain p-2"
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* 互動式食材剖面與微距檢視器 */}
            <div className="mt-6">
              <MacroKibbleViewer product={product} />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {product.videoUrl && (
                <a
                  className="inline-flex items-center gap-2 text-sm font-bold text-[#935941] underline underline-offset-4"
                  href={product.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  觀看商品實拍影片 <ExternalLink size={14} />
                </a>
              )}
              {!isSupply && (
                <Link
                  href={`/care/ingredients?product=${encodeURIComponent(product.slug)}`}
                  className="btn-tactile inline-flex min-h-11 items-center gap-2 bg-[#4e6752] px-5 text-xs font-bold text-white !shadow-[0_4px_0_#344737]"
                >
                  <Search size={15} />
                  開啟成分放大鏡對比
                  <ArrowRight size={15} />
                </Link>
              )}
            </div>
          </div>

          <div className="lg:pt-2">
            <p className="editorial-kicker">
              {isSupply
                ? "LIVING WITH CARE · 質感生活道具"
                : "FOOD WITH INTENTION · 溯源主食選物"}{" "}
              · {petLabels[product.type]}專屬
            </p>
            <h1 className="editorial-title mt-3 font-serif text-[clamp(2.4rem,4.6vw,4.2rem)] font-bold leading-[1.1] tracking-[-.04em] text-[#302b26]">
              {product.name}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-8 text-[#5f554c]">
              {product.description}
            </p>

            <div className="mt-6 rounded-2xl border border-[#dfd0be] bg-[#fffcf7] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-full bg-[#f4ece1] px-3 py-1 text-xs font-bold text-[#6e5d4f]">
                  {isSupply ? "單件規格" : packageSize(product.bagGrams)} ·{" "}
                  {product.category}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-bold text-[#935941]">
                    {money(product.priceNt)}
                  </span>
                  {product.autoshipEligible && (
                    <span className="rounded-full bg-[#eef2eb] px-2.5 py-0.5 text-xs font-bold text-[#4e6752]">
                      定期配 9 折 {money(Math.round(product.priceNt * 0.9))}
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-2 text-xs text-[#8a7f75]">
                定期配滿 $699 或單次選購滿 $999 享免運宅配，購物籃內可免費挑選隨箱職人試食小包。
              </p>
            </div>

            <div
              className={`mt-5 flex items-start gap-3 rounded-2xl border-l-4 px-4 py-3.5 text-sm font-medium leading-6 ${
                fit.safe
                  ? "border-[#4e6752] bg-[#eef3ec] text-[#2f4533]"
                  : "border-[#c85a48] bg-[#faece8] text-[#7a382c]"
              }`}
              role="status"
            >
              <ShieldCheck
                className="mt-0.5 shrink-0"
                size={18}
                aria-hidden="true"
              />
              <span>{fit.label}</span>
            </div>
            {!fit.sameSpecies && (
              <button
                type="button"
                onClick={() => openPetEditor(true)}
                className="mt-2.5 text-xs font-bold text-[#935941] underline underline-offset-4"
              >
                新增 {petLabels[product.type]} 檔案，或從頂部導覽列切換毛孩
              </button>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.94 }}
                disabled={!available}
                onClick={addOnce}
                className="btn-tactile inline-flex min-h-14 items-center justify-center gap-2 bg-[#935941] px-5 text-sm font-bold text-white hover:bg-[#7d4934] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ShoppingBag size={18} />
                為 {pet.name} 納入購物籃
              </motion.button>
              {canCalculate ? (
                <button
                  type="button"
                  disabled={!fit.safe}
                  onClick={() => openCalculator(product.id)}
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-[#d5c3af] bg-[#fffcf7] px-5 text-sm font-bold text-[#4e443a] shadow-[0_3px_0_#d5c3af] transition-all hover:-translate-y-0.5 hover:bg-[#f4ece1] active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Calculator size={17} className="text-[#935941]" />
                  試算每日餵食克數
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openCart(true)}
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-[#d5c3af] bg-[#fffcf7] px-5 text-sm font-bold text-[#4e443a] shadow-[0_3px_0_#d5c3af] hover:bg-[#f4ece1]"
                >
                  開啟購物籃查看 ({product.stock} 件現貨)
                </button>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-6">
              <button
                type="button"
                aria-pressed={isFavorite}
                onClick={handleFavorite}
                className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#935941] underline underline-offset-4"
              >
                <Heart
                  size={17}
                  fill={isFavorite ? "currentColor" : "none"}
                  className={isFavorite ? "text-[#c85a48]" : ""}
                />
                {isFavorite ? "已收入願望清單" : "收入毛孩願望清單"}
              </button>
              {product.autoshipEligible && (
                <Link
                  href="/autoship"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-[#4e6752] underline underline-offset-4"
                >
                  <Repeat2 size={16} />
                  了解定期配 9 折方案 <ArrowRight size={15} />
                </Link>
              )}
            </div>

            {canCalculate && (
              <div className="mt-8 grid grid-cols-3 divide-x divide-[#dfd0be] rounded-2xl border border-[#dfd0be] bg-[#fffcf7] py-4 text-center">
                <div>
                  <strong className="block font-mono text-2xl font-bold text-[#935941]">
                    {product.proteinMin}%
                  </strong>
                  <span className="mt-1 block text-xs text-[#756c63]">
                    粗蛋白最低值
                  </span>
                </div>
                <div>
                  <strong className="block font-mono text-2xl font-bold text-[#4e6752]">
                    {product.kcalPer100g}
                  </strong>
                  <span className="mt-1 block text-xs text-[#756c63]">
                    大卡 / 100 克
                  </span>
                </div>
                <div>
                  <strong className="block font-mono text-2xl font-bold text-[#302b26]">
                    {packageSize(product.bagGrams)}
                  </strong>
                  <span className="mt-1 block text-xs text-[#756c63]">
                    單包規格
                  </span>
                </div>
              </div>
            )}
            {!canCalculate && (
              <div className="mt-8 rounded-2xl border border-[#dfd0be] bg-[#fffcf7] p-4 text-sm font-medium text-[#6e5f52]">
                <Sparkles size={15} className="mr-1.5 inline text-[#935941]" />
                {product.category} ·{" "}
                {isSupply ? "單件" : packageSize(product.bagGrams)} ·{" "}
                {petLabels[product.type]}適用
              </div>
            )}
            <p className="mt-4 text-xs leading-6 text-[#8a7f75]">
              商品與圖片為展示資料，正式資訊請以實品標示為準。
              {!isSupply && "特殊飲食需求請先諮詢獸醫師。"}
            </p>
          </div>
        </div>

        <section
          className="mt-20 grid gap-10 border-t border-[#d7cabd] pt-14 md:grid-cols-[.75fr_1.25fr] md:gap-20"
          aria-labelledby="ingredients-title"
        >
          <div>
            <p className="editorial-kicker">
              {isSupply ? "MADE FOR EVERYDAY" : "INSIDE THE BAG · 袋內完整真相"}
            </p>
            <h2
              id="ingredients-title"
              className="editorial-title mt-3 font-serif text-3xl font-bold leading-tight md:text-5xl"
            >
              {isSupply ? "陪伴生活，\n用心挑選。" : "每一口，\n都看得見來源。"}
            </h2>
          </div>
          <div className="craft-letterpress rounded-2xl p-6 sm:p-8">
            <p className="mb-3 text-xs font-bold tracking-wider text-[#935941]">
              {isSupply ? "商品設計重點" : "完整原料清單（無隱藏添加）"}
            </p>
            <p className="text-base leading-8 text-[#4e433a]">
              {isSupply ? product.description : product.ingredients.join("、")}
            </p>
            <div className="mt-6 border-t border-[#ece0d1] pt-5 text-xs leading-6 text-[#786a5c]">
              {isSupply
                ? "圖片與規格為概念示意，請以實際上架資訊為準。"
                : "我們把配方與檢驗資訊放在同一頁，讓每一次選擇都有憑有據。包裝上的標示是最終資訊來源。"}
            </div>
          </div>
        </section>

        {product.batches.length > 0 && (
          <section className="mt-18">
            <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="editorial-kicker">TRANSPARENCY IN PRACTICE</p>
                <h2 className="editorial-title mt-2 font-serif text-3xl font-bold sm:text-4xl">
                  歷次檢驗批次走勢
                </h2>
                <p className="mt-2 text-sm text-[#756c63]">
                  {product.batches.some(
                    (batch) =>
                      batch.isDemo !== false ||
                      !/^https?:\/\//i.test(batch.reportUrl ?? ""),
                  )
                    ? "目前含展示或未附來源的批次，正式檢驗報告尚待核實。"
                    : "批次已附來源連結，仍請核對正式報告與實品標示。"}
                </p>
              </div>
              <Link
                href="/transparency"
                className="inline-flex items-center gap-2 text-sm font-bold text-[#935941] underline underline-offset-4"
              >
                了解 7C 透明承諾 <ArrowRight size={15} />
              </Link>
            </div>
            <NutritionalTrendChart
              batches={product.batches}
              proteinMin={product.proteinMin}
              moistureMax={product.moistureMax}
              ashMax={product.ashMax}
            />
          </section>
        )}
      </div>
    </main>
  );
}
