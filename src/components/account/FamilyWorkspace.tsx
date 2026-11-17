"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, HeartHandshake, PawPrint, ShoppingBag, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { accountJson, jsonRequest } from "@/lib/accountTypes";
import { useFamilyStore } from "@/store/useFamilyStore";
import { getProduct } from "@/lib/catalog";
import { money } from "@/lib/utils";
import { useCatalogStore } from "@/store/useCatalogStore";
import { matchProduct } from "@/lib/matching";
import Image from "next/image";

type FamilyData = {
  group: { id: string; name: string; inviteCode: string };
  role: "OWNER" | "MEMBER";
  members: { userId: string; role: "OWNER" | "MEMBER"; user: { name: string | null; email: string } }[];
  pets: { id: string; userId: string; name: string; type: string; avatarUrl: string | null }[];
  items: { id: string; productId: string; petId: string | null; quantity: number; note: string; addedById: string }[];
};

export function FamilyWorkspace() {
  const [data, setData] = useState<FamilyData | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [petId, setPetId] = useState("");
  const [productId, setProductId] = useState("");
  const catalog = useCatalogStore((s) => s.products);
  const familyPets = useFamilyStore((s) => s.familyPets);
  const [error, setError] = useState("");
  async function load() { try { const result = await accountJson<FamilyData>("/api/account/family"); setData(result); setName(result.group.name); await useFamilyStore.getState().loadCloud(); setError(""); } catch (reason) { setError(reason instanceof Error ? reason.message : "家庭資料載入失敗"); } }
  useEffect(() => { const invited = new URLSearchParams(window.location.search).get("invite"); if (invited) setCode(invited); void load(); }, []);
  async function act(payload: Record<string, unknown>, success: string) {
    setBusy(true); setError("");
    try { await accountJson("/api/account/family", jsonRequest("POST", payload)); await load(); toast.success(success); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "操作失敗"); }
    finally { setBusy(false); }
  }
  const subtotal = data?.items.reduce((sum, item) => sum + (getProduct(item.productId)?.priceNt ?? 0) * item.quantity, 0) ?? 0;
  const selectedPet = familyPets.find((entry) => entry.id === petId);
  const products = selectedPet ? catalog.filter((product) => product.type === selectedPet.type && product.stock > 0 && matchProduct(product, selectedPet).safe) : [];
  const selectedProduct = products.find((product) => product.id === productId);
  return <section className="space-y-6"><header><h2 className="editorial-title text-3xl text-[#263746]">家庭共買</h2><p className="mt-2 text-sm leading-6 text-[#687985]">家人一起整理毛孩與清單，主帳戶確認訂單。</p></header>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    <div className="grid gap-4 md:grid-cols-2"><div className="rounded-[24px] border border-[#e1d7cc] bg-white p-6"><span className="grid size-12 place-items-center rounded-2xl bg-[#e8f1f8] text-[#315F86]"><Users size={23} /></span><h3 className="mt-4 font-semibold text-[#263746]">{data?.group.name || "家庭清單"}</h3><p className="mt-1 text-xs text-[#687985]">{data?.role === "OWNER" ? "你是主帳戶，可以邀請成員與確認訂單。" : "你可以和家人編輯清單，訂單由主帳戶確認。"}</p>{data?.role === "OWNER" && <div className="mt-4 flex gap-2"><input className="input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} aria-label="家庭名稱" /><button type="button" disabled={busy || !name.trim()} onClick={() => void act({ action: "rename", name }, "名稱已更新")} className="shrink-0 rounded-xl bg-[#315F86] px-4 text-xs font-semibold text-white">儲存</button></div>}</div>
    <div className="rounded-[24px] border border-[#e1d7cc] bg-[#fff9ef] p-6"><span className="grid size-12 place-items-center rounded-2xl bg-[#f2e5d4] text-[#935941]"><UserPlus size={23} /></span><h3 className="mt-4 font-semibold text-[#263746]">邀家人一起加入</h3><p className="mt-2 text-xs text-[#687985]">家人先建立會員帳戶，再輸入邀請碼。</p><div className="mt-4 flex items-center justify-between rounded-xl border border-[#dcc8af] bg-white p-3"><strong className="font-mono tracking-widest text-[#935941]">{data?.group.inviteCode || "載入中"}</strong><button type="button" aria-label="複製邀請碼" onClick={() => { void navigator.clipboard.writeText(data?.group.inviteCode || ""); toast.success("邀請碼已複製"); }}><Copy size={17} /></button></div><div className="mt-3 flex gap-2"><input className="input" value={code} maxLength={40} placeholder="輸入家人的邀請碼" onChange={(e) => setCode(e.target.value.toUpperCase())} /><button type="button" disabled={busy || code.length < 8} onClick={() => void act({ action: "join", code }, "已加入家庭")} className="shrink-0 rounded-xl bg-[#935941] px-4 text-xs font-semibold text-white">加入</button></div></div></div>
    <div className="grid gap-4 xl:grid-cols-2"><section className="rounded-[24px] border border-[#e1d7cc] bg-white p-6"><h3 className="flex items-center gap-2 font-semibold"><HeartHandshake size={18} className="text-[#5B93C5]" />家庭成員</h3><div className="mt-4 space-y-2">{data?.members.map((member) => <div key={member.userId} className="flex items-center gap-3 rounded-xl bg-[#f8f5ef] p-3 text-sm"><span className="grid size-9 place-items-center rounded-full bg-[#d6e7f2] text-[#315F86]">{(member.user.name || member.user.email)[0]}</span><span className="min-w-0 flex-1 truncate">{member.user.name || member.user.email}<small className="ml-2 text-[#687985]">{member.role === "OWNER" ? "主帳戶" : "成員"}</small></span>{data.role === "OWNER" && member.role === "MEMBER" && <button type="button" disabled={busy} onClick={() => { if (window.confirm(`移除 ${member.user.name || member.user.email}？`)) void act({ action: "removeMember", memberId: member.userId }, "成員已移除"); }} className="text-xs text-[#a05d51]">移除</button>}</div>)}</div>{data?.role === "MEMBER" && <button type="button" disabled={busy} onClick={() => { if (window.confirm("離開目前家庭？")) void act({ action: "leave" }, "已離開家庭"); }} className="mt-4 text-xs text-[#a05d51]">離開家庭</button>}</section>
    <section className="rounded-[24px] border border-[#e1d7cc] bg-white p-6"><h3 className="flex items-center gap-2 font-semibold"><PawPrint size={18} className="text-[#5B93C5]" />一起照顧的毛孩</h3><div className="mt-4 flex flex-wrap gap-2">{data?.pets.map((pet) => <span key={pet.id} className="rounded-full bg-[#e8f1f8] px-3 py-2 text-xs font-semibold text-[#315F86]">{pet.name} · {pet.type === "CAT" ? "貓" : pet.type === "DOG" ? "狗" : pet.type === "RABBIT" ? "兔" : "倉鼠"}</span>)}</div>{!data?.pets.length && <p className="mt-4 text-sm text-[#687985]">家人儲存毛孩檔案後會出現在這裡。</p>}</section></div>
    <section className="rounded-[24px] border border-[#e1d7cc] bg-white p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="flex items-center gap-2 font-semibold"><ShoppingBag size={18} className="text-[#5B93C5]" />共用購物清單</h3><p className="mt-1 text-xs text-[#687985]">選毛孩與適合的商品，家人會同步看到。</p></div><strong className="text-[#315F86]">{money(subtotal)}</strong></div>
    <div className="mt-4 grid gap-3 rounded-2xl bg-[#f1f7fa] p-4 sm:grid-cols-[1fr_1.5fr_auto]"><label className="text-xs font-semibold text-[#315F86]">毛孩<select className="input mt-1" value={petId} onChange={(e) => { setPetId(e.target.value); setProductId(""); }}><option value="">選擇毛孩</option>{familyPets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}</select></label><label className="text-xs font-semibold text-[#315F86]">商品<select className="input mt-1" value={productId} onChange={(e) => setProductId(e.target.value)} disabled={!petId}><option value="">選擇適合的商品</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {money(product.priceNt)}</option>)}</select></label><button type="button" disabled={busy || !selectedProduct || !petId} onClick={() => void act({ action: "add", productId, petId, quantity: 1, note: "" }, "已加入家庭清單")} className="self-end rounded-xl bg-[#315F86] px-4 py-3 text-xs font-semibold text-white disabled:opacity-40">加入清單</button></div>
    {selectedProduct && <div className="mt-2 flex items-center gap-2 text-xs text-[#687985]"><span className="relative size-10 overflow-hidden rounded-lg"><Image src={selectedProduct.image} alt="" fill sizes="40px" className="object-cover" /></span>{selectedProduct.name} · 庫存 {selectedProduct.stock}</div>}
    <div className="mt-4 space-y-2">{data?.items.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-[#f8f5ef] p-3"><span className="min-w-0 flex-1 text-sm font-medium">{getProduct(item.productId)?.name || "商品已下架"}<small className="ml-2 text-[#687985]">{data.pets.find((pet) => pet.id === item.petId)?.name || "未指定毛孩"}</small></span><input type="number" min={1} max={99} className="w-16 rounded-lg border p-2 text-center text-sm" value={item.quantity} onChange={(e) => { const quantity = Number(e.target.value); if (quantity >= 1 && quantity <= 99) void act({ action: "quantity", itemId: item.id, quantity }, "數量已更新"); }} aria-label="數量" /><button type="button" disabled={busy} onClick={() => void act({ action: "remove", itemId: item.id }, "已移出清單")} className="text-xs text-[#a05d51]">移除</button></div>)}</div>{!data?.items.length && <p className="mt-4 text-sm text-[#687985]">清單目前是空的，先選毛孩與商品吧。</p>}<div className="mt-5 flex flex-wrap gap-2"><Link href="/shop" className="rounded-xl border border-[#315F86] px-5 py-3 text-sm font-semibold text-[#315F86]">逛商城</Link>{data?.role === "OWNER" && Boolean(data.items.length) && <Link href="/checkout?mode=family" className="rounded-xl bg-[#315F86] px-5 py-3 text-sm font-semibold text-white">確認家庭訂單</Link>}</div></section>
  </section>;
}
