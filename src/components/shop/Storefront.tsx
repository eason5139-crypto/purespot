"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Sparkles,
  SlidersHorizontal,
  Calculator,
  ShieldCheck,
  Repeat2,
  Search,
  PawPrint,
  CircleHelp,
  Heart,
} from "lucide-react";
import { useActivePet } from "@/store/usePetContextStore";
import { useUiStore } from "@/store/useUiStore";
import { products, ugcPosts } from "@/lib/catalog";
import { matchProduct } from "@/lib/matching";
import { calculatePetNutrition } from "@/lib/nutritionCalculator";
import { decimal, money } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProductCard } from "./ProductCard";
export function Storefront() {
  const pet = useActivePet();
  const edit = useUiStore((s) => s.setPetEditorOpen);
  const openCalc = useUiStore((s) => s.openCalculator);
  const openUgc = useUiStore((s) => s.openUgc);
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const recommended = products.find((p) => matchProduct(p, pet).safe);
  const result = recommended
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
        (category === "personal"
          ? p.type === pet.type
          : category === "all"
            ? true
            : p.type === category) &&
        `${p.name}${p.ingredients.join("")}`.includes(query),
    )
    .sort((a, b) => matchProduct(b, pet).score - matchProduct(a, pet).score);
  return (
    <main id="main-content" className="page-shell pb-16 pt-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="flex size-7 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300">
            <PawPrint size={15} />
          </span>
          你好，{pet.name}的家人
          <span className="hidden sm:inline">。今天也一起好好生活。</span>
        </div>
        <button
          onClick={() => edit(true)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-300"
        >
          <SlidersHorizontal size={15} />
          毛孩偏好
        </button>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_330px]">
        <section className="hero-panel relative min-h-[335px] overflow-hidden rounded-3xl border border-white/10 bg-[#121d2a]">
          <Image
            src="/images/cat-life.png"
            alt="灰色短毛貓在溫暖的家中享用餐點，品牌情境示意"
            fill
            priority
            sizes="(max-width:1024px) 100vw,70vw"
            className="object-cover object-[75%_center] opacity-65"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#111b28_0%,#111b28f5_24%,#111b28b0_50%,#111b2800_83%)]" />
          <div className="relative z-10 max-w-[520px] p-6 sm:p-9">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/5 px-3 py-1.5 text-xs tracking-[.12em] text-cyan-200">
              <Sparkles size={13} />
              專屬營養，從理解開始
            </div>
            <h1 className="text-[clamp(2rem,3.3vw,3rem)] font-semibold leading-[1.3] tracking-tight">
              為{pet.name}的每一口，
              <br />
              <span className="text-cyan-300">多想一步。</span>
            </h1>
            <p className="mt-4 max-w-[290px] text-sm leading-7 text-slate-300">
              從避開過敏原到剛剛好的份量，
              <br />
              把複雜的選擇，變成簡單的日常。
            </p>
            <div className="mt-6 flex gap-3">
              <Button
                onClick={() =>
                  document
                    .getElementById("products")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                探索專屬選物
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  recommended ? openCalc(recommended.id) : edit(true)
                }
              >
                <Calculator />
                食量試算
              </Button>
            </div>
          </div>
          <div className="absolute bottom-6 right-6 hidden rounded-xl border border-white/20 bg-[#111827]/70 px-4 py-2.5 text-sm backdrop-blur-xl xl:block">
            <Heart className="mb-1 text-amber-300" size={16} />
            <span className="text-xs text-slate-200">
              每個毛孩，都值得被好好理解。
            </span>
          </div>
        </section>
        <section className="panel relative flex flex-col justify-between overflow-hidden p-6">
          <div className="absolute -right-12 -top-12 size-48 rounded-full bg-cyan-400/5 blur-3xl" />
          <div>
            <div className="flex items-center justify-between">
              <span className="eyebrow">今日營養提案</span>
              <Calculator size={19} className="text-cyan-300" />
            </div>
            <h2 className="mt-3 text-lg font-semibold">
              {pet.name}的剛剛好份量
            </h2>
            <p className="mt-1 text-xs text-slate-400">
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
                  className="font-mono text-[3.5rem] font-light leading-none tracking-tight text-cyan-300"
                >
                  {decimal(result.dailyGrams, 0)}
                </motion.span>
                <span className="pb-1 text-sm text-slate-400">克 / 日</span>
              </div>
              <div className="mb-5 grid grid-cols-2 gap-3 border-t border-white/8 pt-4">
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
              <Button
                variant="secondary"
                className="w-full border-cyan-400/25 text-cyan-200"
                onClick={() => openCalc(recommended.id)}
              >
                調整我的配糧計畫
              </Button>
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
        </section>
      </div>
      <div className="my-7 grid grid-cols-1 divide-y divide-white/8 rounded-2xl border border-white/8 bg-white/[.015] px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          {
            icon: ShieldCheck,
            title: "每一批，都透明",
            desc: "原料與檢驗數據，一目瞭然",
            color: "text-cyan-300",
          },
          {
            icon: PawPrint,
            title: "每一隻，都獨特",
            desc: "依年齡、體重與過敏原選物",
            color: "text-amber-300",
          },
          {
            icon: Repeat2,
            title: "每一次，都剛好",
            desc: "預測補貨，留住陪伴的時間",
            color: "text-emerald-300",
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
      <section id="products" className="scroll-mt-32">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="eyebrow mb-2">由牠出發的好選擇</div>
            <h2 className="text-2xl font-semibold">
              {pet.name}的專屬選物
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
              onChange={(e) => setQuery(e.target.value)}
              className="input !mt-0 pl-10"
              placeholder="搜尋商品或成分"
            />
          </label>
        </div>
        <div className="mb-5 mt-5 flex flex-wrap items-center justify-between gap-3">
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="商品分類"
          >
            {[
              { id: "personal", label: "專屬推薦" },
              { id: "all", label: "全部選物" },
              { id: "CAT", label: "貓咪主食" },
              { id: "DOG", label: "狗狗主食" },
            ].map((tab) => (
              <button
                key={tab.id}
                aria-pressed={category === tab.id}
                className={`rounded-lg px-4 py-2 text-sm transition-colors ${category === tab.id ? "bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/30" : "text-slate-400 hover:bg-white/5"}`}
                onClick={() => setCategory(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck size={13} />
            依毛孩適配排序
          </span>
        </div>
        {filtered.length ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {filtered.map((p) => (
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
                setCategory("all");
              }}
            >
              清除篩選
            </Button>
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
            className="text-sm text-slate-400 hover:text-cyan-300"
          >
            逛逛毛孩日常
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {ugcPosts.map((post) => (
            <button
              key={post.id}
              onClick={() => openUgc(post.id)}
              className="group flex min-h-40 overflow-hidden rounded-2xl border border-white/10 bg-[#111827] text-left transition-colors hover:border-cyan-400/40"
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
                <span className="text-xs text-amber-300">
                  照片開箱 · 示範內容
                </span>
                <h3 className="mb-3 mt-2 text-lg font-medium">{post.title}</h3>
                <p className="text-xs text-slate-400">
                  {post.breed} · {post.age} · {post.weight}
                </p>
                <p className="mt-4 text-sm text-cyan-300">查看日常與同款商品</p>
              </div>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
