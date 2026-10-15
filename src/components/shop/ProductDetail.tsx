"use client";
import Image from "next/image";
import Link from "next/link";
import {
  Calculator,
  ShoppingBag,
  ShieldCheck,
  TriangleAlert,
  Repeat2,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NutritionalTrendChart } from "@/components/analytics/NutritionalTrendChart";
import { useActivePet } from "@/store/usePetContextStore";
import { useCartStore } from "@/store/useCartStore";
import { useUiStore } from "@/store/useUiStore";
import { matchProduct } from "@/lib/matching";
import { money } from "@/lib/utils";
import type { Product } from "@/lib/types";
export function ProductDetail({ product }: { product: Product }) {
  const pet = useActivePet();
  const fit = matchProduct(product, pet);
  const calc = useUiStore((s) => s.openCalculator);
  const add = useCartStore((s) => s.addItem);
  const cart = useUiStore((s) => s.setCartOpen);
  function addOnce() {
    try {
      add({
        productId: product.id,
        petId: pet.id,
        quantity: 1,
        mode: "ONCE",
        intervalDays: null,
      });
      cart(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "無法加入商品");
    }
  }
  return (
    <main id="main-content" className="page-shell py-8">
      <nav
        aria-label="麵包屑"
        className="mb-6 flex items-center gap-2 text-sm text-slate-500"
      >
        <Link href="/" className="hover:text-white">
          專屬選物
        </Link>
        <ChevronRight size={14} />
        <span>{product.name}</span>
      </nav>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-3xl border border-white/10">
          <Image
            src={product.image}
            alt={`${product.name}概念包裝示意`}
            fill
            priority
            sizes="(max-width:1024px) 100vw,50vw"
            className="object-cover"
          />
          <span className="absolute bottom-5 left-5 rounded-lg bg-slate-950/70 px-3 py-2 text-xs text-slate-300">
            概念包裝示意，規格以文字為準
          </span>
        </div>
        <div className="flex flex-col justify-center">
          <span className="eyebrow">每一口，都有跡可循</span>
          <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">
            {product.name}
          </h1>
          <p className="mt-3 text-slate-400">{product.subtitle}</p>
          <div
            className={`my-6 flex items-center gap-2 rounded-xl border p-4 text-sm ${fit.safe ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-200" : "border-amber-400/20 bg-amber-400/5 text-amber-200"}`}
          >
            {fit.safe ? <ShieldCheck size={18} /> : <TriangleAlert size={18} />}{" "}
            {fit.label}
          </div>
          <p className="text-sm leading-7 text-slate-400">
            {product.description}
          </p>
          <div className="my-6 grid grid-cols-3 divide-x divide-white/10 rounded-xl border border-white/10 py-4 text-center">
            {[
              { label: "粗蛋白最低值", value: `${product.proteinMin}%` },
              {
                label: "能量密度",
                value: `${product.kcalPer100g}`,
                unit: "大卡 / 100 克",
              },
              {
                label: "包裝重量",
                value: `${product.bagGrams / 1000}`,
                unit: "公斤",
              },
            ].map((x) => (
              <div key={x.label}>
                <p className="text-xs text-slate-500">{x.label}</p>
                <p className="mt-2 font-mono text-2xl text-cyan-200">
                  {x.value}
                </p>
                <p className="text-xs text-slate-500">{x.unit}</p>
              </div>
            ))}
          </div>
          <div className="flex items-baseline gap-4">
            <strong className="font-mono text-3xl">
              {money(product.priceNt)}
            </strong>
            <span className="flex items-center gap-1 text-sm text-cyan-300">
              <Repeat2 size={15} />
              循環補貨 {money(Math.round(product.priceNt * 0.9))}
            </span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button
              size="lg"
              onClick={() => calc(product.id)}
              disabled={!fit.safe}
            >
              <Calculator />
              試算與循環補貨
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={addOnce}
              disabled={!fit.safe}
            >
              <ShoppingBag />
              單次加入購物車
            </Button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            展示商品 · 剩餘 {product.stock} 包 · 全循環商品滿 $699 免運
          </p>
        </div>
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <NutritionalTrendChart
          batches={product.batches}
          proteinMin={product.proteinMin}
          moistureMax={product.moistureMax}
          ashMax={product.ashMax}
        />
        <section className="panel p-7">
          <span className="eyebrow">把配方攤開來看</span>
          <h2 className="mt-3 text-xl font-semibold">簡單成分，清楚交代。</h2>
          <div className="my-6 flex flex-wrap gap-2">
            {product.ingredients.map((x) => (
              <span
                key={x}
                className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300"
              >
                {x}
              </span>
            ))}
          </div>
          <h3 className="text-sm text-amber-200">含有的過敏原</h3>
          <p className="mt-2 text-sm text-slate-400">
            {product.allergens.join("、")}
          </p>
          <h3 className="mt-6 text-sm">餵食小提醒</h3>
          <p className="mt-2 text-sm leading-7 text-slate-400">
            換糧請循序漸進，並觀察體重、食慾與排便。適配標籤只比對已填寫的資料；若有疾病或特殊飲食需求，請先詢問獸醫。
          </p>
          <p className="mt-6 rounded-xl bg-amber-400/5 p-4 text-xs leading-6 text-amber-100/70">
            本頁商品、成分與批次為展示資料，未宣稱取得 SGS
            或其他第三方認證。正式上架需以供應商規格與原始檢驗報告替換。
          </p>
        </section>
      </div>
    </main>
  );
}
