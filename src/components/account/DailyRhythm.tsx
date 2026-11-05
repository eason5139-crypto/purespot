"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bell, CalendarDays, Heart, PackageCheck, Sparkles } from "lucide-react";
import { accountJson, type AccountFavorite, type AccountOrder, type RhythmCard } from "@/lib/accountTypes";
import type { Preferences } from "@/lib/accountSchemas";

type Tab = "rhythm" | "orders" | "settings" | "favorites" | "care";
export function DailyRhythm({ onTabChange }: { onTabChange: (tab: Tab) => void }) {
  const [cards, setCards] = useState<RhythmCard[]>([]);
  const [upcoming, setUpcoming] = useState<{ id: string; petId: string; title: string; dueAt: string }[]>([]);
  const [favorites, setFavorites] = useState<AccountFavorite[]>([]);
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [preferences, setPreferences] = useState<Preferences>({ orderUpdates: true, refillReminders: true, restockAlerts: true, careReminders: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void Promise.all([
      accountJson<{ cards: RhythmCard[]; upcoming: typeof upcoming }>("/api/account/rhythm"),
      accountJson<{ favorites: AccountFavorite[] }>("/api/account/favorites"),
      accountJson<{ orders: AccountOrder[] }>("/api/account/orders?page=1"),
      accountJson<{ preferences: Preferences }>("/api/account/preferences"),
    ]).then(([rhythm, favoriteData, orderData, preferenceData]) => {
      if (!active) return;
      setCards(rhythm.cards); setUpcoming(rhythm.upcoming); setFavorites(favoriteData.favorites); setOrders(orderData.orders); setPreferences(preferenceData.preferences);
    }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "節奏板暫時無法載入"); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const alerts = [
    ...(preferences.orderUpdates ? orders.filter((order) => ["PAID", "PROCESSING", "DISPATCHED"].includes(order.status)).slice(0, 2).map((order) => ({ id: order.id, icon: PackageCheck, title: `訂單 ${order.id.slice(0, 8).toUpperCase()}`, detail: order.status === "DISPATCHED" ? "已出貨" : order.status === "PROCESSING" ? "正在備貨" : "已付款", tab: "orders" as Tab })) : []),
    ...(preferences.restockAlerts ? favorites.filter((favorite) => favorite.restocked).slice(0, 2).map((favorite) => ({ id: favorite.productId, icon: Heart, title: favorite.product.name, detail: "收藏商品已恢復庫存", tab: "favorites" as Tab })) : []),
    ...(preferences.careReminders ? upcoming.filter((reminder) => new Date(reminder.dueAt).getTime() <= Date.now() + 3 * 86_400_000).slice(0, 2).map((reminder) => ({ id: reminder.id, icon: Bell, title: reminder.title, detail: new Date(reminder.dueAt) < new Date() ? "照顧提醒已到期" : "三天內要記得", tab: "care" as Tab })) : []),
  ];

  return <section className="space-y-7"><div className="relative overflow-hidden rounded-[28px] bg-[#25475f] p-7 text-white sm:p-10"><div className="absolute -right-16 -top-20 size-64 rounded-full border border-white/15" /><div className="absolute -right-5 -top-7 size-44 rounded-full border border-white/15" /><p className="flex items-center gap-2 text-xs font-semibold tracking-[.2em] text-[#b9dbea]"><Sparkles size={15} />THE DAILY RHYTHM</p><h2 className="editorial-title mt-5 max-w-xl text-4xl leading-tight sm:text-5xl">把牠的每一天，<br />排成舒服的節奏。</h2><p className="mt-5 max-w-xl text-sm leading-7 text-[#d4e4eb]">從最近的訂單、毛孩資料與你設定的提醒，整理今天值得留意的事。</p><div className="mt-7 flex flex-wrap gap-3"><button type="button" onClick={() => onTabChange("care")} className="flex min-h-11 items-center gap-2 rounded-xl bg-[#e8f1f8] px-5 text-sm font-semibold text-[#315F86]">寫一筆照顧紀錄 <ArrowRight size={16} /></button><Link href="/care/refill" className="flex min-h-11 items-center gap-2 rounded-xl border border-white/40 px-5 text-sm text-white">調整家中補貨估算</Link></div></div>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}{loading && <p className="rounded-2xl bg-white p-7 text-sm text-[#687985]">正在整理毛孩的日常…</p>}
    {!loading && alerts.length > 0 && <div className="rounded-[22px] border border-[#dce6e9] bg-white p-5 sm:p-6"><h3 className="flex items-center gap-2 font-semibold text-[#263746]"><Bell size={18} className="text-[#5B93C5]" />近期提醒</h3><div className="mt-4 grid gap-3 md:grid-cols-2">{alerts.map((alert) => <button key={alert.id} type="button" onClick={() => onTabChange(alert.tab)} className="flex items-center gap-3 rounded-xl bg-[#f5f9fb] p-4 text-left hover:bg-[#e8f1f8]"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-[#315F86]"><alert.icon size={17} /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-[#263746]">{alert.title}</strong><span className="mt-1 block text-xs text-[#687985]">{alert.detail}</span></span><ArrowRight size={15} className="text-[#5B93C5]" /></button>)}</div></div>}
    <div className="grid gap-4 md:grid-cols-2">{cards.map((card) => <article key={card.petId} className="rounded-[23px] border border-[#e1d7cc] bg-white p-6 sm:p-7"><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-bold tracking-[.16em] text-[#5B93C5]">{card.petType === "CAT" ? "CAT" : card.petType === "DOG" ? "DOG" : "LITTLE FRIEND"} / DAILY NOTE</p><h3 className="editorial-title mt-2 text-2xl text-[#263746]">{card.petName}的日常</h3><p className="mt-1 text-xs text-[#8b918f]">目前體重 {card.weightKg} 公斤</p></div><span className="grid size-11 place-items-center rounded-full bg-[#e8f1f8] text-[#315F86]"><CalendarDays size={20} /></span></div>{card.productName && <div className="mt-6 rounded-xl bg-[#f5f8f9] p-4"><p className="text-xs text-[#8b918f]">最近已出貨的主食</p><p className="mt-1 text-sm font-semibold text-[#263746]">{card.productName}</p>{card.dailyGrams !== null && <p className="mt-3 text-sm text-[#315F86]">每日參考約 <strong className="text-xl">{card.dailyGrams}</strong> 克</p>}{preferences.refillReminders && card.remainingDays !== null && <p className="mt-2 text-xs text-[#687985]">依最近訂單估算，約可再使用 {card.remainingDays} 天。</p>}</div>}{!card.productName && <p className="mt-6 rounded-xl bg-[#f8f5ef] p-4 text-sm text-[#8b918f]">已有出貨訂單後，這裡會整理主食與補貨節奏。</p>}<div className="mt-5 flex flex-wrap gap-2 text-xs text-[#687985]">{card.nextDeliveryAt && <span className="rounded-full bg-[#e8f1f8] px-3 py-1">下次補貨 {new Date(card.nextDeliveryAt).toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })}</span>}{preferences.careReminders && card.openReminderCount > 0 && <span className="rounded-full bg-[#f7eee1] px-3 py-1">{card.openReminderCount} 件照顧待辦</span>}</div><button type="button" onClick={() => onTabChange("care")} className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#315F86]">查看照顧紀錄 <ArrowRight size={16} /></button></article>)}{!loading && cards.length === 0 && <div className="rounded-[23px] border border-[#e1d7cc] bg-white p-7 text-sm text-[#687985]">新增毛孩檔案後，節奏板會為牠建立專屬區塊。</div>}</div><p className="text-xs leading-6 text-[#8b918f]">食量與剩餘天數依毛孩資料及最近已出貨訂單推估；實際使用量與家中庫存請自行確認。</p>
  </section>;
}
