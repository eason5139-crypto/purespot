"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BarChart3, FilePenLine, Megaphone, MessageCircle, Package, ShoppingCart, Users } from "lucide-react";
import type { RevenueMetric } from "@/lib/adminTypes";
import { money } from "@/lib/utils";

const shortcuts = [
  { href: "/admin/content", label: "網站內容", icon: FilePenLine },
  { href: "/admin/products", label: "商品管理", icon: Package },
  { href: "/admin/orders", label: "訂單管理", icon: ShoppingCart },
  { href: "/admin/members", label: "會員管理", icon: Users },
  { href: "/admin/community", label: "社群審核", icon: MessageCircle },
  { href: "/admin/promotions", label: "站內活動", icon: Megaphone },
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
      <h1 className="text-2xl font-bold text-[#302b26]">營運總覽</h1>
      {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">{error}</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          ["今日營收", metrics ? money(metrics.todayRevenueNt) : "—"],
          ["本月營收", metrics ? money(metrics.monthRevenueNt) : "—"],
          ["今日訂單", metrics ? String(metrics.todayOrdersCount) : "—"],
          ["平均客單價", metrics ? money(metrics.averageOrderValueNt) : "—"],
          ["累計營收", metrics ? money(metrics.totalRevenueNt) : "—"],
          ["累計訂單", metrics ? String(metrics.totalOrdersCount) : "—"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-[#e5d8c8] bg-white p-6 shadow-2xs">
            <p className="text-sm font-medium text-[#7c6d5e]">{label}</p>
            <p className="mt-3 text-3xl font-semibold font-mono text-[#302b26]">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#302b26]">快捷入口</h2>
        <Link href="/admin/analytics" className="inline-flex items-center gap-1 text-sm font-semibold text-[#935941] hover:text-[#7a4733]">
          <BarChart3 size={16} />數據分析
        </Link>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shortcuts.map((item) => (
          <Link key={item.href} href={item.href} className="group flex items-center gap-3.5 rounded-2xl border border-[#e5d8c8] bg-white p-4 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-[#935941]/50">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#935941]/10 text-[#935941]"><item.icon size={19} /></span>
            <strong className="flex-1 text-sm text-[#302b26]">{item.label}</strong>
            <ArrowUpRight size={17} className="text-[#8a7f75] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#935941]" />
          </Link>
        ))}
      </div>
    </div>
  );
}
