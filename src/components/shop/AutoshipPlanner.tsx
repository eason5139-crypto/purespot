"use client";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Pause, Play, Repeat2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import { useActivePet } from "@/store/usePetContextStore";
import { useCatalogStore } from "@/store/useCatalogStore";
import { useCartStore } from "@/store/useCartStore";
import { matchProduct } from "@/lib/matching";
import { money } from "@/lib/utils";
type Plan = {
  id: string;
  revision: number;
  frequency: string;
  status: string;
  nextBillingDate: string;
  items: Array<{
    id: string;
    quantity: number;
    variant: {
      priceNt: number;
      product: { name: string; imageUrl: string; slug: string };
    };
  }>;
};
export function AutoshipPlanner() {
  const user = useAuthStore((s) => s.user),
    pet = useActivePet(),
    products = useCatalogStore((s) => s.products),
    add = useCartStore((s) => s.addItem);
  const [days, setDays] = useState<14 | 28 | 42 | 56>(28),
    [plans, setPlans] = useState<Plan[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    const r = await fetch("/api/autoships", { cache: "no-store" }),
      d = await r.json();
    if (!r.ok) throw Error(d.error);
    setPlans(d.plans);
  }, []);
  useEffect(() => {
    if (!user) {
      setPlans([]);
      return;
    }
    void load().catch((e) => setError(e.message));
  }, [user?.id, load]);
  async function change(p: Plan, action: "delay" | "pause" | "resume") {
    setBusy(p.id);
    try {
      const r = await fetch("/api/autoships", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, revision: p.revision, action }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      await load();
      toast.success(d.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "變更失敗");
    } finally {
      setBusy("");
    }
  }
  const selected = products
    .filter(
      (p) =>
        p.isPublished !== false &&
        p.autoshipEligible &&
        p.stock > 0 &&
        matchProduct(p, pet).safe,
    )
    .slice(0, 6);
  return (
    <main id="main-content" className="page-shell py-10 text-[#18344c]">
      <section className="autoship-intro">
        <div>
          <Repeat2 size={26} />
          <h1>每一包，都照牠的步調。</h1>
          <p>
            定期配送商品享 9 折。先為{pet.name}
            選主食，確認第一筆訂單後，配送計畫會存進你的帳戶。
          </p>
          <div className="autoship-terms">
            <span>每 2／4／6／8 週</span>
            <span>隨時暫停或順延</span>
            <span>全單定期配滿 $699 免運</span>
          </div>
          <p className="!text-xs">
            會員折扣與定期配送採較優惠者；點數回饋依目前等級。配送前可在這裡調整計畫。
          </p>
        </div>
        <div className="relative min-h-72">
          <Image
            src="/images/campaigns/autoship-v3.webp"
            alt="PURESPOT 定期配送選物"
            fill
            sizes="(max-width:800px) 100vw,45vw"
            className="object-cover"
          />
        </div>
      </section>
      <section className="member-panel mt-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2>為{pet.name}安排下一包</h2>
            <p className="mt-2 text-sm text-[#647581]">
              依目前毛孩條件篩選；進入結帳前可再調整數量。
            </p>
          </div>
          <label className="text-sm">
            配送間隔
            <select
              className="input"
              aria-label="配送間隔"
              value={days}
              onChange={(e) => setDays(Number(e.target.value) as typeof days)}
            >
              {[14, 28, 42, 56].map((d) => (
                <option key={d} value={d}>
                  每 {d / 7} 週
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {selected.map((p) => (
            <article
              key={p.id}
              className="overflow-hidden rounded-2xl border border-[#d3e0e7]"
            >
              <Link
                href={`/products/${p.slug}`}
                className="relative block aspect-[1.5] bg-[#f3f1ec]"
              >
                <Image
                  src={p.image}
                  alt={p.name}
                  fill
                  sizes="350px"
                  className="object-contain p-5"
                />
              </Link>
              <div className="p-5">
                <h3 className="font-semibold">{p.name}</h3>
                <p className="mt-2 text-sm">
                  每期 {money(Math.round(p.priceNt * 0.9))}／1 件
                </p>
                <button
                  className="member-primary mt-4"
                  onClick={() => {
                    try {
                      add({
                        productId: p.id,
                        petId: pet.id,
                        quantity: 1,
                        mode: "AUTOSHIP",
                        intervalDays: days,
                      });
                      toast.success(`已加入購物籃，每 ${days / 7} 週配送`);
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "無法加入");
                    }
                  }}
                >
                  加入定期配送
                  <ArrowRight size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
        {!selected.length && (
          <p className="mt-5 text-sm">
            目前沒有適合此毛孩的定期配送商品，可切換上方的毛孩檔案。
          </p>
        )}
        <Link className="member-text-link mt-6" href="/checkout">
          確認購物籃與第一筆配送
          <ArrowRight size={16} />
        </Link>
      </section>
      <section className="member-panel">
        <h2>我的配送計畫</h2>
        {error && <p role="alert">{error}</p>}
        {!user ? (
          <p className="mt-4 text-sm text-[#647581]">
            登入後會顯示你的配送計畫。
          </p>
        ) : plans.length === 0 ? (
          <p className="mt-4 text-sm text-[#647581]">
            完成第一筆定期配送訂單後，這裡就會顯示商品、日期與調整按鈕。
          </p>
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {plans.map((p) => (
              <article
                key={p.id}
                className="rounded-2xl border border-[#d3e0e7] p-5"
              >
                <div className="flex justify-between text-xs text-[#647581]">
                  <span>
                    {p.status === "ACTIVE"
                      ? "配送中"
                      : p.status === "PAUSED"
                        ? "已暫停"
                        : "尚未啟用"}
                  </span>
                  <span>
                    {p.frequency
                      .replace("EVERY_", "每 ")
                      .replace("_WEEKS", " 週")}
                  </span>
                </div>
                {p.items.map((i) => (
                  <p key={i.id} className="mt-4 text-sm font-semibold">
                    {i.variant.product.name} × {i.quantity}
                  </p>
                ))}
                <p className="mt-5 flex items-center gap-2 text-sm">
                  <CalendarDays size={16} />
                  下次日期{" "}
                  {new Date(p.nextBillingDate).toLocaleDateString("zh-TW")}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    disabled={busy === p.id || p.status !== "ACTIVE"}
                    className="member-secondary disabled:opacity-30"
                    onClick={() => void change(p, "delay")}
                  >
                    順延 7 天
                  </button>
                  <button
                    disabled={
                      busy === p.id || !["ACTIVE", "PAUSED"].includes(p.status)
                    }
                    className="member-secondary disabled:opacity-30"
                    onClick={() =>
                      void change(p, p.status === "PAUSED" ? "resume" : "pause")
                    }
                  >
                    {p.status === "PAUSED" ? (
                      <Play size={14} />
                    ) : (
                      <Pause size={14} />
                    )}{" "}
                    {p.status === "PAUSED" ? "恢復" : "暫停"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
