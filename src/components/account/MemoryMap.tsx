"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Map, ShoppingBag } from "lucide-react";
import { accountJson } from "@/lib/accountTypes";
import { money } from "@/lib/utils";

type MemoryOrder = { id: string; createdAt: string; totalNt: number; items: { productName: string; quantity: number; pet: { name: string }; variant: { product: { imageUrl: string; slug: string } } }[] };

export function MemoryMap() {
  const [orders, setOrders] = useState<MemoryOrder[]>([]);
  const [pet, setPet] = useState("全部毛孩");
  const [error, setError] = useState("");
  useEffect(() => { void accountJson<{ orders: MemoryOrder[] }>("/api/account/memories").then((data) => setOrders(data.orders)).catch((reason) => setError(reason instanceof Error ? reason.message : "回憶暫時無法載入")); }, []);
  const pets = useMemo(() => ["全部毛孩", ...new Set(orders.flatMap((order) => order.items.map((item) => item.pet.name)))], [orders]);
  const filtered = useMemo(() => orders.filter((order) => pet === "全部毛孩" || order.items.some((item) => item.pet.name === pet)), [orders, pet]);
  const months = useMemo(() => [...new Set(filtered.map((order) => order.createdAt.slice(0, 7)))], [filtered]);
  return <section className="space-y-6"><header><h2 className="editorial-title text-3xl text-[#263746]">購物回憶地圖</h2><p className="mt-2 text-sm text-[#687985]">把為毛孩挑過的每一份日常，排成一條看得見的路。</p></header>{error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    <div className="flex flex-wrap gap-2">{pets.map((name) => <button type="button" key={name} onClick={() => setPet(name)} aria-pressed={pet === name} className={`rounded-full px-4 py-2 text-xs font-semibold ${pet === name ? "bg-[#315F86] text-white" : "border border-[#e1d7cc] bg-white text-[#315F86]"}`}>{name}</button>)}</div>
    {!orders.length && !error && <div className="rounded-2xl border border-[#e1d7cc] bg-white p-8 text-center"><Map size={34} className="mx-auto text-[#5B93C5]" /><p className="mt-3 text-sm text-[#687985]">完成第一筆選物後，這裡會開始長出你的日常路線。</p></div>}
    <div className="relative space-y-8 border-l-2 border-[#b7d3e7] pl-6 sm:pl-9">{months.map((month, index) => {
      const monthOrders = filtered.filter((order) => order.createdAt.startsWith(month));
      const amount = monthOrders.reduce((sum, order) => sum + order.totalNt, 0);
      return <motion.article key={month} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(index * .07, .4) }} className="relative"><span className="absolute -left-[31px] top-3 size-3 rounded-full border-[3px] border-[#f8f5ef] bg-[#5B93C5] sm:-left-[43px]" /><div className="rounded-[24px] border border-[#e1d7cc] bg-white p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-2"><div><span className="text-xs font-bold tracking-[.15em] text-[#5B93C5]">{month.replace("-", " / ")}</span><h3 className="mt-1 font-serif text-xl text-[#263746]">這個月，為牠挑了 {monthOrders.length} 次</h3></div><span className="text-sm font-semibold text-[#935941]">{money(amount)}</span></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{monthOrders.slice(0, 4).map((order) => <Link key={order.id} href={`/account?tab=orders`} className="flex gap-3 rounded-xl bg-[#f8f5ef] p-3 transition-transform hover:-translate-y-0.5"><span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-[#f3eadf]"><Image src={order.items[0]?.variant.product.imageUrl || "/images/brand-logo.png"} alt="" fill sizes="56px" className="object-cover" /></span><span className="min-w-0"><strong className="line-clamp-1 text-sm text-[#263746]">{order.items[0]?.productName || "日常選物"}</strong><small className="mt-1 block text-[#687985]">{order.items[0]?.pet.name} · {new Date(order.createdAt).toLocaleDateString("zh-TW")}</small><small className="mt-1 block text-[#315F86]">{order.items.length > 1 ? `另有 ${order.items.length - 1} 項` : "查看訂單"}</small></span></Link>)}</div>{monthOrders.length > 4 && <p className="mt-3 text-xs text-[#687985]">還有 {monthOrders.length - 4} 次選物，可在完整訂單查看。</p>}</div></motion.article>;
    })}</div>
    {filtered.length > 0 && <p className="flex items-center gap-2 text-xs text-[#687985]"><ShoppingBag size={14} />顯示最近 {orders.length} 筆已成立訂單。</p>}
  </section>;
}
