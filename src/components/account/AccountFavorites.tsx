"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BellRing, Heart, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { accountJson, jsonRequest, type AccountFavorite } from "@/lib/accountTypes";
import type { Preferences } from "@/lib/accountSchemas";
import { money } from "@/lib/utils";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { usePetContextStore } from "@/store/usePetContextStore";

export function AccountFavorites() {
  const [favorites, setFavorites] = useState<AccountFavorite[]>([]);
  const [filter, setFilter] = useState("all");
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const allPets = usePetContextStore((state) => state.allPets);
  const pets = allPets.filter((pet) => Boolean(pet.cloudId));

  async function load() {
    try {
      const [data, settings] = await Promise.all([
        accountJson<{ favorites: AccountFavorite[] }>("/api/account/favorites"),
        accountJson<{ preferences: Preferences }>("/api/account/preferences"),
      ]);
      setFavorites(data.favorites); setAlertsEnabled(settings.preferences.restockAlerts); setError("");
      useFavoritesStore.getState().setIds(data.favorites.map((item) => item.productId));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "收藏暫時無法載入"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function edit(item: AccountFavorite, patch: Partial<Pick<AccountFavorite, "petId" | "watchRestock">>) {
    try {
      await accountJson("/api/account/favorites", jsonRequest("PATCH", { productId: item.productId, petId: patch.petId === undefined ? item.petId : patch.petId, watchRestock: patch.watchRestock === undefined ? item.watchRestock : patch.watchRestock }));
      await load(); toast.success("收藏設定已更新");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "收藏設定儲存失敗"); }
  }
  async function remove(productId: string) {
    try { await accountJson("/api/account/favorites", jsonRequest("DELETE", { productId })); await load(); toast.success("已移除收藏"); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "無法移除收藏"); }
  }
  const visible = favorites.filter((item) => filter === "all" || item.petId === filter);
  return <section className="space-y-5"><header><p className="text-xs font-semibold tracking-[.18em] text-[#5B93C5]">SAVED FOR THEM</p><h2 className="editorial-title mt-2 text-3xl text-[#263746]">雲端收藏</h2><p className="mt-2 text-sm leading-6 text-[#687985]">登入後在手機與電腦都能看到收藏，也能為每件商品指定毛孩。</p></header>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    <div className="flex flex-wrap gap-2"><button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")} className={`rounded-full px-4 py-2 text-xs font-semibold ${filter === "all" ? "bg-[#315F86] text-white" : "bg-white text-[#315F86]"}`}>全部 {favorites.length}</button>{pets.map((pet) => <button key={pet.id} type="button" aria-pressed={filter === pet.cloudId} onClick={() => setFilter(pet.cloudId!)} className={`rounded-full px-4 py-2 text-xs font-semibold ${filter === pet.cloudId ? "bg-[#315F86] text-white" : "bg-white text-[#315F86]"}`}>{pet.name}</button>)}</div>
    {loading && <p className="rounded-2xl bg-white p-8 text-sm text-[#687985]">正在載入收藏…</p>}
    {!loading && visible.length === 0 && <div className="rounded-2xl border border-[#e1d7cc] bg-white p-9 text-center"><Heart className="mx-auto text-[#5B93C5]" /><h3 className="mt-4 font-semibold text-[#263746]">這裡還沒有收藏商品</h3><Link href="/shop" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#315F86]"><ShoppingBag size={16} />前往商城</Link></div>}
    <div className="grid gap-4 md:grid-cols-2">{visible.map((item) => <article key={item.productId} className="flex gap-4 rounded-[20px] border border-[#e1d7cc] bg-white p-4 sm:p-5"><Link href={`/products/${item.product.slug}`} className="relative aspect-square w-28 shrink-0 overflow-hidden rounded-xl bg-[#f2ede5] sm:w-32"><Image src={item.product.image} alt={item.product.name} fill sizes="128px" className="object-contain" /></Link><div className="min-w-0 flex-1"><Link href={`/products/${item.product.slug}`} className="text-sm font-semibold text-[#263746] hover:text-[#5B93C5]">{item.product.name}</Link><p className="mt-2 text-sm text-[#315F86]">{money(item.product.priceNt)} · {item.product.stock > 0 ? "有庫存" : "目前缺貨"}</p><label className="mt-3 block text-xs text-[#687985]">為哪隻毛孩收藏？<select value={item.petId ?? ""} onChange={(event) => void edit(item, { petId: event.target.value || null })} className="input mt-1 min-h-9 py-1 text-xs"><option value="">尚未指定</option>{pets.map((pet) => <option key={pet.id} value={pet.cloudId}>{pet.name}</option>)}</select></label>{item.product.stock === 0 && <label className="mt-3 flex items-center gap-2 text-xs text-[#315F86]"><input type="checkbox" checked={item.watchRestock} onChange={(event) => void edit(item, { watchRestock: event.target.checked })} className="accent-[#315F86]" />到貨時在帳戶提醒我</label>}{alertsEnabled && item.restocked && <p role="status" className="mt-3 flex items-center gap-1 rounded-lg bg-[#e8f1f8] p-2 text-xs font-semibold text-[#315F86]"><BellRing size={14} />已恢復庫存，可以再看看</p>}<button type="button" onClick={() => void remove(item.productId)} className="mt-3 flex items-center gap-1 text-xs text-[#9a5d4c]"><Trash2 size={13} />移除收藏</button></div></article>)}</div>
  </section>;
}
