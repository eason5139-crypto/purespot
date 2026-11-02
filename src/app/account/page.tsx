"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  User,
  Package,
  Repeat2,
  PawPrint,
  LogIn,
  Clock3,
  CheckCircle2,
  Cat,
  Dog,
  ExternalLink,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/useAuthStore";
import { useAutoshipStore } from "@/store/useAutoshipStore";
import { usePetContextStore } from "@/store/usePetContextStore";
import { useUiStore } from "@/store/useUiStore";
import { Button } from "@/components/ui/button";
import { money, dateLabel } from "@/lib/utils";

interface CloudOrder {
  id: string;
  status: string;
  totalNt: number;
  createdAt: string;
  items: {
    id: string;
    productName: string;
    quantity: number;
    unitPriceNt: number;
  }[];
}

export default function AccountPage() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const logout = useAuthStore((s) => s.logout);
  const setAuthOpen = useUiStore((s) => s.setAuthOpen);
  const editPet = useUiStore((s) => s.setPetEditorOpen);

  const plans = useAutoshipStore((s) => s.plans);

  const allPets = usePetContextStore((s) => s.allPets);
  const activePetId = usePetContextStore((s) => s.activePetId);
  const setActivePet = usePetContextStore((s) => s.setActivePet);

  const [cloudOrders, setCloudOrders] = useState<CloudOrder[]>([]);
  const [totalOrdersCount, setTotalOrdersCount] = useState(0);
  const [fetchingCloud, setFetchingCloud] = useState(false);
  const [cloudError, setCloudError] = useState("");

  useEffect(() => {
    void fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) {
      setCloudOrders([]);
      setTotalOrdersCount(0);
      return;
    }

    async function loadCloudOrders() {
      setFetchingCloud(true);
      setCloudError("");
      try {
        const res = await fetch("/api/orders", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { orders?: CloudOrder[]; totalOrdersCount?: number };
          if (Array.isArray(data.orders)) {
            setCloudOrders(data.orders);
            setTotalOrdersCount(data.totalOrdersCount ?? 0);
          }
        } else throw new Error("訂單無法載入");
      } catch {
        setCloudError("訂單暫時無法同步，請稍後重新整理。");
      } finally {
        setFetchingCloud(false);
      }
    }

    void loadCloudOrders();
  }, [user]);

  if (loading) {
    return (
      <main id="main-content" className="page-shell py-20 text-center">
        <div className="mx-auto size-10 animate-spin rounded-full border-2 border-[#5B93C5] border-t-transparent" />
      </main>
    );
  }

  if (!user) {
    return (
      <main id="main-content" className="page-shell py-20 text-center">
        <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-[#5B93C5]/10 text-[#5B93C5]">
          <User size={38} />
        </span>
        <h1 className="mt-6 text-3xl font-semibold text-[#302b26]">登入後，看見更多</h1>
        <p className="mx-auto mt-4 max-w-md text-[#675e53]">
          登入後可以查看雲端訂單、管理循環補貨，以及將毛孩資料永久保存。
        </p>
        <Button className="mt-8" size="lg" onClick={() => setAuthOpen(true)}>
          <LogIn />
          登入 / 建立帳戶
        </Button>
      </main>
    );
  }

  const activePlans = plans.filter((p) => p.status === "ACTIVE");

  return (
    <main id="main-content" className="page-shell py-10">
      <span className="eyebrow">帳戶總覽</span>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[#302b26]">
            {user.name ? `${user.name}的帳戶` : "我的帳戶"}
          </h1>
          <p className="mt-2 text-[#675e53]">{user.email}</p>
        </div>
        <Button
          variant="ghost"
          className="text-[#675e53] hover:text-[#5B93C5] hover:bg-[#f3ede3]"
          onClick={() => void logout()}
        >
          登出
        </Button>
      </div>

      {/* 數據摘要看板 */}
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="panel p-6 bg-white"
        >
          <Package size={24} className="text-[#5B93C5]" />
          <p className="mt-4 text-sm text-[#8a7f75]">
            已成立訂單
          </p>
          <p className="mt-1 font-mono text-4xl text-[#302b26] font-semibold">
            {fetchingCloud ? "…" : totalOrdersCount}
          </p>
          <p className="mt-3 text-xs text-[#8a7f75]">
            {cloudOrders.length > 0 ? "已與公司後台同步" : "在結帳頁建立訂單後會顯示於此"}
          </p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="panel p-6 bg-white"
        >
          <Repeat2 size={24} className="text-[#315F86]" />
          <p className="mt-4 text-sm text-[#8a7f75]">進行中的補貨計畫</p>
          <p className="mt-1 font-mono text-4xl text-[#302b26] font-semibold">{activePlans.length}</p>
          <Button asChild variant="secondary" className="mt-4 w-full">
            <Link href="/autoship">查看補貨專區</Link>
          </Button>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="panel p-6 bg-white"
        >
          <PawPrint size={24} className="text-[#8a5a14]" />
          <p className="mt-4 text-sm text-[#8a7f75]">已登錄毛孩數量</p>
          <p className="mt-1 font-mono text-4xl text-[#302b26] font-semibold">{allPets.length}</p>
          <Button asChild variant="secondary" className="mt-4 w-full">
            <Link href="/health">前往健康儀表板</Link>
          </Button>
        </motion.section>
      </div>

      {/* 我的毛孩群組 */}
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-[#302b26]">
            <PawPrint size={20} className="text-[#5B93C5]" />
            我的毛孩檔案
          </h2>
          <Button variant="ghost" size="sm" onClick={() => editPet(true)}>
            新增或編輯毛孩
          </Button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allPets.map((p) => {
            const isCurrent = p.id === activePetId;
            const PetIcon = p.type === "CAT" ? Cat : Dog;
            return (
              <div
                key={p.id}
                className={`panel p-5 transition-all bg-white ${
                  isCurrent
                    ? "border-[#5B93C5] bg-[#fdfbf9] ring-1 ring-[#5B93C5]"
                    : "hover:border-[#d9cfc3]"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-[#5B93C5]/10 text-[#5B93C5]">
                      <PetIcon size={22} />
                    </span>
                    <div>
                      <h3 className="font-semibold text-[#302b26]">{p.name}</h3>
                      <p className="text-xs text-[#8a7f75]">
                        {p.breed} · {p.weightKg} kg
                      </p>
                    </div>
                  </div>
                  {isCurrent && (
                    <span className="flex items-center gap-1 rounded-full bg-[#e8f1f8] border border-[#78a6c9]/30 px-2.5 py-0.5 text-xs text-[#315F86] font-medium">
                      <CheckCircle2 size={12} />
                      目前檢視中
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#e8ded3] pt-3">
                  <span className="text-xs text-[#8a7f75]">
                    {Math.floor(p.ageMonths / 12)} 歲 {p.ageMonths % 12} 個月
                  </span>
                  {!isCurrent ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-[#5B93C5] hover:text-[#376F9F]"
                      onClick={() => setActivePet(p.id)}
                    >
                      切換為當前毛孩
                    </Button>
                  ) : (
                    <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-[#675e53]">
                      <Link href="/health">
                        檢視健康數據
                        <ExternalLink size={12} className="ml-1" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {cloudError && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{cloudError}</p>}

      {/* 訂單列表 */}
      <section className="mt-10">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-[#302b26]">
          <Clock3 size={20} className="text-[#5B93C5]" />
          最近訂單
        </h2>

        {cloudOrders.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-[#e8ded3] bg-white shadow-sm">
            {cloudOrders.map((order, i) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8ded3] p-4 text-sm last:border-0 hover:bg-[#faf7f2] transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs font-semibold text-[#302b26]">{order.id}</p>
                    <span className="rounded bg-[#e8f1f8] border border-[#78a6c9]/30 px-2 py-0.5 text-xs text-[#315F86]">
                      {order.status === "PENDING_PAYMENT" ? "待付款" : order.status === "CANCELLED" ? "已取消" : order.status === "PROCESSING" ? "處理中" : order.status === "DISPATCHED" ? "已出貨" : order.status === "COMPLETED" ? "已完成" : "已付款"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#8a7f75]">
                    {dateLabel(order.createdAt)} ·{" "}
                    {order.items.map((it) => it.productName).join("、")}
                  </p>
                </div>
                <span className="font-mono text-base font-semibold text-[#5B93C5]">
                  {money(order.totalNt)}
                </span>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-[#e8ded3] bg-white p-8 text-center text-sm text-[#8a7f75]">
            尚未有任何訂單紀錄。
          </div>
        )}
      </section>

      <div className="mt-10 rounded-2xl border border-[#e8ded3] bg-[#f7f2ea] p-5 text-sm leading-7 text-[#675e53]">
        <p>
          帳戶與資料安全：登入憑證採用 HTTP-only Cookie 與 scrypt 雜湊儲存。
          會員訂單與已選用的毛孩資料會同步到後台。
        </p>
      </div>
    </main>
  );
}
