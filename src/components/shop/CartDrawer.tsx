"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Minus,
  Plus,
  Trash2,
  Repeat2,
  Truck,
  CheckCircle2,
  TriangleAlert,
  Users,
  UserPlus,
  Sparkles,
  Share2,
  Copy,
  CreditCard,
  Send,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
import { useFamilyStore } from "@/store/useFamilyStore";
import { DEMO_MODE, getProduct } from "@/lib/catalog";
import { cartTotals, unitPrice } from "@/lib/cart";
import { matchProduct } from "@/lib/matching";
import { money } from "@/lib/utils";

export function CartDrawer() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);
  const pets = usePetContextStore((s) => s.allPets);
  const confirmOrder = useAutoshipStore((s) => s.confirmDemoOrder);
  const close = useUiStore((s) => s.setCartOpen);

  // 家庭共管購物車狀態
  const cartMode = useFamilyStore((s) => s.cartMode);
  const setCartMode = useFamilyStore((s) => s.setCartMode);
  const familyMembers = useFamilyStore((s) => s.members);
  const sharedItems = useFamilyStore((s) => s.sharedItems);
  const removeShared = useFamilyStore((s) => s.removeSharedItem);
  const updateSharedQty = useFamilyStore((s) => s.updateQuantity);
  const inviteCode = useFamilyStore((s) => s.inviteCode);
  const groupName = useFamilyStore((s) => s.groupName);

  const [orderId, setOrderId] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [splitSent, setSplitSent] = useState(false);

  const lock = useRef(false);
  const totals = cartTotals(items);

  // 家庭協同購物車總金額計算
  const familySubtotal = sharedItems.reduce((acc, item) => acc + item.priceNt * item.quantity, 0);
  const familyShipping = familySubtotal >= 699 ? 0 : 100;
  const familyTotal = familySubtotal + familyShipping;

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

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(`【PURESPOT 家庭毛孩共管】邀請你加入「${groupName}」！\n邀請碼：${inviteCode}\n點擊連結加入共同照顧毛孩：https://purespot.tw/join?code=${inviteCode}`);
    setCopied(true);
    toast.success("已複製邀請碼與邀請連結至剪貼簿！");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendLinePaySplit = () => {
    setSplitSent(true);
    toast.success("已透過 LINE Pay 向家庭成員發送自動分帳請求！");
    setTimeout(() => {
      setShowSplitModal(false);
      setSplitSent(false);
    }, 2000);
  };

  const handleGoToCheckout = (mode: "personal" | "family") => {
    close(false);
    router.push(`/checkout?mode=${mode}`);
  };

  async function checkoutDemo() {
    if (lock.current || invalid || !accepted || !items.length) return;
    lock.current = true;
    setBusy(true);
    try {
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
        <DialogTitle className="flex items-center justify-between pr-8 text-xl font-semibold">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="text-cyan-300" size={22} />
            <span>購物袋</span>
          </div>

          {/* 模式切換按鈕：個人 vs 家庭共管 (7C 創新功能 1) */}
          <div className="flex items-center rounded-xl bg-white/5 p-1 border border-white/10">
            <button
              onClick={() => setCartMode("PERSONAL")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                cartMode === "PERSONAL"
                  ? "bg-cyan-500 text-slate-950 font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              個人 ({items.reduce((n, i) => n + i.quantity, 0)})
            </button>
            <button
              onClick={() => setCartMode("FAMILY")}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                cartMode === "FAMILY"
                  ? "bg-cyan-500 text-slate-950 font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Users size={12} />
              家庭共管 ({sharedItems.reduce((n, i) => n + i.quantity, 0)})
            </button>
          </div>
        </DialogTitle>
        <DialogDescription className="sr-only">
          查看並調整購物車內的商品、配送方式或家庭協同購物清單。
        </DialogDescription>

        {/* 訂單完成回饋畫面 */}
        {orderId ? (
          <div className="py-12 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-white">示範訂單已建立</h3>
            <p className="mt-2 font-mono text-sm text-cyan-300">{orderId}</p>
            <p className="mt-4 text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              系統已將這筆訂單記至本機。若您有選定定期補貨，會在指定天數模擬下一次循環。
            </p>
            <div className="mt-6 grid gap-2">
              <Button asChild className="w-full" onClick={() => close(false)}>
                <Link href="/autoship">查看我的循環補貨</Link>
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => close(false)}>
                完成並返回探索
              </Button>
            </div>
          </div>
        ) : cartMode === "FAMILY" ? (
          /* ===================================================
             家庭協同購物車（7C 創新機制 1）
             =================================================== */
          <>
            {/* 家庭群組資訊列與成員頭像 */}
            <div className="mt-4 rounded-xl border border-cyan-400/20 bg-gradient-to-r from-cyan-950/30 to-[#111827] p-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-cyan-400 tracking-wider">
                    FAMILY SHARED CART · 家庭共管
                  </span>
                  <p className="text-sm font-medium text-white">{groupName}</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => setShowInviteModal(true)}
                >
                  <UserPlus size={12} />
                  邀請成員
                </Button>
              </div>

              {/* 成員列表 */}
              <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-2.5">
                <span className="text-xs text-slate-400">共管成員：</span>
                <div className="flex items-center -space-x-1.5">
                  {familyMembers.map((m) => (
                    <div
                      key={m.id}
                      title={`${m.name} (${m.relationship})`}
                      className="flex size-7 items-center justify-center rounded-full border-2 border-[#111827] bg-white/10 text-xs shadow"
                    >
                      {m.avatar}
                    </div>
                  ))}
                </div>
                <span className="text-[11px] text-cyan-300 ml-1">即時同步中</span>
              </div>
            </div>

            {/* 免運進度條 */}
            <div className="my-3 rounded-lg border border-white/5 bg-white/[0.02] p-2.5 text-xs text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Truck size={14} className="text-cyan-400" />
                家庭整單滿 $699 免運
              </span>
              <span className="font-mono text-cyan-300">
                {familySubtotal >= 699 ? "已達免運門檻" : `還差 $${699 - familySubtotal} 免運`}
              </span>
            </div>

            {/* 協同清單 */}
            {sharedItems.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-500">
                <Users size={36} className="mx-auto mb-2 opacity-30" />
                家庭協同購物車目前是空的。
                <p className="mt-1 text-xs text-slate-600">任何家庭成員皆可加購好物並備註原因！</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[48vh] overflow-y-auto pr-1">
                {sharedItems.map((item) => (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 space-y-2.5">
                    {/* 加購成員與加購原因標籤（杜絕重複採購） */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-medium text-cyan-300">
                        <span>{item.memberAvatar}</span>
                        <span>{item.addedBy} 加購</span>
                        <span className="text-[10px] text-slate-500">· {item.addedAt}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-slate-500 hover:text-rose-400"
                        onClick={() => removeShared(item.id)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>

                    {/* 加購理由泡泡 */}
                    {item.note && (
                      <p className="rounded-md bg-white/5 px-2.5 py-1 text-xs text-amber-200/90 italic">
                        💬 「{item.note}」
                      </p>
                    )}

                    {/* 商品主資訊 */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <p className="text-sm font-medium text-white">{item.name}</p>
                        <p className="text-xs font-mono text-slate-400">{money(item.priceNt)} / 份</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center rounded-lg border border-white/10">
                          <button
                            className="p-1 hover:bg-white/10 disabled:opacity-30"
                            disabled={item.quantity <= 1}
                            onClick={() => updateSharedQty(item.id, item.quantity - 1)}
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-7 text-center font-mono text-xs">{item.quantity}</span>
                          <button
                            className="p-1 hover:bg-white/10"
                            onClick={() => updateSharedQty(item.id, item.quantity + 1)}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <span className="font-mono text-sm font-semibold text-white">
                          {money(item.priceNt * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 家庭金額結算 */}
            <div className="mt-4 border-t border-white/10 pt-3 space-y-2 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>品項小計</span>
                <span className="font-mono">{money(familySubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>物流運費</span>
                <span className="font-mono">{familyShipping === 0 ? "免運" : money(familyShipping)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold text-white border-t border-white/5 pt-2">
                <span>家庭總結算</span>
                <span className="font-mono text-cyan-300">{money(familyTotal)}</span>
              </div>
            </div>

            {/* 雙核心結帳按鈕 (主購人合併買單 vs 智慧拆帳) */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                className="gap-1 text-xs"
                onClick={() => setShowSplitModal(true)}
              >
                <Sparkles size={13} className="text-cyan-400" />
                LINE Pay 拆帳
              </Button>
              <Button
                className="gap-1 text-xs"
                onClick={() => handleGoToCheckout("family")}
              >
                主購人合併結帳
                <ArrowRight size={13} />
              </Button>
            </div>
          </>
        ) : (
          /* ===================================================
             個人專屬購物袋
             =================================================== */
          items.length === 0 ? (
            <div className="py-20 text-center text-sm text-slate-400">
              <ShoppingBag size={42} className="mx-auto mb-3 opacity-20" />
              目前購物袋內尚無商品。
              <div className="mt-4">
                <Button variant="secondary" size="sm" onClick={() => close(false)}>
                  前往商城探索商品
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* 免運提示 */}
              <div className="my-3 rounded-lg border border-white/5 bg-white/[0.02] p-2.5 text-xs text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Truck size={14} className="text-cyan-400" />
                  全循環商品滿 $699；單次或混合滿 $999 免運
                </span>
                <span className="font-mono text-cyan-300">
                  {totals.subtotalNt >= 699 ? "已達免運門檻" : `差 $${699 - totals.subtotalNt}`}
                </span>
              </div>

              {/* 個人商品列表 */}
              <div className="space-y-4 max-h-[46vh] overflow-y-auto pr-1">
                {items.map((item) => {
                  const p = getProduct(item.productId);
                  const pet = pets.find((pet) => pet.id === item.petId);
                  if (!p) return null;
                  const fit = pet ? matchProduct(p, pet) : null;
                  return (
                    <div key={item.key} className="border-b border-white/10 pb-4">
                      <div className="flex gap-3">
                        <Image
                          src={p.image}
                          alt={p.name}
                          width={70}
                          height={70}
                          className="size-16 rounded-xl object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] text-cyan-300">
                            給 {pet?.name ?? "毛孩"}
                          </p>
                          <p className="mt-0.5 text-sm font-medium text-white truncate">{p.name}</p>
                          <p className="text-xs text-slate-400">
                            {p.bagGrams / 1000}kg · {money(unitPrice(p, item.mode))}
                          </p>
                          {item.mode === "AUTOSHIP" && (
                            <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-emerald-300">
                              <Repeat2 size={11} />每 {item.intervalDays} 天配送 · 9 折
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-slate-500 hover:text-rose-400"
                          onClick={() => remove(item.key)}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between">
                        <div className="flex items-center rounded-lg border border-white/10">
                          <button
                            className="p-1 hover:bg-white/10 disabled:opacity-30"
                            disabled={item.quantity <= 1}
                            onClick={() => change(item.key, item.quantity - 1)}
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-7 text-center font-mono text-xs">{item.quantity}</span>
                          <button
                            className="p-1 hover:bg-white/10"
                            onClick={() => change(item.key, item.quantity + 1)}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <strong className="font-mono text-sm text-white">
                          {money(unitPrice(p, item.mode) * item.quantity)}
                        </strong>
                      </div>
                      {!fit?.safe && (
                        <p role="alert" className="mt-2 text-xs text-amber-300">
                          {fit?.label ?? "毛孩資料不符"}，請確認後再結帳。
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 個人金額統計 */}
              <div className="mt-4 border-t border-white/10 pt-3 space-y-2 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>小計</span>
                  <span className="font-mono">{money(totals.subtotalNt)}</span>
                </div>
                <div className="flex justify-between">
                  <span>運費</span>
                  <span className="font-mono">{totals.shippingNt ? money(totals.shippingNt) : "免運"}</span>
                </div>
                {totals.savingsNt > 0 && (
                  <div className="flex justify-between text-emerald-300">
                    <span>循環補貨已省</span>
                    <span className="font-mono">{money(totals.savingsNt)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-semibold text-white border-t border-white/5 pt-2">
                  <span>本次結帳總計</span>
                  <span className="font-mono text-cyan-300">{money(totals.totalNt)}</span>
                </div>
              </div>

              {/* 前往結帳流程 */}
              <div className="mt-4 space-y-2">
                <Button
                  className="w-full gap-1.5"
                  size="lg"
                  onClick={() => handleGoToCheckout("personal")}
                  disabled={invalid}
                >
                  前往正式結帳頁面
                  <ArrowRight size={15} />
                </Button>

                {/* 快速示範模式開關 */}
                <div className="space-y-2 pt-2 text-center">
                  <label className="flex cursor-pointer items-start gap-2 rounded-xl bg-white/5 p-3 text-left text-xs leading-5 text-slate-400">
                    <input
                      type="checkbox"
                      checked={accepted}
                      onChange={(event) => setAccepted(event.target.checked)}
                      className="mt-0.5 size-4 accent-[#f4a261]"
                    />
                    <span>我了解這是本機示範訂單，不會扣款、出貨或寄送通知。</span>
                  </label>
                  <button
                    onClick={() => void checkoutDemo()}
                    disabled={!accepted || invalid || busy}
                    className="text-[11px] text-slate-500 hover:text-slate-300 underline underline-offset-2"
                  >
                    或以本機示範訂單快速結算 (免填地址)
                  </button>
                </div>
              </div>
            </>
          )
        )}

        {/* 邀請家庭成員彈窗 */}
        <AnimatePresence>
          {showInviteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f1523] p-6 shadow-2xl text-center"
              >
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-400">
                  <UserPlus size={24} />
                </div>
                <h3 className="mt-3 text-lg font-bold text-white">邀請毛孩共管成員</h3>
                <p className="mt-1 text-xs text-slate-400">
                  將伴侶、家人或同住室友加入，共同照顧毛孩並同步購物清單。
                </p>

                <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3">
                  <span className="text-[10px] text-slate-400">專屬共管邀請碼</span>
                  <p className="mt-1 font-mono text-xl font-bold tracking-widest text-cyan-300">
                    {inviteCode}
                  </p>
                </div>

                <div className="mt-5 flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setShowInviteModal(false)}
                  >
                    關閉
                  </Button>
                  <Button
                    className="flex-1 gap-1.5"
                    onClick={handleCopyInvite}
                  >
                    {copied ? <CheckCircle2 size={15} /> : <Copy size={15} />}
                    {copied ? "已複製！" : "複製邀請"}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 智慧拆帳分攤彈窗 (7C 創新機制 3) */}
        <AnimatePresence>
          {showSplitModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md rounded-2xl border border-cyan-400/30 bg-[#0f1523] p-6 shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-cyan-400" size={18} />
                    <h3 className="text-base font-bold text-white">智慧拆帳分攤 (LINE Pay)</h3>
                  </div>
                  <button
                    onClick={() => setShowSplitModal(false)}
                    className="text-slate-400 hover:text-white text-sm"
                  >
                    ✕
                  </button>
                </div>

                <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                  系統已自動按各成員加購之品項精確分攤，一鍵發送 LINE Pay 分帳請求至家庭群組。
                </p>

                {/* 各成員拆帳明細 */}
                <div className="mt-4 space-y-3">
                  {familyMembers.map((m) => {
                    const memberItems = sharedItems.filter((i) => i.addedBy === m.name);
                    const memberSum = memberItems.reduce((acc, i) => acc + i.priceNt * i.quantity, 0);
                    return (
                      <div key={m.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs">
                        <div className="flex items-center justify-between font-medium">
                          <span className="flex items-center gap-1.5 text-white">
                            <span>{m.avatar}</span>
                            <span>{m.name}</span>
                            <span className="text-[10px] text-slate-500">({m.relationship})</span>
                          </span>
                          <span className="font-mono text-cyan-300 font-semibold">
                            {money(memberSum)}
                          </span>
                        </div>
                        <div className="mt-1 text-slate-400 text-[11px] pl-6 space-y-0.5">
                          {memberItems.map((item) => (
                            <div key={item.id} className="flex justify-between">
                              <span className="truncate max-w-[200px]">{item.name} × {item.quantity}</span>
                              <span className="font-mono text-slate-500">{money(item.priceNt * item.quantity)}</span>
                            </div>
                          ))}
                          {memberItems.length === 0 && (
                            <span className="text-slate-600">本次無加購品項</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3 text-xs">
                  <span className="text-slate-400">總計（含免運折抵）：</span>
                  <span className="font-mono text-base font-bold text-white">{money(familyTotal)}</span>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    variant="ghost"
                    className="flex-1 text-xs"
                    onClick={() => setShowSplitModal(false)}
                  >
                    取消
                  </Button>
                  <Button
                    className="flex-1 gap-1.5 text-xs bg-[#00C300] hover:bg-[#00B000] text-slate-950 font-semibold"
                    onClick={handleSendLinePaySplit}
                    disabled={splitSent}
                  >
                    <Send size={13} />
                    {splitSent ? "已發送分帳請求！" : "發送 LINE Pay 分帳請求"}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
