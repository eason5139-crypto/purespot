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
  Utensils,
  Award,
} from "lucide-react";

export const metadata: Metadata = {
  title: "毛孩生活工作室",
  description: "用毛孩便當組裝台、成分放大鏡、旅前打包桌與探索任務，讓照顧毛孩成為溫暖有趣的日常。",
};

const tools = [
  {
    href: "/shop#bento-builder",
    number: "04",
    title: "毛孩便當 DIY 組裝台",
    subtitle: "主食打底 ＋ 營養加菜 ＋ 飯後小確幸",
    description: "像在巷口挑便當配菜一樣，幫挑嘴主子搖出一盒專屬大餐，一鍵整盒飛進菜籃。",
    icon: Utensils,
    color: "bg-[#f4e5d2]",
  },
  {
    href: "/community#id-card-studio",
    number: "05",
    title: "台灣毛孩榮譽里民證",
    subtitle: "巷口里長伯核發 · 專屬身分證",
    description: "幫家裡那位沙發馬鈴薯或罐罐鑑賞家印一張里民證，蓋上紅章分享給親友。",
    icon: Award,
    color: "bg-[#f3dfd8]",
  },
  {
    href: "/care/compass",
    number: "06",
    title: "選物羅盤",
    subtitle: "三分鐘找到有理由的提案",
    description: "說出毛孩近況，查看三種量身推薦；比較後直接放進菜籃。",
    icon: Compass,
    color: "bg-[#e7efe6]",
  },
  {
    href: "/care/selection",
    number: "07",
    title: "選物實驗室",
    subtitle: "分層比對適合的食物與用品",
    description: "從毛孩資料出發，清楚對照蛋白質來源、顆粒與照護重點。",
    icon: Compass,
    color: "bg-[#efe2cc]",
  },
  {
    href: "/care/refill",
    number: "08",
    title: "補貨天氣預報",
    subtitle: "不怕半夜發現飼料見底",
    description: "把家中存量換算成剩餘天數，提早安排下一袋新鮮口糧。",
    icon: CloudSun,
    color: "bg-[#f5ebd9]",
  },
  {
    href: "/care/transition",
    number: "09",
    title: "七日換糧陪跑",
    subtitle: "台灣換季玻璃肚救星",
    description: "看見每天的新舊食物比例，也記下毛孩便便與食慾反應。",
    icon: Shuffle,
    color: "bg-[#e2ebdf]",
  },
  {
    href: "/health",
    number: "10",
    title: "日常照護手札",
    subtitle: "毛孩專屬健康與份量紀錄",
    description: "查看毛孩基本資料、每日熱量份量估算與照護提醒。",
    icon: HeartPulse,
    color: "bg-[#efe4dc]",
  },
];

export default function CarePage() {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-[#f8f4ed] text-[#302b26]"
    >
      <section className="overflow-hidden border-b border-[#dfd3c3] bg-gradient-to-br from-[#f3e7d7] via-[#f8f2e8] to-[#ebe4d8] text-[#302b26]">
        <div className="page-shell grid gap-8 py-14 lg:grid-cols-[.95fr_1.05fr] lg:items-center sm:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#d6c2ac] bg-white/85 px-3.5 py-1.5 text-xs font-bold text-[#935941] shadow-xs">
              🐾 台灣在地毛孩生活工作室 · 邊玩邊懂照顧
            </span>
            <h1 className="editorial-title mt-5 text-4xl leading-tight sm:text-6xl text-[#2d251e]">
              照顧毛孩的每一天，
              <br />
              <span className="text-[#935941]">本來就該這麼好玩。</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-8 text-[#5c4f43] sm:text-base">
              不想看密密麻麻的化學名詞？來這裡用「成分白話放大鏡」看懂飼料、幫毛孩搖一盒「專屬配菜便當」，或花三分鐘解鎖互動小任務！
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/shop#bento-builder"
                className="btn-tactile inline-flex min-h-11 items-center gap-2 rounded-full bg-[#935941] px-6 text-sm font-bold text-white"
              >
                🍱 搖一盒毛孩便當 <ArrowUpRight size={16} />
              </Link>
              <Link
                href="/care/compass"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-[#302b26] bg-white px-5 text-sm font-bold text-[#302b26] hover:bg-[#f4ebe0]"
              >
                打開選物羅盤 <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>

          <div className="relative hidden h-[420px] lg:block" aria-hidden="true">
            <div className="polaroid-card absolute inset-6 rotate-[-3deg] overflow-hidden rounded-3xl">
              <div className="relative h-full w-full overflow-hidden rounded-2xl bg-[#d9c8b4]">
                <Image
                  src="/images/editorial/home-living-v2.png"
                  alt=""
                  fill
                  priority
                  sizes="50vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2d251e]/55 to-transparent" />
              </div>
            </div>
            <div className="absolute -bottom-2 right-2 flex size-32 rotate-[6deg] items-center justify-center rounded-[2rem] border-2 border-[#302b26]/10 bg-[#f1d6a8] text-[#935941] shadow-xl">
              <ScanSearch size={64} strokeWidth={1.3} />
            </div>
            <span className="washi-tape absolute left-2 top-4 rounded-xl px-4 py-2 text-xs font-bold text-[#7c5338] shadow-sm">
              ✨ 點擊任一工具馬上動手玩 ↗
            </span>
          </div>
        </div>
      </section>

      <section id="today" className="page-shell py-12 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[.15em] text-[#935941]">
              互動小工具 · 動手玩看看
            </p>
            <h2 className="editorial-title mt-2 text-3xl sm:text-4xl">
              今天，想先玩哪個角落？
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-7 text-[#675e53]">
            每個角落都能實際點擊互動、帶著專屬建議或可愛成果離開。
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
          <Link
            href="/care/ingredients"
            className="group relative flex min-h-[400px] flex-col justify-between overflow-hidden rounded-[2rem] border border-[#d9cbb8] bg-[#e9dfd1] p-7 sm:p-10 shadow-sm transition-transform hover:-translate-y-1"
          >
            <div className="relative z-10">
              <span className="rounded-full bg-white/90 px-4 py-1.5 text-xs font-bold text-[#935941]">
                01 / 成分白話放大鏡
              </span>
              <h3 className="editorial-title mt-6 text-4xl sm:text-5xl text-[#2d251e]">
                成分放大鏡
              </h3>
              <p className="mt-4 max-w-xs text-sm leading-7 text-[#5c4f43]">
                點開配方、過敏原與檢驗批次，把兩袋飼料擺在一起比一比，用白話文看懂毛孩吃進什麼。
              </p>
            </div>
            <span className="btn-tactile relative z-10 inline-flex w-fit items-center gap-2 rounded-full bg-[#935941] px-5 py-3 text-sm font-bold text-white transition-all group-hover:gap-3">
              拿放大鏡照看看 <ArrowUpRight size={17} />
            </span>
            <ScanSearch
              className="pointer-events-none absolute -bottom-14 -right-12 size-80 rotate-[-13deg] text-[#b89f84]/35 transition-transform duration-500 group-hover:scale-110"
              strokeWidth={0.8}
            />
          </Link>

          <div className="grid gap-4">
            <Link
              href="/care/packing"
              className="group relative flex min-h-48 flex-col justify-between overflow-hidden rounded-[2rem] border border-[#decbb0] bg-[#f2e2c6] p-6 sm:p-8 shadow-sm transition-transform hover:-translate-y-1"
            >
              <Luggage
                className="absolute -right-8 -top-6 size-44 rotate-[14deg] text-[#b6986c]/30 transition-transform duration-500 group-hover:rotate-[4deg]"
                strokeWidth={0.8}
              />
              <span className="relative text-xs font-bold text-[#875e36]">
                02 / 週末帶毛孩出門玩
              </span>
              <div className="relative">
                <h3 className="editorial-title text-3xl text-[#2d251e]">旅前打包桌</h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-[#5c4f43]">
                  要帶毛孩去露營或環島？勾選清單、儲存分享，缺的隨手補齊。
                </p>
                <ArrowUpRight className="mt-2 text-[#935941]" />
              </div>
            </Link>

            <Link
              href="/care/missions"
              className="group relative flex min-h-48 flex-col justify-between overflow-hidden rounded-[2rem] border border-[#c8d6c5] bg-[#dfece0] p-6 sm:p-8 shadow-sm transition-transform hover:-translate-y-1"
            >
              <Sparkles
                className="absolute -right-3 -top-7 size-40 text-[#6e9175]/25 transition-transform duration-500 group-hover:rotate-12"
                strokeWidth={0.8}
              />
              <span className="relative text-xs font-bold text-[#3f6246]">
                03 / 闖關蓋印章
              </span>
              <div className="relative">
                <h3 className="editorial-title text-3xl text-[#2d251e]">毛孩探索任務</h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-[#495e4d]">
                  三個輕鬆小挑戰，邊玩邊學台灣照護冷知識，收下紀念印章。
                </p>
                <ArrowUpRight className="mt-2 text-[#3f6246]" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-[#dfd3c3] bg-[#f2ebe0]">
        <div className="page-shell flex flex-wrap items-center justify-between gap-5 py-10">
          <div>
            <p className="text-xs font-bold tracking-[.15em] text-[#935941]">
              街坊鄰居一起聊
            </p>
            <h2 className="editorial-title mt-2 text-3xl">
              逛完工作室，去印張毛孩里民證吧！
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-7 text-[#5c4f43]">
              到街坊毛孩牆幫主子拍張拍立得、給別人家毛孩「摸摸頭 👋」，還能免費印製台灣毛孩榮譽里民證。
            </p>
          </div>
          <Link
            href="/community#id-card-studio"
            className="btn-tactile inline-flex min-h-11 items-center gap-2 rounded-full bg-[#935941] px-5 text-sm font-bold text-white"
          >
            🪪 前往里民證印製所 <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>

      <section className="page-shell pt-14">
        <p className="text-xs font-bold tracking-[.15em] text-[#935941]">
          更多暖心照護角落
        </p>
        <h2 className="editorial-title mt-2 text-3xl sm:text-4xl">
          日常照顧百寶袋
        </h2>
      </section>

      <section className="page-shell grid gap-4 py-8 sm:grid-cols-2 lg:grid-cols-3 sm:py-10">
        {tools.map(
          ({ href, number, title, subtitle, description, icon: Icon, color }) => (
            <Link
              key={href}
              href={href}
              className={`group flex min-h-60 flex-col justify-between rounded-3xl border border-[#d9cfc3] p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-[#935941] hover:shadow-lg ${color}`}
            >
              <div className="flex items-start justify-between">
                <span className="rounded-full bg-white/75 px-3 py-1 font-mono text-xs font-bold text-[#6e5a49]">
                  #{number}
                </span>
                <div className="flex size-11 items-center justify-center rounded-2xl bg-white/80 text-[#935941] shadow-xs">
                  <Icon size={22} />
                </div>
              </div>
              <div className="mt-6">
                <p className="text-xs font-bold text-[#84624c]">{subtitle}</p>
                <h2 className="editorial-title mt-1.5 text-2xl sm:text-3xl text-[#2d251e]">
                  {title}
                </h2>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <p className="text-xs leading-6 text-[#5c4f43]">
                    {description}
                  </p>
                  <ArrowUpRight className="shrink-0 text-[#935941] transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </div>
              </div>
            </Link>
          ),
        )}
      </section>

      <p className="page-shell pb-14 text-xs leading-6 text-[#756a5e]">
        份量、日期與商品適配均為依已輸入資料的日常估算；毛孩若有特殊疾病、處方飲食或持續不適時，請先與家庭獸醫師討論喔！
      </p>
    </main>
  );
}
