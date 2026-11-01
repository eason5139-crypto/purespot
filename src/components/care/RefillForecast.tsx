"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Cloud,
  CloudSun,
  Package,
  Sun,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { CareHeader } from "./CareHeader";
import { SavedPetPicker } from "@/components/pets/SavedPetPicker";
import { useActivePet, usePetContextStore } from "@/store/usePetContextStore";
import { useCatalogStore } from "@/store/useCatalogStore";
import { useCareStore } from "@/store/useCareStore";
import {
  addCalendarDays,
  dailyFoodGrams,
  forecastFood,
  suitableMainFoods,
  taipeiDate,
} from "@/lib/careTools";
import { decimal, packageSize } from "@/lib/utils";

function downloadReminder(date: string, petName: string, productName: string) {
  const escaped = (value: string) =>
    value
      .replaceAll("\\", "\\\\")
      .replaceAll("\n", " ")
      .replaceAll(",", "\\,")
      .replaceAll(";", "\\;");
  const next = addCalendarDays(date, 1);
  if (!next) return;
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PURESPOT//Refill Reminder//ZH",
    "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}@purespot`,
    `DTSTAMP:${new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "")}`,
    `DTSTART;VALUE=DATE:${date.replaceAll("-", "")}`,
    `DTEND;VALUE=DATE:${next.replaceAll("-", "")}`,
    `SUMMARY:${escaped(`檢查${petName}的食物存量`)}`,
    `DESCRIPTION:${escaped(`查看${productName}是否需要補貨；日期依目前輸入的存量與份量估算。`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(
    new Blob([body], { type: "text/calendar;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `purespot-refill-${date}.ics`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function RefillForecast() {
  const pet = useActivePet();
  const pets = usePetContextStore((state) => state.allPets);
  const products = useCatalogStore((state) => state.products);
  const hydrated = useCareStore((state) => state.hydrated);
  const saved = useCareStore((state) =>
    state.refillPlans.find((plan) => plan.petId === pet.id),
  );
  const saveRefill = useCareStore((state) => state.saveRefill);
  const removeRefill = useCareStore((state) => state.removeRefill);
  const [productId, setProductId] = useState("");
  const [sealedBags, setSealedBags] = useState(1);
  const [openGrams, setOpenGrams] = useState(0);
  const [sharedPetIds, setSharedPetIds] = useState<string[]>([]);
  const suitable = useMemo(
    () => suitableMainFoods(products, pet),
    [products, pet],
  );
  useEffect(() => {
    setProductId(saved?.productId ?? suitable[0]?.id ?? "");
    setSealedBags(saved?.sealedBags ?? 1);
    setOpenGrams(saved?.openGrams ?? 0);
    setSharedPetIds(saved?.sharedPetIds ?? []);
  }, [
    pet.id,
    saved?.productId,
    saved?.sealedBags,
    saved?.openGrams,
    saved?.sharedPetIds,
    suitable,
  ]);
  const product = suitable.find((item) => item.id === productId) ?? suitable[0];
  const eligibleSharing = product
    ? pets.filter(
        (item) => item.id !== pet.id && dailyFoodGrams(product, item) !== null,
      )
    : [];
  const validShared = sharedPetIds.filter((id) =>
    eligibleSharing.some((item) => item.id === id),
  );
  const usedBy = product
    ? [pet, ...eligibleSharing.filter((item) => validShared.includes(item.id))]
    : [];
  const dailyTotal = product
    ? usedBy.reduce(
        (total, item) => total + (dailyFoodGrams(product, item) ?? 0),
        0,
      )
    : 0;
  const forecast = product
    ? forecastFood({
        bagGrams: product.bagGrams,
        sealedBags,
        openGrams,
        dailyGrams: dailyTotal,
      })
    : null;
  const today = taipeiDate();
  const runoutDate = forecast
    ? addCalendarDays(today, Math.floor(forecast.daysRemaining))
    : null;
  const reminderDate = forecast
    ? addCalendarDays(today, forecast.reminderInDays)
    : null;
  const validStock = Boolean(
    product &&
      Number.isInteger(sealedBags) &&
      sealedBags >= 0 &&
      sealedBags <= 99 &&
      Number.isInteger(openGrams) &&
      openGrams >= 0 &&
      openGrams <= product.bagGrams,
  );
  function save() {
    if (!product || !validStock) {
      toast.error("請確認包數與已開封重量");
      return;
    }
    saveRefill({
      petId: pet.id,
      productId: product.id,
      sharedPetIds: validShared,
      sealedBags,
      openGrams,
      updatedAt: new Date().toISOString(),
    });
    toast.success("已儲存這台裝置的食物存量");
  }
  const WeatherIcon = !forecast
    ? Cloud
    : forecast.weather === "rain"
      ? TriangleAlert
      : forecast.weather === "cloud"
        ? CloudSun
        : Sun;
  if (!hydrated)
    return (
      <main id="main-content" className="page-shell py-20" role="status">
        正在整理毛孩與存量資料…
      </main>
    );
  return (
    <main
      id="main-content"
      className="min-h-screen bg-[#f8f4ed] text-[#302b26]"
    >
      <CareHeader
        eyebrow="02 / THE REFILL FORECAST"
        title="補貨天氣預報"
        description="不用猜一袋還能吃多久。輸入家裡的存量，讓毛孩的每日份量替你算出下一次檢查的日子。"
        nextHref="/care/transition"
        nextLabel="下一站：換糧陪跑"
      />
      <div className="page-shell grid gap-7 py-9 lg:grid-cols-[minmax(0,1fr)_minmax(300px,.9fr)] lg:py-14">
        <section className="border border-[#d9cbbd] bg-[#fffdf9] p-6 sm:p-9">
          <p className="text-xs font-semibold tracking-[.17em] text-[#315F86]">
            AT HOME / 家裡還有多少？
          </p>
          <h2 className="editorial-title mt-3 text-3xl">先盤點，再安排</h2>
          <SavedPetPicker className="mt-7 max-w-sm" />
          {suitable.length ? (
            <>
              <label className="mt-6 block text-sm font-medium">
                正在吃的主食
                <select
                  className="input"
                  aria-label="正在吃的主食"
                  value={product?.id ?? ""}
                  onChange={(event) => {
                    setProductId(event.target.value);
                    setOpenGrams(0);
                    setSharedPetIds([]);
                  }}
                >
                  {suitable.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {packageSize(item.bagGrams)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  未開封包數
                  <input
                    className="input"
                    aria-label="未開封包數"
                    type="number"
                    min="0"
                    max="99"
                    step="1"
                    value={Number.isNaN(sealedBags) ? "" : sealedBags}
                    onChange={(event) =>
                      setSealedBags(
                        event.target.value === ""
                          ? Number.NaN
                          : Number(event.target.value),
                      )
                    }
                  />
                </label>
                <label className="text-sm font-medium">
                  已開封剩餘克數
                  <input
                    className="input"
                    aria-label="已開封剩餘克數"
                    type="number"
                    min="0"
                    max={product?.bagGrams ?? 0}
                    step="1"
                    value={Number.isNaN(openGrams) ? "" : openGrams}
                    onChange={(event) =>
                      setOpenGrams(
                        event.target.value === ""
                          ? Number.NaN
                          : Number(event.target.value),
                      )
                    }
                  />
                  <span className="mt-1 block text-xs text-[#786d60]">
                    最多 {product?.bagGrams ?? 0} 克；沒有開封中的包裝可填 0
                  </span>
                </label>
              </div>
              {eligibleSharing.length > 0 && (
                <fieldset className="mt-7 border-t border-[#e2d6c9] pt-6">
                  <legend className="text-sm font-medium">
                    還有誰一起吃這款？
                  </legend>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {eligibleSharing.map((item) => (
                      <label
                        key={item.id}
                        className="inline-flex min-h-11 items-center gap-2 border border-[#d2c4b5] px-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={sharedPetIds.includes(item.id)}
                          onChange={(event) =>
                            setSharedPetIds((current) =>
                              event.target.checked
                                ? [...current, item.id]
                                : current.filter((id) => id !== item.id),
                            )
                          }
                        />
                        {item.name}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={save}
                  disabled={!validStock}
                  className="min-h-11 bg-[#5B93C5] px-6 text-sm font-semibold text-white hover:bg-[#376F9F] disabled:opacity-50"
                >
                  儲存存量
                </button>
                {saved && (
                  <button
                    type="button"
                    onClick={() => {
                      removeRefill(pet.id);
                      toast.success("已刪除存量紀錄");
                    }}
                    className="min-h-11 border border-[#c8b6a8] px-5 text-sm"
                  >
                    刪除紀錄
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="mt-7 border border-dashed border-[#c9b8a8] p-6">
              <p>目前沒有適合{pet.name}、可用於份量估算的主食。</p>
              <Link
                href="/care/selection"
                className="mt-3 inline-block text-sm text-[#315F86] underline"
              >
                到選物實驗室看看
              </Link>
            </div>
          )}
        </section>
        <section
          className={`relative flex flex-col justify-between overflow-hidden border border-[#bdcbd0] p-7 sm:p-10 ${forecast?.weather === "rain" ? "bg-[#dfe7ec]" : forecast?.weather === "cloud" ? "bg-[#e7e6de]" : "bg-[#e4edf2]"}`}
          aria-live="polite"
        >
          <div
            aria-hidden="true"
            className="care-weather-float pointer-events-none absolute -right-10 -top-10 opacity-10"
          >
            <WeatherIcon size={250} strokeWidth={1} />
          </div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-[.18em] text-[#315F86]">
                THE FORECAST / 今日預報
              </p>
              <WeatherIcon size={31} className="text-[#315F86]" />
            </div>
            <h2 className="editorial-title mt-7 text-3xl">
              {!validStock
                ? "先確認存量輸入"
                : !forecast
                  ? "家裡還沒有可計算的存量"
                  : forecast.weather === "rain"
                    ? "補貨的好時機到了"
                    : forecast.weather === "cloud"
                      ? "可以開始安排補貨"
                      : "這幾天，放心開飯"}
            </h2>
            <div className="mt-8 flex items-baseline gap-3">
              <strong className="editorial-title text-7xl leading-none text-[#284a63] sm:text-8xl">
                {validStock && forecast
                  ? decimal(forecast.daysRemaining, 1)
                  : "—"}
              </strong>
              <span className="text-base text-[#4e6070]">天</span>
            </div>
            <p className="mt-5 text-sm leading-7 text-[#596b73]">
              {forecast && product
                ? `${usedBy.map((item) => item.name).join("、")}合計每日約 ${decimal(dailyTotal, 0)} 克。現有 ${decimal(forecast.totalGrams, 0)} 克，依目前份量推算。`
                : "選擇主食並填寫剩餘包數，這裡就會顯示預估天數。"}
            </p>
          </div>
          <div className="relative mt-10 border-t border-[#aabcc5] pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-[#687982]">預估吃完日期</p>
                <p className="mt-1 text-lg font-semibold">
                  {validStock ? (runoutDate ?? "—") : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#687982]">建議檢查存量</p>
                <p className="mt-1 text-lg font-semibold">
                  {validStock ? (reminderDate ?? "—") : "—"}
                </p>
              </div>
            </div>
            {reminderDate && validStock && (
              <button
                type="button"
                onClick={() =>
                  downloadReminder(
                    reminderDate,
                    pet.name,
                    product?.name ?? "主食",
                  )
                }
                className="mt-7 inline-flex min-h-11 items-center gap-2 border border-[#315F86] px-4 text-sm font-semibold text-[#315F86] hover:bg-white/50"
              >
                <CalendarDays size={17} />
                加入我的行事曆
              </button>
            )}
            <p className="mt-5 flex items-start gap-2 text-xs leading-6 text-[#667783]">
              <Package size={15} className="mt-1 shrink-0" />
              提醒會下載行事曆檔案；不會自動下單。存量只儲存在這台裝置。預測以目前填寫的存量與份量估算，實際消耗可能不同。
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
