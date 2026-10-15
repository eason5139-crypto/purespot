"use client";
import Image from "next/image";
import Link from "next/link";
import {
  Repeat2,
  Pause,
  Play,
  CalendarDays,
  Package,
  Clock3,
} from "lucide-react";
import { toast } from "sonner";
import { useAutoshipStore } from "@/store/useAutoshipStore";
import { usePetContextStore } from "@/store/usePetContextStore";
import { getProduct } from "@/lib/catalog";
import { dateLabel, money, addDays } from "@/lib/utils";
import { Button } from "@/components/ui/button";
export default function AutoshipPage() {
  const plans = useAutoshipStore((s) => s.plans);
  const orders = useAutoshipStore((s) => s.orders);
  const delay = useAutoshipStore((s) => s.delay);
  const toggle = useAutoshipStore((s) => s.toggle);
  const pets = usePetContextStore((s) => s.allPets);
  return (
    <main id="main-content" className="page-shell py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">讓陪伴，多一點餘裕</span>
          <h1 className="mt-3 text-3xl font-semibold">我的循環補貨</h1>
          <p className="mt-3 text-slate-400">照著牠的步調，安排下一份美味。</p>
        </div>
        <span className="rounded-full border border-cyan-400/20 px-3 py-1.5 text-xs text-cyan-300">
          示範計畫 · 不會扣款或出貨
        </span>
      </div>
      {plans.length ? (
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {plans.map((plan) => {
            const p = getProduct(plan.productId);
            const pet = pets.find((p) => p.id === plan.petId);
            if (!p) return null;
            return (
              <section key={plan.id} className="panel p-6">
                <div className="mb-5 flex items-center justify-between">
                  <span className="text-sm text-cyan-300">
                    給{pet?.name ?? "已移除的毛孩"}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${plan.status === "ACTIVE" ? "bg-emerald-400/10 text-emerald-300" : "bg-slate-400/10 text-slate-400"}`}
                  >
                    {plan.status === "ACTIVE" ? "計畫已排入" : "已暫停"}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <Image
                    src={p.image}
                    alt="商品包裝示意"
                    width={88}
                    height={88}
                    className="rounded-xl"
                  />
                  <div>
                    <h2 className="font-medium">{p.name}</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      每 {plan.intervalDays} 天 · {plan.quantity} 包
                    </p>
                    <p className="mt-2 font-mono text-cyan-200">
                      {money(Math.round(p.priceNt * 0.9) * plan.quantity)}
                      <span className="ml-2 text-xs text-slate-500">
                        每期商品金額
                      </span>
                    </p>
                  </div>
                </div>
                <div className="my-5 grid grid-cols-2 gap-3 border-y border-white/10 py-4">
                  <div>
                    <p className="flex items-center gap-1.5 text-xs text-slate-500">
                      <CalendarDays size={13} />
                      預計下次配送
                    </p>
                    <p className="mt-2 text-lg">
                      {dateLabel(plan.nextDeliveryDate)}
                    </p>
                  </div>
                  <div>
                    <p className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock3 size={13} />
                      預計提醒日期
                    </p>
                    <p className="mt-2 text-lg">
                      {dateLabel(addDays(plan.nextDeliveryDate, -3))}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="secondary"
                    disabled={plan.status !== "ACTIVE"}
                    onClick={() => {
                      delay(plan.id);
                      toast.success("這次配送已順延 7 天");
                    }}
                  >
                    順延 7 天
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      toggle(plan.id);
                      toast.success(
                        plan.status === "ACTIVE"
                          ? "循環補貨已暫停"
                          : "循環補貨已恢復",
                      );
                    }}
                  >
                    {plan.status === "ACTIVE" ? <Pause /> : <Play />}
                    {plan.status === "ACTIVE" ? "暫停計畫" : "恢復計畫"}
                  </Button>
                </div>
                <p className="mt-4 text-xs text-slate-500">
                  提醒日期僅供展示，尚未串接 LINE／簡訊通知。
                </p>
              </section>
            );
          })}
        </div>
      ) : (
        <section className="panel mt-8 px-6 py-16 text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300">
            <Repeat2 size={30} />
          </span>
          <h2 className="mt-5 text-xl">從一份剛剛好的配糧計畫開始</h2>
          <p className="mx-auto mb-6 mt-3 max-w-md text-sm leading-7 text-slate-400">
            挑選適合毛孩的主食，試算每日份量並加入循環補貨。建立示範訂單後，計畫就會出現在這裡。
          </p>
          <Button asChild>
            <Link href="/">開始挑選主食</Link>
          </Button>
        </section>
      )}
      {orders.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 flex items-center gap-2 text-xl">
            <Package size={20} />
            最近的示範訂單
          </h2>
          <div className="overflow-hidden rounded-xl border border-white/10">
            {orders.slice(0, 5).map((order) => (
              <div
                key={order.id}
                className="flex flex-wrap justify-between gap-3 border-b border-white/5 bg-[#111827] p-4 text-sm"
              >
                <div>
                  <p className="font-mono">{order.id}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {dateLabel(order.createdAt)} · 僅限本裝置
                  </p>
                </div>
                <span className="text-slate-300">
                  {order.items.reduce((n, i) => n + i.quantity, 0)} 件 ·{" "}
                  {money(order.totalNt)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
