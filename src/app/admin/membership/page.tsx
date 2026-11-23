"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Award, Gift, KeyRound, Save } from "lucide-react";
import { MemberPolicyEditor } from "@/components/admin/MemberPolicyEditor";
import { AdminArcadeEditor } from "@/components/admin/AdminArcadeEditor";
import {
  DEFAULT_ARCADE_CONFIG,
  type PointsArcadeConfig,
} from "@/lib/pointsArcadeConfig";

type Config = { silverSpendNt: number; goldSpendNt: number; pointsPerHundred: number };
type Reward = { id: string; title: string; pointsCost: number; discountNt: number; isActive: boolean };
type Mission = { id: string; title: string; badgeTitle: string; points: number; isActive: boolean };
type Recovery = { id: string; name: string | null; email: string; code: string; expiresAt: string };
const blankReward: Reward = { id: "", title: "", pointsCost: 50, discountNt: 50, isActive: true };

export default function AdminMembershipPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [arcadeConfig, setArcadeConfig] = useState<PointsArcadeConfig>(DEFAULT_ARCADE_CONFIG);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [editing, setEditing] = useState<Reward>(blankReward);
  const [recoveries, setRecoveries] = useState<Recovery[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const [membership, recovery] = await Promise.all([
        fetch("/api/admin/membership", { cache: "no-store" }),
        fetch("/api/admin/recovery", { cache: "no-store" }),
      ]);
      if (!membership.ok || !recovery.ok) throw new Error("資料載入失敗");
      const m = (await membership.json()) as {
        config: Config;
        rewards: Reward[];
        missions: Mission[];
        arcadeConfig?: PointsArcadeConfig;
      };
      const r = (await recovery.json()) as { requests: Recovery[] };
      setConfig(m.config);
      if (m.arcadeConfig) setArcadeConfig(m.arcadeConfig);
      setRewards(m.rewards);
      setMissions(m.missions);
      setRecoveries(r.requests);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "資料載入失敗");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(body: Record<string, unknown>, message = "會員規則已儲存") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "儲存失敗");
      await load();
      toast.success(message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "儲存失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[#302b26]">會員規則與優惠</h1>
      </header>

      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </p>
      )}

      {/* 簽到、分類轉盤、福引搖獎機、刮刮樂與任務獎池管理 */}
      <AdminArcadeEditor
        value={arcadeConfig}
        onChange={setArcadeConfig}
        busy={busy}
        onSave={() =>
          void save(
            { action: "arcade", arcadeConfig },
            "遊戲獎池與任務設定已更新，前台即時生效",
          )
        }
      />

      <MemberPolicyEditor />

      <section className="rounded-2xl border border-[#e5d8c8] bg-white p-6">
        <h2 className="text-base font-bold text-[#302b26]">成就徽章規則</h2>
        <div className="mt-4 space-y-3">
          {missions.map((mission, index) => (
            <div
              key={mission.id}
              className="grid gap-3 rounded-xl bg-[#faf6f0] p-4 sm:grid-cols-[1.5fr_1fr_100px_auto]"
            >
              <label className="text-xs text-[#6e6257]">
                任務名稱
                <input
                  className="input mt-1"
                  maxLength={80}
                  value={mission.title}
                  onChange={(e) =>
                    setMissions(
                      missions.map((item, i) =>
                        i === index ? { ...item, title: e.target.value } : item,
                      ),
                    )
                  }
                />
              </label>
              <label className="text-xs text-[#6e6257]">
                徽章名稱
                <input
                  className="input mt-1"
                  maxLength={40}
                  value={mission.badgeTitle}
                  onChange={(e) =>
                    setMissions(
                      missions.map((item, i) =>
                        i === index
                          ? { ...item, badgeTitle: e.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </label>
              <label className="text-xs text-[#6e6257]">
                點數
                <input
                  className="input mt-1"
                  type="number"
                  min={0}
                  max={1000}
                  value={mission.points}
                  onChange={(e) =>
                    setMissions(
                      missions.map((item, i) =>
                        i === index
                          ? { ...item, points: Number(e.target.value) }
                          : item,
                      ),
                    )
                  }
                />
              </label>
              <div className="flex items-end gap-3">
                <label className="flex items-center gap-1 pb-3 text-xs">
                  <input
                    type="checkbox"
                    checked={mission.isActive}
                    onChange={(e) =>
                      setMissions(
                        missions.map((item, i) =>
                          i === index
                            ? { ...item, isActive: e.target.checked }
                            : item,
                        ),
                      )
                    }
                  />
                  啟用
                </label>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void save({ action: "mission", ...mission })}
                  className="min-h-10 rounded-xl bg-[#935941] px-3 text-xs font-semibold text-white hover:bg-[#7a4733] disabled:opacity-40"
                >
                  儲存
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#e5d8c8] bg-white p-6">
        <h2 className="flex items-center gap-2 text-base font-bold text-[#302b26]">
          <Gift size={18} className="text-[#935941]" />
          兌換優惠
        </h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {rewards.map((reward) => (
            <button
              type="button"
              key={reward.id}
              onClick={() => setEditing(reward)}
              className="rounded-xl border border-[#e5d8c8] p-4 text-left text-sm hover:border-[#935941]"
            >
              <strong>{reward.title}</strong>
              <span className="mt-1 block text-xs text-[#6e6257]">
                {reward.pointsCost} 點 · 折抵 NT${reward.discountNt} ·{" "}
                {reward.isActive ? "開放兌換" : "已停用"}
              </span>
            </button>
          ))}
        </div>
        <h3 className="mt-6 text-sm font-bold text-[#302b26]">
          {editing.id ? "編輯優惠" : "新增優惠"}
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-[#6e6257]">
            名稱
            <input
              className="input mt-1"
              maxLength={60}
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            />
          </label>
          <label className="text-xs text-[#6e6257]">
            需要點數
            <input
              className="input mt-1"
              type="number"
              min={1}
              value={editing.pointsCost}
              onChange={(e) =>
                setEditing({ ...editing, pointsCost: Number(e.target.value) })
              }
            />
          </label>
          <label className="text-xs text-[#6e6257]">
            折抵金額 NT$
            <input
              className="input mt-1"
              type="number"
              min={1}
              value={editing.discountNt}
              onChange={(e) =>
                setEditing({ ...editing, discountNt: Number(e.target.value) })
              }
            />
          </label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={editing.isActive}
            onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
          />
          開放兌換
        </label>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={busy || editing.title.trim().length < 2}
            onClick={() => {
              const { id, ...rest } = editing;
              void save({ action: "reward", ...(id ? { id } : {}), ...rest });
              setEditing(blankReward);
            }}
            className="min-h-10 rounded-xl bg-[#935941] px-5 text-sm font-semibold text-white hover:bg-[#7a4733] disabled:opacity-40"
          >
            儲存優惠
          </button>
          <button
            type="button"
            onClick={() => setEditing(blankReward)}
            className="rounded-xl border border-[#dfd0be] px-4 text-sm"
          >
            清空
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-[#e5d8c8] bg-white p-6">
        <h2 className="flex items-center gap-2 text-base font-bold text-[#302b26]">
          <KeyRound size={18} className="text-[#935941]" />
          密碼重設申請
        </h2>
        {recoveries.length ? (
          <div className="mt-4 space-y-2">
            {recoveries.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#faf6f0] p-3 text-sm"
              >
                <span>
                  {item.name || "會員"} · {item.email}
                  <small className="ml-2 text-[#6e6257]">
                    到期 {new Date(item.expiresAt).toLocaleTimeString("zh-TW")}
                  </small>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(item.code);
                    toast.success("確認碼已複製");
                  }}
                  className="rounded-lg bg-[#935941] px-3 py-2 font-mono font-semibold text-white"
                >
                  {item.code} · 複製
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[#6e6257]">目前無待處理申請</p>
        )}
      </section>
    </div>
  );
}
