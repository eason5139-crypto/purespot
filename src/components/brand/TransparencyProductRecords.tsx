"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Search, X } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { petLabels, type PetType, type Product } from "@/lib/types";
import { shopCategories } from "@/lib/productCategories";

type PetFilter = PetType | "ALL";
type KindFilter = "ALL" | "FOOD" | "SUPPLIES";

const pets: { value: PetFilter; label: string }[] = [
  { value: "ALL", label: "全部毛孩" },
  { value: "CAT", label: "貓咪" },
  { value: "DOG", label: "狗狗" },
  { value: "HAMSTER", label: "倉鼠" },
  { value: "RABBIT", label: "兔兔" },
];

function productKind(product: Product) {
  return product.kind === "SUPPLIES" ? "SUPPLIES" : "FOOD";
}

export function TransparencyProductRecords({ products }: { products: Product[] }) {
  const [pet, setPet] = useState<PetFilter>("ALL");
  const [kind, setKind] = useState<KindFilter>("ALL");
  const [category, setCategory] = useState("ALL");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(12);
  const reduceMotion = useReducedMotion();

  const availableCategories = useMemo(() => [...new Set(products
    .filter((product) => (pet === "ALL" || product.type === pet) && (kind === "ALL" || productKind(product) === kind))
    .map((product) => product.category))].sort((a, b) => {
      const aIndex = shopCategories.findIndex((item) => item.name === a);
      const bIndex = shopCategories.findIndex((item) => item.name === b);
      return (aIndex === -1 ? Infinity : aIndex) - (bIndex === -1 ? Infinity : bIndex) || a.localeCompare(b);
    }), [products, pet, kind]);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("zh-TW");
    return products.filter((product) =>
      (pet === "ALL" || product.type === pet) &&
      (kind === "ALL" || productKind(product) === kind) &&
      (category === "ALL" || product.category === category) &&
      (!term || [product.name, product.subtitle, product.category, ...product.ingredients, ...product.allergens]
        .some((value) => value.toLocaleLowerCase("zh-TW").includes(term))),
    );
  }, [products, pet, kind, category, query]);

  function changePet(next: PetFilter) { setPet(next); setCategory("ALL"); setVisibleCount(12); }
  function changeKind(next: KindFilter) { setKind(next); setCategory("ALL"); setVisibleCount(12); }
  function reset() { setPet("ALL"); setKind("ALL"); setCategory("ALL"); setQuery(""); setVisibleCount(12); }

  return <section data-testid="transparency-product-records" className="page-shell pb-20">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <span className="editorial-kicker">02 / PRODUCT RECORDS</span>
        <h2 className="editorial-title mt-3 text-4xl">商品資訊，找得到也看得懂</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#77695d]">先找到想了解的商品，再查看成分、營養與可查閱的批次資訊。</p>
      </div>
      <Link href="/shop" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-[#9c6048] hover:underline">前往商城 <ArrowUpRight size={16} /></Link>
    </div>

    <div className="mt-8 rounded-[1.75rem] border border-[#dacfc3] bg-[#fffdf9] p-4 shadow-[0_16px_36px_-30px_rgba(69,49,35,.5)] sm:p-6">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="依毛孩種類篩選商品">
        {pets.map((item) => <button key={item.value} type="button" aria-pressed={pet === item.value} onClick={() => changePet(item.value)} className={`min-h-10 rounded-full px-4 text-sm font-medium transition-colors ${pet === item.value ? "bg-[#315F86] text-white" : "bg-[#f3eee7] text-[#685b50] hover:bg-[#e8e2d8]"}`}>{item.label}</button>)}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#eee5db] pt-4">
        <div className="flex rounded-full bg-[#f3eee7] p-1" role="group" aria-label="依食物或用品篩選商品">
          {([{"value":"ALL","label":"全部"},{"value":"FOOD","label":"食物"},{"value":"SUPPLIES","label":"用品"}] as const).map((item) => <button key={item.value} type="button" aria-pressed={kind === item.value} onClick={() => changeKind(item.value)} className={`min-h-9 rounded-full px-4 text-sm transition-colors ${kind === item.value ? "bg-white font-semibold text-[#315F86] shadow-sm" : "text-[#77695d]"}`}>{item.label}</button>)}
        </div>
        <label className="min-w-[160px] flex-1 text-xs text-[#756a5e] sm:flex-none">商品分類
          <select value={category} onChange={(event) => { setCategory(event.target.value); setVisibleCount(12); }} className="mt-1 block min-h-10 w-full rounded-xl border border-[#d9cbbd] bg-white px-3 text-sm text-[#302b26] sm:w-52" aria-label="商品分類">
            <option value="ALL">全部分類</option>
            {availableCategories.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label className="relative min-w-[190px] flex-[2] text-xs text-[#756a5e]">搜尋商品或成分
          <Search aria-hidden="true" size={17} className="absolute bottom-3 left-3 text-[#8a7f75]" />
          <input value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(12); }} placeholder="例如：鮭魚、凍乾、貓窩" className="mt-1 min-h-10 w-full rounded-xl border border-[#d9cbbd] bg-white pl-10 pr-3 text-sm text-[#302b26]" />
        </label>
        {(pet !== "ALL" || kind !== "ALL" || category !== "ALL" || query) && <button type="button" onClick={reset} className="inline-flex min-h-10 items-center gap-1 self-end rounded-xl px-3 text-sm text-[#775f50] hover:bg-[#f3eee7]"><X size={15} />清除篩選</button>}
      </div>
    </div>

    <div className="mt-6 flex items-center justify-between gap-3 text-sm text-[#756a5e]"><p role="status">找到 <strong className="text-[#315F86]">{filtered.length}</strong> 款商品</p><span>每張卡片可進入完整商品頁</span></div>
    {filtered.length === 0 ? <div className="mt-5 rounded-[1.5rem] border border-dashed border-[#d9cbbd] bg-[#fffdf9] p-12 text-center"><p className="text-lg font-semibold">還沒有符合條件的商品</p><p className="mt-2 text-sm text-[#806a5c]">試試其他毛孩、分類或關鍵字。</p><button type="button" onClick={reset} className="mt-5 min-h-10 rounded-full bg-[#315F86] px-5 text-sm font-semibold text-white">查看全部商品</button></div> : <>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {filtered.slice(0, visibleCount).map((product, index) => {
          const food = productKind(product) === "FOOD";
          return <motion.article key={product.id} initial={reduceMotion ? false : { opacity: 0, y: 14 }} whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.35, delay: Math.min(index % 4, 2) * 0.05 }} className="group overflow-hidden rounded-[1.5rem] border border-[#dfd4c7] bg-[#fffdf9] shadow-[0_16px_36px_-34px_rgba(67,47,31,.55)] transition-colors hover:border-[#a9bdd0] sm:grid sm:grid-cols-[170px_1fr]">
            <Link href={`/products/${product.slug}`} aria-label={`查看${product.name}商品詳情`} className="relative block aspect-[4/3] overflow-hidden bg-[#f1ebe2] sm:aspect-auto sm:min-h-full">
              <Image src={product.image} alt={`${product.name}商品照片`} fill sizes="(max-width: 640px) 100vw, 170px" className="object-contain transition-transform duration-500 group-hover:scale-[1.05]" />
            </Link>
            <div className="flex flex-col p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-[#eaf2f8] px-3 py-1 text-xs font-semibold text-[#315F86]">{petLabels[product.type]} · {product.category}</span><span className="text-xs text-[#9a735d]">{food ? product.batches.length ? `${product.batches.length} 筆示範批次` : "尚無批次資料" : "用品資訊"}</span></div>
              <h3 className="mt-4 text-xl font-semibold tracking-tight text-[#302b26]">{product.name}</h3>
              <p className="mt-1 text-sm leading-6 text-[#806a5c]">{product.subtitle}</p>
              {food ? <div className="mt-4 grid grid-cols-3 gap-2 border-y border-[#eee5db] py-3 text-center"><Metric label="粗蛋白" value={`${product.proteinMin}%`} /><Metric label="水分" value={`${product.moistureMax}%`} /><Metric label="熱量 / 100g" value={`${product.kcalPer100g}`} /></div> : <p className="mt-4 line-clamp-2 border-y border-[#eee5db] py-3 text-sm leading-6 text-[#756a5e]">{product.description}</p>}
              {food && <p className="mt-3 line-clamp-1 text-xs text-[#806a5c]">主要成分：{product.ingredients.join("、") || "待補充"}</p>}
              <Link href={`/products/${product.slug}`} className="mt-5 inline-flex min-h-10 w-fit items-center gap-2 rounded-full bg-[#315F86] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#244b6b]">查看商品詳情 <ArrowUpRight size={15} /></Link>
              {food && <Link href={`/care/ingredients?product=${encodeURIComponent(product.slug)}`} className="mt-2 inline-flex min-h-10 w-fit items-center gap-2 text-sm font-semibold text-[#315F86] underline underline-offset-4">用成分放大鏡看這款 <ArrowUpRight size={15}/></Link>}
            </div>
          </motion.article>;
        })}
      </div>
      {visibleCount < filtered.length && <div className="mt-9 text-center"><button type="button" onClick={() => setVisibleCount((count) => count + 12)} className="min-h-12 rounded-full border border-[#a9bdd0] bg-white px-8 text-sm font-semibold text-[#315F86] hover:bg-[#eaf2f8]">載入更多商品 · 已顯示 {Math.min(visibleCount, filtered.length)} / {filtered.length}</button></div>}
    </>}
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><span className="block text-[11px] text-[#8d7567]">{label}</span><strong className="mt-1 block text-sm text-[#302b26]">{value}</strong></div>;
}
