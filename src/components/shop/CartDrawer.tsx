"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Minus,
  Plus,
  Trash2,
  Repeat2,
  Truck,
  CheckCircle2,
  Users,
  UserPlus,
  Sparkles,
  Copy,
  Send,
  ArrowRight,
  Gift,
  HeartHandshake,
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
import { useUiStore } from "@/store/useUiStore";
import { useFamilyStore } from "@/store/useFamilyStore";
import { getProduct } from "@/lib/catalog";
import { cartTotals, unitPrice } from "@/lib/cart";
import { matchProduct } from "@/lib/matching";
import { money } from "@/lib/utils";
import { triggerPawBurst } from "@/lib/flyToCart";

const FREE_SAMPLES = [
  { id: "sample-catnip", label: "🌿 阿里山日曬貓薄荷體驗包", tag: "貓咪最愛" },
  { id: "sample-salmon", label: "🐟 鮮切鮭魚原肉凍乾 5g", tag: "犬貓通用" },
  { id: "sample-timothy", label: "🐰 手工提摩西磨牙小草餅", tag: "小寵必備" },
] as const;

const BLESSING_CARDS = [
  "祝主子大口乾飯、每天呼嚕嚕！",
  "謝謝你把牠照顧得這麼好 🐾",
  "台灣換季乖乖吃飯，肚肚不鬧脾氣！",
] as const;

export function CartDrawer() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.removeItem);
  const pets = usePetContextStore((s) => s.allPets);
  const activePetId = usePetContextStore((s) => s.activePetId);
  const close = useUiStore((s) => s.setCartOpen);

  // 家庭共管購物車狀態
  const cartMode = useFamilyStore((s) => s.cartMode);
  const setCartMode = useFamilyStore((s) => s.setCartMode);
  const familyMembers = useFamilyStore((s) => s.members);
  const sharedItems = useFamilyStore((s) => s.sharedItems);
  const addSharedItem = useFamilyStore((s) => s.addSharedItem);
  const removeShared = useFamilyStore((s) => s.removeSharedItem);
  const updateSharedQty = useFamilyStore((s) => s.updateQuantity);
  const inviteCode = useFamilyStore((s) => s.inviteCode);
  const groupName = useFamilyStore((s) => s.groupName);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [splitSent, setSplitSent] = useState(false);

  // 台灣人情味：店長免費招待試吃包 & 手寫祝福小卡
  const [selectedSampleId, setSelectedSampleId] = useState<string>(FREE_SAMPLES[1].id);
  const [includeCard, setIncludeCard] = useState<boolean>(true);
  const [cardMessage, setCardMessage] = useState<string>(BLESSING_CARDS[0]);

  useEffect(() => {
    try {
      const savedSample = localStorage.getItem("purespot-free-sample");
      if (savedSample) setSelectedSampleId(savedSample);
      const savedCard = localStorage.getItem("purespot-blessing-card");
      if (savedCard) setCardMessage(savedCard);
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleSelectSample = (id: string, label: string, e: React.MouseEvent<HTMLButtonElement>) => {
    setSelectedSampleId(id);
    try {
      localStorage.setItem("purespot-free-sample", id);
    } catch {
      // ignore
    }
    triggerPawBurst(e.currentTarget);
    toast.success(`店長已幫您備註隨箱附贈：${label}`);
  };

  const totals = cartTotals(items);
  const familySubtotal = sharedItems.reduce((acc, i) => acc + (getProduct(i.productId)?.priceNt ?? i.priceNt) * i.quantity, 0);
  const familyShipping = familySubtotal >= 999 ? 0 : 80;
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
    navigator.clipboard.writeText(`【PURESPOT 家庭清單】${groupName}\n邀請碼：${inviteCode}\n目前清單只保存在此裝置。`);
    setCopied(true);
    toast.success("已複製家庭清單資訊");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendLinePaySplit = () => {
    setSplitSent(true);
    toast.success("拆帳金額已整理，尚未送出請款。");
    setTimeout(() => {
      setShowSplitModal(false);
      setSplitSent(false);
    }, 2000);
  };

  const handleGoToCheckout = (mode: "personal" | "family") => {
    close(false);
    router.push(`/checkout?mode=${mode}`);
  };

  function addPersonalItemsToFamily() {
    let added = 0;
    for (const item of items) {
      const product = getProduct(item.productId);
      if (!product || sharedItems.some((shared) => shared.productId === item.productId && shared.petId === item.petId)) continue;
      addSharedItem({
        productId: item.productId,
        petId: item.petId || activePetId,
        name: product.name,
        image: product.image,
        priceNt: product.priceNt,
        quantity: item.quantity,
        addedBy: "我",
        memberAvatar: "🧑",
        note: "",
      });
      added++;
    }
    toast.info(added ? `已將 ${added} 項商品加入家庭清單` : "家庭清單已有這些商品");
  }

  const selectedSample = FREE_SAMPLES.find((s) => s.id === selectedSampleId) ?? FREE_SAMPLES[1];

  return (
    <Dialog open onOpenChange={close}>
      <DialogContent side="right">
        <DialogTitle className="flex items-center justify-between pr-8 text-xl font-semibold text-[#302b26]">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="text-[#935941]" size={22} />
            <span>毛孩菜籃</span>
          </div>

          {/* 模式切換按鈕：個人 vs 家庭共管 */}
          <div className="flex items-center rounded-xl bg-[#f5ede3] p-1 border border-[#e8ded3]">
            <button
              onClick={() => setCartMode("PERSONAL")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                cartMode === "PERSONAL"
                  ? "bg-[#935941] text-white font-semibold shadow-sm"
                  : "text-[#675e53] hover:text-[#302b26]"
              }`}
            >
              個人 ({items.reduce((n, i) => n + i.quantity, 0)})
            </button>
            <button
              onClick={() => setCartMode("FAMILY")}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                cartMode === "FAMILY"
                  ? "bg-[#935941] text-white font-semibold shadow-sm"
                  : "text-[#675e53] hover:text-[#302b26]"
              }`}
            >
              <Users size={12} />
              家庭清單 ({sharedItems.reduce((n, i) => n + i.quantity, 0)})
            </button>
          </div>
        </DialogTitle>
        <DialogDescription className="sr-only">
          查看並調整購物車內的商品、店長免費試吃包、配送方式或家庭協同購物清單。
        </DialogDescription>

        {cartMode === "FAMILY" ? (
          <>
            {/* 家庭群組資訊列與成員頭像 */}
            <div className="mt-4 rounded-xl border border-[#e8ded3] bg-[#fcfaf7] p-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#935941] tracking-wider">
                    FAMILY LIST · 家庭清單
                  </span>
                  <p className="text-sm font-semibold text-[#302b26]">{groupName}</p>
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
              <div className="mt-3 flex items-center gap-2 border-t border-[#e8ded3] pt-2.5">
                <span className="text-xs text-[#8a7f75]">共管成員：</span>
                <div className="flex items-center -space-x-1.5">
                  {familyMembers.map((m) => (
                    <div
                      key={m.id}
                      title={`${m.name} (${m.relationship})`}
                      className="flex size-7 items-center justify-center rounded-full border-2 border-white bg-[#f0e9df] text-xs shadow-sm"
                    >
                      {m.avatar}
                    </div>
                  ))}
                </div>
                <span className="text-[11px] text-[#935941] font-medium ml-1">保存在此裝置</span>
              </div>
            </div>

            {/* 免運進度條 */}
            <div className="my-3 rounded-lg border border-[#e8ded3] bg-[#f7f2ea] p-2.5 text-xs text-[#675e53] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Truck size={14} className="text-[#935941]" />
                家庭整單滿 $999 免運
              </span>
              <span className="font-mono text-[#935941] font-semibold">
                {familySubtotal >= 999 ? "已達免運門檻 🎉" : `還差 $${999 - familySubtotal} 免運`}
              </span>
            </div>

            {/* 協同清單 */}
            {sharedItems.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#8a7f75]">
                <Users size={36} className="mx-auto mb-2 opacity-40 text-[#935941]" />
                家庭協同購物車目前是空的。
                <p className="mt-1 text-xs text-[#8a7f75]">先在柑仔選物店挑商品，再加入這份清單。</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[48vh] overflow-y-auto pr-1">
                {sharedItems.map((item) => (
                  <div key={item.id} className="rounded-xl border border-[#e8ded3] bg-white p-3.5 space-y-2.5 shadow-sm">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-medium text-[#935941]">
                        <span>{item.memberAvatar}</span>
                        <span>{item.addedBy} 加購</span>
                        <span className="text-[10px] text-[#8a7f75]">· {item.addedAt}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-[#8a7f75] hover:text-rose-600"
                        onClick={() => removeShared(item.id)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>

                    {item.note && (
                      <p className="rounded-md bg-[#fdf6ea] border border-[#e2a84c]/20 px-2.5 py-1 text-xs text-[#8a5a14] italic">
                        💬 「{item.note}」
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <p className="text-sm font-medium text-[#302b26]">{getProduct(item.productId)?.name ?? item.name}</p>
                        <p className="text-xs font-mono text-[#8a7f75]">{money(getProduct(item.productId)?.priceNt ?? item.priceNt)} / 份</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center rounded-lg border border-[#d9cfc3] bg-[#fcfaf7]">
                          <button
                            className="p-1 hover:bg-[#ede5da] disabled:opacity-30"
                            disabled={item.quantity <= 1}
                            onClick={() => updateSharedQty(item.id, item.quantity - 1)}
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-7 text-center font-mono text-xs">{item.quantity}</span>
                          <button
                            className="p-1 hover:bg-[#ede5da]"
                            onClick={() => updateSharedQty(item.id, item.quantity + 1)}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <span className="font-mono text-sm font-semibold text-[#302b26]">
                          {money((getProduct(item.productId)?.priceNt ?? item.priceNt) * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {items.length > 0 && (
              <Button variant="secondary" className="mt-4 w-full" onClick={addPersonalItemsToFamily}>
                將個人購物袋加入家庭清單
              </Button>
            )}

            {/* 家庭金額結算 */}
            <div className="mt-4 border-t border-[#e8ded3] pt-3 space-y-2 text-xs text-[#675e53]">
              <div className="flex justify-between">
                <span>品項小計</span>
                <span className="font-mono">{money(familySubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>物流運費</span>
                <span className="font-mono">{familyShipping === 0 ? "免運" : money(familyShipping)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold text-[#302b26] border-t border-[#e8ded3] pt-2">
                <span>家庭總結算</span>
                <span className="font-mono text-[#935941] font-bold">{money(familyTotal)}</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                className="gap-1 text-xs"
                onClick={() => setShowSplitModal(true)}
              >
                <Sparkles size={13} className="text-[#935941]" />
                拆帳預覽
              </Button>
              <Button
                className="gap-1 text-xs"
                onClick={() => handleGoToCheckout("family")}
              >
                家庭清單結帳
                <ArrowRight size={13} />
              </Button>
            </div>
          </>
        ) : items.length === 0 ? (
          <div className="py-20 text-center text-sm text-[#8a7f75]">
            <ShoppingBag size={42} className="mx-auto mb-3 opacity-30 text-[#935941]" />
            目前菜籃內還沒有商品喔！
            <p className="mt-1 text-xs text-[#8a7f75]">去柑仔選物店搖一盒毛孩便當，或挑選適合的口糧吧。</p>
            <div className="mt-4">
              <Button variant="secondary" size="sm" onClick={() => close(false)}>
                前往選物店逛逛
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* 免運提示 */}
            <div className="my-3 rounded-lg border border-[#e8ded3] bg-[#f7f2ea] p-2.5 text-xs text-[#675e53] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Truck size={14} className="text-[#935941]" />
                全循環商品滿 $699；單次或混合滿 $999 免運
              </span>
              <span className="font-mono text-[#935941] font-semibold">
                {totals.subtotalNt >= 699 ? "已達免運門檻 🎉" : `差 $${699 - totals.subtotalNt}`}
              </span>
            </div>

            {/* 個人商品列表與台灣人情味款待區 */}
            <div className="space-y-4 max-h-[48vh] overflow-y-auto pr-1">
              {items.map((item) => {
                const p = getProduct(item.productId);
                const pet = pets.find((pet) => pet.id === item.petId);
                if (!p) return null;
                const fit = pet ? matchProduct(p, pet) : null;
                return (
                  <div key={item.key} className="border-b border-[#e8ded3] pb-4">
                    <div className="flex gap-3">
                      <div className="relative size-16 overflow-hidden rounded-xl bg-[#ebe5da] shrink-0">
                        <Image
                          src={p.image}
                          alt={p.name}
                          fill
                          sizes="64px"
                          className="object-contain p-1"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-[#935941]">
                          給 {pet?.name ?? "毛孩"} 的點心與口糧
                        </p>
                        <p className="mt-0.5 text-sm font-medium text-[#302b26] truncate">{p.name}</p>
                        <p className="text-xs text-[#8a7f75]">
                          {p.kind === "SUPPLIES" ? "單件" : `${p.bagGrams / 1000}kg`} · {money(unitPrice(p, item.mode))}
                        </p>
                        {item.mode === "AUTOSHIP" && (
                          <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-[#4e6752] font-semibold">
                            <Repeat2 size={11} />每 {item.intervalDays} 天配送 · 9 折優惠
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-[#8a7f75] hover:text-rose-600"
                        onClick={() => remove(item.key)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between">
                      <div className="flex items-center rounded-lg border border-[#d9cfc3] bg-[#fcfaf7]">
                        <button
                          className="p-1 hover:bg-[#ede5da] disabled:opacity-30"
                          disabled={item.quantity <= 1}
                          onClick={() => change(item.key, item.quantity - 1)}
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-7 text-center font-mono text-xs">{item.quantity}</span>
                        <button
                          className="p-1 hover:bg-[#ede5da]"
                          onClick={() => change(item.key, item.quantity + 1)}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <strong className="font-mono text-sm text-[#302b26]">
                        {money(unitPrice(p, item.mode) * item.quantity)}
                      </strong>
                    </div>
                    {!fit?.safe && (
                      <p role="alert" className="mt-2 text-xs text-[#8a5a14] bg-[#fdf6ea] border border-[#e2a84c]/20 rounded-md p-1.5">
                        {fit?.label ?? "毛孩資料不符"}，請確認後再結帳。
                      </p>
                    )}
                  </div>
                );
              })}

              {/* 台灣人情味：店長免費招待試吃包 3 選 1 */}
              <div className="rounded-2xl border-2 border-dashed border-[#c9964c]/60 bg-[#fdf8ef] p-3.5">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-[#935941]">
                    <Gift size={14} className="text-[#c9964c]" />
                    店長偷偷塞進箱子的小心意（免費 3 選 1）
                  </p>
                  <span className="rounded-full bg-[#4e6752]/12 px-2 py-0.5 text-[10px] font-bold text-[#4e6752]">
                    免費招待 $0
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-[#756759]">
                  台灣買菜都要送把蔥！挑一包想讓主子嚐鮮的小點心：
                </p>
                <div className="mt-2.5 grid gap-1.5">
                  {FREE_SAMPLES.map((sample) => {
                    const active = selectedSampleId === sample.id;
                    return (
                      <button
                        key={sample.id}
                        type="button"
                        onClick={(e) => handleSelectSample(sample.id, sample.label, e)}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition-all ${
                          active
                            ? "border-[#935941] bg-[#935941]/10 font-bold text-[#302b26] shadow-xs"
                            : "border-[#e4d9ca] bg-white text-[#675e53] hover:border-[#935941]/50"
                        }`}
                      >
                        <span className="truncate">{sample.label}</span>
                        <span className="ml-2 shrink-0 rounded-full bg-[#f4ebe0] px-2 py-0.5 text-[10px] font-semibold text-[#84624c]">
                          {active ? "✓ 已放進箱子" : sample.tag}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 附上手寫溫度祝福小卡 */}
              <div className="rounded-2xl border border-[#e4d9ca] bg-[#faf5ed] p-3.5">
                <label className="flex cursor-pointer items-center justify-between text-xs font-bold text-[#302b26]">
                  <span className="flex items-center gap-1.5">
                    <HeartHandshake size={14} className="text-[#935941]" />
                    隨箱附上手寫溫度祝福小卡（免費）
                  </span>
                  <input
                    type="checkbox"
                    checked={includeCard}
                    onChange={(e) => setIncludeCard(e.target.checked)}
                    className="size-4 accent-[#935941]"
                  />
                </label>
                {includeCard && (
                  <div className="mt-2.5 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {BLESSING_CARDS.map((msg) => (
                        <button
                          key={msg}
                          type="button"
                          onClick={() => {
                            setCardMessage(msg);
                            try {
                              localStorage.setItem("purespot-blessing-card", msg);
                            } catch {
                              // ignore
                            }
                          }}
                          className={`rounded-full px-2.5 py-1 text-[11px] transition-all ${
                            cardMessage === msg
                              ? "bg-[#935941] font-semibold text-white"
                              : "bg-white border border-[#dfd3c3] text-[#675e53] hover:border-[#935941]"
                          }`}
                        >
                          {msg}
                        </button>
                      ))}
                    </div>
                    <p className="rounded-lg bg-white/80 px-2.5 py-1.5 text-[11px] text-[#756759] italic">
                      💌 小卡預覽：「{cardMessage}」
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 個人金額統計 */}
            <div className="mt-4 border-t border-[#e8ded3] pt-3 space-y-2 text-xs text-[#675e53]">
              <div className="flex justify-between">
                <span>小計</span>
                <span className="font-mono">{money(totals.subtotalNt)}</span>
              </div>
              <div className="flex justify-between text-[#4e6752] font-medium">
                <span className="truncate max-w-[210px]">店長招待：{selectedSample.label}</span>
                <span className="font-mono">免費 $0</span>
              </div>
              <div className="flex justify-between">
                <span>運費</span>
                <span className="font-mono">{totals.shippingNt ? money(totals.shippingNt) : "免運"}</span>
              </div>
              {totals.savingsNt > 0 && (
                <div className="flex justify-between text-[#4e6752] font-medium">
                  <span>循環補貨已省</span>
                  <span className="font-mono">{money(totals.savingsNt)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold text-[#302b26] border-t border-[#e8ded3] pt-2">
                <span>本次結帳總計</span>
                <span className="font-mono text-[#935941] font-bold">{money(totals.totalNt)}</span>
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
                帶著店長招待前往結帳
                <ArrowRight size={15} />
              </Button>
            </div>
          </>
        )}

        {/* 邀請家庭成員彈窗 */}
        <AnimatePresence>
          {showInviteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm rounded-2xl border border-[#e8ded3] bg-[#faf7f2] p-6 shadow-2xl text-center"
              >
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#935941]/10 text-[#935941]">
                  <UserPlus size={24} />
                </div>
                <h3 className="mt-3 text-lg font-bold text-[#302b26]">邀請毛孩共管成員</h3>
                <p className="mt-1 text-xs text-[#675e53]">
                  將伴侶、家人或同住室友加入，共同照顧毛孩並同步購物清單。
                </p>

                <div className="mt-5 rounded-xl border border-[#e8ded3] bg-white p-3">
                  <span className="text-[10px] text-[#8a7f75]">專屬共管邀請碼</span>
                  <p className="mt-1 font-mono text-xl font-bold tracking-widest text-[#935941]">
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

        {/* 智慧拆帳分攤彈窗 */}
        <AnimatePresence>
          {showSplitModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md rounded-2xl border border-[#e8ded3] bg-[#faf7f2] p-6 shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-[#e8ded3] pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-[#935941]" size={18} />
                    <h3 className="text-base font-bold text-[#302b26]">智慧拆帳分攤 (LINE Pay)</h3>
                  </div>
                  <button
                    onClick={() => setShowSplitModal(false)}
                    className="text-[#8a7f75] hover:text-[#302b26] text-sm"
                  >
                    ✕
                  </button>
                </div>

                <p className="mt-3 text-xs text-[#675e53] leading-relaxed">
                  系統已自動按各成員加購之品項精確分攤，一鍵發送 LINE Pay 分帳請求至家庭群組。
                </p>

                <div className="mt-4 space-y-3">
                  {familyMembers.map((m) => {
                    const memberItems = sharedItems.filter((i) => i.addedBy === m.name);
                    const memberSum = memberItems.reduce((acc, i) => acc + i.priceNt * i.quantity, 0);
                    return (
                      <div key={m.id} className="rounded-xl border border-[#e8ded3] bg-white p-3 text-xs shadow-sm">
                        <div className="flex items-center justify-between font-medium">
                          <span className="flex items-center gap-1.5 text-[#302b26]">
                            <span>{m.avatar}</span>
                            <span>{m.name}</span>
                            <span className="text-[10px] text-[#8a7f75]">({m.relationship})</span>
                          </span>
                          <span className="font-mono text-[#935941] font-semibold">
                            {money(memberSum)}
                          </span>
                        </div>
                        <div className="mt-1 text-[#675e53] text-[11px] pl-6 space-y-0.5">
                          {memberItems.map((item) => (
                            <div key={item.id} className="flex justify-between">
                              <span className="truncate max-w-[200px]">{item.name} × {item.quantity}</span>
                              <span className="font-mono text-[#8a7f75]">{money(item.priceNt * item.quantity)}</span>
                            </div>
                          ))}
                          {memberItems.length === 0 && (
                            <span className="text-[#8a7f75]">本次無加購品項</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-[#e8ded3] pt-3 text-xs">
                  <span className="text-[#675e53]">總計（含免運折抵）：</span>
                  <span className="font-mono text-base font-bold text-[#935941]">{money(familyTotal)}</span>
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
                    className="flex-1 gap-1.5 text-xs bg-[#00C300] hover:bg-[#00B000] text-white font-semibold"
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
