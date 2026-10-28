"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowDown, ArrowRight, Calculator, Check, PawPrint } from "lucide-react";
import { useUiStore } from "@/store/useUiStore";
import { useActivePet } from "@/store/usePetContextStore";
import { useCatalogStore } from "@/store/useCatalogStore";
import { matchProduct } from "@/lib/matching";
import { money } from "@/lib/utils";
import type { SiteContent } from "@/lib/siteContent";

const reveal = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease: "easeOut" as const },
};

export function WarmBrandHomePage({ content }: { content: SiteContent }) {
  const products = useCatalogStore((state) => state.products);
  const pet = useActivePet();
  const openCalculator = useUiStore((state) => state.openCalculator);
  const suggestedProduct = products.find((product) => matchProduct(product, pet).safe);
  const featured = products.find((product) => product.stock > 0);
  const benefits = [
    [content.benefit1Title, content.benefit1Text],
    [content.benefit2Title, content.benefit2Text],
    [content.benefit3Title, content.benefit3Text],
    [content.benefit4Title, content.benefit4Text],
  ];

  return (
    <main id="main-content" className="public-editorial overflow-hidden bg-[#f8f4ed] text-[#302b26]">
      <section className="border-b border-[#d9cec0]">
        <div className="page-shell grid min-h-[690px] lg:grid-cols-[.92fr_1.08fr]">
          <div className="relative z-10 flex flex-col justify-center py-16 lg:py-24 lg:pr-12">
            <div className="flex items-center gap-3 text-[11px] font-semibold tracking-[.22em] text-[#946c52]"><span className="h-px w-9 bg-[#b67855]" /> PURESPOT JOURNAL · 01</div>
            <h1 className="editorial-title mt-9 max-w-[660px] text-[clamp(3.5rem,7vw,7.4rem)] font-medium leading-[1.07] tracking-[-.08em]">{content.heroTitle}<br /><span className="text-[#a45f43]">{content.heroAccent}</span></h1>
            <p className="mt-8 max-w-[510px] border-l border-[#b87956] pl-6 text-base leading-8 text-[#665c52] sm:text-lg">{content.heroDescription}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/shop" className="editorial-action inline-flex min-h-12 items-center justify-center gap-3 bg-[#a96043] px-6 text-sm font-semibold text-white hover:bg-[#8e4d36]">{content.heroPrimaryLabel}<ArrowRight size={17} /></Link>
              <button type="button" onClick={() => openCalculator(suggestedProduct?.id ?? null)} className="editorial-action inline-flex min-h-12 items-center justify-center gap-3 border border-[#cdbbae] px-6 text-sm font-semibold text-[#44392f] hover:border-[#a96043] hover:bg-white"><Calculator size={17} />{content.heroSecondaryLabel}</button>
            </div>
            <a href="#our-approach" className="mt-14 inline-flex w-fit items-center gap-2 text-xs font-medium text-[#806f5f] hover:text-[#a96043]">往下認識我們 <ArrowDown size={14} /></a>
          </div>
          <div className="relative min-h-[420px] lg:-mr-[max(1.5rem,calc((100vw-1320px)/2))]">
            <Image src={content.heroImage} alt={content.heroImageAlt} fill priority sizes="(max-width:1024px) 100vw,54vw" className="object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#302b26]/35 via-transparent to-transparent" />
            <div className="absolute bottom-7 left-7 right-7 flex max-w-[360px] items-center gap-3 border border-white/70 bg-[#f8f4ed]/95 px-5 py-4 shadow-[0_18px_36px_-26px_#2d211b] backdrop-blur-sm sm:left-10"><PawPrint size={22} className="shrink-0 text-[#a96043]" /><div className="min-w-0"><p className="text-xs text-[#806d5e]">為 {pet.name} 留一份剛剛好的照顧</p><p className="truncate text-sm font-semibold">{suggestedProduct?.name ?? "從認識毛孩開始"}</p></div></div>
          </div>
        </div>
      </section>

      <section id="our-approach" className="page-shell grid gap-10 border-b border-[#d9cec0] py-20 lg:grid-cols-[.8fr_1.2fr] lg:gap-24 lg:py-28">
        <motion.div {...reveal}><span className="editorial-kicker">01 / OUR APPROACH</span><h2 className="editorial-title mt-5 max-w-[510px] text-4xl font-medium leading-[1.3] tracking-[-.055em] sm:text-5xl">{content.benefitsTitle}</h2><p className="mt-6 max-w-md text-base leading-8 text-[#71675c]">{content.benefitsDescription}</p><Link href="/transparency" className="mt-9 inline-flex min-h-11 items-center gap-2 border-b border-[#a96043] text-sm font-semibold text-[#915238] hover:gap-4">了解我們如何公開資訊 <ArrowRight size={17} /></Link></motion.div>
        <div className="border-t border-[#cbbdaf]">{benefits.map(([title, description], index) => <motion.div key={title} {...reveal} className="grid gap-3 border-b border-[#d9cec0] py-6 sm:grid-cols-[3.5rem_1fr] sm:gap-8"><span className="text-sm font-medium text-[#a96043]">0{index + 1}</span><div><h3 className="text-xl font-semibold tracking-[-.025em]">{title}</h3><p className="mt-2 max-w-lg text-sm leading-7 text-[#71675c]">{description}</p></div></motion.div>)}</div>
      </section>

      <section className="bg-[#e7e2d7] py-20 lg:py-28">
        <div className="page-shell grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-24">
          <div className="relative min-h-[520px] overflow-hidden bg-[#d4c9bb]"><Image src={featured?.image ?? "/images/salmon-cat.png"} alt={featured?.name ?? "PURESPOT 主食包裝"} fill sizes="(max-width:1024px) 100vw,50vw" className="object-cover" /><div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#24221f]/75 to-transparent p-7 pt-24 text-white"><p className="text-xs tracking-[.2em]">FEATURED RECIPE</p><p className="mt-2 text-xl font-semibold">{featured?.name ?? "精選配方"}</p></div></div>
          <motion.div {...reveal}><span className="editorial-kicker">02 / THE EVERYDAY RITUAL</span><h2 className="editorial-title mt-5 text-4xl font-medium leading-[1.3] tracking-[-.055em] sm:text-5xl">好好吃飯，是每天都做得到的愛。</h2><p className="mt-7 max-w-lg text-base leading-8 text-[#675e53]">從成分、份量到補貨節奏，讓每一次選擇都更有把握。先看清楚，再選適合 {pet.name} 的那一包。</p><div className="mt-9 border-y border-[#bfb3a5] py-5"><div className="flex items-center justify-between gap-5 text-sm"><span className="text-[#74695e]">今日精選</span><strong>{featured?.name ?? "主食選物"}</strong></div><div className="mt-3 flex items-center justify-between gap-5 text-sm"><span className="text-[#74695e]">規格與價格</span><strong>{featured ? `${featured.bagGrams}g · ${money(featured.priceNt)}` : "前往商城查看"}</strong></div></div><Link href={featured ? `/products/${featured.slug}` : "/shop"} className="editorial-action mt-8 inline-flex min-h-12 items-center gap-3 bg-[#302b26] px-6 text-sm font-semibold text-white hover:bg-[#53453a]">查看商品與配方 <ArrowRight size={17} /></Link></motion.div>
        </div>
      </section>

      <section className="page-shell grid gap-12 py-20 lg:grid-cols-[.9fr_1.1fr] lg:gap-24 lg:py-28">
        <motion.div {...reveal} className="flex flex-col justify-center"><span className="editorial-kicker">03 / CARE TOGETHER</span><h2 className="editorial-title mt-5 text-4xl font-medium leading-[1.3] tracking-[-.055em] sm:text-5xl">{content.familyTitle}</h2><p className="mt-6 max-w-lg leading-8 text-[#71675c]">{content.familyDescription}</p><Link href="/account" className="mt-8 inline-flex min-h-11 w-fit items-center gap-2 border-b border-[#a96043] text-sm font-semibold text-[#915238] hover:gap-4">看看我的毛孩資料 <ArrowRight size={17} /></Link></motion.div>
        <div className="bg-[#3c483b] p-8 text-[#f7f3e9] sm:p-12"><span className="text-xs font-semibold tracking-[.2em] text-[#d2bd9e]">A ROUTINE WORTH SHARING</span><div className="mt-10 space-y-7">{[["01", "記下牠的需要", "把年齡、體重與過敏資訊放在同一處。"], ["02", "一起選擇", "讓家人看見同一份選物與照顧方向。"], ["03", "留住陪伴時間", "把每日份量與補貨節奏整理得更清楚。"]].map(([number, title, text]) => <div key={number} className="grid grid-cols-[2.5rem_1fr] gap-5 border-t border-white/20 pt-6"><span className="text-sm text-[#d6bfa3]">{number}</span><div><h3 className="text-xl font-semibold">{title}</h3><p className="mt-2 text-sm leading-7 text-[#e1e1d5]">{text}</p></div></div>)}</div></div>
      </section>

      <section className="border-y border-[#d9cec0] bg-[#eee8de] py-20 lg:py-28"><div className="page-shell grid items-center gap-10 lg:grid-cols-[1.1fr_.9fr] lg:gap-20"><div className="relative min-h-[420px] overflow-hidden bg-[#d4c9bb] lg:min-h-[540px]"><Image src={content.communityImage} alt="毛孩日常與 PURESPOT 商品" fill sizes="(max-width:1024px) 100vw,50vw" className="object-cover" /></div><motion.div {...reveal}><span className="editorial-kicker">04 / LIFE WITH PETS</span><h2 className="editorial-title mt-5 text-4xl font-medium leading-[1.3] tracking-[-.055em] sm:text-5xl">{content.communityTitle}</h2><p className="mt-6 max-w-lg leading-8 text-[#71675c]">{content.communityDescription}</p><Link href="/community" className="editorial-action mt-8 inline-flex min-h-12 items-center gap-3 bg-[#a96043] px-6 text-sm font-semibold text-white hover:bg-[#8e4d36]">走進毛孩日常 <ArrowRight size={17} /></Link></motion.div></div></section>

      <section className="bg-[#3c483b] py-20 text-[#f7f3e9] lg:py-24"><div className="page-shell flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between"><div><span className="text-xs font-semibold tracking-[.22em] text-[#d2bd9e]">THE 7C PERSPECTIVE</span><h2 className="editorial-title mt-5 max-w-2xl text-4xl font-medium leading-[1.25] sm:text-5xl">每一份安心，都應該有資訊可以對照。</h2></div><Link href="/transparency" className="editorial-action inline-flex min-h-12 w-fit items-center gap-3 border border-[#d5c7ad] px-6 text-sm font-semibold text-[#f7f3e9] hover:bg-white/10">查看透明資訊 <ArrowRight size={17} /></Link></div><div className="page-shell mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/20 pt-7 text-sm text-[#e3e3d8]">{["成分", "營養", "批次", "適配提醒"].map((item) => <span key={item} className="inline-flex items-center gap-2"><Check size={14} className="text-[#d6bfa3]" />{item}</span>)}</div></section>

      <section className="page-shell grid gap-8 py-20 sm:py-28 lg:grid-cols-[1fr_auto] lg:items-end"><motion.div {...reveal}><span className="editorial-kicker">BEGIN WITH ONE GOOD CHOICE</span><h2 className="editorial-title mt-5 text-4xl font-medium leading-[1.3] tracking-[-.055em] sm:text-5xl">{content.finalTitle}</h2><p className="mt-5 max-w-xl leading-8 text-[#71675c]">{content.finalDescription}</p></motion.div><button type="button" onClick={() => openCalculator(suggestedProduct?.id ?? null)} className="editorial-action inline-flex min-h-12 w-fit items-center gap-3 bg-[#a96043] px-6 text-sm font-semibold text-white hover:bg-[#8e4d36]"><Calculator size={17} />開始配糧試算 <ArrowRight size={17} /></button></section>
    </main>
  );
}
