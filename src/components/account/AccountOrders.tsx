"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, FileText, RotateCcw, Send, Truck } from "lucide-react";
import { toast } from "sonner";
import { accountJson, jsonRequest, type AccountOrder } from "@/lib/accountTypes";
import { money } from "@/lib/utils";
import { useCartStore } from "@/store/useCartStore";
import { usePetContextStore } from "@/store/usePetContextStore";

const steps = ["PENDING_PAYMENT", "PAID", "PROCESSING", "DISPATCHED", "COMPLETED"];
const labels: Record<string, string> = { PENDING_PAYMENT: "待付款", PAID: "已付款", PROCESSING: "備貨中", DISPATCHED: "已出貨", COMPLETED: "已完成", CANCELLED: "已取消" };
const paymentLabels: Record<string, string> = { credit: "信用卡", linepay: "LINE Pay", cvs: "超商付款", transfer: "ATM 轉帳" };
const supportKind: Record<string, string> = { RETURN: "退換貨", ISSUE: "訂單問題", OTHER: "其他需求" };
const supportStatus: Record<string, string> = { OPEN: "待處理", IN_PROGRESS: "處理中", RESOLVED: "已完成" };

export function AccountOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [openId, setOpenId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState("ISSUE");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void accountJson<{ orders: AccountOrder[]; count: number }>(`/api/account/orders?page=${page}`).then((data) => {
      if (active) { setOrders(data.orders); setCount(data.count); setError(""); }
    }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "訂單暫時無法載入"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page]);

  function reorder(order: AccountOrder) {
    const pets = usePetContextStore.getState().allPets;
    const add = useCartStore.getState().addItem;
    let added = 0;
    for (const item of order.items) {
      const pet = pets.find((candidate) => (candidate.cloudId ?? candidate.id) === item.petId);
      if (!pet) continue;
      try { add({ productId: item.productId, petId: pet.id, quantity: item.quantity, mode: "ONCE", intervalDays: null }); added += 1; }
      catch { /* Unavailable items stay out of the cart. */ }
    }
    if (added) { toast.success(`已將 ${added} 件商品加入購物車`); router.push("/checkout"); }
    else toast.error("商品或毛孩資料已有變動，請到商城重新挑選");
  }

  async function sendSupport(orderId: string) {
    if (message.trim().length < 10) { setError("請至少寫下 10 個字，讓我們了解需求"); return; }
    setSending(true); setError("");
    try {
      await accountJson("/api/account/support", jsonRequest("POST", { orderId, kind, message }));
      const data = await accountJson<{ order: AccountOrder }>(`/api/account/orders/${orderId}`);
      setOrders((previous) => previous.map((order) => order.id === orderId ? data.order : order));
      setMessage(""); toast.success("需求已送出，可在這筆訂單查看進度");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "送出失敗"); }
    finally { setSending(false); }
  }

  return <section aria-labelledby="orders-title" className="space-y-5">
    <header><p className="text-xs font-semibold tracking-[.18em] text-[#5B93C5]">ORDER JOURNAL</p><h2 id="orders-title" className="editorial-title mt-2 text-3xl text-[#263746]">我的訂單</h2><p className="mt-2 text-sm leading-6 text-[#6e716f]">查看進度、明細與收據；需要協助時可以直接從訂單提出需求。</p></header>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    {loading && <p className="rounded-2xl bg-white p-8 text-sm text-[#687985]">正在載入訂單…</p>}
    {!loading && orders.length === 0 && <div className="rounded-2xl border border-[#e1d7cc] bg-white p-9 text-center"><Truck className="mx-auto text-[#5B93C5]" /><h3 className="mt-4 font-semibold text-[#263746]">還沒有訂單</h3><p className="mt-2 text-sm text-[#687985]">先為毛孩挑一件喜歡的選物吧。</p><Link href="/shop" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#315F86]">逛逛商城 <ArrowRight size={16} /></Link></div>}
    {orders.map((order) => <article key={order.id} className="overflow-hidden rounded-[22px] border border-[#e1d7cc] bg-white shadow-sm"><button type="button" aria-expanded={openId === order.id} onClick={() => { setOpenId(openId === order.id ? "" : order.id); setMessage(""); setError(""); }} className="flex w-full flex-wrap items-center gap-4 p-5 text-left hover:bg-[#f8fbfc] sm:p-6"><span className="grid size-11 place-items-center rounded-xl bg-[#e8f1f8] text-[#315F86]"><Truck size={20} /></span><span className="min-w-0 flex-1"><strong className="block text-sm text-[#263746]">訂單 {order.id.slice(0, 8).toUpperCase()}</strong><span className="mt-1 block text-xs text-[#7a817f]">{new Date(order.createdAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })} · {order.items.length} 款商品</span></span><span className="rounded-full bg-[#e8f1f8] px-3 py-1 text-xs font-semibold text-[#315F86]">{labels[order.status] ?? order.status}</span><strong className="text-lg text-[#263746]">{money(order.totalNt)}</strong><ChevronDown size={17} className={`text-[#315F86] transition-transform ${openId === order.id ? "rotate-180" : ""}`} /></button>
      {openId === order.id && <div className="border-t border-[#e7e0d7] px-5 pb-6 pt-5 sm:px-6"><div className="grid gap-6 lg:grid-cols-[1fr_290px]"><div><h3 className="text-sm font-semibold text-[#263746]">訂單進度</h3>{order.status === "CANCELLED" ? <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">這筆訂單已取消</p> : <div className="mt-4 grid grid-cols-5 gap-1">{steps.map((step, index) => <div key={step} className="min-w-0"><div className={`h-1.5 rounded-full ${index <= steps.indexOf(order.status) ? "bg-[#5B93C5]" : "bg-[#e7e0d7]"}`} /><p className={`mt-2 text-[11px] ${index <= steps.indexOf(order.status) ? "font-semibold text-[#315F86]" : "text-[#9b9e9c]"}`}>{labels[step]}</p></div>)}</div>}<p className="mt-4 text-xs text-[#8b918f]">此進度顯示目前狀態；詳細物流資訊以後台更新為準。</p>
        <h3 className="mt-7 text-sm font-semibold text-[#263746]">商品明細</h3><div className="mt-3 divide-y divide-[#eee7de]">{order.items.map((item) => <div key={item.id} className="flex items-center gap-3 py-3"><div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-[#f4efe7]"><Image src={item.image} alt="" fill sizes="56px" className="object-contain" /></div><div className="min-w-0 flex-1"><Link href={`/products/${item.slug}`} className="text-sm font-semibold text-[#263746] hover:text-[#5B93C5]">{item.productName}</Link><p className="mt-1 text-xs text-[#8b918f]">給 {item.petName} · {item.quantity} 件</p></div><span className="text-sm text-[#263746]">{money(item.unitPriceNt * item.quantity)}</span></div>)}</div>
        <div className="mt-4 space-y-1 border-t border-[#eee7de] pt-4 text-sm text-[#687985]"><p className="flex justify-between"><span>商品金額</span><span>{money(order.subtotalNt)}</span></p><p className="flex justify-between"><span>運費</span><span>{money(order.shippingNt)}</span></p><p className="flex justify-between font-semibold text-[#263746]"><span>合計</span><span>{money(order.totalNt)}</span></p></div></div>
        <aside className="rounded-2xl bg-[#f8f5ef] p-5 text-sm"><h3 className="font-semibold text-[#263746]">收件與付款</h3><p className="mt-3 leading-6 text-[#687985]">{order.shippingAddress?.name}<br />{order.shippingAddress?.postalCode} {order.shippingAddress?.address}<br />{order.shippingAddress?.phone}</p><p className="mt-3 text-[#687985]">付款：{paymentLabels[order.paymentMethod ?? ""] ?? "依訂單紀錄"}</p><div className="mt-5 space-y-2"><button type="button" onClick={() => reorder(order)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#315F86] px-4 text-sm font-semibold text-white"><RotateCcw size={16} />再次購買</button>{["PAID", "PROCESSING", "DISPATCHED", "COMPLETED"].includes(order.status) && <Link href={`/account/orders/${order.id}/receipt`} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#c4d7e6] bg-white text-sm font-semibold text-[#315F86]"><FileText size={16} />查看與列印收據</Link>}</div></aside></div>
        <div className="mt-7 border-t border-[#e7e0d7] pt-6"><h3 className="text-sm font-semibold text-[#263746]">售後協助</h3>{order.supportRequests.map((request) => <div key={request.id} className="mt-3 rounded-xl border border-[#dce6e9] bg-[#f7fbfc] p-4 text-sm"><p className="font-semibold text-[#315F86]">{supportKind[request.kind]} · {supportStatus[request.status]}</p><p className="mt-2 whitespace-pre-wrap leading-6 text-[#67737b]">{request.message}</p>{request.response && <p className="mt-3 border-t border-[#dce6e9] pt-3 leading-6 text-[#263746]">客服回覆：{request.response}</p>}</div>)}{order.status !== "CANCELLED" && <div className="mt-4 grid gap-3 md:grid-cols-[170px_1fr_auto]"><label className="text-xs font-medium text-[#687985]">需求類型<select value={kind} onChange={(event) => setKind(event.target.value)} className="input mt-1"><option value="ISSUE">訂單問題</option><option value="RETURN">退換貨</option><option value="OTHER">其他需求</option></select></label><label className="text-xs font-medium text-[#687985]">告訴我們發生什麼事<textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1000} rows={2} className="input mt-1 min-h-20" placeholder="請描述商品與需要的協助" /></label><button type="button" disabled={sending || message.trim().length < 10} onClick={() => void sendSupport(order.id)} className="self-end flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#315F86] px-4 text-sm font-semibold text-[#315F86] disabled:opacity-40"><Send size={16} />送出需求</button></div>}</div></div>}
    </article>)}
    {count > 10 && <nav aria-label="訂單分頁" className="flex items-center justify-center gap-4 pt-2"><button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded-full border border-[#cbd8e0] px-4 py-2 text-sm text-[#315F86] disabled:opacity-40">上一頁</button><span className="text-sm text-[#687985]">第 {page} / {Math.ceil(count / 10)} 頁</span><button type="button" disabled={page * 10 >= count} onClick={() => setPage((value) => value + 1)} className="rounded-full border border-[#cbd8e0] px-4 py-2 text-sm text-[#315F86] disabled:opacity-40">下一頁</button></nav>}
  </section>;
}
