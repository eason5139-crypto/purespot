"use client";

import Link from "next/link";
import { ArrowUpRight, FileText, FlaskConical, Leaf, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import type { SiteContent } from "@/lib/siteContent";
import { useCatalogStore } from "@/store/useCatalogStore";

const pillars = [
  { title: "原料看得懂", text: "每款商品列出主要成分與已知過敏原。", icon: Leaf },
  { title: "營養有數值", text: "熱量與保證分析值可在商品頁核對。", icon: FlaskConical },
  { title: "批次可查閱", text: "有紀錄的批次顯示日期與分析走勢。", icon: FileText },
  { title: "適配有提醒", text: "依毛孩資料標示物種、生命階段與過敏衝突。", icon: ShieldCheck },
];

export function TransparencyPage({ content }: { content: SiteContent }) {
  const products = useCatalogStore((state) => state.products);

  return (
    <main id="main-content" className="bg-[#f8f4ed] pb-24 text-[#302b26]">
      <section className="border-b border-[#d9cbbd] bg-[#e7e2d7] py-16 sm:py-24">
        <div className="page-shell">
          <span className="editorial-kicker">7C · CONTENT TRANSPARENCY</span>
          <h1 className="editorial-title mt-5 max-w-3xl text-5xl leading-tight tracking-[-.05em] sm:text-7xl">{content.transparencyTitle}</h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[#775f50]">{content.transparencyDescription}</p>
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

      <section className="page-shell">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="editorial-kicker">02 / PRODUCT RECORDS</span>
            <h2 className="editorial-title mt-3 text-4xl">商品營養與批次資料</h2>
          </div>
          <Link href="/shop" className="inline-flex items-center gap-1 text-sm font-medium text-[#ae6744]">前往商城 <ArrowUpRight size={16} /></Link>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {products.map((product) => (
            <article key={product.id} className="border border-[#d9cbbd] bg-[#fffdf9] p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-[#a17a61]">{product.type === "CAT" ? "貓咪" : product.type === "DOG" ? "狗狗" : product.type === "HAMSTER" ? "倉鼠" : "兔兔"} · {product.category}</p>
                  <h3 className="mt-1 text-xl font-semibold">{product.name}</h3>
                  <p className="mt-1 text-sm text-[#806a5c]">{product.subtitle}</p>
                </div>
                <span className="bg-[#f0e8de] px-3 py-1 text-xs text-[#876149]">
                  {product.batches.length ? `${product.batches.length} 筆示範批次` : "尚無批次資料"}
                </span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 border-y border-[#eee2d5] py-4 text-center">
                <div><p className="text-xs text-[#8d7567]">粗蛋白最低</p><strong className="mt-1 block text-lg">{product.proteinMin}%</strong></div>
                <div><p className="text-xs text-[#8d7567]">水分最高</p><strong className="mt-1 block text-lg">{product.moistureMax}%</strong></div>
                <div><p className="text-xs text-[#8d7567]">熱量 / 100g</p><strong className="mt-1 block text-lg">{product.kcalPer100g}</strong></div>
              </div>
              <p className="mt-4 text-sm text-[#806a5c]">主要成分：{product.ingredients.join("、") || "待補充"}</p>
              <p className="mt-1 text-sm text-[#806a5c]">過敏原：{product.allergens.join("、") || "未列出"}</p>
              <Link href={`/products/${product.slug}`} className="editorial-action mt-5 inline-flex min-h-11 items-center gap-2 bg-[#955a42] px-4 text-sm font-semibold text-white hover:bg-[#7e4833]">
                查看商品詳情 <ArrowUpRight size={16} />
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
