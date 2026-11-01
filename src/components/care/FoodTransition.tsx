"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardPenLine,
  HeartPulse,
  Info,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { CareHeader } from "./CareHeader";
import { SavedPetPicker } from "@/components/pets/SavedPetPicker";
import { useActivePet } from "@/store/usePetContextStore";
import { useCatalogStore } from "@/store/useCatalogStore";
import { useCareStore, type TransitionLog } from "@/store/useCareStore";
import {
  addCalendarDays,
  suitableMainFoods,
  taipeiDate,
  transitionPercent,
} from "@/lib/careTools";
import { supportsFoodCalculator } from "@/lib/types";

const appetiteLabels = { GOOD: "正常", LOW: "稍差", NONE: "不吃" } as const;
const stoolLabels = {
  NORMAL: "正常",
  SOFT: "偏軟",
  OTHER: "其他異常",
} as const;

export function FoodTransition() {
  const pet = useActivePet();
  const products = useCatalogStore((state) => state.products);
  const hydrated = useCareStore((state) => state.hydrated);
  const saved = useCareStore((state) =>
    state.transitionPlans.find((plan) => plan.petId === pet.id),
  );
  const saveTransition = useCareStore((state) => state.saveTransition);
  const saveLog = useCareStore((state) => state.saveLog);
  const removeTransition = useCareStore((state) => state.removeTransition);
  const suitable = useMemo(
    () => suitableMainFoods(products, pet),
    [products, pet],
  );
  const [productId, setProductId] = useState("");
  const [oldFoodName, setOldFoodName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [durationDays, setDurationDays] = useState<7 | 10 | 14>(10);
  const [day, setDay] = useState(1);
  const [appetite, setAppetite] = useState<TransitionLog["appetite"]>("GOOD");
  const [stool, setStool] = useState<TransitionLog["stool"]>("NORMAL");
  const [note, setNote] = useState("");
  useEffect(() => {
    setProductId(saved?.productId ?? suitable[0]?.id ?? "");
    setOldFoodName(saved?.oldFoodName ?? "");
    setStartDate(saved?.startDate ?? taipeiDate());
    setDurationDays(saved?.durationDays ?? 10);
    setDay(1);
  }, [
    pet.id,
    saved?.productId,
    saved?.oldFoodName,
    saved?.startDate,
    saved?.durationDays,
    suitable,
  ]);
  const product = suitable.find((item) => item.id === productId) ?? suitable[0];
  const active =
    saved &&
    product?.id === saved.productId &&
    oldFoodName.trim() === saved.oldFoodName &&
    startDate === saved.startDate &&
    durationDays === saved.durationDays
      ? saved
      : null;
  const log = active?.logs.find((item) => item.day === day);
  useEffect(() => {
    setAppetite(log?.appetite ?? "GOOD");
    setStool(log?.stool ?? "NORMAL");
    setNote(log?.note ?? "");
  }, [pet.id, day, log?.appetite, log?.stool, log?.note]);
  const percent = transitionPercent(day, durationDays);
  const selectedDate = addCalendarDays(startDate, day - 1);
  function savePlan() {
    if (!product || !supportsFoodCalculator(pet.type)) {
      toast.error("請選擇可試算的主食");
      return;
    }
    const name = oldFoodName.trim();
    if (!name) {
      toast.error("請填寫目前吃的食物");
      return;
    }
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
      !addCalendarDays(startDate, 0)
    ) {
      toast.error("請選擇有效的開始日期");
      return;
    }
    const same =
      saved?.productId === product.id &&
      saved?.oldFoodName === name &&
      saved?.startDate === startDate &&
      saved?.durationDays === durationDays;
    if (
      !same &&
      saved?.logs.length &&
      !window.confirm("變更日程會清空原有的每日觀察紀錄，確定繼續嗎？")
    )
      return;
    saveTransition({
      petId: pet.id,
      productId: product.id,
      oldFoodName: name,
      startDate,
      durationDays,
      logs: same ? (saved?.logs ?? []) : [],
    });
    toast.success("換糧日程已儲存在這台裝置");
  }
  function record() {
    if (!active) {
      toast.error("請先儲存日程");
      return;
    }
    saveLog(pet.id, { day, appetite, stool, note: note.trim() });
    toast.success(`第 ${day} 天的觀察已儲存`);
  }
  if (!hydrated)
    return (
      <main id="main-content" className="page-shell py-20" role="status">
        正在整理毛孩與換糧資料…
      </main>
    );
  return (
    <main
      id="main-content"
      className="min-h-screen bg-[#f8f4ed] text-[#302b26]"
    >
      <CareHeader
        eyebrow="03 / THE FOOD TRANSITION"
        title="換糧陪跑"
        description="從第一口開始，慢慢認識新味道。設定日程、翻看每天的比例，將食慾與便便的變化記下來。"
        nextHref="/care/selection"
        nextLabel="回到選物實驗室"
      />
      <div className="page-shell grid gap-7 py-9 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] lg:py-14">
        <section className="h-fit border border-[#d9cbbd] bg-[#fffdf9] p-6 sm:p-9">
          <p className="text-xs font-semibold tracking-[.17em] text-[#315F86]">
            THE START / 從牠出發
          </p>
          <h2 className="editorial-title mt-3 text-3xl">建立陪跑日程</h2>
          <SavedPetPicker className="mt-7" />
          {supportsFoodCalculator(pet.type) && suitable.length ? (
            <>
              <label className="mt-6 block text-sm font-medium">
                目前吃的食物
                <input
                  className="input"
                  aria-label="目前吃的食物"
                  value={oldFoodName}
                  maxLength={80}
                  onChange={(event) => setOldFoodName(event.target.value)}
                  placeholder="例如：原本的乾糧"
                />
              </label>
              <label className="mt-5 block text-sm font-medium">
                準備換成
                <select
                  className="input"
                  aria-label="準備換成"
                  value={product?.id ?? ""}
                  onChange={(event) => setProductId(event.target.value)}
                >
                  {suitable.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  開始日期
                  <input
                    className="input"
                    aria-label="開始日期"
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                </label>
                <label className="text-sm font-medium">
                  安排幾天
                  <select
                    className="input"
                    aria-label="安排幾天"
                    value={durationDays}
                    onChange={(event) =>
                      setDurationDays(Number(event.target.value) as 7 | 10 | 14)
                    }
                  >
                    <option value="7">7 天</option>
                    <option value="10">10 天</option>
                    <option value="14">14 天</option>
                  </select>
                </label>
              </div>
              <button
                type="button"
                onClick={savePlan}
                className="mt-7 min-h-11 w-full bg-[#5B93C5] px-6 text-sm font-semibold text-white hover:bg-[#376F9F]"
              >
                儲存日程
              </button>
              {saved && (
                <button
                  type="button"
                  onClick={() => {
                    if (
                      saved.logs.length &&
                      !window.confirm("要刪除這份日程與每日觀察嗎？")
                    )
                      return;
                    removeTransition(pet.id);
                    setOldFoodName("");
                    toast.success("已刪除日程");
                  }}
                  className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm text-[#866653] underline"
                >
                  <RotateCcw size={15} />
                  刪除日程
                </button>
              )}
            </>
          ) : (
            <div className="mt-7 border border-dashed border-[#c9b8a8] p-5 text-sm leading-7">
              {pet.name}
              目前沒有可建立日程的貓狗主食。倉鼠與兔兔的飲食不套用此比例，請依商品標示與專業建議安排。
              <Link
                href="/care/selection"
                className="mt-2 block text-[#315F86] underline"
              >
                查看適用選物
              </Link>
            </div>
          )}
          <div className="mt-8 border-t border-[#e2d6c9] pt-6 text-xs leading-6 text-[#756a5e]">
            <Info size={14} className="mr-1 inline" />
            日程是觀察用的參考；有疾病、處方飲食或持續不適時，請問獸醫。貓咪接受新食物時，有時需要把新舊食物分開放在不同碗。
            <a
              href="https://wsava.org/wp-content/uploads/2020/01/Frequently-Asked-Questions-and-Myths.pdf"
              target="_blank"
              rel="noreferrer"
              className="ml-1 text-[#315F86] underline"
            >
              WSAVA 換糧資料
            </a>
          </div>
        </section>
        <div className="min-w-0">
          <section className="overflow-hidden border border-[#bfd0d0] bg-[#e3ece7] p-6 sm:p-9">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[.17em] text-[#52715d]">
                  DAY BY DAY / 今天走到哪裡？
                </p>
                <h2 className="editorial-title mt-3 text-3xl">
                  第 {day} 天的餐桌
                </h2>
              </div>
              <span className="inline-flex items-center gap-2 text-xs text-[#637667]">
                <CalendarDays size={15} />
                {selectedDate ?? "請選日期"}
              </span>
            </div>
            <div className="mt-7 flex items-center gap-3">
              <button
                type="button"
                aria-label="前一天"
                disabled={day === 1}
                onClick={() => setDay((value) => value - 1)}
                className="flex size-11 shrink-0 items-center justify-center border border-[#a7b7a7] disabled:opacity-35"
              >
                <ChevronLeft />
              </button>
              <input
                aria-label="換糧第幾天"
                type="range"
                min="1"
                max={durationDays}
                step="1"
                value={day}
                onChange={(event) => setDay(Number(event.target.value))}
                className="w-full accent-[#5B93C5]"
              />
              <button
                type="button"
                aria-label="後一天"
                disabled={day === durationDays}
                onClick={() => setDay((value) => value + 1)}
                className="flex size-11 shrink-0 items-center justify-center border border-[#a7b7a7] disabled:opacity-35"
              >
                <ChevronRight />
              </button>
            </div>
            <div
              className="mt-6 flex h-14 overflow-hidden border border-[#a9bcb0]"
              role="img"
              aria-label={`原本食物 ${100 - percent}%，新食物 ${percent}%`}
            >
              <div
                style={{ width: `${100 - percent}%` }}
                className="flex items-center justify-center overflow-hidden whitespace-nowrap bg-[#eacdb5] text-sm font-semibold text-[#6e4c36] transition-[width] duration-500"
              >
                {100 - percent >= 20 ? `${100 - percent}%` : ""}
              </div>
              <div
                style={{ width: `${percent}%` }}
                className="flex items-center justify-center overflow-hidden whitespace-nowrap bg-[#5B93C5] text-sm font-semibold text-white transition-[width] duration-500"
              >
                {percent >= 20 ? `${percent}%` : ""}
              </div>
            </div>
            <div className="mt-3 flex justify-between gap-3 text-xs">
              <span>原本食物 {100 - percent}%</span>
              <span>新食物 {percent}%</span>
            </div>
            <p className="mt-6 text-xs leading-6 text-[#607263]">
              比例僅協助安排漸進過程；不同食物熱量可能不同，實際克數請看各自包裝與毛孩需求。若便便異常、嘔吐或食慾下降，先放慢速度並聯繫獸醫。
            </p>
          </section>
          <section className="mt-5 border border-[#d9cbbd] bg-[#fffdf9] p-6 sm:p-9">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[.17em] text-[#315F86]">
                  DAILY NOTES / 觀察一下
                </p>
                <h2 className="editorial-title mt-3 text-2xl">
                  第 {day} 天的心情筆記
                </h2>
              </div>
              {log && (
                <span className="inline-flex items-center gap-1 text-xs text-[#4a7658]">
                  <Check size={14} />
                  已記錄
                </span>
              )}
            </div>
            {active ? (
              <>
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <fieldset>
                    <legend className="mb-2 text-sm font-medium">食慾</legend>
                    <div className="flex flex-wrap gap-2">
                      {(
                        Object.entries(appetiteLabels) as [
                          TransitionLog["appetite"],
                          string,
                        ][]
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={appetite === value}
                          onClick={() => setAppetite(value)}
                          className={`min-h-11 border px-3 text-sm ${appetite === value ? "border-[#315F86] bg-[#e6f0f6] text-[#315F86]" : "border-[#d7c8b8]"}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset>
                    <legend className="mb-2 text-sm font-medium">便便</legend>
                    <div className="flex flex-wrap gap-2">
                      {(
                        Object.entries(stoolLabels) as [
                          TransitionLog["stool"],
                          string,
                        ][]
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={stool === value}
                          onClick={() => setStool(value)}
                          className={`min-h-11 border px-3 text-sm ${stool === value ? "border-[#315F86] bg-[#e6f0f6] text-[#315F86]" : "border-[#d7c8b8]"}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </div>
                <label className="mt-6 block text-sm font-medium">
                  還想記下什麼？
                  <textarea
                    aria-label="觀察備註"
                    className="input min-h-24 resize-y"
                    maxLength={240}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="例如：今天有沒有主動靠近新食物"
                  />
                </label>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={record}
                    className="inline-flex min-h-11 items-center gap-2 bg-[#5B93C5] px-6 text-sm font-semibold text-white hover:bg-[#376F9F]"
                  >
                    <ClipboardPenLine size={16} />
                    儲存今天的觀察
                  </button>
                  <span className="text-xs text-[#756a5e]">
                    已記錄 {active.logs.length} / {durationDays} 天
                  </span>
                </div>
                {(appetite !== "GOOD" || stool !== "NORMAL") && (
                  <p className="mt-5 flex items-start gap-2 border border-[#e0c5b1] bg-[#fbf0e6] p-4 text-xs leading-6 text-[#7b4c35]">
                    <HeartPulse size={16} className="mt-1 shrink-0" />
                    觀察到食慾或便便變化。若症狀持續、嘔吐或明顯不適，請聯繫獸醫。
                  </p>
                )}
              </>
            ) : (
              <div className="mt-7 border border-dashed border-[#c9b8a8] p-5 text-sm text-[#756a5e]">
                先在左側儲存日程，才能記錄每天的觀察。
              </div>
            )}
          </section>
          <p className="mt-5 text-xs leading-6 text-[#756a5e]">
            漸進換糧可參考{" "}
            <a
              href="https://vcahospitals.com/resources/adult/everything-you-need-to-know-about-switching-your-pet-to-adult-wellness-food"
              target="_blank"
              rel="noreferrer"
              className="text-[#315F86] underline"
            >
              VCA 獸醫資料
            </a>
            。每日紀錄只儲存在這台裝置，不會自動傳給醫師或家人。
          </p>
        </div>
      </div>
    </main>
  );
}
