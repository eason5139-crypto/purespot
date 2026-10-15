"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  MapPin,
  CreditCard,
  CheckCircle2,
  ChevronRight,
  Truck,
  Store,
  ArrowLeft,
  Shield,
  Copy,
  Users,
  Send,
  Sparkles,
} from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useFamilyStore } from "@/store/useFamilyStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useUiStore } from "@/store/useUiStore";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/utils";
import { getProduct } from "@/lib/catalog";

type Step = "cart" | "address" | "payment" | "confirm";

interface AddressForm {
  name: string;
  phone: string;
  city: string;
  district: string;
  address: string;
  note: string;
}

interface PaymentMethod {
  id: string;
  label: string;
  icon: typeof CreditCard;
  desc: string;
}

const paymentMethods: PaymentMethod[] = [
  { id: "credit", label: "信用卡線上付款", icon: CreditCard, desc: "Visa / MasterCard / JCB (支援 3D 驗證)" },
  { id: "linepay", label: "LINE Pay 智慧支付 (支援家庭自動拆帳)", icon: Sparkles, desc: "一鍵結帳並自動通知家庭成員分帳" },
  { id: "cvs", label: "超商取貨付款", icon: Store, desc: "7-11、全家、萊爾富門市" },
  { id: "transfer", label: "ATM 虛擬帳號轉帳", icon: Truck, desc: "下單後取得專屬繳費帳號" },
];

const steps: { id: Step; label: string; icon: typeof ShoppingBag }[] = [
  { id: "cart", label: "確認訂單", icon: ShoppingBag },
  { id: "address", label: "收件地址", icon: MapPin },
  { id: "payment", label: "付款方式", icon: CreditCard },
  { id: "confirm", label: "訂單確認", icon: CheckCircle2 },
];

function CheckoutContent() {
  const searchParams = useSearchParams();
  const isFamilyMode = searchParams.get("mode") === "family";

  const personalItems = useCartStore((s) => s.items);
  const clearPersonalCart = useCartStore((s) => s.clear);

  const sharedItems = useFamilyStore((s) => s.sharedItems);
  const familyMembers = useFamilyStore((s) => s.members);
  const groupName = useFamilyStore((s) => s.groupName);

  const user = useAuthStore((s) => s.user);
  const setAuthOpen = useUiStore((s) => s.setAuthOpen);

  const [step, setStep] = useState<Step>("cart");
  const [address, setAddress] = useState<AddressForm>({
    name: user?.name ?? "陳小玲",
    phone: "0912-345-678",
    city: "台北市",
    district: "大安區",
    address: "敦化南路二段 100 號 8 樓",
    note: isFamilyMode ? "請放管理室，家庭主食補貨" : "",
  });
  const [selectedPayment, setSelectedPayment] = useState(isFamilyMode ? "linepay" : "credit");
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState("");

  // 計算金額
  const subtotal = isFamilyMode
    ? sharedItems.reduce((acc, i) => acc + i.priceNt * i.quantity, 0)
    : personalItems.reduce((sum, item) => {
        const product = getProduct(item.productId);
        return sum + (product?.priceNt ?? 0) * item.quantity;
      }, 0);

  const shipping = subtotal >= 699 ? 0 : 100;
  const total = subtotal + shipping;
  const stepIndex = steps.findIndex((s) => s.id === step);

  const hasItems = isFamilyMode ? sharedItems.length > 0 : personalItems.length > 0;

  async function handlePlaceOrder() {
    setSubmitting(true);
    try {
      const orderPayload = isFamilyMode
        ? {
            items: sharedItems.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              unitPriceNt: i.priceNt,
              addedBy: i.addedBy,
            })),
            totalNt: total,
            shippingAddress: address,
            paymentMethod: selectedPayment,
            type: "FAMILY_SHARED",
          }
        : {
            items: personalItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPriceNt: getProduct(item.productId)?.priceNt ?? 0,
            })),
            totalNt: total,
            shippingAddress: address,
            paymentMethod: selectedPayment,
            type: "PERSONAL",
          };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      if (res.ok) {
        const data = (await res.json()) as { orderId?: string };
        setOrderId(data.orderId ?? `PS-FAM-${Date.now()}`);
      } else {
        setOrderId(`PS-${Date.now()}`);
      }
    } catch {
      setOrderId(`PS-${Date.now()}`);
    } finally {
      if (!isFamilyMode) {
        clearPersonalCart();
      }
      setSubmitting(false);
      setStep("confirm");
    }
  }

  if (!hasItems && step !== "confirm") {
    return (
      <main id="main-content" className="page-shell py-20 text-center">
        <ShoppingBag size={48} className="mx-auto text-slate-600 mb-6" />
        <h1 className="text-2xl font-semibold text-white">
          {isFamilyMode ? "家庭協同購物車是空的" : "購物車是空的"}
        </h1>
        <p className="mt-3 text-slate-400">先前往商城或加入家庭好物吧！</p>
        <Button asChild className="mt-8">
          <Link href="/shop">前往精品商城</Link>
        </Button>
      </main>
    );
  }

  return (
    <main id="main-content" className="page-shell py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/shop"
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          返回商城
        </Link>
        {isFamilyMode && (
          <span className="flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-950/40 px-3 py-1 text-xs text-cyan-300">
            <Users size={13} />
            正在進行：{groupName} 一鍵合併買單
          </span>
        )}
      </div>

      <h1 className="text-3xl font-bold text-white mb-8">
        {isFamilyMode ? "家庭協同結帳" : "安全結帳"}
      </h1>

      {/* Progress Steps */}
      <div className="flex items-center gap-0 mb-10 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center shrink-0">
            <div
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all ${
                s.id === step
                  ? "bg-cyan-500/10 text-cyan-300 font-medium"
                  : i < stepIndex
                  ? "text-emerald-400"
                  : "text-slate-500"
              }`}
            >
              {i < stepIndex ? (
                <CheckCircle2 size={16} className="text-emerald-400" />
              ) : (
                <s.icon size={16} />
              )}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <ChevronRight size={14} className="text-slate-700 mx-1" />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: 確認訂單 */}
        {step === "cart" && (
          <motion.div
            key="cart"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid gap-6 lg:grid-cols-[1fr_360px]"
          >
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">確認結帳品項</h2>

              {isFamilyMode ? (
                /* 家庭協同清單顯示 */
                <div className="space-y-3">
                  {sharedItems.map((item) => (
                    <div key={item.id} className="panel p-5 flex items-center gap-4">
                      <div className="flex size-12 items-center justify-center rounded-xl bg-white/10 text-xl shrink-0">
                        {item.memberAvatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-cyan-300">
                            {item.addedBy} 加購
                          </span>
                          {item.note && (
                            <span className="truncate text-xs text-amber-200/80">
                              💬 {item.note}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 font-medium text-white truncate">{item.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          數量 {item.quantity} · {money(item.priceNt)} / 份
                        </p>
                      </div>
                      <span className="font-mono font-semibold text-cyan-300">
                        {money(item.priceNt * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                /* 個人清單顯示 */
                <div className="space-y-3">
                  {personalItems.map((item) => {
                    const product = getProduct(item.productId);
                    if (!product) return null;
                    return (
                      <div key={item.productId} className="panel p-5 flex items-center gap-4">
                        <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-black/40">
                          <Image src={product.image} alt={product.name} fill className="object-cover" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-white">{product.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{product.bagGrams}g · 數量 {item.quantity}</p>
                        </div>
                        <span className="font-mono font-semibold text-cyan-300">
                          {money(product.priceNt * item.quantity)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 摘要與右側結帳卡 */}
            <div className="panel p-6 h-fit">
              <h3 className="font-semibold text-white mb-4">訂單摘要</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>商品小計</span>
                  <span className="font-mono">{money(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>物流運費</span>
                  <span className={shipping === 0 ? "text-emerald-400" : "font-mono"}>
                    {shipping === 0 ? "免運費 (滿額優惠)" : money(shipping)}
                  </span>
                </div>
                <div className="border-t border-white/10 pt-3 flex justify-between font-semibold text-white">
                  <span>訂單總計</span>
                  <span className="font-mono text-cyan-300">{money(total)}</span>
                </div>
              </div>

              {isFamilyMode && (
                <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-slate-400">
                  <p className="font-medium text-cyan-300 mb-1">主購人一鍵買單優惠</p>
                  <p>全戶合併計算享有免運門檻；後續可透過 LINE Pay 發送家庭分帳通知。</p>
                </div>
              )}

              <Button className="w-full mt-5 gap-2" onClick={() => setStep("address")}>
                前往填寫收件資訊
                <ChevronRight size={16} />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 2: 收件地址 */}
        {step === "address" && (
          <motion.div
            key="address"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-xl"
          >
            <h2 className="text-xl font-semibold text-white mb-6">填寫收件地址與聯絡資訊</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="field-label">收件人姓名 *</label>
                  <input
                    type="text"
                    required
                    value={address.name}
                    onChange={(e) => setAddress({ ...address, name: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="field-label">聯絡電話 *</label>
                  <input
                    type="tel"
                    required
                    value={address.phone}
                    onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                    className="input font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="field-label">縣市 *</label>
                  <input
                    type="text"
                    required
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="field-label">鄉鎮市區 *</label>
                  <input
                    type="text"
                    required
                    value={address.district}
                    onChange={(e) => setAddress({ ...address, district: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="field-label">詳細地址 *</label>
                <input
                  type="text"
                  required
                  value={address.address}
                  onChange={(e) => setAddress({ ...address, address: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="field-label">配送備註（選填）</label>
                <input
                  type="text"
                  value={address.note}
                  onChange={(e) => setAddress({ ...address, note: e.target.value })}
                  placeholder="例如：放置警衛室代收"
                  className="input"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="ghost" onClick={() => setStep("cart")}>
                  返回
                </Button>
                <Button
                  className="flex-1 gap-2"
                  disabled={!address.name || !address.phone || !address.address}
                  onClick={() => setStep("payment")}
                >
                  確認收件資訊，選擇付款方式
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: 付款方式 */}
        {step === "payment" && (
          <motion.div
            key="payment"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-xl"
          >
            <h2 className="text-xl font-semibold text-white mb-6">選擇付款方式</h2>
            <div className="space-y-3 mb-8">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedPayment(method.id)}
                  className={`w-full panel p-5 flex items-center gap-4 text-left transition-all ${
                    selectedPayment === method.id
                      ? "border-cyan-400/40 bg-cyan-950/20 ring-1 ring-cyan-400/30"
                      : "hover:border-white/20"
                  }`}
                >
                  <div
                    className={`flex size-10 items-center justify-center rounded-xl ${
                      selectedPayment === method.id
                        ? "bg-cyan-400/10 text-cyan-400"
                        : "bg-white/5 text-slate-400"
                    }`}
                  >
                    <method.icon size={20} />
                  </div>
                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        selectedPayment === method.id ? "text-white" : "text-slate-300"
                      }`}
                    >
                      {method.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{method.desc}</p>
                  </div>
                  {selectedPayment === method.id && (
                    <CheckCircle2 size={20} className="text-cyan-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {/* 收件資訊確認 */}
            <div className="panel p-5 mb-6">
              <h3 className="text-sm font-medium text-slate-400 mb-3">收件與結算確認</h3>
              <p className="text-sm text-white">
                {address.name} · {address.phone}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {address.city}
                {address.district} {address.address}
              </p>
              <div className="border-t border-white/5 mt-3 pt-3 flex justify-between text-sm">
                <span className="text-slate-400">訂單總額</span>
                <span className="font-mono font-semibold text-cyan-300">{money(total)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setStep("address")}>
                返回
              </Button>
              <Button
                className="flex-1 gap-2"
                disabled={submitting}
                onClick={() => void handlePlaceOrder()}
              >
                {submitting ? "正在連線銀行授權..." : isFamilyMode ? "主購人確認合併下單" : "確認付款與下單"}
                {!submitting && <ChevronRight size={16} />}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 4: 訂單完成 */}
        {step === "confirm" && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg mx-auto text-center py-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
              className="mx-auto flex size-20 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400 mb-6"
            >
              <CheckCircle2 size={40} />
            </motion.div>
            <h2 className="text-3xl font-bold text-white">訂單已成功送出！</h2>
            <p className="mt-3 text-slate-400">
              {isFamilyMode
                ? "家庭合併訂單已建立，已為家庭省下單獨配送運費！"
                : "感謝您的訂購，我們正為毛孩進行原肉無菌包裝與出貨安排。"}
            </p>

            <div className="mt-8 panel p-5 text-left">
              <p className="text-xs text-slate-500 mb-1">訂單編號</p>
              <div className="flex items-center justify-between">
                <p className="font-mono text-white text-sm">{orderId}</p>
                <button
                  onClick={() => void navigator.clipboard.writeText(orderId)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
                >
                  <Copy size={12} />
                  複製
                </button>
              </div>
              <div className="border-t border-white/5 mt-4 pt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500">主購人 / 收件人</p>
                  <p className="text-white mt-1">{address.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">結算金額</p>
                  <p className="font-mono text-cyan-300 mt-1">{money(total)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-500">配送地址</p>
                  <p className="text-white mt-1">
                    {address.city}
                    {address.district} {address.address}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button asChild>
                <Link href="/account">查看我的訂單進度</Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/shop">繼續選購商品</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

export function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center">
          <div className="mx-auto size-10 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
