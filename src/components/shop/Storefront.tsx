"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  SlidersHorizontal,
  Calculator,
  ShieldCheck,
  Repeat2,
  Search,
  PawPrint,
  CircleHelp,
  ArrowUpRight,
  Heart,
} from "lucide-react";
import { useActivePet } from "@/store/usePetContextStore";
import { useUiStore } from "@/store/useUiStore";
import { ugcPosts } from "@/lib/catalog";
import { shopCategories } from "@/lib/productCategories";
import { useCatalogStore } from "@/store/useCatalogStore";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { matchProduct } from "@/lib/matching";
import { calculatePetNutrition } from "@/lib/nutritionCalculator";
import { decimal, money } from "@/lib/utils";
import { petLabels, supportsFoodCalculator, type PetType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ProductCard } from "./ProductCard";
import { ProductComparison } from "./ProductComparison";
import type { SiteContent } from "@/lib/siteContent";
export function Storefront({ content }: { content: SiteContent }) {
  const products = useCatalogStore((s) => s.products);
  const favorites = useFavoritesStore((s) => s.ids);
  const pet = useActivePet();
  const edit = useUiStore((s) => s.setPetEditorOpen);
  const openCalc = useUiStore((s) => s.openCalculator);
  const openUgc = useUiStore((s) => s.openUgc);
  const [species, setSpecies] = useState<"all" | "personal" | PetType>("all");
  const [kind, setKind] = useState<"all" | "FOOD" | "SUPPLIES">("all");
  const [productCategory, setProductCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"fit" | "price-asc" | "price-desc" | "name">("fit");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [priceCeiling, setPriceCeiling] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(8);
  const counts = new Map<string, number>();
  for (const product of products) counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
  const catalogCategories = [
    ...shopCategories.map(({ name }) => name).filter((name) => counts.has(name)),
    ...[...counts.keys()].filter((name) => !shopCategories.some((category) => category.name === name)).sort((a, b) => a.localeCompare(b, "zh-Hant")),
  ];
  const recommended = products.find((p) => p.kind !== "SUPPLIES" && p.autoshipEligible && matchProduct(p, pet).safe);
  const result = recommended && supportsFoodCalculator(pet.type)
    ? calculatePetNutrition(
        {
          petType: pet.type,
          weightKg: pet.weightKg,
          ageMonths: pet.ageMonths,
          isNeutered: pet.isNeutered,
          activityLevel: pet.activityLevel,
          isWeightLossGoal: pet.goal === "WEIGHT_LOSS",
          foodKcalPer100g: recommended.kcalPer100g,
        },
        recommended.bagGrams,
        recommended.priceNt,
      )
    : null;
  const filtered = products
    .filter(
      (p) =>
        (species === "personal"
          ? p.type === pet.type
          : species === "all"
            ? true
            : p.type === species) &&
        (kind === "all" || (p.kind ?? "FOOD") === kind) &&
        (productCategory === "all" || p.category === productCategory) &&
        (!favoritesOnly || favorites.includes(p.id)) &&
        (priceCeiling === null || p.priceNt <= priceCeiling) &&
        `${p.name}${p.subtitle}${p.category}${p.ingredients.join("")}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) &&
        (!inStockOnly || p.stock > 0),
    )
    .sort((a, b) => sort === "price-asc" ? a.priceNt - b.priceNt
      : sort === "price-desc" ? b.priceNt - a.priceNt
      : sort === "name" ? a.name.localeCompare(b.name, "zh-Hant")
      : matchProduct(b, pet).score - matchProduct(a, pet).score);
  const visibleProducts = filtered.slice(0, visibleCount);
  return (
    <main id="main-content" className="shop-surface bg-[#f8f4ed] py-8 text-[#302b26]">
      <div className="page-shell pb-12">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-[#74675b]">
          <PawPrint size={16} className="text-[#9b6049]" />
          你好，{pet.name}的家人
          <span className="hidden sm:inline">。今天也一起好好生活。</span>
        </div>
        <button
          onClick={() => edit(true)}
          className="flex items-center gap-2 text-sm text-[#74675b] hover:text-[#9b6049]"
        >
          <SlidersHorizontal size={15} />
          毛孩偏好
        </button>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_330px]">
        <section className="hero-panel relative min-h-[425px] overflow-hidden bg-[#303a31] text-[#fffaf2]">
          <Image
            src={content.shopImage}
            alt="貓與兔兔在家中探索食物和用品的生活場景"
            fill
            priority
            sizes="(max-width:1024px) 100vw,70vw"
            className="object-cover object-[75%_center]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(27,43,36,.95)_0%,rgba(27,43,36,.78)_38%,rgba(27,43,36,.08)_100%)]" />
          <div className="relative z-10 flex h-full max-w-[590px] flex-col justify-center p-8 sm:p-11">
            <div className="mb-5 text-xs font-semibold tracking-[.2em] text-[#e9c5a5]">
              {content.shopBadge}
            </div>
            <h1 className="editorial-title text-[clamp(2.5rem,4.5vw,4.8rem)] leading-[1.12] tracking-[-.06em]">
              為{pet.name}的每一天，
              <br />
              <span className="text-[#e9b08c]">{content.shopTitleAccent}</span>
            </h1>
            <p className="mt-5 max-w-[360px] text-sm leading-7 text-[#f5eade]">
              {content.shopDescription}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button type="button" className="editorial-action min-h-11 bg-[#935941] px-5 text-sm font-semibold text-white hover:bg-[#794632]"
                onClick={() =>
                  document
                    .getElementById("products")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                探索專屬選物
              </button>
              <button type="button" className="editorial-action inline-flex min-h-11 items-center gap-2 border border-[#f4e8d8]/70 px-5 text-sm font-semibold text-[#fff9ee] hover:bg-white/10"
                onClick={() =>
                  recommended ? openCalc(recommended.id) : edit(true)
                }
              >
                <Calculator size={17} />
                食量試算
              </button>
            </div>
          </div>
        </section>
        {supportsFoodCalculator(pet.type) ? <section className="relative flex flex-col justify-between border border-[#d9cbbd] bg-[#f1ebe2] p-6">
          <div>
            <div className="flex items-center justify-between">
              <span className="editorial-kicker">今日營養提案</span>
              <Calculator size={19} className="text-[#9c6048]" />
            </div>
            <h2 className="mt-3 text-lg font-semibold">
              {pet.name}的剛剛好份量
            </h2>
            <p className="mt-1 text-xs text-[#75695e]">
              {pet.weightKg} 公斤 · {pet.ageMonths < 12 ? "成長期" : "成齡"} ·{" "}
              {pet.isNeutered ? "已結紮" : "未結紮"}
            </p>
          </div>
          {result && recommended ? (
            <>
              <div className="my-5 flex items-end gap-2">
                <motion.span
                  key={`${pet.id}-${pet.weightKg}`}
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  className="editorial-title text-[3.5rem] leading-none tracking-tight text-[#4e5e4b]"
                >
                  {decimal(result.dailyGrams, 0)}
                </motion.span>
                <span className="pb-1 text-sm text-[#75695e]">克 / 日</span>
              </div>
              <div className="mb-5 grid grid-cols-2 gap-3 border-t border-[#d9cbbd] pt-4">
                <div>
                  <p className="text-xs text-slate-500">每日飲食預算</p>
                  <p className="mt-1 font-mono text-lg">
                    {money(result.autoshipDailyCostNt)}
                    <span className="ml-1 text-xs text-slate-500">起</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">建議補貨週期</p>
                  <p className="mt-1 text-lg">
                    {result.recommendedIntervalDays / 7}
                    <span className="ml-1 text-xs text-slate-400">週</span>
                  </p>
                </div>
              </div>
              <button type="button" className="editorial-action min-h-11 w-full border border-[#9f8f7e] text-sm font-semibold text-[#584536] hover:bg-white/70" onClick={() => openCalc(recommended.id)}>
                調整我的配糧計畫
              </button>
              <p className="mt-2 text-center text-xs text-slate-500">
                依{recommended.name}與循環價估算
              </p>
            </>
          ) : (
            <div className="mt-5">
              <p className="mb-4 text-sm text-slate-400">
                目前沒有符合全部條件的主食，請先確認毛孩資料。
              </p>
              <Button onClick={() => edit(true)}>檢查毛孩資料</Button>
            </div>
          )}
        </section> : <section className="relative flex flex-col justify-between border border-[#c4d0bf] bg-[#e7eee4] p-7">
          <div><p className="text-xs font-semibold tracking-[.18em] text-[#59715c]">A LITTLE LIFE, FULL OF JOY</p><h2 className="editorial-title mt-5 text-3xl leading-tight text-[#334737]">{pet.name}的日常，<br />從喜歡的事開始。</h2><p className="mt-5 text-sm leading-7 text-[#5c705e]">食物、玩具與舒適的小空間，為{petLabels[pet.type]}慢慢挑。食量資訊請以實品標示及專業建議為準。</p></div>
          <button type="button" className="editorial-action mt-8 min-h-11 bg-[#935941] px-5 text-sm font-semibold text-white hover:bg-[#794632]" onClick={() => { setSpecies(pet.type); document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }); }}>看{pet.name}的選物 <ArrowUpRight size={15} className="ml-1 inline" /></button>
        </section>}
      </div>
      <div className="my-9 grid grid-cols-1 divide-y divide-[#d9cbbd] border-y border-[#d9cbbd] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          {
            icon: ShieldCheck,
            title: "每一批，都透明",
            desc: "原料與檢驗數據，一目瞭然",
            color: "text-[#9c6048]",
          },
          {
            icon: PawPrint,
            title: "每一隻，都獨特",
            desc: "依年齡、體重與過敏原選物",
            color: "text-[#9c6048]",
          },
          {
            icon: Repeat2,
            title: "每一次，都剛好",
            desc: "預測補貨，留住陪伴的時間",
            color: "text-[#4e5e4b]",
          },
        ].map(({ icon: Icon, title, desc, color }) => (
          <div
            key={title}
            className="flex items-center gap-3 py-4 sm:justify-center"
          >
            <Icon size={23} className={color} />
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="mt-1 text-xs text-slate-500">{desc}</p>
            </div>
          </div>
        ))}
      </div>
      <section className="mb-16 border-t border-[#cbbdb0] pt-12" aria-labelledby="category-heading">
        <div className="grid gap-8 lg:grid-cols-[minmax(270px,.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div>
            <p className="editorial-kicker">THE COLLECTION / 依喜好慢慢挑</p>
            <h2 id="category-heading" className="editorial-title mt-4 max-w-md text-4xl leading-[1.2] sm:text-5xl">把每一天，<br /><em className="font-normal text-[#a35f44]">過成牠喜歡的樣子。</em></h2>
            <p className="mt-5 max-w-md text-sm leading-7 text-[#71675c]">從一餐飯到一件玩具，{catalogCategories.length} 個主題裡，慢慢找到適合你們的日常。</p>
            <div className="relative mt-8 hidden aspect-[4/5] max-w-[480px] overflow-hidden bg-[#d5c8b7] lg:block"><Image src="/images/editorial/small-friends-v2.png" alt="倉鼠與兔兔在家中的生活片刻" fill sizes="40vw" className="object-cover transition-transform duration-700 hover:scale-[1.03]" /><span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#202c27]/75 to-transparent px-6 pb-5 pt-20 text-xs tracking-[.18em] text-white">SMALL MOMENTS, BIG LOVE</span></div>
          </div>
          <div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2" role="group" aria-label="食物或用品">
                {([ ["all", "全部"], ["FOOD", "食物"], ["SUPPLIES", "用品"] ] as const).map(([value, label]) => (
                  <button key={value} type="button" aria-pressed={kind === value} onClick={() => { setKind(value); setProductCategory("all"); setVisibleCount(8); }} className={`min-h-11 rounded-full border px-5 text-sm transition-all ${kind === value ? "border-[#3e4c3c] bg-[#3e4c3c] text-white" : "border-[#cbb9a7] text-[#655244] hover:border-[#7a8a70]"}`}>{label}</button>
                ))}
              </div>
              <button type="button" onClick={() => { setProductCategory("all"); setKind("all"); setSpecies("all"); setVisibleCount(8); document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }); }} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-[#8c5a43] underline underline-offset-4 hover:text-[#6f3f2d]">看全部 {products.length} 款 <ArrowUpRight size={16} /></button>
            </div>
            <div className="grid gap-x-7 sm:grid-cols-2">
              {catalogCategories.filter((name) => kind === "all" || (shopCategories.find((item) => item.name === name)?.kind ?? (products.find((p) => p.category === name)?.kind ?? "FOOD")) === kind).map((name, index) => {
                const info = shopCategories.find((item) => item.name === name) ?? { name, english: "MORE TO EXPLORE", description: "探索更多日常選物。", tint: "#e8e1d8" };
                const selected = productCategory === name;
                return <button key={name} type="button" aria-pressed={selected} onClick={() => { setProductCategory(selected ? "all" : name); setVisibleCount(8); document.getElementById("products")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className={`group flex min-h-28 items-center gap-4 border-b py-5 text-left transition-colors hover:border-[#9a7157] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9c6048] ${selected ? "border-[#955a42] text-[#955a42]" : "border-[#d5c8ba] text-[#302b26]"}`}>
                  <span className="self-start pt-1 font-mono text-xs text-[#a38672]">{String(index + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1"><strong className="editorial-title block text-[1.55rem] leading-tight group-hover:text-[#9a6046]">{name}</strong><span className="mt-2 block text-xs leading-5 text-[#807266]">{info.description}</span></span>
                  <span className="flex shrink-0 flex-col items-end gap-2 text-xs text-[#97775f]"><ArrowUpRight size={18} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />{counts.get(name)} 款</span>
                </button>;
              })}
            </div>
          </div>
        </div>
      </section>
      <section id="products" className="scroll-mt-32">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="eyebrow mb-2">由牠出發的好選擇</div>
            <h2 className="text-2xl font-semibold">
              {productCategory === "all" ? (species === "personal" ? `${pet.name}的專屬選物` : "探索全部選物") : productCategory}
              <span className="ml-3 align-middle text-sm font-normal text-slate-500">
                {filtered.length} 款商品
              </span>
            </h2>
          </div>
          <label className="relative w-full sm:w-64">
            <span className="sr-only">搜尋商品或成分</span>
            <Search
              className="absolute left-3 top-3 text-slate-500"
              size={17}
            />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setVisibleCount(8); }}
              className="input !mt-0 pl-10"
              placeholder="搜尋商品或成分"
            />
          </label>
        </div>
        <div className="mb-5 mt-5 flex flex-wrap items-center justify-between gap-3">
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="適用動物"
          >
            {[
              { id: "personal", label: "專屬推薦" },
              { id: "all", label: "全部選物" },
              ...(["CAT", "DOG", "HAMSTER", "RABBIT"] as const).map((id) => ({ id, label: petLabels[id] })),
            ].map((tab) => (
              <button
                key={tab.id}
                aria-pressed={species === tab.id}
                className={`rounded-lg px-4 py-2 text-sm transition-colors ${species === tab.id ? "bg-[#f7e4d5] text-[#9a5036] ring-1 ring-[#e8af8e]" : "text-[#806c60] hover:bg-[#f7eee6]"}`}
                onClick={() => { setSpecies(tab.id as typeof species); setVisibleCount(8); }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" aria-pressed={favoritesOnly} onClick={() => { setFavoritesOnly((value) => !value); setVisibleCount(8); }} className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors ${favoritesOnly ? "border-[#a96043] bg-[#f9e5d9] text-[#934d34]" : "border-[#d6c7b8] text-[#76685d] hover:bg-[#fffaf4]"}`}><Heart size={15} fill={favoritesOnly ? "currentColor" : "none"} />我的收藏 {favorites.length}</button>
            <label className="flex items-center gap-2 text-xs text-[#806c60]">價格
              <select aria-label="價格範圍" value={priceCeiling ?? "all"} onChange={(event) => { setPriceCeiling(event.target.value === "all" ? null : Number(event.target.value)); setVisibleCount(8); }} className="min-h-10 rounded-lg border border-[#d6c7b8] bg-white px-2 text-sm text-[#3b2b24]"><option value="all">不限</option><option value="300">$300 以下</option><option value="500">$500 以下</option><option value="1000">$1,000 以下</option><option value="1500">$1,500 以下</option></select>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input type="checkbox" checked={inStockOnly} onChange={(event) => { setInStockOnly(event.target.checked); setVisibleCount(8); }} />
              只看有貨
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              排序
              <select aria-label="商品排序" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="rounded-lg border border-[#e5d3c3] bg-white px-3 py-2 text-sm text-[#3b2b24]">
                <option value="fit">毛孩適配</option>
                <option value="price-asc">價格：低到高</option>
                <option value="price-desc">價格：高到低</option>
                <option value="name">商品名稱</option>
              </select>
            </label>
          </div>
        </div>
        {filtered.length ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {visibleProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="panel p-12 text-center">
            <Search className="mx-auto mb-3 text-slate-500" />
            <p>沒有符合的商品</p>
            <Button
              variant="ghost"
              className="mt-3"
              onClick={() => {
                setQuery("");
                setSpecies("all");
                setKind("all");
                setProductCategory("all");
                setInStockOnly(false);
                setFavoritesOnly(false);
                setPriceCeiling(null);
                setSort("fit");
                setVisibleCount(8);
              }}
            >
              清除篩選
            </Button>
          </div>
        )}
        {filtered.length > visibleCount && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <p className="text-xs text-[#86766b]">已顯示 {visibleProducts.length} / {filtered.length} 款</p>
            <button type="button" onClick={() => setVisibleCount((count) => count + 8)} className="editorial-action min-h-12 border border-[#a88c78] px-8 text-sm font-semibold text-[#71513f] transition-colors hover:bg-[#efe5da]">查看更多商品</button>
          </div>
        )}
        <p className="mt-4 flex items-start gap-1.5 text-xs leading-5 text-slate-500">
          <CircleHelp size={14} className="mt-0.5 shrink-0" />
          專屬適配僅比對已填寫的物種、年齡與過敏原，並非醫療適用保證。商品、包裝與檢驗資料為展示樣本。
        </p>
      </section>
      <section className="mt-12">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <div className="eyebrow mb-2">生活裡的小小幸福</div>
            <h2 className="text-2xl font-semibold">毛孩的開飯日常</h2>
          </div>
          <Link
            href="/community"
            className="text-sm font-medium text-[#74675b] hover:text-[#935941]"
          >
            逛逛毛孩日常
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {ugcPosts.map((post) => (
            <button
              key={post.id}
              onClick={() => openUgc(post.id)}
              className="group flex min-h-40 overflow-hidden rounded-2xl border border-[#ead9c9] bg-white text-left transition-colors hover:border-[#935941]"
            >
              <div className="relative w-[40%] shrink-0">
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  sizes="250px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                <span className="text-xs font-semibold text-[#935941]">
                  照片開箱 · 示範內容
                </span>
                <h3 className="mb-3 mt-2 text-lg font-medium">{post.title}</h3>
                <p className="text-xs text-[#7d7165]">
                  {post.breed} · {post.age} · {post.weight}
                </p>
                <p className="mt-4 text-sm font-medium text-[#935941]">查看日常與同款商品</p>
              </div>
            </button>
          ))}
        </div>
      </section>
      </div>
      <ProductComparison products={products} />
    </main>
  );
}
