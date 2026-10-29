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
      <span className="eyebrow text-[#935941]">PURESPOT OPERATIONS</span>
      <h1 className="mt-3 text-3xl font-semibold text-[#302b26]">營運總覽</h1>
      <p className="mt-2 text-sm text-[#675e53]">從這裡選擇工作，頁面內容與商品資料已各自分類。</p>
      {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">{error}</p>}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["今日營收", metrics ? money(metrics.todayRevenueNt) : "—"],
          ["本月營收", metrics ? money(metrics.monthRevenueNt) : "—"],
          ["今日訂單", metrics ? String(metrics.todayOrdersCount) : "—"],
          ["平均客單價", metrics ? money(metrics.averageOrderValueNt) : "—"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-[#e8ded3] bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-[#8a7f75]">{label}</p>
            <p className="mt-4 text-3xl font-semibold font-mono text-[#302b26]">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#302b26]">常用工作</h2>
        <Link href="/admin/analytics" className="inline-flex items-center gap-1 text-sm font-semibold text-[#935941] hover:text-[#794632]">
          <BarChart3 size={16} />完整分析
        </Link>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {shortcuts.map((item) => (
          <Link key={item.href} href={item.href} className="group flex items-center gap-4 rounded-2xl border border-[#e8ded3] bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-[#935941]/40 hover:shadow-md">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#935941]/10 text-[#935941]"><item.icon size={22} /></span>
            <span className="flex-1">
              <strong className="block text-[#302b26]">{item.label}</strong>
              <span className="mt-1 block text-sm text-[#8a7f75]">{item.detail}</span>
            </span>
            <ArrowUpRight size={18} className="text-[#8a7f75] transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-[#935941]" />
          </Link>
        ))}
      </div>
    </div>
  );
}
