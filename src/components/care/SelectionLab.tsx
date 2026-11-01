"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Plus,
  Scale,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { CareHeader } from "./CareHeader";
import { SavedPetPicker } from "@/components/pets/SavedPetPicker";
import { useActivePet } from "@/store/usePetContextStore";
import { useCatalogStore } from "@/store/useCatalogStore";
import { useCartStore } from "@/store/useCartStore";
import { useCareStore } from "@/store/useCareStore";
import { dailyFoodGrams, isMainFood } from "@/lib/careTools";
import { matchProduct } from "@/lib/matching";
import { decimal, money, packageSize } from "@/lib/utils";
import type { Product } from "@/lib/types";

type Kind = "all" | "FOOD" | "SUPPLIES";
type Sort = "fit" | "daily" | "price";

function dailyPrice(product: Product, pet: ReturnType<typeof useActivePet>) {
  const grams = dailyFoodGrams(product, pet);
  return grams === null ? null : (grams * product.priceNt) / product.bagGrams;
}

export function SelectionLab() {
  const pet = useActivePet();
  const hydrated = useCareStore((state) => state.hydrated);
  const products = useCatalogStore((state) => state.products);
  const addItem = useCartStore((state) => state.addItem);
  const [kind, setKind] = useState<Kind>("all");
  const [budget, setBudget] = useState("all");
  const [sort, setSort] = useState<Sort>("fit");
  const [query, setQuery] = useState("");
  const [comparedIds, setComparedIds] = useState<string[]>([]);
  const [limit, setLimit] = useState(8);
  const matched = useMemo(
    () =>
      products.filter(
        (product) =>
          product.type === pet.type &&
          matchProduct(product, pet).safe &&
          product.stock > 0,
      ),
    [products, pet],
  );
  const filtered = matched
    .filter(
      (product) =>
        (kind === "all" || (product.kind ?? "FOOD") === kind) &&
        (budget === "all" || product.priceNt <= Number(budget)) &&
        `${product.name} ${product.subtitle} ${product.category} ${product.ingredients.join(" ")}`
          .toLocaleLowerCase()
          .includes(query.trim().toLocaleLowerCase()),
    )
    .sort((a, b) =>
      sort === "price"
        ? a.priceNt - b.priceNt
        : sort === "daily"
          ? (dailyPrice(a, pet) ?? Infinity) - (dailyPrice(b, pet) ?? Infinity)
          : Number(isMainFood(b)) - Number(isMainFood(a)) ||
            a.priceNt - b.priceNt,
    );
  const compared = comparedIds
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is Product =>
      Boolean(product && filtered.some((item) => item.id === product.id)),
    );
  function toggleCompare(id: string) {
    setComparedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length < 2
          ? [...current, id]
          : [current[1]!, id],
    );
  }
  function add(product: Product) {
    try {
      addItem({
        productId: product.id,
        petId: pet.id,
        quantity: 1,
        mode: "ONCE",
        intervalDays: null,
      });
      toast.success(`已為${pet.name}加入購物袋`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加入購物袋失敗");
    }
  }
  if (!hydrated)
    return (
      <main id="main-content" className="page-shell py-20" role="status">
        正在整理毛孩與商品資料…
      </main>
    );
  return (
    <main
      id="main-content"
      className="min-h-screen bg-[#f8f4ed] text-[#302b26]"
    >
      <CareHeader
        eyebrow="01 / THE SELECTION LAB"
        title="選物實驗室"
        description="先看牠是誰，再看商品適不適合。從現有商品裡避開已記錄的過敏原，按預算與每日期望花費慢慢挑。"
        nextHref="/care/refill"
        nextLabel="下一站：補貨天氣預報"
      />
      <div className="page-shell grid gap-9 py-9 lg:grid-cols-[290px_minmax(0,1fr)] lg:py-14">
        <aside className="h-fit border border-[#d8c9b9] bg-[#eee8dd] p-6 lg:sticky lg:top-32">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-[.15em] text-[#315F86]">
            <SlidersHorizontal size={15} />
            JUST FOR THEM
          </div>
          <h2 className="editorial-title mt-3 text-2xl">從{pet.name}出發</h2>
          <SavedPetPicker className="mt-5" />
          <div className="mt-5 border-t border-[#cbbfb0] pt-5">
            <p className="text-xs text-[#786d60]">目前比對</p>
            <p className="mt-2 text-sm leading-6">
              物種、生命階段、
              {pet.allergies.length
                ? `避開 ${pet.allergies.join("、")}`
                : "未記錄過敏原"}
            </p>
          </div>
          <p className="mt-5 text-xs leading-6 text-[#786d60]">
            商品適配依你填寫的資料與商品標示比對；有特殊飲食需求，仍請依獸醫建議選擇。
          </p>
        </aside>
        <div className="min-w-0">
          <div className="grid gap-4 border-b border-[#d8c9b9] pb-7 sm:grid-cols-2 xl:grid-cols-[1fr_auto_auto]">
            <label className="relative block">
              <span className="sr-only">搜尋選物</span>
              <Search
                className="absolute left-3 top-4 text-[#806e60]"
                size={17}
              />
              <input
                className="input !mt-0 !pl-10"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setLimit(8);
                }}
                placeholder="搜尋名稱、成分或分類"
              />
            </label>
            <label className="text-xs text-[#756a5e]">
              單件預算
              <select
                className="input"
                aria-label="單件預算"
                value={budget}
                onChange={(event) => {
                  setBudget(event.target.value);
                  setLimit(8);
                }}
              >
                <option value="all">不限</option>
                <option value="300">$300 以下</option>
                <option value="500">$500 以下</option>
                <option value="1000">$1,000 以下</option>
                <option value="1500">$1,500 以下</option>
              </select>
            </label>
            <label className="text-xs text-[#756a5e]">
              排列方式
              <select
                className="input"
                aria-label="排列方式"
                value={sort}
                onChange={(event) => setSort(event.target.value as Sort)}
              >
                <option value="fit">主食優先</option>
                <option value="price">單件價格</option>
                <option value="daily">每日花費</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 py-6">
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="選物種類"
            >
              {(
                [
                  ["all", "全部"],
                  ["FOOD", "食物"],
                  ["SUPPLIES", "用品"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={kind === value}
                  onClick={() => {
                    setKind(value);
                    setLimit(8);
                  }}
                  className={`min-h-11 border px-5 text-sm transition-colors ${kind === value ? "border-[#315F86] bg-[#315F86] text-white" : "border-[#c6b9ab] hover:border-[#315F86]"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="text-sm text-[#756a5e]">
              找到 <strong className="text-[#315F86]">{filtered.length}</strong>{" "}
              款
            </span>
          </div>
          {filtered.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.slice(0, limit).map((product) => {
                const perDay = dailyPrice(product, pet);
                const comparedHere = compared.some(
                  (item) => item.id === product.id,
                );
                return (
                  <article
                    key={product.id}
                    className="group overflow-hidden border border-[#d9cbbd] bg-[#fffdf9] transition-shadow hover:shadow-lg"
                  >
                    <div className="grid grid-cols-[112px_1fr] gap-4 p-4 sm:grid-cols-[140px_1fr]">
                      <Link
                        href={`/products/${product.slug}`}
                        className="relative aspect-square bg-[#eee8dd]"
                      >
                        <Image
                          src={product.image}
                          alt={`${product.name}包裝示意`}
                          fill
                          sizes="140px"
                          className="object-contain p-2"
                        />
                      </Link>
                      <div className="min-w-0">
                        <p className="text-xs text-[#5d7c61]">
                          <ShieldCheck size={13} className="mr-1 inline" />
                          已通過{pet.name}的基本條件
                        </p>
                        <Link
                          href={`/products/${product.slug}`}
                          className="editorial-title mt-2 block text-lg leading-6 hover:text-[#315F86]"
                        >
                          {product.name}
                        </Link>
                        <p className="mt-2 text-xs text-[#756a5e]">
                          {product.category} · {packageSize(product.bagGrams)}
                        </p>
                        <p className="mt-3 text-lg font-semibold">
                          {money(product.priceNt)}
                        </p>
                        {perDay !== null && (
                          <p className="text-xs text-[#315F86]">
                            每日約 {money(perDay)} ·{" "}
                            {decimal(dailyFoodGrams(product, pet)!, 0)} 克
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 border-t border-[#e4d8cb] p-3">
                      <button
                        type="button"
                        onClick={() => toggleCompare(product.id)}
                        aria-pressed={comparedHere}
                        aria-label={`${comparedHere ? "取消比較" : "比較"}${product.name}`}
                        className={`min-h-11 flex-1 border px-2 text-xs ${comparedHere ? "border-[#315F86] bg-[#e6f0f6] text-[#315F86]" : "border-[#d9cbbd]"}`}
                      >
                        <Scale size={14} className="mr-1 inline" />
                        {comparedHere ? "已加入比較" : "加入比較"}
                      </button>
                      <button
                        type="button"
                        onClick={() => add(product)}
                        aria-label={`將${product.name}加入購物袋`}
                        className="min-h-11 flex-1 bg-[#5B93C5] px-2 text-xs font-semibold text-white hover:bg-[#376F9F]"
                      >
                        <Plus size={14} className="mr-1 inline" />
                        加入購物袋
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="border border-dashed border-[#c9b8a8] p-10 text-center">
              <p className="text-lg">目前沒有符合條件的商品</p>
              <p className="mt-2 text-sm text-[#756a5e]">
                可調整預算或關鍵字；已記錄的過敏原仍會保留比對。
              </p>
              <button
                type="button"
                className="mt-5 text-sm text-[#315F86] underline"
                onClick={() => {
                  setBudget("all");
                  setQuery("");
                  setKind("all");
                }}
              >
                清除預算與搜尋
              </button>
            </div>
          )}
          {filtered.length > limit && (
            <button
              type="button"
              onClick={() => setLimit((value) => value + 8)}
              className="mt-7 min-h-11 w-full border border-[#ad9685] text-sm hover:bg-[#eee8dd]"
            >
              查看更多選物
            </button>
          )}
          {compared.length > 0 && (
            <section
              className="mt-10 border-t-2 border-[#315F86] bg-[#e7eff4] p-5"
              aria-label="選物比較"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs tracking-[.15em] text-[#315F86]">
                    SIDE BY SIDE
                  </p>
                  <h2 className="editorial-title mt-2 text-2xl">一眼比較</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setComparedIds([])}
                  className="text-xs underline"
                >
                  清空比較
                </button>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {compared.map((product) => (
                  <div key={product.id} className="bg-white p-4">
                    <Link
                      href={`/products/${product.slug}`}
                      className="font-semibold hover:text-[#315F86]"
                    >
                      {product.name}
                      <ArrowUpRight size={14} className="ml-1 inline" />
                    </Link>
                    <p className="mt-3 text-sm">
                      {packageSize(product.bagGrams)} · {money(product.priceNt)}
                    </p>
                    <p className="mt-1 text-sm text-[#315F86]">
                      {dailyPrice(product, pet) === null
                        ? "每日花費依包裝標示"
                        : `每日約 ${money(dailyPrice(product, pet)!)}`}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-[#756a5e]">
                      {product.ingredients.slice(0, 4).join("、")}
                    </p>
                  </div>
                ))}
              </div>
              {compared.length === 1 && (
                <p className="mt-3 text-xs text-[#756a5e]">
                  <Check size={13} className="mr-1 inline" />
                  再加入一款，就能並排看差異。
                </p>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
