"use client";

import { FileText, FlaskConical, Leaf, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import type { SiteContent } from "@/lib/siteContent";
import { useSiteContentPreview } from "@/lib/useSiteContentPreview";
import { useCatalogStore } from "@/store/useCatalogStore";
import { TransparencyProductRecords } from "./TransparencyProductRecords";

const pillars = [
  { title: "原料看得懂", text: "每款商品列出主要成分與已知過敏原。", icon: Leaf },
  { title: "營養有數值", text: "熱量與保證分析值可在商品頁核對。", icon: FlaskConical },
  { title: "批次可查閱", text: "有紀錄的批次顯示日期與分析走勢。", icon: FileText },
  { title: "適配有提醒", text: "依毛孩資料標示物種、生命階段與過敏衝突。", icon: ShieldCheck },
];

export function TransparencyPage({ content }: { content: SiteContent }) {
  const displayContent = useSiteContentPreview(content);
  const products = useCatalogStore((state) => state.products);

  return (
    <main id="main-content" className="bg-[#f8f4ed] pb-24 text-[#302b26]">
      <section className="border-b border-[#d9cbbd] bg-[#e7e2d7] py-16 sm:py-24">
        <div className="page-shell">
          <span className="editorial-kicker">PURESPOT · 安心選物</span>
          <h1 className="editorial-title mt-5 max-w-3xl text-5xl leading-tight tracking-[-.05em] sm:text-7xl">{displayContent.transparencyTitle}</h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[#775f50]">{displayContent.transparencyDescription}</p>
          <p className="mt-7 inline-flex border-l-[3px] border-[#9c6048] bg-[#f8f4ed] px-4 py-3 text-sm text-[#82543a]">
            目前商品與批次數據供介面展示。正式檢驗報告須經來源確認後才能對外發布。
          </p>
        </div>
      </section>

      <section className="page-shell py-16">
        <span className="editorial-kicker">01 / WHAT WE SHOW</span>
        <h2 className="editorial-title mt-4 text-4xl">四個可查閱的面向</h2>
        <div className="mt-8 grid gap-0 border-t border-[#d3c5b6] sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((pillar, index) => (
            <motion.article
              key={pillar.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06 }}
              className="border-b border-[#d3c5b6] p-6 sm:border-r"
            >
              <span className="flex size-11 items-center justify-center bg-[#eee2d5] text-[#9c6048]"><pillar.icon size={22} /></span>
              <h3 className="mt-5 font-semibold">{pillar.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[#806a5c]">{pillar.text}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <TransparencyProductRecords products={products} />
    </main>
  );
}
