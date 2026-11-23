"use client";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import {
  memberPolicySchema,
  type MemberPolicy,
  type TierRule,
} from "@/lib/memberPolicy";
export function MemberPolicyEditor() {
  const [policy, setPolicy] = useState<MemberPolicy | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    void fetch("/api/admin/member-policy")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        setPolicy(d.policy);
      })
      .catch((e) => setError(e.message));
  }, []);
  function edit(i: number, key: keyof TierRule, value: string) {
    if (!policy) return;
    setPolicy({
      ...policy,
      tiers: policy.tiers.map((t, index) =>
        index === i
          ? {
              ...t,
              [key]: ["name", "support"].includes(key) ? value : Number(value),
            }
          : t,
      ),
    });
  }
  async function save() {
    const check = memberPolicySchema.safeParse(policy);
    if (!check.success) {
      setError(check.error.issues.map((i) => i.message).join("；"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/member-policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policy),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setPolicy(d.policy);
      toast.success("五等會員規則已儲存");
    } catch (e) {
      setError(e instanceof Error ? e.message : "儲存失敗");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="member-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2>五等會員與六個月續等</h2>
          <p className="mt-2 text-sm text-[#647581]">
            依序設定升等與續等門檻。已取得的等級保留至有效日期，既有點數不會重算。
          </p>
        </div>
        <button
          className="member-primary"
          onClick={() => void save()}
          disabled={busy || !policy}
        >
          <Save size={16} />
          儲存五等規則
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-rose-700">
          {error}
        </p>
      )}
      <div className="mt-6 grid gap-4">
        {policy?.tiers.map((t, i) => (
          <div
            key={t.code}
            className="rounded-2xl border border-[#d3e0e7] bg-[#f8fafb] p-4"
          >
            <h3 className="font-semibold">
              第 {i + 1} 等 · {t.name}
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {(
                [
                  ["name", "等級名稱"],
                  ["spendNt", "半年升等金額"],
                  ["retainNt", "半年續等金額"],
                  ["earnPercent", "購物回饋 %"],
                  ["discountPercent", "商品降價 %"],
                  ["couponNt", "升等續等券金額"],
                  ["couponMinNt", "票券最低商品金額"],
                  ["freeShippingNt", "免運門檻"],
                  ["maxRedeemRatio", "最高點數折抵比例 0 至 1"],
                  ["shopRate", "點數商城換購倍率 0.5 至 1"],
                  ["support", "客服權益"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="text-xs text-[#526b7c]">
                  {label}
                  <input
                    className="input"
                    aria-label={`${t.code} ${label}`}
                    type={
                      key === "name" || key === "support" ? "text" : "number"
                    }
                    step={
                      key === "maxRedeemRatio" || key === "shopRate" ? 0.01 : 1
                    }
                    value={t[key]}
                    onChange={(e) => edit(i, key, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
