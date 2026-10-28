"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calculator, ChevronRight, ExternalLink, Repeat2, ShieldCheck, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { NutritionalTrendChart } from "@/components/analytics/NutritionalTrendChart";
import { useActivePet } from "@/store/usePetContextStore";
import { useCartStore } from "@/store/useCartStore";
import { useUiStore } from "@/store/useUiStore";
import { matchProduct } from "@/lib/matching";
import { money, packageSize } from "@/lib/utils";
import type { Product } from "@/lib/types";
import { petLabels, supportsFoodCalculator } from "@/lib/types";

export function ProductDetail({ product }: { product: Product }) {
  const images = [product.image, ...(product.gallery ?? [])].filter(Boolean);
  const [activeImage, setActiveImage] = useState(images[0] ?? product.image);
  const pet = useActivePet();
  const fit = matchProduct(product, pet);
  const isSupply = product.kind === "SUPPLIES";
  const canCalculate = !isSupply && supportsFoodCalculator(product.type) && product.kcalPer100g > 0;
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useUiStore((state) => state.setCartOpen);
  const openPetEditor = useUiStore((state) => state.setPetEditorOpen);
  const openCalculator = useUiStore((state) => state.openCalculator);
  const available = product.stock > 0 && fit.safe;

  function addOnce() {
    if (!available) return;
    try {
      addItem({ productId: product.id, petId: pet.id, quantity: 1, mode: "ONCE", intervalDays: null });
      openCart(true);
      toast.success("已加入購物車");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "無法加入商品");
    }
  }

  return (
    <main id="main-content" className="min-h-screen bg-[#f8f4ed] text-[#302b26]">
      <div className="page-shell pb-24 pt-8 md:pt-12">
        <nav aria-label="麵包屑" className="mb-10 flex items-center gap-2 text-xs text-[#7c746c]">
          <Link className="hover:text-[#955a43]" href="/shop">商城</Link>
          <ChevronRight aria-hidden="true" size={13} />
          <span className="text-[#433c35]">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.12fr)_minmax(340px,.88fr)] lg:gap-16">
          <div>
            <div className="relative aspect-[1.04] overflow-hidden bg-[#ebe5da]">
              <Image src={activeImage} alt={`${product.name}概念包裝示意`} fill priority className="object-contain p-8 md:p-14" sizes="(max-width: 1024px) 100vw, 55vw" />
              <span className="absolute left-5 top-5 bg-[#f8f4ed]/95 px-3 py-2 text-[11px] font-semibold tracking-[.14em] text-[#765b4c]">PURESPOT SELECT</span>
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-3 overflow-x-auto">
                {images.map((image, index) => (
                  <button key={`${image}-${index}`} type="button" aria-label={`查看商品圖片 ${index + 1}`} aria-pressed={activeImage === image} onClick={() => setActiveImage(image)} className={`relative h-20 w-20 shrink-0 overflow-hidden bg-[#ebe5da] transition-opacity hover:opacity-75 ${activeImage === image ? "outline outline-2 outline-offset-2 outline-[#9c6149]" : ""}`}>
                    <Image src={image} alt="" fill className="object-contain p-2" sizes="80px" />
                  </button>
                ))}
              </div>
            )}
            {product.videoUrl && (
              <a className="mt-5 inline-flex items-center gap-2 text-sm text-[#7c4e3c] underline underline-offset-4" href={product.videoUrl} target="_blank" rel="noopener noreferrer">觀看商品影片 <ExternalLink size={14} /></a>
            )}
          </div>

          <div className="lg:pt-3">
            <p className="editorial-kicker">{isSupply ? "LIVING WITH CARE · 用心選物" : "FOOD WITH INTENTION · 用心選食"} · {petLabels[product.type]}</p>
            <h1 className="editorial-title mt-5 font-serif text-[clamp(2.7rem,5vw,4.8rem)] leading-[1.08] tracking-[-.045em]">{product.name}</h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-[#6d655d]">{product.description}</p>

            <div className="mt-8 border-y border-[#d9cfc3] py-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-[#70665d]">{packageSize(product.bagGrams)} · {product.category}</span>
              <span className="font-serif text-3xl text-[#3b342d]">{money(product.priceNt)}</span>
              </div>
              <p className="mt-2 text-xs tracking-wide text-[#8a7f75]">展示商品與價格，以結帳頁顯示的配送方式為準</p>
            </div>

            <div className={`mt-6 flex items-start gap-3 border-l-[3px] px-4 py-3 text-sm leading-6 ${fit.safe ? "border-[#68856b] bg-[#eef0e8] text-[#425847]" : "border-[#ac705c] bg-[#f4e9df] text-[#734b3b]"}`} role="status">
              <ShieldCheck className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
              <span>{fit.label}</span>
            </div>
            {!fit.sameSpecies && <button type="button" onClick={() => openPetEditor(true)} className="mt-3 text-sm font-medium text-[#795340] underline underline-offset-4">新增{petLabels[product.type]}檔案，或從頂部切換毛孩</button>}

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <button type="button" disabled={!available} onClick={addOnce} className="editorial-action inline-flex min-h-14 items-center justify-center gap-2 bg-[#935941] px-5 text-sm font-semibold text-white hover:bg-[#794632] disabled:cursor-not-allowed disabled:opacity-45"><ShoppingBag size={17} />單次加入購物車</button>
              {canCalculate && <button type="button" disabled={!fit.safe} onClick={() => openCalculator(product.id)} className="editorial-action inline-flex min-h-14 items-center justify-center gap-2 border border-[#9e8d7c] px-5 text-sm font-semibold text-[#4e443a] hover:bg-[#ebe3d8] disabled:cursor-not-allowed disabled:opacity-45"><Calculator size={17} />試算每日份量</button>}
              {!canCalculate && <Link href="/shop" className="editorial-action inline-flex min-h-14 items-center justify-center gap-2 border border-[#9e8d7c] px-5 text-sm font-semibold text-[#4e443a] hover:bg-[#ebe3d8]">繼續逛逛選物 <ArrowRight size={17} /></Link>}
            </div>
            {product.autoshipEligible && <Link href="/autoship" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#795340] underline underline-offset-4"><Repeat2 size={16} />了解定期配送 <ArrowRight size={15} /></Link>}

            {canCalculate && <div className="mt-10 grid grid-cols-3 divide-x divide-[#d9cfc3] border-y border-[#d9cfc3] py-5 text-center">
              <div><strong className="block font-serif text-2xl">{product.proteinMin}%</strong><span className="mt-1 block text-xs text-[#756c63]">粗蛋白最低值</span></div>
              <div><strong className="block font-serif text-2xl">{product.kcalPer100g}</strong><span className="mt-1 block text-xs text-[#756c63]">大卡 / 100 克</span></div>
              <div><strong className="block font-serif text-2xl">{packageSize(product.bagGrams)}</strong><span className="mt-1 block text-xs text-[#756c63]">包裝規格</span></div>
            </div>}
            {!canCalculate && <div className="mt-10 border-y border-[#d9cfc3] py-5 text-sm text-[#756c63]">{product.category} · {packageSize(product.bagGrams)} · {petLabels[product.type]}適用</div>}
            <p className="mt-4 text-xs leading-6 text-[#8a7f75]">商品與圖片為展示資料，正式資訊請以實品標示為準。{!isSupply && "特殊飲食需求請先詢問獸醫師。"}</p>
          </div>
        </div>

        <section className="mt-24 grid gap-10 border-t border-[#d7cabd] pt-14 md:grid-cols-[.75fr_1.25fr] md:gap-20" aria-labelledby="ingredients-title">
          <div><p className="editorial-kicker">{isSupply ? "MADE FOR EVERYDAY" : "INSIDE THE BAG"}</p><h2 id="ingredients-title" className="editorial-title mt-4 font-serif text-4xl leading-tight md:text-5xl">{isSupply ? "陪伴生活，\n用心挑選。" : "每一口，\n都看得清楚。"}</h2></div>
          <div><p className="mb-5 text-xs font-semibold tracking-[.16em] text-[#8b634e]">{isSupply ? "商品介紹" : "原料與營養"}</p><p className="text-base leading-9 text-[#5e554d]">{isSupply ? product.description : product.ingredients.join("、")}</p><div className="mt-8 border-t border-[#d7cabd] pt-6 text-sm leading-7 text-[#6c6258]">{isSupply ? "圖片與規格為概念示意，請以實際上架資訊為準。" : "我們把配方與檢驗資訊放在同一頁，讓選擇有依據。包裝上的標示是最終資訊來源。"}</div></div>
        </section>

        {product.batches.length > 0 && <section className="mt-20"><div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="editorial-kicker">TRANSPARENCY IN PRACTICE</p><h2 className="editorial-title mt-3 font-serif text-4xl">批次檢驗，公開可查。</h2></div><Link href="/transparency" className="inline-flex items-center gap-2 text-sm text-[#795340] underline underline-offset-4">了解透明承諾 <ArrowRight size={15} /></Link></div><NutritionalTrendChart batches={product.batches} proteinMin={product.proteinMin} moistureMax={product.moistureMax} ashMax={product.ashMax} /></section>}
      </div>
    </main>
  );
}
