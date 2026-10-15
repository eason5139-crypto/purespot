"use client";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck, TriangleAlert, Plus, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { useActivePet } from "@/store/usePetContextStore";
import { useCartStore } from "@/store/useCartStore";
import { useUiStore } from "@/store/useUiStore";
import { matchProduct } from "@/lib/matching";
import { money } from "@/lib/utils";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
export function ProductCard({ product }: { product: Product }) {
  const pet = useActivePet();
  const fit = matchProduct(product, pet);
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
      whileHover={{ y: -5 }}
      className="product-card group relative overflow-hidden rounded-2xl border border-white/10 bg-[#111827]/80 transition-colors hover:border-cyan-500/40 backdrop-blur-md"
    >
      <div className="relative aspect-[1.12] overflow-hidden bg-[#111827]">
        <Link
          href={`/products/${product.slug}`}
          aria-label={`查看${product.name}`}
        >
          <Image
            src={product.image}
            alt={`${product.name}包裝概念示意，商品規格以文字為準`}
            fill
            sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>
        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-1">
          <span className="rounded-md bg-slate-950/65 px-2 py-1 text-xs text-slate-300">
            {product.type === "CAT" ? "貓咪" : "狗狗"}
          </span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={`${pet.id}-${fit.label}`}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className={`flex max-w-[80%] items-center gap-1 rounded-md border px-2 py-1 text-xs backdrop-blur-md ${fit.safe ? "border-emerald-400/20 bg-emerald-950/85 text-emerald-200" : fit.conflicts.length && fit.sameSpecies ? "border-amber-400/30 bg-amber-950/85 text-amber-200" : "border-white/10 bg-slate-900/90 text-slate-300"}`}
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
        <span className="absolute bottom-2 right-3 text-xs text-slate-500">
          概念包裝示意
        </span>
      </div>
      <div className="p-5">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
          <span>
            {product.bagGrams / 1000} 公斤 · {product.category}
          </span>
          <span className="flex items-center gap-1 text-cyan-400">
            <FlaskConical size={12} />
            批次履歷
          </span>
        </div>
        <Link
          href={`/products/${product.slug}`}
          className="text-lg font-semibold tracking-tight hover:text-cyan-300"
        >
          {product.name}
        </Link>
        <p className="mt-1 text-sm text-slate-400">{product.subtitle}</p>
        <div className="my-4 flex items-baseline gap-2">
          <strong className="font-mono text-2xl font-medium">
            {money(product.priceNt)}
          </strong>
          <span className="text-xs text-cyan-300">
            循環價 {money(Math.round(product.priceNt * 0.9))}
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1 text-sm"
            onClick={() => calculator(product.id)}
            disabled={!fit.safe}
          >
            試算專屬食量
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
