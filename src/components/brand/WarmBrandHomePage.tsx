"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowDown, ArrowRight, Calculator, Check } from "lucide-react";
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
  const suggestedProduct = products.find((product) => product.kind !== "SUPPLIES" && product.autoshipEligible && matchProduct(product, pet).safe);
  const featured = products.find((product) => product.stock > 0);
  const benefits = [
    [content.benefit1Title, content.benefit1Text],
    [content.benefit2Title, content.benefit2Text],
    [content.benefit3Title, content.benefit3Text],
    [content.benefit4Title, content.benefit4Text],
  ];

  return (
    <main id="main-content" className="public-editorial overflow-hidden bg-[#f8f4ed] text-[#302b26]">
      <section className="brand-hero relative isolate overflow-hidden bg-[#28332d] text-[#fffaf0]">
        <motion.div initial={{ scale: 1.06 }} animate={{ scale: 1 }} transition={{ duration: 1.4, ease: "easeOut" }} className="absolute inset-0">
          <Image src={content.heroImage} alt={content.heroImageAlt} fill priority sizes="100vw" className="object-cover object-[62%_center]" />
        </motion.div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(24,33,27,.88)_0%,rgba(24,33,27,.66)_38%,rgba(24,33,27,.18)_78%)] max-sm:bg-[linear-gradient(0deg,rgba(24,33,27,.95)_0%,rgba(24,33,27,.62)_50%,rgba(24,33,27,.08)_100%)]" />
        <div className="page-shell relative z-10 flex min-h-[760px] flex-col justify-between py-10 sm:min-h-[780px] sm:py-14">
          <div className="flex items-center justify-between gap-5 border-b border-white/30 pb-5 text-[11px] font-semibold tracking-[.2em] text-[#f6e6d0]"><span>PURESPOT — THE EVERYDAY EDIT</span><span>01 / 04</span></div>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8, delay: .15 }} className="max-w-[810px] py-12">
            <p className="mb-6 flex items-center gap-3 text-xs font-medium tracking-[.28em] text-[#f4d4b7]"><span className="h-px w-9 bg-[#e6b995]" />{content.heroEyebrow}</p>
            <h1 className="editorial-title max-w-[780px] text-[clamp(3.4rem,8vw,8.4rem)] font-medium leading-[1.02] tracking-[-.08em]">{content.heroTitle}<br /><span className="text-[#f4c19f]">{content.heroAccent}</span></h1>
            <p className="mt-8 max-w-[510px] border-l-2 border-[#e9b68f] pl-5 text-base leading-8 text-[#f6ede2] sm:text-lg">{content.heroDescription}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/shop" className="editorial-action inline-flex min-h-13 items-center justify-center gap-3 bg-[#935941] px-7 text-sm font-semibold text-white hover:bg-[#794632]">{content.heroPrimaryLabel}<ArrowRight size={17} /></Link>
              {suggestedProduct ? <button type="button" onClick={() => openCalculator(suggestedProduct.id)} className="editorial-action inline-flex min-h-13 items-center justify-center gap-3 border border-white/65 px-6 text-sm font-semibold text-white hover:bg-white/10"><Calculator size={17} />{content.heroSecondaryLabel}</button> : <Link href="/shop" className="editorial-action inline-flex min-h-13 items-center justify-center gap-3 border border-white/65 px-6 text-sm font-semibold text-white hover:bg-white/10">看看適合的選物 <ArrowRight size={17} /></Link>}
            </div>
          </motion.div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/30 pt-5 text-xs tracking-wide text-[#f3e6d9]"><span>陪牠生活的每一天，都值得認真對待。</span><a href="#our-approach" className="inline-flex items-center gap-2 hover:text-[#ffcba8]">往下探索 <ArrowDown size={15} /></a></div>
        </div>
      </section>

      <section id="our-approach" className="page-shell grid gap-10 border-b border-[#d9cec0] py-20 lg:grid-cols-[.8fr_1.2fr] lg:gap-24 lg:py-28">
        <motion.div {...reveal}><span className="editorial-kicker">01 / OUR APPROACH</span><h2 className="editorial-title mt-5 max-w-[510px] text-4xl font-medium leading-[1.3] tracking-[-.055em] sm:text-5xl">{content.benefitsTitle}</h2><p className="mt-6 max-w-md text-base leading-8 text-[#71675c]">{content.benefitsDescription}</p><Link href="/transparency" className="mt-9 inline-flex min-h-11 items-center gap-2 border-b border-[#935941] text-sm font-semibold text-[#935941] hover:gap-4">了解我們如何公開資訊 <ArrowRight size={17} /></Link></motion.div>
        <div className="border-t border-[#cbbdaf]">{benefits.map(([title, description], index) => <motion.div key={title} {...reveal} className="grid gap-3 border-b border-[#d9cec0] py-6 sm:grid-cols-[3.5rem_1fr] sm:gap-8"><span className="text-sm font-semibold text-[#935941]">0{index + 1}</span><div><h3 className="text-xl font-semibold tracking-[-.025em]">{title}</h3><p className="mt-2 max-w-lg text-sm leading-7 text-[#71675c]">{description}</p></div></motion.div>)}</div>
      </section>

      <section className="bg-[#e7e2d7] py-20 lg:py-28">
        <div className="page-shell grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-24">
          <div className="relative min-h-[520px] overflow-hidden bg-[#d4c9bb]"><Image src={content.shopImage} alt="毛孩居家選物情境" fill sizes="(max-width:1024px) 100vw,50vw" className="object-cover transition-transform duration-700 hover:scale-[1.03]" /><div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#24221f]/75 to-transparent p-7 pt-24 text-white"><p className="text-xs tracking-[.2em]">THE DAILY SELECTION</p><p className="mt-2 text-xl font-semibold">吃飯、玩耍與休息，都有好選擇。</p></div></div>
          <motion.div {...reveal}><span className="editorial-kicker">02 / THE EVERYDAY RITUAL</span><h2 className="editorial-title mt-5 text-4xl font-medium leading-[1.3] tracking-[-.055em] sm:text-5xl">從一餐飯，到一個安心的角落。</h2><p className="mt-7 max-w-lg text-base leading-8 text-[#675e53]">吃得好、玩得開心、在家自在休息。從適用動物、價格到商品細節，把每一次選擇都整理得更清楚。</p><div className="mt-9 border-y border-[#bfb3a5] py-5"><div className="flex items-center justify-between gap-5 text-sm"><span className="text-[#74695e]">今日精選</span><strong>{featured?.name ?? "主食選物"}</strong></div><div className="mt-3 flex items-center justify-between gap-5 text-sm"><span className="text-[#74695e]">規格與價格</span><strong>{featured ? `${featured.bagGrams}g · ${money(featured.priceNt)}` : "前往商城查看"}</strong></div></div><Link href={featured ? `/products/${featured.slug}` : "/shop"} className="editorial-action mt-8 inline-flex min-h-12 items-center gap-3 bg-[#935941] px-6 text-sm font-semibold text-white hover:bg-[#794632]">查看商品詳情 <ArrowRight size={17} /></Link></motion.div>
        </div>
      </section>

      <section className="page-shell grid gap-12 py-20 lg:grid-cols-[.9fr_1.1fr] lg:gap-24 lg:py-28">
        <motion.div {...reveal} className="flex flex-col justify-center"><span className="editorial-kicker">03 / CARE TOGETHER</span><h2 className="editorial-title mt-5 text-4xl font-medium leading-[1.3] tracking-[-.055em] sm:text-5xl">{content.familyTitle}</h2><p className="mt-6 max-w-lg leading-8 text-[#71675c]">{content.familyDescription}</p><Link href="/account" className="mt-8 inline-flex min-h-11 w-fit items-center gap-2 border-b border-[#935941] text-sm font-semibold text-[#935941] hover:gap-4">看看我的毛孩資料 <ArrowRight size={17} /></Link></motion.div>
        <div className="bg-[#3c483b] p-8 text-[#f7f3e9] sm:p-12"><span className="text-xs font-semibold tracking-[.2em] text-[#d2bd9e]">A ROUTINE WORTH SHARING</span><div className="mt-10 space-y-7">{[["01", "記下牠的需要", "把年齡、體重與過敏資訊放在同一處。"], ["02", "一起選擇", "讓家人看見同一份選物與照顧方向。"], ["03", "留住陪伴時間", "把每日份量與補貨節奏整理得更清楚。"]].map(([number, title, text]) => <div key={number} className="grid grid-cols-[2.5rem_1fr] gap-5 border-t border-white/20 pt-6"><span className="text-sm text-[#d6bfa3]">{number}</span><div><h3 className="text-xl font-semibold">{title}</h3><p className="mt-2 text-sm leading-7 text-[#e1e1d5]">{text}</p></div></div>)}</div></div>
      </section>

      <section className="border-y border-[#d9cec0] bg-[#eee8de] py-20 lg:py-28"><div className="page-shell grid items-center gap-10 lg:grid-cols-[1.1fr_.9fr] lg:gap-20"><div className="relative min-h-[420px] overflow-hidden bg-[#d4c9bb] lg:min-h-[540px]"><Image src={content.communityImage} alt="毛孩日常與 PURESPOT 商品" fill sizes="(max-width:1024px) 100vw,50vw" className="object-cover" /></div><motion.div {...reveal}><span className="editorial-kicker">04 / LIFE WITH PETS</span><h2 className="editorial-title mt-5 text-4xl font-medium leading-[1.3] tracking-[-.055em] sm:text-5xl">{content.communityTitle}</h2><p className="mt-6 max-w-lg leading-8 text-[#71675c]">{content.communityDescription}</p><Link href="/community" className="editorial-action mt-8 inline-flex min-h-12 items-center gap-3 bg-[#935941] px-6 text-sm font-semibold text-white hover:bg-[#794632]">走進毛孩日常 <ArrowRight size={17} /></Link></motion.div></div></section>

      <section className="bg-[#3c483b] py-20 text-[#f7f3e9] lg:py-24"><div className="page-shell flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between"><div><span className="text-xs font-semibold tracking-[.22em] text-[#d2bd9e]">THE 7C PERSPECTIVE</span><h2 className="editorial-title mt-5 max-w-2xl text-4xl font-medium leading-[1.25] sm:text-5xl">每一份安心，都應該有資訊可以對照。</h2></div><Link href="/transparency" className="editorial-action inline-flex min-h-12 w-fit items-center gap-3 border border-[#d5c7ad] px-6 text-sm font-semibold text-[#f7f3e9] hover:bg-white/10">查看透明資訊 <ArrowRight size={17} /></Link></div><div className="page-shell mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/20 pt-7 text-sm text-[#e3e3d8]">{["成分", "營養", "批次", "適配提醒"].map((item) => <span key={item} className="inline-flex items-center gap-2"><Check size={14} className="text-[#d6bfa3]" />{item}</span>)}</div></section>

      <section className="page-shell grid gap-8 py-20 sm:py-28 lg:grid-cols-[1fr_auto] lg:items-end"><motion.div {...reveal}><span className="editorial-kicker">BEGIN WITH ONE GOOD CHOICE</span><h2 className="editorial-title mt-5 text-4xl font-medium leading-[1.3] tracking-[-.055em] sm:text-5xl">{content.finalTitle}</h2><p className="mt-5 max-w-xl leading-8 text-[#71675c]">{content.finalDescription}</p></motion.div>{suggestedProduct ? <button type="button" onClick={() => openCalculator(suggestedProduct.id)} className="editorial-action inline-flex min-h-12 w-fit items-center gap-3 bg-[#935941] px-6 text-sm font-semibold text-white hover:bg-[#794632]"><Calculator size={17} />開始配糧試算 <ArrowRight size={17} /></button> : <Link href="/shop" className="editorial-action inline-flex min-h-12 w-fit items-center gap-3 bg-[#935941] px-6 text-sm font-semibold text-white hover:bg-[#794632]">探索商城 <ArrowRight size={17} /></Link>}</section>
    </main>
  );
}
