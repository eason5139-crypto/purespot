"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BarChart3, FilePenLine, Package, ShoppingCart, Users } from "lucide-react";
import type { RevenueMetric } from "@/lib/adminTypes";
import { money } from "@/lib/utils";

const shortcuts = [
  { href: "/admin/content", label: "編輯網站文案與照片", detail: "首頁、商城、透明資訊與頁尾", icon: FilePenLine },
  { href: "/admin/products", label: "維護商品", detail: "詳細資訊、圖片、售價與上架", icon: Package },
  { href: "/admin/orders", label: "處理訂單", detail: "查看與更新訂單狀態", icon: ShoppingCart },
  { href: "/admin/members", label: "管理會員", detail: "搜尋與檢視顧客資料", icon: Users },
];

export default function AdminPage() {
  const [metrics, setMetrics] = useState<RevenueMetric | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/admin/analytics", { cache: "no-store" })
      .then(async (response) => {
        const result = (await response.json()) as { metrics?: RevenueMetric; error?: string };
        if (!response.ok) throw new Error(result.error || "無法載入營運摘要");
        setMetrics(result.metrics ?? null);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "無法載入營運摘要"));
  }, []);

  return (
    <div className="mx-auto max-w-7xl">
      <span className="eyebrow">PURESPOT OPERATIONS</span>
      <h1 className="mt-3 text-3xl font-semibold text-[#fff7ec]">營運總覽</h1>
      <p className="mt-2 text-sm text-[#b59d8d]">從這裡選擇工作，頁面內容與商品資料已各自分類。</p>
      {error && <p role="alert" className="mt-5 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["今日營收", metrics ? money(metrics.todayRevenueNt) : "—"],
          ["本月營收", metrics ? money(metrics.monthRevenueNt) : "—"],
          ["今日訂單", metrics ? String(metrics.todayOrdersCount) : "—"],
          ["平均客單價", metrics ? money(metrics.averageOrderValueNt) : "—"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-[#e9a06d]/20 bg-[#2a1b15] p-6">
            <p className="text-sm text-[#b59d8d]">{label}</p>
            <p className="mt-4 text-3xl font-semibold text-[#fff7ec]">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#fff7ec]">常用工作</h2>
        <Link href="/admin/analytics" className="inline-flex items-center gap-1 text-sm text-[#f4a261]"><BarChart3 size={16} />完整分析</Link>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {shortcuts.map((item) => (
          <Link key={item.href} href={item.href} className="group flex items-center gap-4 rounded-2xl border border-[#e9a06d]/15 bg-[#2a1b15] p-5 transition-transform hover:-translate-y-1 hover:border-[#e9a06d]/40">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#f4a261]/10 text-[#f4a261]"><item.icon size={22} /></span>
            <span className="flex-1"><strong className="block text-[#fff7ec]">{item.label}</strong><span className="mt-1 block text-sm text-[#a78f80]">{item.detail}</span></span>
            <ArrowUpRight size={18} className="text-[#ad8c76] transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
          </Link>
        ))}
      </div>
    </div>
  );
}
