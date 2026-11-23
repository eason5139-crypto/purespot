"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Compass, ScanSearch, Backpack, HeartHandshake, Plus } from "lucide-react";
import { toast } from "sonner";
import { ActivityCarousel } from "./ActivityCarousel";
import { ProductDecisionDesk } from "@/components/shop/ProductDecisionDesk";
import { useSiteContentPreview } from "@/lib/useSiteContentPreview";
import type { SiteContent } from "@/lib/siteContent";
import { useCatalogStore } from "@/store/useCatalogStore";
import { useActivePet } from "@/store/usePetContextStore";
import { useCartStore } from "@/store/useCartStore";
import { useUiStore } from "@/store/useUiStore";
import { matchProduct } from "@/lib/matching";
import { money } from "@/lib/utils";
import { triggerFlyToCart } from "@/lib/flyToCart";

const tools = [
  { href: "/care/compass", title: "還沒決定，先聊聊牠。", label: "選物羅盤", text: "從毛孩的年齡、習慣與需求，縮小選擇。", image: "/images/editorial/home-living-v2.png", icon: Compass },
  { href: "/care/ingredients", title: "兩款之間，差在哪？", label: "成分放大鏡", text: "把原料、過敏原與批次資料攤開來看。", image: "/images/editorial/shop-living-v2.png", icon: ScanSearch },
  { href: "/care/packing", title: "出門前，一起點點名。", label: "旅前打包桌", text: "整理外出清單，只帶需要的東西。", image: "/images/editorial/small-friends-v2.png", icon: Backpack },
];
const reveal = { initial: { y: 12 }, whileInView: { y: 0 }, viewport: { once: true, amount: .12 }, transition: { duration: .45 } };

export function EditorialHomePage({ content }: { content: SiteContent }) {
  const view = useSiteContentPreview(content);
  const products = useCatalogStore((s) => s.products);
  const pet = useActivePet();
  const addItem = useCartStore((s) => s.addItem);
  const openCalculator = useUiStore((s) => s.openCalculator);
  const openPetEditor = useUiStore((s) => s.setPetEditorOpen);
  const selected = products.filter((p) => p.isPublished !== false && p.stock > 0 && matchProduct(p, pet).safe).slice(0, 6);
  const benefits = [[view.benefit1Title, view.benefit1Text], [view.benefit2Title, view.benefit2Text], [view.benefit3Title, view.benefit3Text], [view.benefit4Title, view.benefit4Text]];

  return <main id="main-content" className="editorial-home bg-[#f8f6f1] text-[#18344c]">
    <section id="home-activities" className="scroll-mt-32" aria-label="首頁活動">
      <ActivityCarousel promotions={view.promotions} autoplay={view.promotionAutoplay} intervalSeconds={view.promotionIntervalSeconds} />
    </section>
    <section id="home-hero" className="page-shell scroll-mt-32 grid gap-8 py-12 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:items-end">
      <div><h1 className="editorial-title max-w-2xl text-[clamp(2rem,4vw,3.6rem)] font-medium leading-[1.25]">{view.heroTitle}<span className="text-[#4f8ab8]">{view.heroAccent}</span></h1>
        <p className="mt-5 max-w-xl text-sm leading-8 text-[#647581]">{view.heroDescription}</p>
        <div className="mt-6 flex flex-wrap items-center gap-5"><Link href="/shop" className="text-link">{view.heroPrimaryLabel}<ArrowUpRight size={18} /></Link>
          <button type="button" className="text-link" onClick={() => openCalculator("__general__")}>{view.heroSecondaryLabel}<ArrowUpRight size={18} /></button></div>
      </div>
      <div className="relative h-52 overflow-hidden rounded-2xl sm:h-64"><Image src={view.heroImage} alt={view.heroImageAlt} fill sizes="(max-width:1024px) 100vw,45vw" className="object-cover" /></div>
    </section>

    <section className="border-y border-[#dce4e7] bg-[#f0f4f4] py-12 sm:py-16" aria-label="選物工具">
      <div className="page-shell"><div className="mb-7 flex items-end justify-between gap-4"><h2 className="editorial-title text-3xl sm:text-4xl">先找到方法，再挑喜歡的。</h2><Link href="/care/compass" className="text-link hidden sm:inline-flex">開始選物<ArrowUpRight size={18} /></Link></div>
        <div className="grid gap-5 md:grid-cols-3">{tools.map((tool, i) => <motion.div key={tool.href} {...reveal}>
          <Link href={tool.href} className="tool-story group block h-full overflow-hidden rounded-2xl bg-[#fffefa]">
            <div className="relative aspect-[1.65] overflow-hidden"><Image src={tool.image} alt="" fill sizes="(max-width:768px) 100vw,33vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
              <span className="absolute left-4 top-4 rounded-full bg-[#fffefa]/95 px-3 py-1.5 text-xs font-semibold text-[#18344c]">{tool.label}</span></div>
            <div className="p-5 sm:p-6"><span className="float-right grid size-9 place-items-center rounded-full border border-[#dce4e7] transition-colors group-hover:bg-[#315f86] group-hover:text-white"><ArrowUpRight size={18} /></span>
              <h3 className="pr-9 text-xl font-semibold leading-relaxed">{tool.title}</h3><p className="mt-3 text-sm leading-7 text-[#647581]">{tool.text}</p></div>
          </Link>
        </motion.div>)}</div>
      </div>
    </section>

    <section className="page-shell py-12 sm:py-18" aria-label="為毛孩選物">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="editorial-title text-3xl sm:text-4xl">{pet.name}的選物架</h2><p className="mt-3 text-sm text-[#647581]">依目前毛孩檔案，整理可以先看的選物。</p></div>
        <button type="button" onClick={() => openPetEditor(true)} className="text-link">調整毛孩條件<ArrowUpRight size={17} /></button></div>
      <div className="product-shelf mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-6">{selected.map((p) => <article key={p.id} className="group w-[240px] shrink-0 snap-start sm:w-[280px]">
        <Link href={`/products/${p.slug}`} className="relative block aspect-square overflow-hidden rounded-2xl bg-[#efeee8]"><Image src={p.image} alt={p.name} fill sizes="280px" className="object-contain p-5 transition-transform duration-700 group-hover:scale-[1.04]" /></Link>
        <div className="mt-4 flex items-start justify-between gap-3"><div><p className="text-xs text-[#647581]">{p.category}</p><Link href={`/products/${p.slug}`} className="mt-1 block text-base font-semibold leading-7">{p.name}</Link><strong className="mt-2 block text-sm text-[#315f86]">{money(p.priceNt)}</strong></div>
          <button type="button" aria-label={`加入購物車 ${p.name}`} className="grid size-10 shrink-0 place-items-center rounded-full border border-[#bdced7] text-[#315f86] transition hover:bg-[#315f86] hover:text-white" onClick={(event) => {
            try { addItem({ productId: p.id, petId: pet.id, quantity: 1, mode: "ONCE", intervalDays: null }); triggerFlyToCart(event.currentTarget, { image: p.image, label: p.name }); toast.success(`已加入 ${p.name}`); }
            catch (reason) { toast.error(reason instanceof Error ? reason.message : "無法加入購物車"); }
          }}><Plus size={18} /></button></div>
      </article>)}</div>
      {selected.length === 0 && <p className="py-6 text-sm text-[#647581]">目前沒有符合條件的商品，可以調整毛孩檔案或到商城看看。</p>}
    </section>

    <motion.div {...reveal} className="page-shell pb-14 sm:pb-20"><ProductDecisionDesk /></motion.div>

    <section id="our-approach" className="scroll-mt-32 border-y border-[#dce4e7] bg-white py-12 sm:py-16"><div className="page-shell grid gap-8 lg:grid-cols-[.9fr_1.1fr]">
      <div><h2 className="editorial-title max-w-md text-3xl leading-snug sm:text-4xl">{view.benefitsTitle}</h2><p className="mt-4 max-w-md text-sm leading-7 text-[#647581]">{view.benefitsDescription}</p></div>
      <div className="grid gap-x-7 gap-y-6 sm:grid-cols-2">{benefits.map(([title, text], i) => <div key={i} className="border-t border-[#dce4e7] pt-4"><h3 className="text-base font-semibold">{title}</h3><p className="mt-2 text-sm leading-7 text-[#647581]">{text}</p></div>)}</div>
    </div></section>

    <section className="page-shell flex flex-wrap items-center justify-between gap-5 py-10"><div><h2 className="editorial-title text-2xl">一日份量，分成舒服的幾餐。</h2><p className="mt-3 text-sm text-[#647581]">到餵食時鐘調整乾濕比例，安排每日餐次。</p></div><Link href="/care/feeding" className="text-link">開啟餵食時鐘<ArrowUpRight size={18} /></Link></section>

    <section id="family-story" className="scroll-mt-32 bg-[#dfeaf0] py-12 sm:py-16"><div className="page-shell grid items-center gap-8 lg:grid-cols-2">
      <div className="relative aspect-[1.45] overflow-hidden rounded-2xl"><Image src="/images/editorial/home-living-v2.png" alt="家人與毛孩的居家日常" fill sizes="(max-width:1024px) 100vw,50vw" className="object-cover" /></div>
      <div className="max-w-lg lg:pl-6"><HeartHandshake size={30} strokeWidth={1.3} /><h2 className="editorial-title mt-4 text-3xl leading-snug sm:text-4xl">{view.familyTitle}</h2><p className="mt-5 text-sm leading-8 text-[#526b7c]">{view.familyDescription}</p><Link href="/account?tab=family" className="activity-cta mt-7">一起整理家庭清單<ArrowRight size={18} /></Link></div>
    </div></section>

    <section id="community-story" className="page-shell scroll-mt-32 grid items-center gap-8 py-12 sm:py-18 lg:grid-cols-2"><div className="order-2 max-w-lg lg:order-1"><h2 className="editorial-title text-3xl leading-snug sm:text-4xl">{view.communityTitle}</h2><p className="mt-5 text-sm leading-8 text-[#647581]">{view.communityDescription}</p><Link href="/community" className="text-link mt-6">走進毛孩生活圈<ArrowUpRight size={18} /></Link><div className="mt-7 flex flex-wrap gap-3"><Link href="/community/connect?platform=instagram" className="rounded-full border border-[#bdced7] px-5 py-2.5 text-sm text-[#315f86]">Instagram</Link><Link href="/community/connect?platform=line" className="rounded-full border border-[#bdced7] px-5 py-2.5 text-sm text-[#315f86]">LINE</Link></div></div>
      <div className="relative order-1 aspect-[1.45] overflow-hidden rounded-2xl lg:order-2"><Image src={view.communityImage} alt="毛孩生活圈" fill sizes="(max-width:1024px) 100vw,50vw" className="object-cover" /></div>
    </section>

    <section id="final-invitation" className="scroll-mt-32 bg-[#18344c] py-14 text-[#fffefa]"><div className="page-shell flex flex-wrap items-center justify-between gap-7"><div><h2 className="editorial-title text-3xl sm:text-4xl">{view.finalTitle}</h2><p className="mt-4 max-w-xl text-sm leading-7 text-[#c8d9e4]">{view.finalDescription}</p></div><Link href="/care/compass" className="inline-flex min-h-12 items-center gap-5 rounded-full bg-[#fffefa] px-6 text-sm font-semibold text-[#18344c]">開始選物<ArrowRight size={18} /></Link></div></section>
  </main>;
}
