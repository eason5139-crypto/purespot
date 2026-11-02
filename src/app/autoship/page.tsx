"use client";
import Image from "next/image";
import Link from "next/link";
import {
  Repeat2,
  Pause,
  Play,
  CalendarDays,
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
  const delay = useAutoshipStore((s) => s.delay);
  const toggle = useAutoshipStore((s) => s.toggle);
  const pets = usePetContextStore((s) => s.allPets);

  return (
    <main id="main-content" className="page-shell py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">讓陪伴，多一點餘裕</span>
          <h1 className="mt-3 text-3xl font-semibold text-[#302b26]">我的循環補貨</h1>
          <p className="mt-3 text-[#675e53]">照著牠的步調，安排下一份美味。</p>
        </div>
      </div>

      {plans.length ? (
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {plans.map((plan) => {
            const p = getProduct(plan.productId);
            const pet = pets.find((pet) => pet.id === plan.petId);
            if (!p) return null;
            return (
              <section key={plan.id} className="panel p-6 bg-white">
                <div className="mb-5 flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#5B93C5]">
                    給{pet?.name ?? "已移除的毛孩"}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      plan.status === "ACTIVE"
                        ? "bg-[#e8f1f8] text-[#315F86] border border-[#78a6c9]/30"
                        : "bg-[#f5ede3] text-[#8a7f75]"
                    }`}
                  >
                    {plan.status === "ACTIVE" ? "計畫已排入" : "已暫停"}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative size-20 overflow-hidden rounded-xl bg-[#ebe5da] shrink-0">
                    <Image
                      src={p.image}
                      alt="商品包裝示意"
                      fill
                      sizes="80px"
                      className="object-contain p-1"
                    />
                  </div>
                  <div>
                    <h2 className="font-medium text-[#302b26]">{p.name}</h2>
                    <p className="mt-1 text-sm text-[#8a7f75]">
                      每 {plan.intervalDays} 天 · {plan.quantity} 包
                    </p>
                    <p className="mt-2 font-mono text-base font-semibold text-[#5B93C5]">
                      {money(Math.round(p.priceNt * 0.9) * plan.quantity)}
                      <span className="ml-2 text-xs font-normal text-[#8a7f75]">
                        每期商品金額
                      </span>
                    </p>
                  </div>
                </div>
                <div className="my-5 grid grid-cols-2 gap-3 border-y border-[#e8ded3] py-4">
                  <div>
                    <p className="flex items-center gap-1.5 text-xs text-[#8a7f75]">
                      <CalendarDays size={13} />
                      預計下次配送
                    </p>
                    <p className="mt-2 text-lg font-medium text-[#302b26]">
                      {dateLabel(plan.nextDeliveryDate)}
                    </p>
                  </div>
                  <div>
                    <p className="flex items-center gap-1.5 text-xs text-[#8a7f75]">
                      <Clock3 size={13} />
                      預計提醒日期
                    </p>
                    <p className="mt-2 text-lg font-medium text-[#302b26]">
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
                    {plan.status === "ACTIVE" ? <Pause size={15} /> : <Play size={15} />}
                    {plan.status === "ACTIVE" ? "暫停計畫" : "恢復計畫"}
                  </Button>
                </div>
                <p className="mt-4 text-xs text-[#8a7f75]">
                  提醒功能尚未開放，請先自行記下預計補貨日期。
                </p>
              </section>
            );
          })}
        </div>
      ) : (
        <section className="panel mt-8 px-6 py-16 text-center bg-white">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#5B93C5]/10 text-[#5B93C5]">
            <Repeat2 size={30} />
          </span>
          <h2 className="mt-5 text-xl font-semibold text-[#302b26]">從一份剛剛好的配糧計畫開始</h2>
          <p className="mx-auto mb-6 mt-3 max-w-md text-sm leading-7 text-[#675e53]">
            挑選適合毛孩的主食，試算每日份量並加入購物車。
          </p>
          <Button asChild>
            <Link href="/shop">開始挑選主食</Link>
          </Button>
        </section>
      )}

    </main>
  );
}
