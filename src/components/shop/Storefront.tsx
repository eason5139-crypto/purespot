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
  Utensils,
  Sparkles,
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
import { BentoBuilder } from "./BentoBuilder";
import { SavedPetPicker } from "@/components/pets/SavedPetPicker";
import type { SiteContent } from "@/lib/siteContent";
import { useSiteContentPreview } from "@/lib/useSiteContentPreview";

export function Storefront({ content }: { content: SiteContent }) {
  const displayContent = useSiteContentPreview(content);
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
  for (const product of products)
    counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
  const catalogCategories = [
    ...shopCategories.map(({ name }) => name).filter((name) => counts.has(name)),
    ...[...counts.keys()]
      .filter((name) => !shopCategories.some((category) => category.name === name))
      .sort((a, b) => a.localeCompare(b, "zh-Hant")),
  ];

  const recommended = products.find(
    (p) =>
      p.kind !== "SUPPLIES" &&
      p.autoshipEligible &&
      matchProduct(p, pet).safe,
  );
  const result =
    recommended && supportsFoodCalculator(pet.type)
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
        `${p.name}${p.subtitle}${p.category}${p.ingredients.join("")}`
          .toLocaleLowerCase()
          .includes(query.trim().toLocaleLowerCase()) &&
        (!inStockOnly || p.stock > 0),
    )
    .sort((a, b) =>
      sort === "price-asc"
        ? a.priceNt - b.priceNt
        : sort === "price-desc"
          ? b.priceNt - a.priceNt
          : sort === "name"
            ? a.name.localeCompare(b.name, "zh-Hant")
            : matchProduct(b, pet).score - matchProduct(a, pet).score,
    );
  const visibleProducts = filtered.slice(0, visibleCount);

  return (
    <main id="main-content" className="shop-surface bg-[#faf6f0] py-8 text-[#302b26]">
      <div className="page-shell pb-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e3d5c4] bg-[#fffcf7] px-4 py-3 shadow-2xs">
          <div className="flex items-center gap-2 text-sm font-medium text-[#5e5044]">
            <span className="flex size-7 items-center justify-center rounded-full bg-[#935941]/15 text-[#935941]">
              <PawPrint size={15} />
            </span>
            <span>
              哩賀！歡迎光臨 <strong>{pet.name}</strong> 的專屬柑仔選物店
            </span>
            <span className="hidden text-xs text-[#8a7a6b] sm:inline">
              · 已啟動過敏原與物種安心雷達
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="#bento-builder"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#fdf3e7] px-3 py-1 text-xs font-bold text-[#935941] hover:bg-[#f8e5ce]"
            >
              <Utensils size={13} />
              去包今日便當
            </a>
            <button
              onClick={() => edit(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-[#74675b] hover:text-[#935941]"
            >
              <SlidersHorizontal size={14} />
              調整毛孩偏好
            </button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <section className="hero-panel relative min-h-[425px] overflow-hidden rounded-[2rem] border border-[#dfd0be] bg-[#362b24] text-[#fffaf2] shadow-md">
            <Image
              src={displayContent.shopImage}
              alt="貓與兔兔在家中探索食物和用品的生活場景"
              fill
              priority
              sizes="(max-width:1024px) 100vw,70vw"
              className="object-cover object-[75%_center]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(42,31,24,.94)_0%,rgba(42,31,24,.76)_42%,rgba(42,31,24,.12)_100%)]" />
            <div className="relative z-10 flex h-full max-w-[590px] flex-col justify-center p-8 sm:p-11">
              <div className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#fffaf2]/15 px-3.5 py-1 text-xs font-bold tracking-wider text-[#f3cfa8] backdrop-blur-xs">
                <Sparkles size={13} />
                {displayContent.shopBadge}
              </div>
              <h1 className="editorial-title text-[clamp(2.4rem,4.5vw,4.5rem)] font-bold leading-[1.12] tracking-[-.04em]">
                為 {pet.name} 的每一天，
                <br />
                <span className="text-[#f1bc93]">{displayContent.shopTitleAccent}</span>
              </h1>
              <p className="mt-5 max-w-[390px] text-sm leading-7 text-[#f5eade]">
                {displayContent.shopDescription}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="btn-tactile min-h-11 bg-[#935941] px-6 text-sm font-bold text-white hover:bg-[#7d4934]"
                  onClick={() =>
                    document
                      .getElementById("products")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  探索專屬選物
                </button>
                <button
                  type="button"
                  className="editorial-action inline-flex min-h-11 items-center gap-2 border border-[#f4e8d8]/70 bg-white/10 px-5 text-sm font-bold text-[#fff9ee] backdrop-blur-xs hover:bg-white/20"
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

          {supportsFoodCalculator(pet.type) ? (
            <section className="relative flex flex-col justify-between rounded-[2rem] border-2 border-[#dfd0be] bg-[#fffdf9] p-6 shadow-[0_6px_0_#dfd0be]">
              <div>
                <SavedPetPicker className="mb-5" />
                <div className="flex items-center justify-between">
                  <span className="editorial-kicker">🍚 今日主子飯量小算盤</span>
                  <Calculator size={19} className="text-[#935941]" />
                </div>
                <h2 className="mt-2 text-lg font-bold text-[#302b26]">
                  {pet.name} 的剛剛好份量
                </h2>
                <p className="mt-1 text-xs text-[#75695e]">
                  {pet.weightKg} 公斤 · {pet.ageMonths < 12 ? "幼年成長期" : "成齡階段"} ·{" "}
                  {pet.isNeutered ? "已結紮" : "未結紮"}
                </p>
              </div>
              {result && recommended ? (
                <>
                  <div className="my-4 flex items-end gap-2 rounded-2xl bg-[#faf4eb] p-4 border border-[#e8dac8]">
                    <motion.span
                      key={`${pet.id}-${pet.weightKg}`}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="editorial-title text-[3.2rem] font-bold leading-none tracking-tight text-[#4e6752]"
                    >
                      {decimal(result.dailyGrams, 0)}
                    </motion.span>
                    <span className="pb-1 text-sm font-semibold text-[#6e5f52]">
                      克 / 每日建議總量
                    </span>
                  </div>
                  <div className="mb-4 grid grid-cols-2 gap-3 border-t border-[#ece0d1] pt-3">
                    <div>
                      <p className="text-xs text-[#8a7a6b]">每日伙食預算</p>
                      <p className="mt-0.5 font-mono text-lg font-bold text-[#935941]">
                        {money(result.autoshipDailyCostNt)}
                        <span className="ml-1 text-xs font-normal text-[#8a7a6b]">起</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#8a7a6b]">建議補貨週期</p>
                      <p className="mt-0.5 font-mono text-lg font-bold text-[#302b26]">
                        {result.recommendedIntervalDays / 7}
                        <span className="ml-1 text-xs font-normal text-[#8a7a6b]">週一包</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-tactile min-h-11 w-full bg-[#935941] text-xs font-bold text-white hover:bg-[#7d4934]"
                    onClick={() => openCalc(recommended.id)}
                  >
                    打開互動配糧計算機
                  </button>
                  <p className="mt-2 text-center text-[11px] text-[#8a7a6b]">
                    依「{recommended.name}」與定期配 9 折估算
                  </p>
                </>
              ) : (
                <div className="mt-5">
                  <p className="mb-4 text-sm text-[#7e6f62]">
                    目前沒有符合全部條件的主食，請先確認毛孩資料。
                  </p>
                  <Button onClick={() => edit(true)}>檢查毛孩資料</Button>
                </div>
              )}
            </section>
          ) : (
            <section className="relative flex flex-col justify-between rounded-[2rem] border-2 border-[#c8d6c3] bg-[#eef3ec] p-7 shadow-[0_6px_0_#c8d6c3]">
              <SavedPetPicker className="mb-5" />
              <div>
                <p className="text-xs font-bold tracking-wider text-[#4e6752]">
                  🐰 小寵物的療癒日常
                </p>
                <h2 className="editorial-title mt-3 text-3xl font-bold leading-tight text-[#2f4233]">
                  {pet.name} 的日常，
                  <br />
                  從喜歡的小事開始。
                </h2>
                <p className="mt-4 text-sm leading-7 text-[#536856]">
                  牧草、磨牙點心與舒適的小窩，為 {petLabels[pet.type]} 慢慢挑。食量資訊請以實品標示及專業獸醫建議為準。
                </p>
              </div>
              <button
                type="button"
                className="btn-tactile mt-6 min-h-11 bg-[#4e6752] px-5 text-sm font-bold text-white !shadow-[0_4px_0_#344737]"
                onClick={() => {
                  setSpecies(pet.type);
                  document
                    .getElementById("products")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                看 {pet.name} 的專屬好物{" "}
                <ArrowUpRight size={15} className="ml-1 inline" />
              </button>
            </section>
          )}
        </div>

        {/* 原創互動：毛孩命定便當盒 DIY 組裝台 */}
        <BentoBuilder />

        {/* 照顧工具橫幅 */}
        <Link
          href="/care"
          className="group mt-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-[#dfd0be] bg-[#fffcf7] px-6 py-5 text-[#302b26] shadow-xs transition-all hover:-translate-y-0.5 hover:border-[#935941]"
        >
          <span>
            <strong className="editorial-title text-xl font-bold text-[#935941]">
              🧭 選擇困難？想替 {pet.name} 安排得更剛好？
            </strong>
            <span className="mt-1 block text-xs text-[#6e5f52]">
              選物羅盤、成分放大鏡、存糧天氣預報與 7 日換糧陪跑，四個互動工具免費玩！
            </span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#f5ebe0] px-4 py-2 text-xs font-bold text-[#935941]">
            走進照顧工作室{" "}
            <ArrowUpRight
              size={16}
              className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
            />
          </span>
        </Link>

        {/* 三大安心承諾 */}
        <div className="my-9 grid grid-cols-1 divide-y divide-[#dfd0be] rounded-2xl border border-[#dfd0be] bg-[#fffdf9] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            {
              icon: ShieldCheck,
              title: "每一批，都透明公開",
              desc: "原料白話文與檢驗數據，翻開卡片背面就看懂",
              color: "text-[#935941]",
            },
            {
              icon: PawPrint,
              title: "每一隻，都幫你避雷",
              desc: "自動比對毛孩年齡、體重與已知過敏原",
              color: "text-[#935941]",
            },
            {
              icon: Repeat2,
              title: "每一次，都不怕斷糧",
              desc: "定期配享 9 折優惠，隨時可調整配送節奏",
              color: "text-[#4e6752]",
            },
          ].map(({ icon: Icon, title, desc, color }) => (
            <div
              key={title}
              className="flex items-center gap-3.5 p-5 sm:justify-center"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#faf4eb]">
                <Icon size={22} className={color} />
              </span>
              <div>
                <p className="text-sm font-bold text-[#302b26]">{title}</p>
                <p className="mt-0.5 text-xs text-[#7c6e60]">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 16 大主題分類導覽 */}
        <section
          className="mb-14 border-t border-[#dfd0be] pt-12"
          aria-labelledby="category-heading"
        >
          <div className="grid gap-8 lg:grid-cols-[minmax(270px,.78fr)_minmax(0,1.22fr)] lg:gap-14">
            <div>
              <p className="editorial-kicker">柑仔店分類貨架 / 依喜好慢慢挑</p>
              <h2
                id="category-heading"
                className="editorial-title mt-3 max-w-md text-3xl font-bold leading-[1.2] sm:text-5xl"
              >
                把每一天，
                <br />
                <em className="font-normal text-[#935941]">過成牠喜歡的樣子。</em>
              </h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-[#6b5d50]">
                從一餐好飯到一件耐咬玩具，{catalogCategories.length} 個主題貨架裡，慢慢找到適合你們家的日常。
              </p>
              <div className="polaroid-card relative mt-7 hidden aspect-[4/5] max-w-[440px] overflow-hidden rounded-[1.8rem] p-3 lg:block">
                <div className="relative size-full overflow-hidden rounded-2xl bg-[#d5c8b7]">
                  <Image
                    src="/images/editorial/small-friends-v2.png"
                    alt="倉鼠與兔兔在家中的生活片刻"
                    fill
                    sizes="40vw"
                    className="object-cover transition-transform duration-700 hover:scale-[1.03]"
                  />
                  <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#2a211b]/80 to-transparent px-5 pb-4 pt-16 text-xs font-semibold tracking-wider text-[#fffaf2]">
                    🐾 台灣毛孩家庭的溫暖角落
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label="食物或用品"
                >
                  {(
                    [
                      ["all", "全部貨架"],
                      ["FOOD", "美味伙食"],
                      ["SUPPLIES", "居家好物"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={kind === value}
                      onClick={() => {
                        setKind(value);
                        setProductCategory("all");
                        setVisibleCount(8);
                      }}
                      className={`min-h-10 rounded-full border px-5 text-xs font-bold transition-all ${
                        kind === value
                          ? "border-[#935941] bg-[#935941] text-white shadow-[0_2px_0_#6e3f2c]"
                          : "border-[#d8c7b4] bg-[#fffcf7] text-[#655244] hover:border-[#935941]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setProductCategory("all");
                    setKind("all");
                    setSpecies("all");
                    setVisibleCount(8);
                    document
                      .getElementById("products")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="inline-flex min-h-10 items-center gap-1 text-xs font-bold text-[#935941] underline underline-offset-4 hover:text-[#6f3f2d]"
                >
                  看全部 {products.length} 款選物 <ArrowUpRight size={15} />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {catalogCategories
                  .filter(
                    (name) =>
                      kind === "all" ||
                      (shopCategories.find((item) => item.name === name)?.kind ??
                        products.find((p) => p.category === name)?.kind ??
                        "FOOD") === kind,
                  )
                  .map((name, index) => {
                    const info = shopCategories.find(
                      (item) => item.name === name,
                    ) ?? {
                      name,
                      english: "MORE TO EXPLORE",
                      description: "探索更多日常選物。",
                      tint: "#e8e1d8",
                    };
                    const selected = productCategory === name;
                    return (
                      <motion.button
                        key={name}
                        type="button"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        aria-pressed={selected}
                        onClick={() => {
                          setProductCategory(selected ? "all" : name);
                          setVisibleCount(8);
                          document
                            .getElementById("products")
                            ?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                        className={`group flex min-h-24 items-center gap-3.5 rounded-2xl border p-4 text-left transition-all ${
                          selected
                            ? "border-[#935941] bg-[#fdf3e7] shadow-[0_3px_0_#935941]"
                            : "border-[#e2d3c1] bg-[#fffdf9] hover:border-[#b89b82]"
                        }`}
                      >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#f4ece1] font-mono text-xs font-bold text-[#935941]">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0 flex-1">
                          <strong className="editorial-title block text-lg font-bold leading-tight text-[#302b26] group-hover:text-[#935941]">
                            {name}
                          </strong>
                          <span className="mt-1 block line-clamp-1 text-xs text-[#7c6e60]">
                            {info.description}
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1 text-xs font-bold text-[#935941]">
                          <ArrowUpRight
                            size={16}
                            className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                          />
                          {counts.get(name)} 款
                        </span>
                      </motion.button>
                    );
                  })}
              </div>
            </div>
          </div>
        </section>

        {/* 商品主貨架 */}
        <section id="products" className="scroll-mt-32">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="eyebrow mb-1.5">🐾 點卡片右下角可「翻背面看白話文」</div>
              <h2 className="editorial-title text-2xl font-bold sm:text-3xl">
                {productCategory === "all"
                  ? species === "personal"
                    ? `${pet.name} 的專屬適配選物`
                    : "探索全部選物"
                  : productCategory}
                <span className="ml-3 align-middle font-mono text-sm font-normal text-[#8a7a6b]">
                  共 {filtered.length} 款
                </span>
              </h2>
            </div>
            <label className="relative w-full sm:w-64">
              <span className="sr-only">搜尋商品或成分</span>
              <Search
                className="absolute left-3 top-3 text-[#8a7a6b]"
                size={17}
              />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setVisibleCount(8);
                }}
                className="input !mt-0 pl-10"
                placeholder="搜尋商品或成分（如：鮭魚、牧草）"
              />
            </label>
          </div>

          <div className="mb-6 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e5d7c6] bg-[#fffcf7] p-3">
            <div
              className="flex flex-wrap gap-1.5"
              role="group"
              aria-label="適用動物"
            >
              {[
                { id: "personal", label: `✨ ${pet.name}專屬推薦` },
                { id: "all", label: "全部選物" },
                ...(["CAT", "DOG", "HAMSTER", "RABBIT"] as const).map((id) => ({
                  id,
                  label: petLabels[id],
                })),
              ].map((tab) => (
                <button
                  key={tab.id}
                  aria-pressed={species === tab.id}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                    species === tab.id
                      ? "bg-[#935941] text-white shadow-[0_2px_0_#6e3f2c]"
                      : "text-[#6e5d4f] hover:bg-[#f4ece1]"
                  }`}
                  onClick={() => {
                    setSpecies(tab.id as typeof species);
                    setVisibleCount(8);
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                aria-pressed={favoritesOnly}
                onClick={() => {
                  setFavoritesOnly((value) => !value);
                  setVisibleCount(8);
                }}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors ${
                  favoritesOnly
                    ? "border-[#c85a48] bg-[#fce8e6] text-[#c85a48]"
                    : "border-[#d6c7b8] bg-white text-[#76685d] hover:bg-[#fffaf4]"
                }`}
              >
                <Heart size={14} fill={favoritesOnly ? "currentColor" : "none"} />
                願望口袋 {favorites.length}
              </button>
              <label className="flex items-center gap-1.5 text-xs font-medium text-[#6e5d4f]">
                預算
                <select
                  aria-label="價格範圍"
                  value={priceCeiling ?? "all"}
                  onChange={(event) => {
                    setPriceCeiling(
                      event.target.value === "all"
                        ? null
                        : Number(event.target.value),
                    );
                    setVisibleCount(8);
                  }}
                  className="min-h-9 rounded-lg border border-[#d6c7b8] bg-white px-2 text-xs font-semibold text-[#3b2b24]"
                >
                  <option value="all">不限金額</option>
                  <option value="300">$300 以下</option>
                  <option value="500">$500 以下</option>
                  <option value="1000">$1,000 以下</option>
                  <option value="1500">$1,500 以下</option>
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-xs font-medium text-[#6e5d4f]">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(event) => {
                    setInStockOnly(event.target.checked);
                    setVisibleCount(8);
                  }}
                  className="accent-[#935941]"
                />
                只看現貨
              </label>
              <label className="flex items-center gap-1.5 text-xs font-medium text-[#6e5d4f]">
                排序
                <select
                  aria-label="商品排序"
                  value={sort}
                  onChange={(event) =>
                    setSort(event.target.value as typeof sort)
                  }
                  className="min-h-9 rounded-lg border border-[#d6c7b8] bg-white px-2.5 text-xs font-semibold text-[#3b2b24]"
                >
                  <option value="fit">毛孩適配優先</option>
                  <option value="price-asc">價格：由低到高</option>
                  <option value="price-desc">價格：由高到低</option>
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
              <Search className="mx-auto mb-3 text-[#8a7a6b]" />
              <p className="font-semibold">找不到符合條件的選物</p>
              <Button
                variant="secondary"
                className="mt-4"
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
                重設所有篩選條件
              </Button>
            </div>
          )}

          {filtered.length > visibleCount && (
            <div className="mt-9 flex flex-col items-center gap-3">
              <p className="text-xs font-medium text-[#86766b]">
                目前已顯示 {visibleProducts.length} / {filtered.length} 款選物
              </p>
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + 8)}
                className="btn-tactile min-h-12 bg-[#935941] px-8 text-sm font-bold text-white hover:bg-[#7d4934]"
              >
                搬出更多好物 (+8 款)
              </button>
            </div>
          )}

          <p className="mt-5 flex items-start gap-1.5 text-xs leading-5 text-[#8a7a6b]">
            <CircleHelp size={14} className="mt-0.5 shrink-0" />
            專屬適配僅比對已填寫的物種、年齡與過敏原，並非醫療處方保證。商品、包裝與檢驗資料為展示樣本。
          </p>
        </section>

        {/* 毛孩開飯拍立得區 */}
        <section className="mt-14">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <div className="eyebrow mb-1.5">📸 街坊鄰居的真實開箱</div>
              <h2 className="editorial-title text-2xl font-bold sm:text-3xl">
                毛孩的開飯日常
              </h2>
            </div>
            <Link
              href="/community"
              className="text-sm font-bold text-[#935941] hover:underline"
            >
              去街坊毛孩牆逛逛 →
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {ugcPosts.map((post) => (
              <motion.button
                key={post.id}
                whileHover={{ y: -4 }}
                onClick={() => openUgc(post.id)}
                className="polaroid-card group flex min-h-40 overflow-hidden rounded-2xl p-3 text-left transition-colors hover:border-[#935941]"
              >
                <div className="relative w-[38%] shrink-0 overflow-hidden rounded-xl bg-[#ebe1d4]">
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    sizes="250px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-col justify-between p-4">
                  <div>
                    <span className="inline-block rounded-full bg-[#fdf3e7] px-2.5 py-0.5 text-[11px] font-bold text-[#935941]">
                      拍立得開箱 · 點擊看同款
                    </span>
                    <h3 className="mt-2 text-lg font-bold text-[#302b26]">
                      {post.title}
                    </h3>
                    <p className="mt-1 text-xs text-[#7d7165]">
                      {post.breed} · {post.age} · {post.weight}
                    </p>
                  </div>
                  <p className="mt-3 text-xs font-bold text-[#935941] group-hover:underline">
                    查看牠吃的同款商品 ↗
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        </section>
      </div>
      <ProductComparison products={products} />
    </main>
  );
}
