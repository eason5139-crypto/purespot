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
  PawPrint,
} from "lucide-react";
import { BentoWoodBoxSvg } from "@/components/ui/CraftEmblems";

export const metadata: Metadata = {
  title: "日台飼育道具室",
  description:
    "集合曲木旬食組配盤、成分微距放大鏡、旅前整理桌與探索任務手冊，協助飼主清晰掌握照護細節。",
};

const tools = [
  { href: "/care/ingredients", number: "01", title: "成分放大鏡", subtitle: "食品資料並排看", description: "查看配方與過敏原，並排比較兩款食品。", icon: ScanSearch, color: "bg-[#e5eef3]" },
  { href: "/care/packing", number: "02", title: "旅前打包桌", subtitle: "外出清單一起整理", description: "依毛孩與出門情境準備用品，缺少的物品再回商城挑。", icon: Luggage, color: "bg-[#edf2e9]" },
  { href: "/care/feeding", number: "03", title: "一日餵食時鐘", subtitle: "安排乾濕配比與餐次", description: "選擇餵食時段，依每日熱量估算乾濕配餐份量。", icon: Utensils, color: "bg-[#e5eef3]" },
  {
    href: "/shop#bento-builder",
    number: "04",
    title: "曲木旬食配餐盒",
    subtitle: "主食基底 ＋ 原肉佐餐 ＋ 日常器物",
    description:
      "自由配搭三格日常餐盤，即時核算營養平衡比並一鍵封裝納入購物籃。",
    icon: Utensils,
    color: "bg-[#f4e5d2]",
  },
  {
    href: "/community#id-card-studio",
    number: "05",
    title: "里民手形銘牌印製",
    subtitle: "活版印刷工藝 · 火漆封蠟印記",
    description:
      "為毛孩鑄造專屬街坊識別銘牌，自選年度稱號與紅章，即時留存或分享。",
    icon: Award,
    color: "bg-[#f3dfd8]",
  },
  {
    href: "/care/compass",
    number: "06",
    title: "選物羅盤",
    subtitle: "三分鐘推論適配提案",
    description:
      "依居家情境與體質目標，條列三組具備營養邏輯的選物提案與比對清單。",
    icon: Compass,
    color: "bg-[#e7efe6]",
  },
  {
    href: "/care/selection",
    number: "07",
    title: "選物實驗室",
    subtitle: "分層比對飲食與居家器具",
    description:
      "從毛孩檔案出發，有條理對照蛋白質來源、顆粒尺寸與養護重點。",
    icon: Compass,
    color: "bg-[#efe2cc]",
  },
  {
    href: "/care/refill",
    number: "08",
    title: "存糧週期預報",
    subtitle: "換算剩餘天數與補貨時程",
    description:
      "依照每日建議攝取克數換算存糧可食天數，從容規劃下一次新鮮補貨。",
    icon: CloudSun,
    color: "bg-[#f5ebd9]",
  },
  {
    href: "/care/transition",
    number: "09",
    title: "七日換糧陪跑",
    subtitle: "循序漸進的飲食銜接表",
    description:
      "逐日標示新舊配方混合比例，並同步紀錄消化狀態與進食意願反應。",
    icon: Shuffle,
    color: "bg-[#e2ebdf]",
  },
  {
    href: "/health",
    number: "10",
    title: "日常照護手札",
    subtitle: "基本資料與份量紀錄表",
    description:
      "掌握體重變化、熱量需求估算與過往定期配排程的集中總覽頁面。",
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
        <div className="page-shell grid gap-8 py-14 sm:py-20 lg:grid-cols-[.95fr_1.05fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#d6c2ac] bg-white/85 px-3.5 py-1.5 text-xs font-bold text-[#935941] shadow-xs">
              <PawPrint size={13} />
              PURESPOT WORKSHOP ・ 日台飼育道具室
            </span>
            <h1 className="editorial-title mt-5 text-4xl leading-tight text-[#2d251e] sm:text-6xl">
              照顧毛孩的日常，
              <br />
              <span className="text-[#935941]">也能成為有秩序的手作樂趣。</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-8 text-[#5c4f43] sm:text-base">
              將繁複的檢驗報表與克數試算整理成直覺的生活道具。無論是用放大鏡檢視原料、組合曲木旬食木盒，或盤點外出整理清單，都能在這裡清晰完成。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/shop#bento-builder"
                className="btn-tactile inline-flex min-h-11 items-center gap-2 rounded-full bg-[#935941] px-6 text-sm font-bold text-white"
              >
                <BentoWoodBoxSvg size={20} />
                <span>搭配曲木旬食木盒</span>
                <ArrowUpRight size={16} />
              </Link>
              <Link
                href="/care/compass"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-[#302b26] bg-white px-5 text-sm font-bold text-[#302b26] hover:bg-[#f4ebe0]"
              >
                開啟選物羅盤 <ArrowUpRight size={16} />
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
            <span className="washi-tape absolute left-2 top-4 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-[#7c5338] shadow-sm">
              <Sparkles size={13} />
              選擇以下道具立即操作
            </span>
          </div>
        </div>
      </section>

      <section id="today" className="page-shell py-12 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[.15em] text-[#935941]">
              CORE TOOLS · 焦點飼育道具
            </p>
            <h2 className="editorial-title mt-2 text-3xl sm:text-4xl">
              從最迫切的需求開始檢視
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-7 text-[#675e53]">
            每個入口皆可依據家中毛孩檔案即時演算，並保留清晰依據供日後複查。
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
          <Link
            href="/care/ingredients"
            className="group relative flex min-h-[400px] flex-col justify-between overflow-hidden rounded-[2rem] border border-[#d9cbb8] bg-[#e9dfd1] p-7 shadow-sm transition-transform hover:-translate-y-1 sm:p-10"
          >
            <div className="relative z-10">
              <span className="rounded-full bg-white/90 px-4 py-1.5 font-mono text-xs font-bold text-[#935941]">
                01 / 成分溯源放大鏡
              </span>
              <h3 className="editorial-title mt-6 text-4xl text-[#2d251e] sm:text-5xl">
                成分放大鏡
              </h3>
              <p className="mt-4 max-w-xs text-sm leading-7 text-[#5c4f43]">
                並排檢視兩款配方的原料排序、過敏原標記與檢驗批次，將專業成分表翻譯成清晰的白話說明。
              </p>
            </div>
            <span className="btn-tactile relative z-10 inline-flex w-fit items-center gap-2 rounded-full bg-[#935941] px-5 py-3 text-sm font-bold text-white transition-all group-hover:gap-3">
              開啟成分對照 <ArrowUpRight size={17} />
            </span>
            <ScanSearch
              className="pointer-events-none absolute -bottom-14 -right-12 size-80 rotate-[-13deg] text-[#b89f84]/35 transition-transform duration-500 group-hover:scale-110"
              strokeWidth={0.8}
            />
          </Link>

          <div className="grid gap-4">
            <Link
              href="/care/packing"
              className="group relative flex min-h-48 flex-col justify-between overflow-hidden rounded-[2rem] border border-[#decbb0] bg-[#f2e2c6] p-6 shadow-sm transition-transform hover:-translate-y-1 sm:p-8"
            >
              <Luggage
                className="absolute -right-8 -top-6 size-44 rotate-[14deg] text-[#b6986c]/30 transition-transform duration-500 group-hover:rotate-[4deg]"
                strokeWidth={0.8}
              />
              <span className="relative font-mono text-xs font-bold text-[#875e36]">
                02 / 外出裝備盤點
              </span>
              <div className="relative">
                <h3 className="editorial-title text-3xl text-[#2d251e]">
                  旅前整理桌
                </h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-[#5c4f43]">
                  規劃散步、露營或返鄉攜行清單，逐項核對並補齊缺少的生活器具。
                </p>
                <ArrowUpRight className="mt-2 text-[#935941]" />
              </div>
            </Link>

            <Link
              href="/care/missions"
              className="group relative flex min-h-48 flex-col justify-between overflow-hidden rounded-[2rem] border border-[#c8d6c5] bg-[#dfece0] p-6 shadow-sm transition-transform hover:-translate-y-1 sm:p-8"
            >
              <Sparkles
                className="absolute -right-3 -top-7 size-40 text-[#6e9175]/25 transition-transform duration-500 group-hover:rotate-12"
                strokeWidth={0.8}
              />
              <span className="relative font-mono text-xs font-bold text-[#3f6246]">
                03 / 集章學習手冊
              </span>
              <div className="relative">
                <h3 className="editorial-title text-3xl text-[#2d251e]">
                  毛孩探索任務
                </h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-[#495e4d]">
                  透過三個貼近台灣氣候的照護小問答，累積實用飼養知識並收集印記。
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
              COMMUNITY CRAFT PASS
            </p>
            <h2 className="editorial-title mt-2 text-3xl">
              走訪完道具室，為毛孩印製里民手形銘牌
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-7 text-[#5c4f43]">
              前往街坊生活誌製作專屬的活版印刷銘牌並壓蓋火漆封蠟印章，與鄰近家庭交流飲食筆記。
            </p>
          </div>
          <Link
            href="/community#id-card-studio"
            className="btn-tactile inline-flex min-h-11 items-center gap-2 rounded-full bg-[#935941] px-5 text-sm font-bold text-white"
          >
            <Award size={16} />
            前往手形銘牌印製所 <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>

      <section className="page-shell pt-14">
        <p className="text-xs font-bold tracking-[.15em] text-[#935941]">
          TOOL DIRECTORY
        </p>
        <h2 className="editorial-title mt-2 text-3xl sm:text-4xl">
          完整飼育道具目錄
        </h2>
      </section>

      <section className="page-shell grid gap-4 py-8 sm:grid-cols-2 sm:py-10 lg:grid-cols-3">
        {tools.map(
          ({
            href,
            number,
            title,
            subtitle,
            description,
            icon: Icon,
            color,
          }) => (
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
                <h2 className="editorial-title mt-1.5 text-2xl text-[#2d251e] sm:text-3xl">
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
        份量、存糧天數與商品適配皆依已建檔之資料進行日常估算；若毛孩正面臨特殊醫療狀況、處方飲食或持續不適，請務必優先諮詢專業獸醫師。
      </p>
    </main>
  );
}
