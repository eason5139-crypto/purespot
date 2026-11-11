"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleHelp,
  Compass,
  MessageCircle,
  Plus,
  Scale,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { CareHeader } from "./CareHeader";
import { SavedPetPicker } from "@/components/pets/SavedPetPicker";
import { useActivePet } from "@/store/usePetContextStore";
import { useCareStore } from "@/store/useCareStore";
import { useCartStore } from "@/store/useCartStore";
import { useCatalogStore } from "@/store/useCatalogStore";
import {
  compassIntentSchema,
  type CompassCard,
  type CompassIntent,
} from "@/lib/selectionCompass";
import { money, packageSize } from "@/lib/utils";

type Response = {
  cards: CompassCard[];
  availableCount: number;
  excluded: {
    species: number;
    age: number;
    allergy: number;
    data: number;
    stock: number;
    budget: number;
  };
  intent: CompassIntent;
  aiUsed: boolean;
  followUp: string | null;
};

const scenarioOptions = [
  { value: "DAILY", label: "日常選物", emoji: "✦" },
  { value: "TRIP", label: "準備出門", emoji: "↗" },
  { value: "NEW_PET", label: "迎接毛孩", emoji: "♡" },
  { value: "REFILL", label: "快要補貨", emoji: "◷" },
] as const;

export function SelectionCompass() {
  const pet = useActivePet();
  const hydrated = useCareStore((state) => state.hydrated);
  const addItem = useCartStore((state) => state.addItem);
  const reduceMotion = useReducedMotion();
  const [intent, setIntent] = useState<CompassIntent>(() =>
    compassIntentSchema.parse({}),
  );
  const [budgetInput, setBudgetInput] = useState("");
  const [remainingInput, setRemainingInput] = useState("");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Response | null>(null);
  const [resultPetId, setResultPetId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [comparedIds, setComparedIds] = useState<string[]>([]);
  const [conversation, setConversation] = useState<string[]>([]);
  const current = resultPetId === pet.id ? result : null;

  async function findRecommendations() {
    setError("");
    const budgetNt = budgetInput.trim() ? Number(budgetInput) : null;
    const remainingGrams = remainingInput.trim()
      ? Number(remainingInput)
      : null;
    const parsed = compassIntentSchema.safeParse({
      ...intent,
      budgetNt,
      remainingGrams,
    });
    if (!parsed.success) {
      setError("請確認預算與剩餘克數，兩者都需要是合理的正整數。");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/care/compass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pet, intent: parsed.data, query }),
        cache: "no-store",
      });
      const data = (await response.json()) as Response & { error?: string };
      if (!response.ok) throw new Error(data.error || "選物資料暫時無法載入");
      setResult(data);
      setResultPetId(pet.id);
      setIntent(data.intent);
      if (data.intent.budgetNt !== null)
        setBudgetInput(String(data.intent.budgetNt));
      if (data.intent.remainingGrams !== null)
        setRemainingInput(String(data.intent.remainingGrams));
      setComparedIds([]);
      if (query.trim())
        setConversation((items) => [...items.slice(-3), query.trim()]);
      setQuery("");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "選物資料暫時無法載入",
      );
    } finally {
      setBusy(false);
    }
  }

  function toggleCompare(id: string) {
    setComparedIds((ids) =>
      ids.includes(id)
        ? ids.filter((item) => item !== id)
        : [...ids.slice(-1), id],
    );
  }

  async function add(card: CompassCard) {
    try {
      const response = await fetch("/api/products", { cache: "no-store" });
      const catalog = (await response.json()) as {
        products?: CompassCard["product"][];
        source?: string;
      };
      if (
        !response.ok ||
        catalog.source === "fallback" ||
        !catalog.products?.length
      )
        throw new Error("商品資料暫時無法更新，請稍後再試");
      useCatalogStore.getState().setProducts(catalog.products);
      addItem({
        productId: card.product.id,
        petId: pet.id,
        quantity: 1,
        mode: "ONCE",
        intervalDays: null,
      });
      toast.success(`${card.product.name}已加入購物袋`);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "加入購物袋失敗");
    }
  }

  if (!hydrated)
    return (
      <main id="main-content" className="page-shell py-20" role="status">
        正在載入毛孩資料…
      </main>
    );
  const compared = (current?.cards ?? []).filter((card) =>
    comparedIds.includes(card.product.id),
  );
  return (
    <main
      id="main-content"
      className="min-h-screen bg-[#f7f3ea] text-[#26333b]"
    >
      <CareHeader
        eyebrow="PURESPOT / YOUR CHOICE, MADE CLEARER"
        title="選物羅盤"
        description="先認識毛孩，再釐清這次要找什麼。三個不同角度的提案，讓你知道為什麼適合、差在哪裡。"
        nextHref="/care/selection"
        nextLabel="查看完整選物清單"
      />
      <section className="page-shell grid gap-7 py-9 lg:grid-cols-[minmax(300px,.8fr)_minmax(0,1.2fr)] lg:py-14">
        <div className="h-fit overflow-hidden rounded-[2rem] border border-[#d7d7cc] bg-[#fffdf8] shadow-[0_18px_60px_-42px_#315f86] lg:sticky lg:top-28">
          <div className="bg-[#dbeaf3] px-6 py-6 sm:px-8">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-[#315f86] text-white">
                <Compass size={21} />
              </span>
              <div>
                <p className="text-[11px] font-bold tracking-[.2em] text-[#477ca5]">
                  START WITH THEM
                </p>
                <h2 className="editorial-title text-2xl">今天替誰找？</h2>
              </div>
            </div>
            <SavedPetPicker className="mt-5" />
            <p className="mt-3 text-xs leading-5 text-[#486377]">
              已記錄的過敏原：
              {pet.allergies.length ? pet.allergies.join("、") : "尚未記錄"}
              。若資料有變動，請先更新毛孩檔案。
            </p>
          </div>
          <div className="space-y-6 p-6 sm:p-8">
            <fieldset>
              <legend className="text-sm font-semibold">這次的生活情境</legend>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {scenarioOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={intent.scenario === option.value}
                    onClick={() =>
                      setIntent((value) => ({
                        ...value,
                        scenario: option.value,
                      }))
                    }
                    className={`min-h-12 rounded-2xl border px-3 text-left text-sm transition-colors ${intent.scenario === option.value ? "border-[#315f86] bg-[#315f86] text-white" : "border-[#d4d8d7] bg-[#fbfaf6] hover:border-[#6ca1c6]"}`}
                  >
                    <span className="mr-2 text-lg">{option.emoji}</span>
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-sm font-semibold">想先看哪一類？</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {(
                  [
                    ["ALL", "都可以"],
                    ["FOOD", "食物"],
                    ["SUPPLIES", "用品"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={intent.kind === value}
                    onClick={() =>
                      setIntent((item) => ({ ...item, kind: value }))
                    }
                    className={`min-h-10 rounded-full border px-4 text-sm ${intent.kind === value ? "border-[#315f86] bg-[#e2edf4] font-semibold text-[#315f86]" : "border-[#d4d8d7]"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            {intent.avoid.length > 0 && (
              <div>
                <p className="text-sm font-semibold">這次另外避開</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {intent.avoid.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() =>
                        setIntent((value) => ({
                          ...value,
                          avoid: value.avoid.filter((item) => item !== term),
                        }))
                      }
                      className="inline-flex min-h-9 items-center gap-1 rounded-full border border-[#b9cbd1] bg-[#e8f2f5] px-3 text-xs text-[#315f86]"
                      aria-label={`取消額外避開${term}`}
                    >
                      {term} <X size={13} />
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-[#687b83]">毛孩檔案中的過敏原仍會保留排除。</p>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                單件預算 NT$
                <input
                  inputMode="numeric"
                  type="number"
                  min="1"
                  max="100000"
                  placeholder="不限"
                  value={budgetInput}
                  onChange={(event) => setBudgetInput(event.target.value)}
                  className="input mt-2 w-full bg-white"
                />
              </label>
              {intent.scenario === "REFILL" && (
                <label className="text-sm font-semibold">
                  家裡還有幾克？
                  <input
                    inputMode="numeric"
                    type="number"
                    min="0"
                    max="50000"
                    placeholder="可略過"
                    value={remainingInput}
                    onChange={(event) => setRemainingInput(event.target.value)}
                    className="input mt-2 w-full bg-white"
                  />
                </label>
              )}
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void findRecommendations();
              }}
            >
              <label
                htmlFor="compass-question"
                className="flex items-center gap-2 text-sm font-semibold"
              >
                <MessageCircle size={16} className="text-[#477ca5]" />{" "}
                用自己的話說說需求
              </label>
              <textarea
                id="compass-question"
                value={query}
                maxLength={500}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="例如：想帶麻糬去旅行，找 1,000 元內的用品；或牠不吃雞肉，飼料只剩 300 克了。"
                className="mt-2 min-h-28 w-full rounded-2xl border border-[#d4d8d7] bg-white p-4 text-sm leading-6 outline-none focus:border-[#5b93c5]"
              />
              <p className="mt-1 text-xs text-[#687b83]">
                可留空直接選物；第二次輸入會接續目前條件追問。
              </p>
              <button
                type="submit"
                disabled={busy}
                className="mt-4 flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-[#315f86] px-6 font-semibold text-white shadow-[0_8px_24px_-12px_#315f86] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
              >
                {busy ? "正在整理提案…" : "找到三種提案"}
                <ArrowRight size={18} />
              </button>
            </form>
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-[#fff0e9] p-3 text-sm text-[#a34737]"
              >
                {error}
              </p>
            )}
          </div>
        </div>
        <div className="min-w-0">
          <div className="relative overflow-hidden rounded-[2rem] bg-[#284a63] p-7 text-white sm:p-9">
            <Sparkles
              className="absolute -right-6 -top-7 size-40 text-[#a2c7dd]/15"
              strokeWidth={0.8}
            />
            <p className="relative text-xs font-bold tracking-[.2em] text-[#b9d9e8]">
              A LITTLE GUIDANCE, A LOT MORE CLARITY
            </p>
            <h2 className="editorial-title relative mt-4 text-3xl sm:text-4xl">
              一眼看見，哪款更合拍。
            </h2>
            <p className="relative mt-4 max-w-xl text-sm leading-7 text-[#e2eff4]">
              商品適配先查物種、年齡、過敏原與庫存，再依你的生活情境整理提案。文字追問會交由
              Gemini 協助理解，最後仍由商品資料規則檢查。
            </p>
            <div className="relative mt-6 flex flex-wrap gap-2 text-xs">
              {[
                "過敏原別名比對",
                "三個選物角度",
                "並排比較",
                "直接加入購物袋",
              ].map((value) => (
                <span
                  key={value}
                  className="rounded-full border border-white/30 px-3 py-2"
                >
                  {value}
                </span>
              ))}
            </div>
          </div>
          {!current ? (
            <div className="mt-6 rounded-[2rem] border border-dashed border-[#b9c9ce] bg-[#edf2f1] px-7 py-12 text-center">
              <CircleHelp size={34} className="mx-auto text-[#5b93c5]" />
              <h3 className="editorial-title mt-4 text-2xl">
                從左邊開始，提案會出現在這裡
              </h3>
              <p className="mt-2 text-sm text-[#65777e]">
                切換毛孩後，請重新產生提案以更新適配結果。
              </p>
            </div>
          ) : (
            <>
              <div className="mt-9 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold tracking-[.2em] text-[#5b93c5]">
                    THE THREE DIRECTIONS
                  </p>
                  <h2 className="editorial-title mt-2 text-3xl">
                    給{pet.name}的選物提案
                  </h2>
                  <p className="mt-2 text-sm text-[#697a7e]">
                    符合目前條件 {current.availableCount} 款 ·{" "}
                    {current.aiUsed
                      ? "Gemini 已協助理解文字需求"
                      : "依選物條件整理"}
                  </p>
                </div>
                <Link
                  href="/care/ingredients"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-[#315f86] hover:underline"
                >
                  查看成分放大鏡 <ChevronRight size={16} />
                </Link>
              </div>
              {conversation.length > 0 && (
                <div
                  className="mt-5 flex flex-wrap gap-2"
                  aria-label="最近追問"
                >
                  {conversation.map((item, index) => (
                    <span
                      key={`${index}-${item}`}
                      className="max-w-full rounded-full bg-[#e4eced] px-3 py-2 text-xs text-[#45626c]"
                    >
                      你問：{item}
                    </span>
                  ))}
                </div>
              )}
              {current.followUp && (
                <p className="mt-4 rounded-2xl border border-[#b8d4df] bg-[#e8f2f5] p-4 text-sm text-[#315f86]">
                  <MessageCircle size={15} className="mr-2 inline" />
                  {current.followUp} 可在左側補充後再次尋找。
                </p>
              )}
              {current.cards.length ? (
                <div className="mt-6 grid gap-4 xl:grid-cols-3">
                  {current.cards.map((card, index) => (
                    <motion.article
                      key={card.product.id}
                      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.35 }}
                      className="flex min-w-0 flex-col overflow-hidden rounded-[1.7rem] border border-[#d8d7cc] bg-[#fffdf9] shadow-[0_12px_35px_-28px_#294b60]"
                    >
                      <div className="relative aspect-[4/3] bg-[#e7e8df]">
                        <Image
                          src={card.product.image}
                          alt={`${card.product.name}商品圖片`}
                          fill
                          sizes="(max-width: 1280px) 50vw, 25vw"
                          className="object-contain p-5"
                        />
                        <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-[#315f86]">
                          0{index + 1} / {card.title}
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <p className="text-xs text-[#63818a]">
                          {card.product.category} ·{" "}
                          {packageSize(card.product.bagGrams)}
                        </p>
                        <Link
                          href={`/products/${card.product.slug}`}
                          className="editorial-title mt-2 text-xl leading-7 hover:text-[#315f86]"
                        >
                          {card.product.name}
                        </Link>
                        <p className="mt-3 text-2xl font-semibold text-[#315f86]">
                          {money(card.product.priceNt)}
                        </p>
                        <ul className="mt-4 space-y-2 border-t border-[#e4e1d9] pt-4">
                          {card.reasons.map((reason) => (
                            <li
                              key={reason}
                              className="flex gap-2 text-xs leading-5 text-[#48656e]"
                            >
                              <Check
                                size={14}
                                className="mt-0.5 shrink-0 text-[#5b93c5]"
                              />
                              {reason}
                            </li>
                          ))}
                        </ul>
                        {card.dailyGrams !== null && (
                          <p className="mt-4 rounded-xl bg-[#eef4f2] p-3 text-xs leading-5 text-[#416371]">
                            參考日份量約 {Math.round(card.dailyGrams)} 克 ·
                            每日約 {money(card.dailyCostNt ?? 0)}
                            {card.refillInDays !== null && (
                              <>
                                {" "}
                                · 若現用同款，約可用 {card.refillInDays} 天；
                                {card.refillInDays <= 5
                                  ? "建議現在安排補貨"
                                  : `建議約 ${card.refillInDays - 5} 天後補貨`}
                              </>
                            )}
                          </p>
                        )}
                        <p className="mt-3 text-xs leading-5 text-[#8b7462]">
                          <ShieldCheck size={13} className="mr-1 inline" />
                          {card.dataNote}
                        </p>
                        <div className="mt-auto flex gap-2 pt-5">
                          <button
                            type="button"
                            aria-pressed={comparedIds.includes(card.product.id)}
                            onClick={() => toggleCompare(card.product.id)}
                            className={`min-h-11 flex-1 rounded-full border px-2 text-xs font-semibold ${comparedIds.includes(card.product.id) ? "border-[#315f86] bg-[#e0edf3] text-[#315f86]" : "border-[#b9cbd1] text-[#315f86]"}`}
                          >
                            <Scale size={15} className="mr-1 inline" />
                            比較
                          </button>
                          <button
                            type="button"
                            onClick={() => void add(card)}
                            className="min-h-11 flex-1 rounded-full bg-[#315f86] px-2 text-xs font-semibold text-white hover:bg-[#244d6a]"
                          >
                            <Plus size={15} className="mr-1 inline" />
                            加入購物袋
                          </button>
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-[#d8d7cc] bg-[#fffdf9] p-8">
                  <h3 className="editorial-title text-2xl">
                    暫時沒有符合條件的商品
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[#60737b]">
                    已排除錯物種 {current.excluded.species} 款、年齡不合{" "}
                    {current.excluded.age} 款、過敏衝突{" "}
                    {current.excluded.allergy} 款；另外有{" "}
                    {current.excluded.stock} 款缺貨、{current.excluded.data}{" "}
                    款資料不足、{current.excluded.budget}{" "}
                    款超出預算。可以調整預算或品類；已記錄的過敏原仍會保留。
                  </p>
                </div>
              )}
              {compared.length > 0 && (
                <section
                  className="mt-8 rounded-[1.7rem] border border-[#b7cdd9] bg-[#e7f0f4] p-6"
                  aria-label="選物並排比較"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="editorial-title text-2xl">放在一起看</h3>
                    <button
                      type="button"
                      onClick={() => setComparedIds([])}
                      className="text-xs text-[#315f86] underline"
                    >
                      清空比較
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {compared.map((card) => (
                      <div
                        key={card.product.id}
                        className="rounded-2xl bg-white p-4"
                      >
                        <Link
                          href={`/products/${card.product.slug}`}
                          className="font-semibold hover:text-[#315f86]"
                        >
                          {card.product.name}
                        </Link>
                        <p className="mt-2 text-sm">
                          {money(card.product.priceNt)} ·{" "}
                          {packageSize(card.product.bagGrams)}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-[#60737b]">
                          {card.dailyCostNt === null
                            ? "日花費資料不足"
                            : `每日約 ${money(card.dailyCostNt)}`}{" "}
                          ·{" "}
                          {card.product.autoshipEligible
                            ? "可定期補貨"
                            : "一般選購"}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-[#60737b]">
                          成分：
                          {card.product.ingredients.slice(0, 5).join("、") ||
                            "請查看商品標示"}
                        </p>
                      </div>
                    ))}
                  </div>
                  {compared.length === 1 && (
                    <p className="mt-3 text-xs text-[#60737b]">
                      再選一款就能並排比較。
                    </p>
                  )}
                </section>
              )}
            </>
          )}
          <p className="mt-8 text-xs leading-6 text-[#718087]">
            選物依商品登載資訊與你提供的毛孩資料；過敏原排除不能替代獸醫診斷。食品標示、批次與熱量資料請以可核實來源及實際包裝為準。
          </p>
        </div>
      </section>
    </main>
  );
}
