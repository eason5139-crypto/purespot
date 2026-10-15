"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingBag,
  Minus,
  Plus,
  Trash2,
  Repeat2,
  Truck,
  CheckCircle2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/useCartStore";
import { usePetContextStore } from "@/store/usePetContextStore";
import { useAutoshipStore } from "@/store/useAutoshipStore";
import { useUiStore } from "@/store/useUiStore";
import { DEMO_MODE, getProduct } from "@/lib/catalog";
import { cartTotals, unitPrice } from "@/lib/cart";
import { matchProduct } from "@/lib/matching";
import { money } from "@/lib/utils";
export function CartDrawer() {
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);
  const pets = usePetContextStore((s) => s.allPets);
  const confirmOrder = useAutoshipStore((s) => s.confirmDemoOrder);
  const close = useUiStore((s) => s.setCartOpen);
  const [orderId, setOrderId] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const totals = cartTotals(items);
  const invalid = items.some((i) => {
    const p = getProduct(i.productId);
    const pet = pets.find((pet) => pet.id === i.petId);
    return (
      !p ||
      !pet ||
      !matchProduct(p, pet).safe ||
      items
        .filter((j) => j.productId === i.productId)
        .reduce((n, j) => n + j.quantity, 0) > p.stock
    );
  });
  function change(key: string, qty: number) {
    try {
      setQuantity(key, qty);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "數量更新失敗");
    }
  }
  async function checkout() {
    if (lock.current || invalid || !accepted || !items.length) return;
    lock.current = true;
    setBusy(true);
    try {
      if (!DEMO_MODE) {
        throw new Error("正式付款服務尚未啟用，目前無法扣款或建立正式訂閱。");
      }
      const id = confirmOrder(items, totals.totalNt);
      clear();
      setOrderId(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "無法建立訂單");
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  return (
    <Dialog open onOpenChange={close}>
      <DialogContent side="right">
        <DialogTitle className="flex items-center gap-3 pr-10 text-2xl font-semibold">
          <ShoppingBag className="text-cyan-300" />
          {orderId ? "日常計畫，安排好了" : "毛孩的購物袋"}
        </DialogTitle>
        <DialogDescription className="mt-2 text-sm text-slate-400">
          {orderId
            ? "這是一筆保留在此裝置的示範訂單。"
            : "每一份選擇，都記得是為了誰。"}
        </DialogDescription>
        {orderId ? (
          <div className="py-12 text-center">
            <CheckCircle2 className="mx-auto size-16 text-emerald-300" />
            <h3 className="mt-5 text-xl">示範訂單已建立</h3>
            <p className="mt-2 font-mono text-sm text-slate-400">{orderId}</p>
            <p className="my-5 text-sm leading-7 text-slate-400">
              未進行扣款、出貨或寄送通知。
              <br />
              循環補貨計畫可以在專區順延或暫停。
            </p>
            <Button asChild className="w-full">
              <Link href="/autoship" onClick={() => close(false)}>
                查看我的循環補貨
              </Link>
            </Button>
            <Button
              variant="ghost"
              className="mt-3"
              onClick={() => close(false)}
            >
              繼續逛逛
            </Button>
          </div>
        ) : !items.length ? (
          <div className="py-20 text-center">
            <ShoppingBag className="mx-auto size-14 text-slate-600" />
            <h3 className="mt-5 text-lg">購物袋還空著</h3>
            <p className="mb-6 mt-2 text-sm text-slate-500">
              先從適合毛孩的一份主食開始吧。
            </p>
            <Button onClick={() => close(false)}>繼續挑選</Button>
          </div>
        ) : (
          <>
            <div className="my-6 rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-4">
              <p className="flex items-center gap-2 text-sm text-cyan-200">
                <Truck size={16} />
                {totals.remainingNt
                  ? `再 ${money(totals.remainingNt)}，這一單就免運`
                  : "已達本次免運門檻"}
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-cyan-400 transition-all"
                  style={{
                    width: `${Math.min(100, (totals.subtotalNt / totals.thresholdNt) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                全循環商品滿 $699；單次或混合購物袋滿 $999 免運。
              </p>
            </div>
            <div className="space-y-5">
              {items.map((item) => {
                const p = getProduct(item.productId);
                const pet = pets.find((pet) => pet.id === item.petId);
                if (!p) return null;
                const fit = pet ? matchProduct(p, pet) : null;
                return (
                  <div key={item.key} className="border-b border-white/10 pb-5">
                    <div className="flex gap-3">
                      <Image
                        src={p.image}
                        alt="商品概念包裝示意"
                        width={82}
                        height={82}
                        className="size-20 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-cyan-300">
                          給{pet?.name ?? "已移除的毛孩"}
                        </p>
                        <p className="mt-1 text-sm font-medium">{p.name}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {p.bagGrams / 1000} 公斤 ·{" "}
                          {money(unitPrice(p, item.mode))} / 包
                        </p>
                        {item.mode === "AUTOSHIP" && (
                          <span className="mt-2 flex items-center gap-1 text-xs text-emerald-300">
                            <Repeat2 size={12} />每 {item.intervalDays} 天配送 ·
                            9 折
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`移除${p.name}`}
                        onClick={() => remove(item.key)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center rounded-lg border border-white/10">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`減少${p.name}數量`}
                          disabled={item.quantity === 1}
                          onClick={() => change(item.key, item.quantity - 1)}
                        >
                          <Minus />
                        </Button>
                        <span className="min-w-8 text-center font-mono text-sm">
                          {item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`增加${p.name}數量`}
                          onClick={() => change(item.key, item.quantity + 1)}
                        >
                          <Plus />
                        </Button>
                      </div>
                      <strong className="font-mono">
                        {money(unitPrice(p, item.mode) * item.quantity)}
                      </strong>
                    </div>
                    {!fit?.safe && (
                      <p role="alert" className="mt-3 text-xs text-amber-300">
                        {fit?.label ?? "毛孩資料已移除"}，請移除此商品後再繼續。
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>商品小計</span>
                <span>{money(totals.subtotalNt)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>運費</span>
                <span>
                  {totals.shippingNt ? money(totals.shippingNt) : "免運"}
                </span>
              </div>
              {totals.savingsNt > 0 && (
                <div className="flex justify-between text-emerald-300">
                  <span>循環補貨已省</span>
                  <span>{money(totals.savingsNt)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-white/10 pt-4 text-xl">
                <span>本次總計</span>
                <strong className="font-mono">{money(totals.totalNt)}</strong>
              </div>
            </div>
            {invalid && (
              <p
                role="alert"
                className="mt-4 flex gap-2 text-sm text-amber-300"
              >
                <TriangleAlert size={18} className="shrink-0" />
                商品適配或庫存已變更，請檢查購物袋。
              </p>
            )}
            <label className="my-5 flex cursor-pointer items-start gap-3 text-xs leading-6 text-slate-400">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-1.5 size-4 shrink-0 accent-cyan-400"
              />
              {DEMO_MODE
                ? "我了解這是示範訂單，不會扣款或出貨；循環補貨只儲存於此裝置，可在專區調整。"
                : "我已確認毛孩、商品數量、配送週期及總金額。"}
            </label>
            <Button
              className="w-full"
              size="lg"
              onClick={() => void checkout()}
              disabled={!accepted || invalid || busy || !DEMO_MODE}
            >
              {busy
                ? "正在處理…"
                : DEMO_MODE
                  ? "建立示範訂單"
                  : "付款服務尚未啟用"}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
