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

  const localOrders = useAutoshipStore((s) => s.orders);
  const plans = useAutoshipStore((s) => s.plans);

  const allPets = usePetContextStore((s) => s.allPets);
  const activePetId = usePetContextStore((s) => s.activePetId);
  const setActivePet = usePetContextStore((s) => s.setActivePet);

  const [cloudOrders, setCloudOrders] = useState<CloudOrder[]>([]);
  const [fetchingCloud, setFetchingCloud] = useState(false);

  useEffect(() => {
    void fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) {
      setCloudOrders([]);
      return;
    }

    async function loadCloudOrders() {
      setFetchingCloud(true);
      try {
        const res = await fetch("/api/orders", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { orders?: CloudOrder[] };
          if (Array.isArray(data.orders)) {
            setCloudOrders(data.orders);
          }
        }
      } catch {
        // 優雅降級使用本機展示資料
      } finally {
        setFetchingCloud(false);
      }
    }

    void loadCloudOrders();
  }, [user]);

  if (loading) {
    return (
      <main id="main-content" className="page-shell py-20 text-center">
        <div className="mx-auto size-10 animate-spin rounded-full border-2 border-[#935941] border-t-transparent" />
      </main>
    );
  }

  if (!user) {
    return (
      <main id="main-content" className="page-shell py-20 text-center">
        <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-[#935941]/10 text-[#935941]">
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
        <p className="mt-4 text-xs text-[#8a7f75]">
          目前展示訂單與補貨計畫已儲存於此裝置的 localStorage。
        </p>
      </main>
    );
  }

  const activePlans = plans.filter((p) => p.status === "ACTIVE");
  const totalOrdersCount = cloudOrders.length > 0 ? cloudOrders.length : localOrders.length;

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
          className="text-[#675e53] hover:text-[#935941] hover:bg-[#f3ede3]"
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
          <Package size={24} className="text-[#935941]" />
          <p className="mt-4 text-sm text-[#8a7f75]">
            {cloudOrders.length > 0 ? "雲端同步訂單" : "本裝置示範訂單"}
          </p>
          <p className="mt-1 font-mono text-4xl text-[#302b26] font-semibold">
            {fetchingCloud ? "…" : totalOrdersCount}
          </p>
          <p className="mt-3 text-xs text-[#8a7f75]">
            {cloudOrders.length > 0
              ? "已自後端資料庫同步最新紀錄"
              : "正式訂單需連線 PostgreSQL 儲存"}
          </p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="panel p-6 bg-white"
        >
          <Repeat2 size={24} className="text-[#425847]" />
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
            <PawPrint size={20} className="text-[#935941]" />
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
                    ? "border-[#935941] bg-[#fdfbf9] ring-1 ring-[#935941]"
                    : "hover:border-[#d9cfc3]"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-[#935941]/10 text-[#935941]">
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
                    <span className="flex items-center gap-1 rounded-full bg-[#eef0e8] border border-[#68856b]/30 px-2.5 py-0.5 text-xs text-[#425847] font-medium">
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
                      className="h-7 text-xs text-[#935941] hover:text-[#794632]"
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

      {/* 雲端 / 示範訂單列表 */}
      <section className="mt-10">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-[#302b26]">
          <Clock3 size={20} className="text-[#935941]" />
          {cloudOrders.length > 0 ? "最近的雲端訂單" : "最近的示範訂單"}
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
                    <span className="rounded bg-[#eef0e8] border border-[#68856b]/30 px-2 py-0.5 text-xs text-[#425847]">
                      {order.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#8a7f75]">
                    {dateLabel(order.createdAt)} ·{" "}
                    {order.items.map((it) => it.productName).join("、")}
                  </p>
                </div>
                <span className="font-mono text-base font-semibold text-[#935941]">
                  {money(order.totalNt)}
                </span>
              </motion.div>
            ))}
          </div>
        ) : localOrders.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-[#e8ded3] bg-white shadow-sm">
            {localOrders.slice(0, 10).map((order, i) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8ded3] p-4 text-sm last:border-0 hover:bg-[#faf7f2] transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs text-[#675e53]">{order.id}</p>
                    <span className="rounded bg-[#fdf6ea] border border-[#e2a84c]/30 px-1.5 py-0.5 text-[10px] text-[#8a5a14]">
                      本機示範
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#8a7f75]">
                    {dateLabel(order.createdAt)} · {order.items.length} 項商品
                  </p>
                </div>
                <span className="font-mono font-semibold text-[#935941]">
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
          正式連線 PostgreSQL 時，伺服端將提供端對端訂單同步、週期扣款授權與自動健康記錄。
        </p>
      </div>
    </main>
  );
}
