import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Compass,
  CloudSun,
  HeartPulse,
  Shuffle,
  ScanSearch,
  Luggage,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "毛孩生活工作室",
  description: "用成分放大鏡、旅前打包桌與探索任務，讓照顧毛孩成為有趣的日常。",
};

const tools = [
  {
    href: "/care/compass",
    number: "04",
    title: "選物羅盤",
    en: "THE CHOICE COMPASS",
    description: "說出需求，查看三種有理由的提案；比較後直接加入購物袋。",
    icon: Compass,
    color: "bg-[#dcebf5]",
  },
  {
    href: "/care/selection",
    number: "05",
    title: "選物實驗室",
    en: "THE SELECTION LAB",
    description: "從毛孩資料出發，分層比較適合的食物與用品。",
    icon: Compass,
    color: "bg-[#dcebf5]",
  },
  {
    href: "/care/refill",
    number: "06",
    title: "補貨天氣預報",
    en: "THE REFILL FORECAST",
    description: "把家中存量換算成剩餘天數，提早安排下一袋。",
    icon: CloudSun,
    color: "bg-[#efe2cc]",
  },
  {
    href: "/care/transition",
    number: "07",
    title: "換糧陪跑",
    en: "THE FOOD TRANSITION",
    description: "看見每天的新舊食物比例，也記下毛孩的反應。",
    icon: Shuffle,
    color: "bg-[#e0e8dd]",
  },
  {
    href: "/health",
    number: "08",
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
      <section className="overflow-hidden border-b border-[#d9cfc3] bg-[#284a63] text-white">
        <div className="page-shell grid gap-8 py-16 lg:grid-cols-[.95fr_1.05fr] lg:items-center sm:py-24">
          <div>
          <p className="text-xs font-semibold tracking-[.25em] text-[#b8d8ed]">
            PURESPOT / LIFE STUDIO
          </p>
          <h1 className="editorial-title mt-6 text-5xl leading-tight sm:text-7xl">
            毛孩的每一天，
            <br />
            <em className="text-[#c6e2f2]">值得一起玩。</em>
          </h1>
          <p className="mt-7 max-w-xl text-sm leading-8 text-[#e3edf1] sm:text-base">
            今天想看懂一袋食物？準備一趟出門？還是用三分鐘完成探索任務？從你的問題出發，走進毛孩生活工作室。
          </p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/care/compass" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#dcebf3] px-5 text-sm font-semibold text-[#284a63]">打開選物羅盤 <ArrowUpRight size={16}/></Link><a href="#today" className="inline-flex min-h-11 items-center rounded-full border border-white/40 px-5 text-sm font-semibold">看看今天能玩什麼</a></div>
          </div>
          <div className="relative hidden h-[440px] lg:block" aria-hidden="true"><div className="absolute inset-5 rotate-[-5deg] overflow-hidden rounded-[12rem_12rem_3rem_3rem] bg-[#7399a8]"><Image src="/images/editorial/home-living-v2.png" alt="" fill priority sizes="50vw" className="object-cover"/><div className="absolute inset-0 bg-gradient-to-t from-[#183b4a]/60 to-transparent"/></div><div className="absolute -bottom-3 right-0 flex size-36 rotate-[8deg] items-center justify-center rounded-[2rem] bg-[#f1d6a8] text-[#284a63] shadow-xl"><ScanSearch size={75} strokeWidth={1.1}/></div><span className="absolute left-0 top-6 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-[#315F86]">來找今天的靈感 ↗</span></div>
        </div>
      </section>
      <section id="today" className="page-shell py-12 sm:py-16"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold tracking-[.2em] text-[#5B93C5]">CHOOSE YOUR MOMENT</p><h2 className="editorial-title mt-3 text-4xl">今天，從哪件小事開始？</h2></div><p className="max-w-sm text-sm leading-7 text-[#69808b]">每個入口都是可以操作、帶著成果離開的地方。</p></div><div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_.8fr]"><Link href="/care/ingredients" className="group relative flex min-h-[420px] flex-col justify-between overflow-hidden rounded-[2rem] bg-[#cfdfdd] p-7 sm:p-10"><div className="relative z-10"><span className="rounded-full bg-white/80 px-4 py-2 text-xs font-bold text-[#315F86]">01 / LOOK CLOSER</span><h3 className="editorial-title mt-8 text-4xl sm:text-5xl">成分放大鏡</h3><p className="mt-4 max-w-xs text-sm leading-7 text-[#496171]">點開配方、過敏原與批次，兩款食品放一起看，讓選擇更有根據。</p></div><span className="relative z-10 inline-flex w-fit items-center gap-2 rounded-full bg-[#315F86] px-5 py-3 text-sm font-semibold text-white transition-all group-hover:gap-4">進入放大鏡 <ArrowUpRight size={17}/></span><ScanSearch className="pointer-events-none absolute -bottom-14 -right-12 size-80 rotate-[-13deg] text-[#80abae]/45 transition-transform duration-500 group-hover:scale-110" strokeWidth={0.7}/></Link><div className="grid gap-4"><Link href="/care/packing" className="group relative flex min-h-48 flex-col justify-between overflow-hidden rounded-[2rem] bg-[#e7d6b8] p-6 sm:p-8"><Luggage className="absolute -right-8 -top-6 size-44 rotate-[14deg] text-[#b6a076]/35 transition-transform duration-500 group-hover:rotate-[4deg]" strokeWidth={0.7}/><span className="relative text-xs font-bold text-[#876c47]">02 / GO TOGETHER</span><div className="relative"><h3 className="editorial-title text-3xl">旅前打包桌</h3><p className="mt-2 max-w-xs text-sm leading-6 text-[#6e604b]">拖曳整理、儲存分享，缺的用品順路補齊。</p><ArrowUpRight className="mt-2"/></div></Link><Link href="/care/missions" className="group relative flex min-h-48 flex-col justify-between overflow-hidden rounded-[2rem] bg-[#d7e7e5] p-6 sm:p-8"><Sparkles className="absolute -right-3 -top-7 size-40 text-[#7db1b6]/25 transition-transform duration-500 group-hover:rotate-12" strokeWidth={0.7}/><span className="relative text-xs font-bold text-[#527f88]">03 / PLAY A LITTLE</span><div className="relative"><h3 className="editorial-title text-3xl">毛孩探索任務</h3><p className="mt-2 max-w-xs text-sm leading-6 text-[#58777c]">三個小挑戰，邊玩邊學，收下探索印章。</p><ArrowUpRight className="mt-2"/></div></Link></div></div></section>
      <section className="border-y border-[#d8dedb] bg-[#ecf0eb]"><div className="page-shell flex flex-wrap items-center justify-between gap-5 py-10"><div><p className="text-xs font-bold tracking-[.2em] text-[#5B93C5]">ONE THING LEADS TO ANOTHER</p><h2 className="editorial-title mt-2 text-3xl">探索之後，也能分享。</h2><p className="mt-2 max-w-xl text-sm leading-7 text-[#5c717a]">挑一段故事，試試 IG 與 LINE 的分享預覽，讓照顧成為一起參與的事。</p></div><Link href="/community/connect" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#8eb0c2] px-5 text-sm font-semibold text-[#315F86] hover:bg-white">社群分享工作室 <ArrowUpRight size={16}/></Link></div></section>
      <section className="page-shell pt-14"><p className="text-xs font-bold tracking-[.2em] text-[#5B93C5]">MORE WAYS TO CARE</p><h2 className="editorial-title mt-3 text-4xl">其他實用工具</h2></section>
      <section className="page-shell grid gap-3 py-8 sm:grid-cols-2 sm:py-10">
        {tools.map(
          ({ href, number, title, en, description, icon: Icon, color }) => (
            <Link
              key={href}
              href={href}
              className={`group flex min-h-64 flex-col justify-between border border-[#d9cfc3] p-7 transition-transform duration-300 hover:-translate-y-1 hover:border-[#5B93C5] ${color}`}
            >
              <div className="flex items-start justify-between">
                <span className="font-mono text-sm text-[#5f6c6c]">
                  {number} / 08
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
