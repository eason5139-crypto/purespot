"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck, TriangleAlert, Plus, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { useActivePet } from "@/store/usePetContextStore";
import { useCartStore } from "@/store/useCartStore";
import { useUiStore } from "@/store/useUiStore";
import { matchProduct } from "@/lib/matching";
import { money, packageSize } from "@/lib/utils";
import type { Product } from "@/lib/types";
import { petLabels, supportsFoodCalculator } from "@/lib/types";
import { Button } from "@/components/ui/button";
export function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const pet = useActivePet();
  const fit = matchProduct(product, pet);
  const canCalculate = product.kind !== "SUPPLIES" && supportsFoodCalculator(product.type) && product.kcalPer100g > 0;
  const add = useCartStore((s) => s.addItem);
  const calculator = useUiStore((s) => s.openCalculator);
  function addToCart() {
    try {
      add({
        productId: product.id,
        petId: pet.id,
        quantity: 1,
        mode: "ONCE",
        intervalDays: null,
      });
      toast.success(`已為${pet.name}加入購物車`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加入失敗");
    }
  }
  return (
    <motion.article
      layout
      whileHover={{ y: -3 }}
      className="product-card group relative overflow-hidden border border-[#d9cbbd] bg-[#fffdf9] transition-all hover:border-[#a96e51] hover:shadow-[0_18px_36px_-28px_#735646]"
    >
      <div className="relative aspect-[1.02] overflow-hidden bg-[#ede6dc]">
        <Link
          href={`/products/${product.slug}`}
          aria-label={`查看${product.name}`}
        >
          <Image
            src={product.image}
            alt={`${product.name}包裝概念示意，商品規格以文字為準`}
            fill
            sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,25vw"
            className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
          />
        </Link>
        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-1">
          <span className="bg-[#f8f4ed]/95 px-2 py-1 text-xs font-medium text-[#6b5547]">
            {petLabels[product.type]} · {product.kind === "SUPPLIES" ? "用品" : "食物"}
          </span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={`${pet.id}-${fit.label}`}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className={`flex max-w-[80%] items-center gap-1 border px-2 py-1 text-xs backdrop-blur-md ${fit.safe ? "border-[#a8b5a2] bg-[#edf0e9] text-[#49634c]" : fit.conflicts.length && fit.sameSpecies ? "border-[#d7b299] bg-[#f4e7dc] text-[#80543c]" : "border-[#d4c7ba] bg-[#f5eee6] text-[#756b61]"}`}
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
        <span className="absolute bottom-2 right-3 bg-[#f8f4ed]/80 px-1 text-[10px] text-[#766c62]">
          概念包裝示意
        </span>
      </div>
      <div className="p-5">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
          <span>
            {packageSize(product.bagGrams)} · {product.category}
          </span>
          {product.kind !== "SUPPLIES" && <span className="flex items-center gap-1 text-cyan-400">
            <FlaskConical size={12} />
            {product.batches.length ? "批次履歷" : "配方資料"}
          </span>}
        </div>
        <Link
          href={`/products/${product.slug}`}
          className="editorial-title text-xl font-semibold tracking-tight text-[#302b26] hover:text-[#955a42]"
        >
          {product.name}
        </Link>
        <p className="mt-1 text-sm text-slate-400">{product.subtitle}</p>
        <div className="my-4 flex items-baseline gap-2">
          <strong className="font-mono text-2xl font-medium">
            {money(product.priceNt)}
          </strong>
          {product.autoshipEligible && <span className="text-xs text-cyan-300">
            循環價 {money(Math.round(product.priceNt * 0.9))}
          </span>}
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1 text-sm"
            onClick={() => canCalculate ? calculator(product.id) : router.push(`/products/${product.slug}`)}
            disabled={canCalculate && !fit.safe}
          >
            {canCalculate ? "試算專屬食量" : "查看商品詳情"}
          </Button>
          <Button
            size="icon"
            variant={fit.safe ? "default" : "secondary"}
            disabled={!fit.safe || product.stock === 0}
            onClick={addToCart}
            aria-label={`將${product.name}加入購物車`}
          >
            <Plus />
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
