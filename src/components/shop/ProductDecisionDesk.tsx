"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Check, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useCatalogStore } from "@/store/useCatalogStore";
import { useActivePet } from "@/store/usePetContextStore";
import { useCartStore } from "@/store/useCartStore";
import { matchProduct } from "@/lib/matching";
import { money, packageSize } from "@/lib/utils";
import { petLabels, type Product } from "@/lib/types";
import { triggerFlyToCart } from "@/lib/flyToCart";

export function ProductDecisionDesk({ initialProduct }: { initialProduct?: Product }) {
  const catalog = useCatalogStore((state) => state.products);
  const pet = useActivePet();
  const addItem = useCartStore((state) => state.addItem);
  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");
  const species = initialProduct?.type ?? pet.type;
  const options = catalog.filter((p) => p.isPublished !== false && p.type === species &&
    (initialProduct ? p.kind === initialProduct.kind : p.kind !== "SUPPLIES"));
  const first = options.find((p) => p.id === leftId) ?? options.find((p) => p.id === initialProduct?.id) ?? options[0];
  const second = options.find((p) => p.id === rightId && p.id !== first?.id) ?? options.find((p) => p.id !== first?.id);
  const isFood = initialProduct?.kind !== "SUPPLIES";

  function add(event: React.MouseEvent<HTMLButtonElement>, product: Product) {
    try {
      addItem({ productId: product.id, petId: pet.id, quantity: 1, mode: "ONCE", intervalDays: null });
      triggerFlyToCart(event.currentTarget, { image: product.image, label: product.name });
      toast.success(`已加入 ${product.name}`);
    } catch (reason) { toast.error(reason instanceof Error ? reason.message : "無法加入購物車"); }
  }

  if (!first) return <p className="py-8 text-sm text-[#657681]">目前沒有可比較的商品，請到商城查看其他選物。</p>;
  return <section id="product-decision-desk" className="decision-desk" aria-label="商品比較桌">
    <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
      <div><h2 className="editorial-title text-3xl text-[#18344c] sm:text-4xl">放在一起，就好選了。</h2>
        <p className="mt-3 text-sm leading-7 text-[#647581]">{petLabels[species]}{isFood ? "食品" : "用品"}並排看，先確認差別，再選適合的一款。</p></div>
      <Link href="/shop" className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-[#315f86]">看全部選物<ArrowUpRight size={17} /></Link>
    </div>
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[#dce4e7] bg-[#dce4e7] md:grid-cols-2">
      {[first, second].map((product, index) => product ? <article key={index} className="min-w-0 bg-[#fffefa] p-5 sm:p-7">
        <label className="block text-xs font-semibold text-[#647581]">{index === 0 ? "第一款商品" : "第二款商品"}
          <select aria-label={index === 0 ? "第一款商品" : "第二款商品"} value={product.id} className="input mt-2 w-full"
            onChange={(event) => index === 0 ? setLeftId(event.target.value) : setRightId(event.target.value)}>
            {options.filter((p) => index === 0 || p.id !== first.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <AnimatePresence mode="wait" initial={false}><motion.div key={product.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .2 }}>
          <div className="mt-5 flex items-center gap-5"><Link href={`/products/${product.slug}`} className="relative block aspect-square w-[35%] shrink-0 overflow-hidden rounded-xl bg-[#f2f3ef]">
            <Image src={product.image} alt={product.name} fill sizes="(max-width:768px) 130px, 190px" className="object-contain p-2" /></Link>
            <div className="min-w-0"><span className="text-xs text-[#647581]">{product.category} · {packageSize(product.bagGrams)}</span>
              <h3 className="mt-2 text-lg font-semibold leading-relaxed text-[#18344c]">{product.name}</h3><strong className="mt-2 block text-xl text-[#315f86]">{money(product.priceNt)}</strong></div>
          </div>
          <dl className="mt-5 divide-y divide-[#e1e7e8] border-y border-[#e1e7e8] text-sm">
            {isFood && product.nutritionDataProvided !== false && <div className="flex flex-wrap justify-between gap-2 py-3"><dt className="text-[#647581]">營養標示</dt><dd>蛋白 {product.proteinMin}% · {product.kcalPer100g} kcal / 100g</dd></div>}
            <div className="py-3"><dt className="text-[#647581]">{isFood ? "主要原料" : "材質與規格"}</dt><dd className="mt-1 min-h-12 leading-6 text-[#283f50]">{product.ingredients.join("、") || "資料待補充"}</dd></div>
            {isFood && <div className="flex flex-wrap justify-between gap-2 py-3"><dt className="text-[#647581]">已列過敏原</dt><dd className="text-[#94604a]">{product.allergens.join("、") || "未列出"}</dd></div>}
            <div className="flex items-start gap-2 py-3 text-[#315f86]"><Check size={16} className="mt-0.5 shrink-0" /><dd>{matchProduct(product, pet).label}</dd></div>
          </dl>
          <button type="button" disabled={product.stock <= 0 || !matchProduct(product, pet).safe} onClick={(event) => add(event, product)}
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#315f86] px-4 text-sm font-semibold text-white transition hover:bg-[#244b6b] disabled:bg-[#dde3e6] disabled:text-[#6b7983]">
            <ShoppingBag size={17} />{product.stock <= 0 ? "暫時缺貨" : !matchProduct(product, pet).safe ? "請先確認毛孩條件" : "加入購物車"}<Plus size={16} /></button>
        </motion.div></AnimatePresence>
      </article> : <div key={index} className="bg-[#fffefa] p-8 text-sm text-[#647581]">目前只有一款相同物種與類型的商品。</div>)}
    </div>
  </section>;
}
