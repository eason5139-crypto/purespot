"use client";
import { useRef, useState, Suspense } from "react";
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
  Store,
  ArrowLeft,
  Copy,
  Users,
  Landmark,
  Smartphone,
} from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useFamilyStore } from "@/store/useFamilyStore";
import { useAuthStore } from "@/store/useAuthStore";
import { usePetContextStore } from "@/store/usePetContextStore";
import { useUiStore } from "@/store/useUiStore";
import { cartTotals } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/utils";
import { getProduct } from "@/lib/catalog";

type Step = "cart" | "address" | "payment" | "confirm";

interface AddressForm {
  name: string;
  phone: string;
  postalCode: string;
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
  { id: "credit", label: "信用卡", icon: CreditCard, desc: "卡片確認與感應動畫" },
  { id: "linepay", label: "LINE Pay", icon: Smartphone, desc: "手機付款確認動畫" },
  { id: "cvs", label: "超商取貨付款", icon: Store, desc: "門市付款流程" },
  { id: "transfer", label: "ATM 轉帳", icon: Landmark, desc: "查看轉帳資訊" },
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
  const clearCart = useCartStore((s) => s.clear);
  const pets = usePetContextStore((s) => s.allPets);
  const activePetId = usePetContextStore((s) => s.activePetId);
  const openAuth = useUiStore((s) => s.setAuthOpen);
  const requestKey = useRef<string | null>(null);

  const sharedItems = useFamilyStore((s) => s.sharedItems);
  const clearSharedItems = useFamilyStore((s) => s.clearSharedItems);
  const familyMembers = useFamilyStore((s) => s.members);
  const groupName = useFamilyStore((s) => s.groupName);

  const user = useAuthStore((s) => s.user);

  const [step, setStep] = useState<Step>("cart");
  const [address, setAddress] = useState<AddressForm>({
    name: user?.name ?? "",
    phone: "",
    postalCode: "",
    city: "",
    district: "",
    address: "",
    note: isFamilyMode ? "請放管理室，家庭主食補貨" : "",
  });
  const [selectedPayment, setSelectedPayment] = useState(isFamilyMode ? "linepay" : "credit");
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [confirmedTotal, setConfirmedTotal] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState("");

  const subtotal = isFamilyMode
    ? sharedItems.reduce((acc, i) => acc + (getProduct(i.productId)?.priceNt ?? i.priceNt) * i.quantity, 0)
    : cartTotals(personalItems).subtotalNt;

  const shipping = isFamilyMode ? (subtotal >= 999 ? 0 : 80) : cartTotals(personalItems).shippingNt;
  const total = subtotal + shipping;
  const stepIndex = steps.findIndex((s) => s.id === step);

  const hasItems = isFamilyMode ? sharedItems.length > 0 : personalItems.length > 0;

  async function handlePlaceOrder() {
    if (!user) {
      openAuth(true);
      return;
    }
    setSubmitError("");
    setSubmitting(true);
    const started = Date.now();
    try {
      const items = isFamilyMode
        ? sharedItems.map((item) => ({
            productId: item.productId,
            pet: pets.find((pet) => pet.id === item.petId) ?? pets.find((pet) => pet.id === activePetId)!,
            quantity: item.quantity,
            intervalDays: null,
          }))
        : personalItems.map((item) => ({
            productId: item.productId,
            pet: pets.find((pet) => pet.id === item.petId)!,
            quantity: item.quantity,
            intervalDays: item.intervalDays,
          }));
      if (items.some((item) => !item.pet)) throw new Error("毛孩資料已變動，請重新選擇");
      requestKey.current ??= crypto.randomUUID();
      const response = await fetch("/api/orders/experience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: requestKey.current,
          paymentMethod: selectedPayment,
          items,
          shippingAddress: {
            name: address.name,
            phone: address.phone,
            postalCode: address.postalCode,
            address: `${address.city}${address.district}${address.address}`,
          },
        }),
      });
      const result = await response.json() as { order?: { id: string; totalNt: number }; error?: string };
      if (!response.ok || !result.order) throw new Error(result.error || "訂單無法建立，請稍後再試");
      await new Promise((resolve) => window.setTimeout(resolve, Math.max(0, 1500 - (Date.now() - started))));
      setOrderId(result.order.id);
      setConfirmedTotal(result.order.totalNt);
      if (isFamilyMode) clearSharedItems();
      else clearCart();
      requestKey.current = null;
      setSubmitting(false);
      setStep("confirm");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "無法建立訂單");
      setSubmitting(false);
    }
  }

  if (!hasItems && step !== "confirm") {
    return (
      <main id="main-content" className="page-shell py-20 text-center">
        <ShoppingBag size={48} className="mx-auto text-[#8a7f75] mb-6 opacity-40" />
        <h1 className="text-2xl font-semibold text-[#302b26]">
          {isFamilyMode ? "家庭協同購物車是空的" : "購物車是空的"}
        </h1>
        <p className="mt-3 text-[#675e53]">先前往商城或加入家庭好物吧！</p>
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
          className="flex items-center gap-1.5 text-sm text-[#675e53] hover:text-[#5B93C5] transition-colors"
        >
          <ArrowLeft size={16} />
          返回商城
        </Link>
        {isFamilyMode && (
          <span className="flex items-center gap-1.5 rounded-full border border-[#5B93C5]/30 bg-[#5B93C5]/10 px-3 py-1 text-xs font-medium text-[#5B93C5]">
            <Users size={13} />
            正在進行：{groupName} 一鍵合併買單
          </span>
        )}
      </div>

      <h1 className="text-3xl font-bold text-[#302b26] mb-8">
        {isFamilyMode ? "家庭結帳" : "結帳"}
      </h1>
      <p className="mb-8 rounded-xl border border-[#bcd5e9] bg-[#eaf3fa] px-4 py-3 text-sm text-[#315F86]">
        體驗結帳不會扣款、轉帳或安排出貨。送出後，訂單會同步到會員帳戶與公司後台。
      </p>

      {/* Progress Steps */}
      <div className="flex items-center gap-0 mb-10 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center shrink-0">
            <div
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all ${
                s.id === step
                  ? "bg-[#5B93C5]/10 text-[#5B93C5] font-semibold"
                  : i < stepIndex
                  ? "text-[#315F86] font-medium"
                  : "text-[#8a7f75]"
              }`}
            >
              {i < stepIndex ? (
                <CheckCircle2 size={16} className="text-[#315F86]" />
              ) : (
                <s.icon size={16} />
              )}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <ChevronRight size={14} className="text-[#d9cfc3] mx-1" />
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
              <h2 className="text-xl font-semibold text-[#302b26]">確認結帳品項</h2>

              {isFamilyMode ? (
                <div className="space-y-3">
                  {sharedItems.map((item) => (
                    <div key={item.id} className="panel p-5 flex items-center gap-4 bg-white">
                      <div className="flex size-12 items-center justify-center rounded-xl bg-[#f0e9df] text-xl shrink-0">
                        {item.memberAvatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#5B93C5]">
                            {item.addedBy} 加購
                          </span>
                          {item.note && (
                            <span className="truncate text-xs text-[#8a5a14] bg-[#fdf6ea] px-2 py-0.5 rounded">
                              💬 {item.note}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 font-medium text-[#302b26] truncate">{getProduct(item.productId)?.name ?? item.name}</p>
                        <p className="text-xs text-[#8a7f75] mt-0.5">
                          數量 {item.quantity} · {money(getProduct(item.productId)?.priceNt ?? item.priceNt)} / 份
                        </p>
                      </div>
                      <span className="font-mono font-semibold text-[#5B93C5]">
                        {money((getProduct(item.productId)?.priceNt ?? item.priceNt) * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {personalItems.map((item) => {
                    const product = getProduct(item.productId);
                    if (!product) return null;
                    return (
                      <div key={item.productId} className="panel p-5 flex items-center gap-4 bg-white">
                        <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-[#ebe5da]">
                          <Image src={product.image} alt={product.name} fill className="object-contain p-1" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-[#302b26]">{product.name}</p>
                          <p className="text-xs text-[#8a7f75] mt-0.5">{product.bagGrams}g · 數量 {item.quantity}</p>
                        </div>
                        <span className="font-mono font-semibold text-[#5B93C5]">
                          {money(product.priceNt * item.quantity)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 摘要與右側結帳卡 */}
            <div className="panel p-6 h-fit bg-white">
              <h3 className="font-semibold text-[#302b26] mb-4">訂單摘要</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-[#675e53]">
                  <span>商品小計</span>
                  <span className="font-mono">{money(subtotal)}</span>
                </div>
                <div className="flex justify-between text-[#675e53]">
                  <span>物流運費</span>
                  <span className={shipping === 0 ? "text-[#315F86] font-medium" : "font-mono"}>
                    {shipping === 0 ? "免運費 (滿額優惠)" : money(shipping)}
                  </span>
                </div>
                <div className="border-t border-[#e8ded3] pt-3 flex justify-between font-semibold text-[#302b26]">
                  <span>訂單總計</span>
                  <span className="font-mono text-[#5B93C5] font-bold text-lg">{money(total)}</span>
                </div>
              </div>

              {isFamilyMode && (
                <div className="mt-4 rounded-xl border border-[#e8ded3] bg-[#f7f2ea] p-3 text-xs text-[#675e53]">
                  <p className="font-semibold text-[#5B93C5] mb-1">主購人一鍵買單優惠</p>
                  <p>家庭商品可一起檢視總額；分帳與 LINE Pay 目前僅供流程示範。</p>
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
            className="max-w-xl panel p-6 sm:p-8 bg-white"
          >
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-[#302b26]">收件資訊</h2>
                <p className="mt-1 text-sm text-[#675e53]">請填測試資料；送出後會保存在公司後台。</p>
              </div>
              <Button variant="secondary" onClick={() => setAddress({ name: "測試收件人", phone: "0900000000", postalCode: "100", city: "台北市", district: "中正區", address: "體驗路 1 號", note: "僅供體驗" })}>填入測試資料</Button>
            </div>
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
                  <label className="field-label">郵遞區號 *</label>
                  <input type="text" inputMode="numeric" maxLength={6} value={address.postalCode} onChange={(e) => setAddress({ ...address, postalCode: e.target.value })} className="input font-mono" />
                </div>
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
                  disabled={!address.name || !/^09\d{8}$/.test(address.phone) || !/^\d{3}(\d{2,3})?$/.test(address.postalCode) || !address.city || !address.district || !address.address}
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
            <h2 className="text-xl font-semibold text-[#302b26] mb-6">選擇付款方式</h2>
            <div className="space-y-3 mb-8">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedPayment(method.id)}
                  className={`w-full panel p-5 flex items-center gap-4 text-left transition-all ${
                    selectedPayment === method.id
                      ? "border-[#5B93C5] bg-[#fbf8f4] ring-1 ring-[#5B93C5]"
                      : "bg-white hover:border-[#d9cfc3]"
                  }`}
                >
                  <div
                    className={`flex size-10 items-center justify-center rounded-xl ${
                      selectedPayment === method.id
                        ? "bg-[#5B93C5]/10 text-[#5B93C5]"
                        : "bg-[#f5ede3] text-[#675e53]"
                    }`}
                  >
                    <method.icon size={20} />
                  </div>
                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        selectedPayment === method.id ? "text-[#302b26]" : "text-[#5e544a]"
                      }`}
                    >
                      {method.label}
                    </p>
                    <p className="text-xs text-[#8a7f75] mt-0.5">{method.desc}</p>
                  </div>
                  {selectedPayment === method.id && (
                    <CheckCircle2 size={20} className="text-[#5B93C5] shrink-0" />
                  )}
                </button>
              ))}
            </div>

            <div className="mb-6 rounded-[1.5rem] border border-[#bcd5e9] bg-[#f2f8fc] p-5 text-[#253b4d]" aria-live="polite">
              {selectedPayment === "credit" && (
                <>
                  <div className="flex items-center gap-2 font-semibold"><CreditCard size={20} />信用卡確認</div>
                  <motion.div
                    initial={{ rotateY: -12, y: 16, opacity: 0 }}
                    animate={{ rotateY: 0, y: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 140, damping: 18 }}
                    className="relative mt-4 max-w-xs overflow-hidden rounded-2xl bg-[#315F86] p-5 text-white shadow-xl"
                  >
                    <motion.div className="pointer-events-none absolute inset-y-0 w-24 -skew-x-12 bg-white/15 blur-xl" initial={{ x: -160 }} animate={{ x: 430 }} transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.7 }} />
                    <p className="relative text-xs tracking-[.2em] text-white/75">PURESPOT · CARD</p>
                    <p className="mt-7 font-mono text-xl tracking-[.18em]">•••• •••• •••• 0000</p>
                    <div className="mt-5 flex items-center justify-between text-xs text-white/75"><span>PURESPOT MEMBER</span><CreditCard size={20} /></div>
                  </motion.div>
                  <p className="mt-4 text-sm">確認後會播放刷卡流程並建立訂單紀錄；此處不輸入卡號。</p>
                </>
              )}
              {selectedPayment === "linepay" && (
                <>
                  <div className="flex items-center gap-2 font-semibold"><Smartphone size={20} />LINE Pay 確認</div>
                  <motion.div initial={{ y: 20, opacity: 0, scale: .96 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 150, damping: 18 }} className="mx-auto mt-4 max-w-[220px] rounded-[2rem] border-[7px] border-[#253b4d] bg-white p-4 text-center shadow-xl">
                    <div className="mx-auto mb-4 h-1 w-14 rounded-full bg-[#253b4d]/30" />
                    <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2.2 }} className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#06c755] text-xl font-bold text-white">LINE</motion.div>
                    <p className="mt-4 text-sm font-semibold text-[#253b4d]">PURESPOT</p>
                    <p className="mt-1 font-mono text-2xl font-bold text-[#253b4d]">{money(total)}</p>
                    <div className="mt-4 rounded-xl bg-[#06c755] px-3 py-2 text-xs font-semibold text-white">確認付款</div>
                  </motion.div>
                  <p className="mt-4 text-sm">確認後會播放手機付款流程並建立訂單紀錄。</p>
                </>
              )}
              {selectedPayment === "transfer" && (
                <>
                  <div className="flex items-center gap-2 font-semibold"><Landmark size={20} />PURESPOT 轉帳資料</div>
                  <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-[6rem_1fr]">
                    <dt className="text-[#657788]">銀行代碼</dt><dd className="font-mono">000</dd>
                    <dt className="text-[#657788]">戶名</dt><dd>PURESPOT 體驗帳戶</dd>
                    <dt className="text-[#657788]">帳號</dt><dd className="font-mono">000-000-000000</dd>
                  </dl>
                  <p className="mt-4 text-sm font-semibold text-[#315F86]">此帳號不能匯款，請勿使用真實銀行 App 操作。</p>
                </>
              )}
              {selectedPayment === "cvs" && (
                <>
                  <div className="flex items-center gap-2 font-semibold"><Store size={20} />超商取貨付款</div>
                  <p className="mt-3 text-sm leading-7">選擇後可留下訂單紀錄；目前不產生門市代碼或繳費單。</p>
                </>
              )}
            </div>

            {/* 收件資訊確認 */}
            <div className="panel p-5 mb-6 bg-white">
              <h3 className="text-sm font-semibold text-[#675e53] mb-3">收件與結算確認</h3>
              <p className="text-sm font-medium text-[#302b26]">
                {address.name} · {address.phone}
              </p>
              <p className="text-sm text-[#675e53] mt-1">
                {address.city}
                {address.district} {address.address}
              </p>
              <div className="border-t border-[#e8ded3] mt-3 pt-3 flex justify-between text-sm">
                <span className="text-[#675e53]">訂單總額</span>
                <span className="font-mono font-semibold text-[#5B93C5]">{money(total)}</span>
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
                {submitting ? "正在確認訂單..." : user ? "確認建立訂單" : "登入後建立訂單"}
                {!submitting && <ChevronRight size={16} />}
              </Button>
            </div>
            {submitError && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{submitError}</p>}
            <AnimatePresence>
              {submitting && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="status" className="mt-5 flex items-center gap-4 rounded-2xl border border-[#bcd5e9] bg-white p-5 shadow-sm">
                  <motion.span animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} className="flex size-11 items-center justify-center rounded-full border-2 border-[#bcd5e9] border-t-[#315F86] text-[#315F86]">{selectedPayment === "linepay" ? <Smartphone size={17} /> : <CreditCard size={17} />}</motion.span>
                  <span><strong className="block text-sm text-[#253b4d]">{selectedPayment === "linepay" ? "正在開啟手機付款畫面" : selectedPayment === "credit" ? "正在感應卡片" : "正在建立訂單"}</strong><span className="mt-1 block text-xs text-[#657788]">請稍候，訂單即將同步到會員與後台</span></span>
                </motion.div>
              )}
            </AnimatePresence>
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
              className="mx-auto flex size-20 items-center justify-center rounded-full bg-[#e8f1f8] text-[#315F86] mb-6"
            >
              <CheckCircle2 size={40} />
            </motion.div>
            <h2 className="text-3xl font-bold text-[#302b26]">訂單已建立</h2>
            <p className="mt-3 text-[#675e53]">
              可在會員帳戶與公司後台查看這筆訂單。目前沒有實際扣款或安排出貨。
            </p>

            <div className="mt-8 panel p-5 text-left bg-white">
              <p className="text-xs text-[#8a7f75] mb-1">訂單編號</p>
              <div className="flex items-center justify-between">
                <p className="font-mono text-[#302b26] font-semibold text-sm">{orderId}</p>
                <button
                  onClick={() => void navigator.clipboard.writeText(orderId)}
                  className="flex items-center gap-1 text-xs text-[#675e53] hover:text-[#5B93C5]"
                >
                  <Copy size={12} />
                  複製
                </button>
              </div>
              <div className="border-t border-[#e8ded3] mt-4 pt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-[#8a7f75]">主購人 / 收件人</p>
                  <p className="text-[#302b26] mt-1 font-medium">{address.name}</p>
                </div>
                <div>
                  <p className="text-xs text-[#8a7f75]">結算金額</p>
                  <p className="font-mono text-[#5B93C5] font-semibold mt-1">{money(confirmedTotal ?? total)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-[#8a7f75]">配送地址</p>
                  <p className="text-[#302b26] mt-1">
                    {address.city}
                    {address.district} {address.address}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button asChild>
                <Link href="/shop">返回商城</Link>
              </Button>
              <Button variant="secondary" onClick={() => setStep("cart")}>重新體驗</Button>
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
          <div className="mx-auto size-10 animate-spin rounded-full border-2 border-[#5B93C5] border-t-transparent" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
