import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  Compass,
  CloudSun,
  HeartPulse,
  Shuffle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "照顧工具",
  description: "依毛孩檔案選物、預估補貨時間，並記錄循序換糧的日常。",
};

const tools = [
  {
    href: "/care/selection",
    number: "01",
    title: "選物實驗室",
    en: "THE SELECTION LAB",
    description: "從毛孩資料出發，分層比較適合的食物與用品。",
    icon: Compass,
    color: "bg-[#dcebf5]",
  },
  {
    href: "/care/refill",
    number: "02",
    title: "補貨天氣預報",
    en: "THE REFILL FORECAST",
    description: "把家中存量換算成剩餘天數，提早安排下一袋。",
    icon: CloudSun,
    color: "bg-[#efe2cc]",
  },
  {
    href: "/care/transition",
    number: "03",
    title: "換糧陪跑",
    en: "THE FOOD TRANSITION",
    description: "看見每天的新舊食物比例，也記下毛孩的反應。",
    icon: Shuffle,
    color: "bg-[#e0e8dd]",
  },
  {
    href: "/health",
    number: "04",
    title: "健康儀表板",
    en: "THE PET PROFILE",
    description: "查看毛孩基本資料、份量估算與照顧紀錄。",
    icon: HeartPulse,
    color: "bg-[#e9e2ed]",
  },
];

export default function CarePage() {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-[#f8f4ed] text-[#302b26]"
    >
      <section className="border-b border-[#d9cfc3] bg-[#284a63] text-white">
        <div className="page-shell py-16 sm:py-24">
          <p className="text-xs font-semibold tracking-[.25em] text-[#b8d8ed]">
            PURESPOT / CARE STUDIO
          </p>
          <h1 className="editorial-title mt-6 text-5xl leading-tight sm:text-7xl">
            把照顧，
            <br />
            <em className="text-[#c6e2f2]">變成好玩的日常。</em>
          </h1>
          <p className="mt-7 max-w-xl text-sm leading-8 text-[#e3edf1] sm:text-base">
            選對一餐、算好下一次補貨，慢慢記下每個小變化。工具會讀取你選擇的毛孩與目前商品資料。
          </p>
        </div>
      </section>
      <section className="page-shell grid gap-4 py-12 sm:grid-cols-2 sm:py-16">
        {tools.map(
          ({ href, number, title, en, description, icon: Icon, color }) => (
            <Link
              key={href}
              href={href}
              className={`group flex min-h-64 flex-col justify-between border border-[#d9cfc3] p-7 transition-transform duration-300 hover:-translate-y-1 hover:border-[#5B93C5] ${color}`}
            >
              <div className="flex items-start justify-between">
                <span className="font-mono text-sm text-[#5f6c6c]">
                  {number} / 04
                </span>
                <Icon size={29} className="text-[#315F86]" />
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-[.2em] text-[#62717a]">
                  {en}
                </p>
                <h2 className="editorial-title mt-3 text-3xl sm:text-4xl">
                  {title}
                </h2>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <p className="max-w-sm text-sm leading-7 text-[#605a50]">
                    {description}
                  </p>
                  <ArrowUpRight className="shrink-0 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </div>
              </div>
            </Link>
          ),
        )}
      </section>
      <p className="page-shell pb-14 text-xs leading-6 text-[#756a5e]">
        份量、日期與商品適配均為依已輸入資料的估算；毛孩有特殊疾病、處方飲食或持續不適時，請先與獸醫討論。
      </p>
    </main>
  );
}
