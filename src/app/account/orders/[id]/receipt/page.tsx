"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { accountJson, type AccountOrder } from "@/lib/accountTypes";
import { money } from "@/lib/utils";

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<AccountOrder | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { if (id) void accountJson<{ order: AccountOrder }>(`/api/account/orders/${encodeURIComponent(id)}`).then((data) => setOrder(data.order)).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "無法載入訂單")); }, [id]);
  const receiptAvailable = !!order && !["PENDING_PAYMENT", "CANCELLED"].includes(order.status);
  return <main id="main-content" className="receipt-page mx-auto min-h-[70vh] max-w-3xl px-5 py-10 text-[#263746]">
    <div className="mb-6 flex items-center justify-between gap-3"><Link href="/account?tab=orders" className="flex items-center gap-2 text-sm text-[#315F86]"><ArrowLeft size={16} />返回訂單中心</Link>{receiptAvailable && <button type="button" onClick={() => window.print()} className="flex min-h-11 items-center gap-2 rounded-xl bg-[#315F86] px-4 text-sm font-semibold text-white"><Printer size={16} />列印或儲存 PDF</button>}</div>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-5 text-sm text-rose-700">{error}</p>}
    {!error && !order && <p className="rounded-xl bg-white p-8 text-sm text-[#687985]">正在載入訂單收據…</p>}
    {order && !receiptAvailable && <p className="rounded-xl bg-amber-50 p-5 text-sm text-amber-900">此筆訂單尚未付款或已取消，沒有可列印的收據。</p>}
    {receiptAvailable && <article className="rounded-[24px] border border-[#dce5e9] bg-white p-7 shadow-sm sm:p-10"><div className="flex flex-wrap justify-between gap-4 border-b border-[#e2e8e9] pb-7"><div><p className="text-xs font-bold tracking-[.2em] text-[#5B93C5]">PURESPOT</p><h1 className="editorial-title mt-3 text-3xl">訂單收據</h1><p className="mt-2 text-xs text-[#687985]">訂單編號 {order.id}</p></div><div className="text-right text-sm leading-7 text-[#687985]"><p>{new Date(order.createdAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</p><p>{order.status === "COMPLETED" ? "已完成" : order.status === "DISPATCHED" ? "已出貨" : order.status === "PROCESSING" ? "備貨中" : "已付款"}</p></div></div><div className="grid gap-6 border-b border-[#e2e8e9] py-6 text-sm sm:grid-cols-2"><div><h2 className="font-semibold">收件資訊</h2><p className="mt-2 leading-7 text-[#687985]">{order.shippingAddress?.name}<br />{order.shippingAddress?.postalCode} {order.shippingAddress?.address}<br />{order.shippingAddress?.phone}</p></div><div><h2 className="font-semibold">付款與配送</h2><p className="mt-2 text-[#687985]">付款方式：{({ credit: "信用卡", linepay: "LINE Pay", cvs: "超商付款", transfer: "ATM 轉帳" } as Record<string, string>)[order.paymentMethod ?? ""] ?? "依訂單紀錄"}</p></div></div><div className="py-5"><h2 className="mb-4 font-semibold">商品明細</h2>{order.items.map((item) => <div key={item.id} className="flex justify-between gap-4 border-b border-[#eef0ef] py-3 text-sm"><span>{item.productName}<span className="ml-2 text-[#8b918f]">× {item.quantity}</span></span><span>{money(item.unitPriceNt * item.quantity)}</span></div>)}</div><div className="ml-auto max-w-xs space-y-2 border-t border-[#e2e8e9] pt-5 text-sm"><p className="flex justify-between"><span>商品金額</span><span>{money(order.subtotalNt)}</span></p><p className="flex justify-between"><span>運費</span><span>{money(order.shippingNt)}</span></p><p className="flex justify-between pt-2 text-lg font-semibold"><span>合計</span><span>{money(order.totalNt)}</span></p></div><p className="mt-9 border-t border-[#e2e8e9] pt-5 text-xs leading-6 text-[#8b918f]">這份收據記錄網站內的訂單內容；若需要正式發票，請依實際開立資料辦理。</p></article>}
  </main>;
}
