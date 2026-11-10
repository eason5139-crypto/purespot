"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Layers3, ScanSearch, ShieldAlert, TestTube2 } from "lucide-react";
import { useCatalogStore } from "@/store/useCatalogStore";
import { petLabels, type Product } from "@/lib/types";
import { awardStamp } from "@/lib/explorePassport";

type Layer = "ingredients" | "allergens" | "batches";
const layerCopy: Record<Layer, { label: string; hint: string }> = {
  ingredients: { label: "01 配方", hint: "先看主成分與營養標示" },
  allergens: { label: "02 過敏原", hint: "再檢查需要留意的原料" },
  batches: { label: "03 批次", hint: "最後辨認資料的核實狀態" },
};
const layers: Layer[] = ["ingredients", "allergens", "batches"];

function LayerContent({ product, layer }: { product: Product; layer: Layer }) {
  if (layer === "ingredients") return <>
    <div className="flex flex-wrap gap-2">{product.ingredients.length ? product.ingredients.map((item) => <span key={item} className="rounded-full bg-[#eaf2f8] px-3 py-2 text-sm text-[#315F86]">{item}</span>) : <p>配方資料待補充</p>}</div>
    <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[#d8e4e9] pt-4 text-center"><Metric label="粗蛋白最低" value={`${product.proteinMin}%`} /><Metric label="水分最高" value={`${product.moistureMax}%`} /><Metric label="大卡 / 100g" value={`${product.kcalPer100g}`} /></div>
  </>;
  if (layer === "allergens") return <>
    <p className="text-sm leading-7 text-[#526271]">依目前商品資料列出的過敏原。若毛孩有過敏史，請再核對實品包裝與獸醫建議。</p>
    <div className="mt-4 flex flex-wrap gap-2">{product.allergens.length ? product.allergens.map((item) => <span key={item} className="rounded-full border border-[#d8a58d] bg-[#fff2e9] px-3 py-2 text-sm font-medium text-[#8b503b]">{item}</span>) : <span className="text-sm text-[#65717a]">未列出已知過敏原，並不代表零過敏風險。</span>}</div>
  </>;
  const sourced = product.batches.filter((batch) => batch.isDemo === false && /^https?:\/\//i.test(batch.reportUrl ?? ""));
  return <>
    <p className="rounded-xl border border-[#c9dbe8] bg-[#eaf2f8] p-4 text-sm leading-7 text-[#315F86]">{sourced.length ? "以下批次有來源連結，請開啟報告核對；正式資料須由品牌再次確認。" : "目前沒有可供正式核實的批次報告。展示數值不作為正式檢驗證明。"}</p>
    {sourced.length > 0 && <div className="mt-4 space-y-2">{sourced.map((batch) => <div key={batch.batch} className="flex flex-wrap justify-between gap-2 border-b border-[#d8e4e9] py-2 text-sm"><span>{batch.batch} · {batch.date}</span><span>蛋白 {batch.protein}% · 水分 {batch.moisture}% · 灰分 {batch.ash}%</span><a href={batch.reportUrl!} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#315F86] underline">查看來源</a></div>)}</div>}
  </>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div><span className="block text-[11px] text-[#667681]">{label}</span><strong className="mt-1 block text-lg text-[#263e50]">{value}</strong></div>; }

export function IngredientLens({ initialSlug }: { initialSlug: string }) {
  const products = useCatalogStore((state) => state.products);
  const foods = useMemo(() => products.filter((item) => item.kind !== "SUPPLIES"), [products]);
  const [slug, setSlug] = useState(initialSlug);
  const [compareSlug, setCompareSlug] = useState("");
  const [layer, setLayer] = useState<Layer>("ingredients");
  const [visited, setVisited] = useState<Layer[]>([]);
  const product = foods.find((item) => item.slug === slug) ?? foods[0];
  const compare = foods.find((item) => item.slug === compareSlug);
  if (!product) return <main className="page-shell py-20">目前沒有可查看的食品資料。</main>;
  const sameType = foods.filter((item) => item.type === product.type && item.id !== product.id);
  function chooseLayer(next: Layer) { const updated = visited.includes(next) ? visited : [...visited, next]; setLayer(next); setVisited(updated); if (updated.length === layers.length) awardStamp("lens"); }
  return <main id="main-content" className="min-h-screen bg-[#f5f3ee] pb-24 text-[#263e50]">
    <section className="overflow-hidden bg-[#25445b] text-white"><div className="page-shell relative py-14 sm:py-20"><span className="text-xs font-bold tracking-[.22em] text-[#a8cfe7]">PURESPOT · EXPLORE WHAT'S INSIDE</span><h1 className="editorial-title mt-5 text-[clamp(2.35rem,9.5vw,4.5rem)] leading-[1.12]">從一張照片，<br/><em className="text-[#b8d8ed]">看見每一層選擇。</em></h1><p className="mt-6 max-w-xl text-sm leading-8 text-[#d8e6ef] sm:text-base">點選照片上的光點，依序看配方、已知過敏原與批次狀態。想比較時，把第二款放上工作桌。</p><ScanSearch className="pointer-events-none absolute -bottom-16 right-2 size-60 text-white/5 sm:size-80" strokeWidth={0.8}/></div></section>
    <div className="page-shell py-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold tracking-[.18em] text-[#5B93C5]">INGREDIENT LENS / 01—03</p><h2 className="editorial-title mt-3 text-3xl sm:text-4xl">今天想看哪一款？</h2></div><Link href="/transparency" className="text-sm font-semibold text-[#315F86] underline underline-offset-4">查看全部商品資訊</Link></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">主要商品<select aria-label="選擇主要商品" value={product.slug} onChange={(event) => { setSlug(event.target.value); setCompareSlug(""); setVisited([]); setLayer("ingredients"); }} className="mt-2 block min-h-12 w-full rounded-xl border border-[#bed1de] bg-white px-4 text-sm">{foods.map((item) => <option key={item.id} value={item.slug}>{petLabels[item.type]} · {item.name}</option>)}</select></label><label className="text-sm font-semibold">並排比較<select aria-label="選擇比較商品" value={compareSlug} onChange={(event) => setCompareSlug(event.target.value)} className="mt-2 block min-h-12 w-full rounded-xl border border-[#bed1de] bg-white px-4 text-sm"><option value="">先專心看一款</option>{sameType.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label></div>
      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,.9fr)]"><div className="relative aspect-[1.08] overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_50%_40%,#ffffff_0%,#e5e9e8_65%,#cfdbdf_100%)] shadow-[0_28px_60px_-40px_rgba(25,55,70,.5)]"><Image src={product.image} alt={`${product.name}商品照片，點選光點查看資料`} fill sizes="(max-width:1024px) 100vw,55vw" className="object-contain p-10 sm:p-16" priority/><div className="absolute bottom-4 left-4 rounded-full bg-[#25445b]/85 px-4 py-2 text-xs font-semibold text-white backdrop-blur">{product.name}</div>{layers.map((item, index) => <button key={item} type="button" aria-label={`查看${layerCopy[item].label}`} aria-pressed={layer === item} onClick={() => chooseLayer(item)} style={{ left: `${[23,73,54][index]}%`, top: `${[28,42,72][index]}%` }} className={`absolute flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white font-bold shadow-xl transition-transform hover:scale-110 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#25445b] ${layer === item ? "bg-[#315F86] text-white" : "bg-white/90 text-[#315F86] animate-pulse motion-reduce:animate-none"}`}>{index + 1}</button>)}</div>
        <div className="rounded-[2rem] border border-[#d4dfe5] bg-white p-5 shadow-[0_18px_45px_-36px_rgba(25,55,70,.4)] sm:p-7"><div className="flex items-center gap-2 text-sm font-semibold text-[#315F86]"><Layers3 size={18}/>逐層閱讀</div><div className="mt-5 grid grid-cols-3 gap-2">{layers.map((item) => <button key={item} type="button" onClick={() => chooseLayer(item)} aria-pressed={layer === item} className={`min-h-14 rounded-xl px-2 text-xs font-semibold sm:text-sm ${layer === item ? "bg-[#315F86] text-white" : "bg-[#edf3f7] text-[#315F86] hover:bg-[#dce9f2]"}`}>{layerCopy[item].label}{visited.includes(item) && <Check size={13} className="ml-1 inline"/>}</button>)}</div><p className="mt-6 text-xs font-semibold tracking-wider text-[#6b8da5]">{layerCopy[layer].hint}</p><h3 className="editorial-title mt-2 text-2xl">{layer === "ingredients" ? "袋子裡有什麼？" : layer === "allergens" ? "替敏感毛孩多看一眼" : "這筆資料查得到來源嗎？"}</h3><div className="mt-5 min-h-36 text-[#526271]"><LayerContent product={product} layer={layer}/></div><div className="mt-6 border-t border-[#e2e9ec] pt-4 text-xs leading-6 text-[#76838b]">照片光點是閱讀導覽，非實際包裝標示位置。商品展示資料請與實品標示核對。</div></div></div>
      {compare && <section aria-label="食品並排比較" className="mt-9 rounded-[2rem] border border-[#d4dfe5] bg-white p-5 sm:p-8"><div className="flex items-center gap-2 text-[#315F86]"><TestTube2 size={20}/><h2 className="editorial-title text-2xl">並排比較</h2></div><div className="mt-6 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr className="border-b border-[#d6e2e8]"><th className="py-3 font-medium">比較項目</th><th className="py-3">{product.name}</th><th className="py-3">{compare.name}</th></tr></thead><tbody>{([ ["粗蛋白最低", `${product.proteinMin}%`, `${compare.proteinMin}%`], ["水分最高", `${product.moistureMax}%`, `${compare.moistureMax}%`], ["熱量 / 100g", `${product.kcalPer100g} 大卡`, `${compare.kcalPer100g} 大卡`], ["主要成分", product.ingredients.join("、") || "待補充", compare.ingredients.join("、") || "待補充"], ["已知過敏原", product.allergens.join("、") || "未列出", compare.allergens.join("、") || "未列出"], ["附來源批次", `${product.batches.filter((item) => item.isDemo === false && /^https?:\/\//i.test(item.reportUrl ?? "")).length} 筆`, `${compare.batches.filter((item) => item.isDemo === false && /^https?:\/\//i.test(item.reportUrl ?? "")).length} 筆`] ] as string[][]).map(([label, a, b]) => <tr key={label} className="border-b border-[#edf1f3] align-top"><th className="w-36 py-4 pr-4 font-semibold text-[#536b7b]">{label}</th><td className="w-[40%] py-4 pr-5">{a}</td><td className="py-4">{b}</td></tr>)}</tbody></table></div><p className="mt-4 flex items-start gap-2 text-xs leading-6 text-[#7b695d]"><ShieldAlert size={16} className="mt-0.5 shrink-0"/>數值與配方須以正式標示核對；此比較不代替獸醫營養建議。</p><div className="mt-5 flex flex-wrap gap-3"><Link href={`/products/${product.slug}`} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#315F86] px-4 text-sm font-semibold text-white">查看{product.name}<ArrowRight size={15}/></Link><Link href={`/products/${compare.slug}`} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#a5bfd1] px-4 text-sm font-semibold text-[#315F86]">查看{compare.name}<ArrowRight size={15}/></Link></div></section>}
    </div>
  </main>;
}
