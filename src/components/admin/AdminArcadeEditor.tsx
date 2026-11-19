"use client";

import { useState } from "react";
import {
  Dices,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import {
  DEFAULT_ARCADE_CONFIG,
  WHEEL_KEYS,
  calcExpectedValue,
  type PointsArcadeConfig,
  type PrizeKind,
  type WheelKey,
} from "@/lib/pointsArcadeConfig";

const WHEEL_NAMES: Record<WheelKey, string> = {
  CAT: "貓咪轉盤",
  DOG: "狗狗轉盤",
  SMALL_PET: "小寵轉盤",
};

const PALETTE = [
  "#935941",
  "#b8823c",
  "#4e6752",
  "#c9964f",
  "#758879",
  "#a77259",
  "#c4a889",
  "#8c7f73",
];

export function AdminArcadeEditor({
  value,
  onChange,
  onSave,
  busy,
}: {
  value: PointsArcadeConfig;
  onChange: (next: PointsArcadeConfig) => void;
  onSave: () => void;
  busy: boolean;
}) {
  const [section, setSection] = useState<
    "wheel" | "fukubiki" | "scratch" | "tasks"
  >("wheel");
  const [wheelKey, setWheelKey] = useState<WheelKey>("CAT");

  const currentWheel = value.wheels[wheelKey];
  const wheelTotalWeight = currentWheel.prizes.reduce(
    (s, p) => s + Math.max(1, p.weight),
    0,
  );
  const wheelEV = calcExpectedValue(currentWheel.prizes);

  const fukubikiTotalWeight = value.fukubiki.prizes.reduce(
    (s, p) => s + Math.max(1, p.weight),
    0,
  );
  const fukubikiEV = calcExpectedValue(value.fukubiki.prizes);

  const scratchTotalWeight = value.scratch.prizes.reduce(
    (s, p) => s + Math.max(1, p.weight),
    0,
  );
  const scratchEV = calcExpectedValue(value.scratch.prizes);

  function updateWheel(updater: (w: PointsArcadeConfig["wheels"][WheelKey]) => PointsArcadeConfig["wheels"][WheelKey]) {
    onChange({
      ...value,
      wheels: {
        ...value.wheels,
        [wheelKey]: updater(value.wheels[wheelKey]),
      },
    });
  }

  return (
    <section className="rounded-2xl border border-[#e5d8c8] bg-white p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-[#302b26]">
          <Dices size={18} className="text-[#935941]" />
          簽到、轉盤與遊戲獎池管理
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onChange(DEFAULT_ARCADE_CONFIG)}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[#dfd0be] bg-[#faf6f0] px-3 text-xs font-semibold text-[#675b4f] hover:border-[#935941] hover:text-[#935941]"
          >
            <RotateCcw size={13} />
            還原預設
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onSave}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-[#935941] px-4 text-xs font-bold text-white hover:bg-[#7d4934] disabled:opacity-45"
          >
            <Save size={14} />
            儲存獎池與任務設定
          </button>
        </div>
      </div>

      {/* 每日簽到點數設定 */}
      <div className="grid gap-4 rounded-xl border border-[#ece1d4] bg-[#faf6f0] p-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-[#6e6257]">
          每日登入簽到點數
          <input
            type="number"
            min={1}
            max={100}
            value={value.checkIn.dailyPoints}
            onChange={(e) =>
              onChange({
                ...value,
                checkIn: {
                  ...value.checkIn,
                  dailyPoints: Math.max(1, Number(e.target.value) || 1),
                },
              })
            }
            className="input mt-1.5 bg-white font-mono"
          />
        </label>
        <label className="text-xs font-semibold text-[#6e6257]">
          連續簽到第 7 天加碼點數
          <input
            type="number"
            min={0}
            max={300}
            value={value.checkIn.streak7Bonus}
            onChange={(e) =>
              onChange({
                ...value,
                checkIn: {
                  ...value.checkIn,
                  streak7Bonus: Math.max(0, Number(e.target.value) || 0),
                },
              })
            }
            className="input mt-1.5 bg-white font-mono"
          />
        </label>
      </div>

      {/* 子模組切換 */}
      <div className="flex flex-wrap gap-1.5 border-b border-[#f0e6da] pb-3">
        {(
          [
            ["wheel", "寵物分類轉盤"],
            ["fukubiki", "福引搖獎機"],
            ["scratch", "每日刮刮樂"],
            ["tasks", "雙軌任務點數"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
              section === id
                ? "bg-[#302b26] text-white"
                : "bg-[#faf6f0] text-[#675b4f] hover:text-[#302b26]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ─── 1. 寵物分類轉盤管理 ─── */}
      {section === "wheel" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {WHEEL_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setWheelKey(key)}
                  className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold ${
                    wheelKey === key
                      ? "border-[#935941] bg-[#fdf3ec] text-[#935941]"
                      : "border-[#e5d8c8] bg-white text-[#675b4f]"
                  }`}
                >
                  {WHEEL_NAMES[key]}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label className="flex items-center gap-2 font-semibold text-[#5e5246]">
                每次花費點數
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={currentWheel.costPoints}
                  onChange={(e) =>
                    updateWheel((w) => ({
                      ...w,
                      costPoints: Math.max(1, Number(e.target.value) || 1),
                    }))
                  }
                  className="input !mt-0 w-24 font-mono"
                />
              </label>
              <span className="rounded-lg bg-[#faf6f0] px-3 py-1.5 font-mono text-[11px] font-bold text-[#6e6257]">
                面額期望值：{wheelEV}（投入 {currentWheel.costPoints} 點）
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#faf6f0] text-[11px] font-bold text-[#75675a]">
                <tr className="border-b border-[#ece1d4]">
                  <th className="px-3 py-2.5">獎品名稱</th>
                  <th className="px-3 py-2.5">盤面簡稱</th>
                  <th className="px-3 py-2.5">類型</th>
                  <th className="px-3 py-2.5">面額 / 點數</th>
                  <th className="px-3 py-2.5">權重</th>
                  <th className="px-3 py-2.5">機率</th>
                  <th className="px-3 py-2.5">色票</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2e9de]">
                {currentWheel.prizes.map((p, idx) => {
                  const pct = (p.weight / Math.max(1, wheelTotalWeight)) * 100;
                  return (
                    <tr key={p.id}>
                      <td className="px-2 py-2">
                        <input
                          value={p.label}
                          maxLength={36}
                          onChange={(e) =>
                            updateWheel((w) => ({
                              ...w,
                              prizes: w.prizes.map((item, i) =>
                                i === idx
                                  ? { ...item, label: e.target.value }
                                  : item,
                              ),
                            }))
                          }
                          className="input !mt-0 min-w-[170px]"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          value={p.shortLabel}
                          maxLength={12}
                          onChange={(e) =>
                            updateWheel((w) => ({
                              ...w,
                              prizes: w.prizes.map((item, i) =>
                                i === idx
                                  ? { ...item, shortLabel: e.target.value }
                                  : item,
                              ),
                            }))
                          }
                          className="input !mt-0 w-24"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <select
                          value={p.kind}
                          onChange={(e) =>
                            updateWheel((w) => ({
                              ...w,
                              prizes: w.prizes.map((item, i) =>
                                i === idx
                                  ? { ...item, kind: e.target.value as PrizeKind }
                                  : item,
                              ),
                            }))
                          }
                          className="input !mt-0 w-32"
                        >
                          <option value="PRODUCT_VOUCHER">實體兌換券</option>
                          <option value="CASH_VOUCHER">現金折價券</option>
                          <option value="POINTS">點數回饋</option>
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={1}
                          max={10000}
                          value={p.value}
                          onChange={(e) =>
                            updateWheel((w) => ({
                              ...w,
                              prizes: w.prizes.map((item, i) =>
                                i === idx
                                  ? {
                                      ...item,
                                      value: Math.max(
                                        1,
                                        Number(e.target.value) || 1,
                                      ),
                                    }
                                  : item,
                              ),
                            }))
                          }
                          className="input !mt-0 w-20 font-mono"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={1}
                          max={1000}
                          value={p.weight}
                          onChange={(e) =>
                            updateWheel((w) => ({
                              ...w,
                              prizes: w.prizes.map((item, i) =>
                                i === idx
                                  ? {
                                      ...item,
                                      weight: Math.max(
                                        1,
                                        Number(e.target.value) || 1,
                                      ),
                                    }
                                  : item,
                              ),
                            }))
                          }
                          className="input !mt-0 w-16 font-mono"
                        />
                      </td>
                      <td className="px-2 py-2 font-mono font-bold text-[#6e6257]">
                        {pct.toFixed(1)}%
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="color"
                          value={p.color}
                          onChange={(e) =>
                            updateWheel((w) => ({
                              ...w,
                              prizes: w.prizes.map((item, i) =>
                                i === idx
                                  ? { ...item, color: e.target.value }
                                  : item,
                              ),
                            }))
                          }
                          className="h-8 w-10 cursor-pointer rounded border border-[#dfd0be] bg-white p-0.5"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          disabled={currentWheel.prizes.length <= 4}
                          onClick={() =>
                            updateWheel((w) => ({
                              ...w,
                              prizes: w.prizes.filter((_, i) => i !== idx),
                            }))
                          }
                          className="rounded-lg p-1.5 text-[#8a7c6e] hover:bg-rose-50 hover:text-rose-700 disabled:opacity-30"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {currentWheel.prizes.length < 10 && (
            <button
              type="button"
              onClick={() =>
                updateWheel((w) => ({
                  ...w,
                  prizes: [
                    ...w.prizes,
                    {
                      id: `${wheelKey.toLowerCase()}-${Date.now()}`,
                      label: "新獎項",
                      shortLabel: "新獎項",
                      kind: "POINTS",
                      value: 20,
                      weight: 10,
                      color: PALETTE[w.prizes.length % PALETTE.length]!,
                    },
                  ],
                }))
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[#c9b7a3] px-3.5 py-2 text-xs font-bold text-[#675b4f] hover:border-[#935941] hover:text-[#935941]"
            >
              <Plus size={14} />
              新增轉盤獎項（最多 10 格）
            </button>
          )}
        </div>
      )}

      {/* ─── 2. 福引搖獎機管理 ─── */}
      {section === "fukubiki" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <label className="flex items-center gap-2 font-semibold text-[#5e5246]">
              單次投入點數
              <input
                type="number"
                min={1}
                max={500}
                value={value.fukubiki.costPoints}
                onChange={(e) =>
                  onChange({
                    ...value,
                    fukubiki: {
                      ...value.fukubiki,
                      costPoints: Math.max(1, Number(e.target.value) || 1),
                    },
                  })
                }
                className="input !mt-0 w-24 font-mono"
              />
            </label>
            <label className="flex items-center gap-2 font-semibold text-[#5e5246]">
              每日次數上限
              <input
                type="number"
                min={1}
                max={50}
                value={value.fukubiki.dailyLimit}
                onChange={(e) =>
                  onChange({
                    ...value,
                    fukubiki: {
                      ...value.fukubiki,
                      dailyLimit: Math.max(1, Number(e.target.value) || 1),
                    },
                  })
                }
                className="input !mt-0 w-20 font-mono"
              />
            </label>
            <span
              className={`rounded-lg px-3 py-1.5 font-mono text-[11px] font-bold ${
                fukubikiEV <= value.fukubiki.costPoints
                  ? "bg-[#eef5ef] text-[#35553a]"
                  : "bg-[#fbeee9] text-[#9b3d28]"
              }`}
            >
              點數期望值：{fukubikiEV} 點（
              {fukubikiEV <= value.fukubiki.costPoints
                ? "收支健康"
                : "高於投入點數，留意通膨"}
              ）
            </span>
          </div>

          <div className="space-y-2.5">
            {value.fukubiki.prizes.map((p, idx) => {
              const pct = (p.weight / Math.max(1, fukubikiTotalWeight)) * 100;
              return (
                <div
                  key={p.id}
                  className="grid items-center gap-3 rounded-xl bg-[#faf6f0] p-3 sm:grid-cols-[1.4fr_110px_100px_70px]"
                >
                  <label className="text-[11px] text-[#6e6257]">
                    賞別名稱
                    <input
                      value={p.rank}
                      maxLength={24}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          fukubiki: {
                            ...value.fukubiki,
                            prizes: value.fukubiki.prizes.map((item, i) =>
                              i === idx
                                ? { ...item, rank: e.target.value }
                                : item,
                            ),
                          },
                        })
                      }
                      className="input mt-1 bg-white"
                    />
                  </label>
                  <label className="text-[11px] text-[#6e6257]">
                    中獎點數
                    <input
                      type="number"
                      min={0}
                      max={5000}
                      value={p.points}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          fukubiki: {
                            ...value.fukubiki,
                            prizes: value.fukubiki.prizes.map((item, i) =>
                              i === idx
                                ? {
                                    ...item,
                                    points: Math.max(
                                      0,
                                      Number(e.target.value) || 0,
                                    ),
                                  }
                                : item,
                            ),
                          },
                        })
                      }
                      className="input mt-1 bg-white font-mono"
                    />
                  </label>
                  <label className="text-[11px] text-[#6e6257]">
                    權重
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={p.weight}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          fukubiki: {
                            ...value.fukubiki,
                            prizes: value.fukubiki.prizes.map((item, i) =>
                              i === idx
                                ? {
                                    ...item,
                                    weight: Math.max(
                                      1,
                                      Number(e.target.value) || 1,
                                    ),
                                  }
                                : item,
                            ),
                          },
                        })
                      }
                      className="input mt-1 bg-white font-mono"
                    />
                  </label>
                  <div className="pt-4 text-right font-mono text-xs font-bold text-[#6e6257]">
                    {pct.toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── 3. 每日刮刮樂管理 ─── */}
      {section === "scratch" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <label className="flex items-center gap-2 font-semibold text-[#5e5246]">
              每張花費點數
              <input
                type="number"
                min={1}
                max={500}
                value={value.scratch.costPoints}
                onChange={(e) =>
                  onChange({
                    ...value,
                    scratch: {
                      ...value.scratch,
                      costPoints: Math.max(1, Number(e.target.value) || 1),
                    },
                  })
                }
                className="input !mt-0 w-24 font-mono"
              />
            </label>
            <label className="flex items-center gap-2 font-semibold text-[#5e5246]">
              每日張數上限
              <input
                type="number"
                min={1}
                max={20}
                value={value.scratch.dailyLimit}
                onChange={(e) =>
                  onChange({
                    ...value,
                    scratch: {
                      ...value.scratch,
                      dailyLimit: Math.max(1, Number(e.target.value) || 1),
                    },
                  })
                }
                className="input !mt-0 w-20 font-mono"
              />
            </label>
            <span className="rounded-lg bg-[#faf6f0] px-3 py-1.5 font-mono text-[11px] font-bold text-[#6e6257]">
              面額期望值：{scratchEV}（投入 {value.scratch.costPoints} 點）
            </span>
          </div>

          <div className="space-y-2.5">
            {value.scratch.prizes.map((p, idx) => {
              const pct = (p.weight / Math.max(1, scratchTotalWeight)) * 100;
              return (
                <div
                  key={p.id}
                  className="grid items-center gap-3 rounded-xl bg-[#faf6f0] p-3 sm:grid-cols-[1.4fr_130px_95px_85px_65px]"
                >
                  <label className="text-[11px] text-[#6e6257]">
                    獎項名稱
                    <input
                      value={p.label}
                      maxLength={32}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          scratch: {
                            ...value.scratch,
                            prizes: value.scratch.prizes.map((item, i) =>
                              i === idx
                                ? { ...item, label: e.target.value }
                                : item,
                            ),
                          },
                        })
                      }
                      className="input mt-1 bg-white"
                    />
                  </label>
                  <label className="text-[11px] text-[#6e6257]">
                    類型
                    <select
                      value={p.kind}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          scratch: {
                            ...value.scratch,
                            prizes: value.scratch.prizes.map((item, i) =>
                              i === idx
                                ? {
                                    ...item,
                                    kind: e.target.value as
                                      | "CASH_VOUCHER"
                                      | "POINTS",
                                  }
                                : item,
                            ),
                          },
                        })
                      }
                      className="input mt-1 bg-white"
                    >
                      <option value="CASH_VOUCHER">折價券 (NT$)</option>
                      <option value="POINTS">點數回饋</option>
                    </select>
                  </label>
                  <label className="text-[11px] text-[#6e6257]">
                    數值
                    <input
                      type="number"
                      min={1}
                      max={5000}
                      value={p.value}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          scratch: {
                            ...value.scratch,
                            prizes: value.scratch.prizes.map((item, i) =>
                              i === idx
                                ? {
                                    ...item,
                                    value: Math.max(
                                      1,
                                      Number(e.target.value) || 1,
                                    ),
                                  }
                                : item,
                            ),
                          },
                        })
                      }
                      className="input mt-1 bg-white font-mono"
                    />
                  </label>
                  <label className="text-[11px] text-[#6e6257]">
                    權重
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={p.weight}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          scratch: {
                            ...value.scratch,
                            prizes: value.scratch.prizes.map((item, i) =>
                              i === idx
                                ? {
                                    ...item,
                                    weight: Math.max(
                                      1,
                                      Number(e.target.value) || 1,
                                    ),
                                  }
                                : item,
                            ),
                          },
                        })
                      }
                      className="input mt-1 bg-white font-mono"
                    />
                  </label>
                  <div className="pt-4 text-right font-mono text-xs font-bold text-[#6e6257]">
                    {pct.toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── 4. 雙軌任務點數管理 ─── */}
      {section === "tasks" && (
        <div className="space-y-2.5">
          {value.tasks.map((task, idx) => (
            <div
              key={task.key}
              className="grid items-center gap-3 rounded-xl bg-[#faf6f0] p-3.5 sm:grid-cols-[90px_1.2fr_1.6fr_90px_70px]"
            >
              <span
                className={`inline-flex justify-center rounded-lg px-2 py-1 text-[11px] font-bold ${
                  task.scope === "DAILY"
                    ? "bg-[#fdf3ec] text-[#935941]"
                    : "bg-[#eef5ef] text-[#4e6752]"
                }`}
              >
                {task.scope === "DAILY" ? "每日任務" : "里程碑"}
              </span>
              <input
                value={task.title}
                maxLength={40}
                onChange={(e) =>
                  onChange({
                    ...value,
                    tasks: value.tasks.map((t, i) =>
                      i === idx ? { ...t, title: e.target.value } : t,
                    ),
                  })
                }
                className="input !mt-0 bg-white font-semibold"
              />
              <input
                value={task.description}
                maxLength={80}
                onChange={(e) =>
                  onChange({
                    ...value,
                    tasks: value.tasks.map((t, i) =>
                      i === idx ? { ...t, description: e.target.value } : t,
                    ),
                  })
                }
                className="input !mt-0 bg-white text-xs"
              />
              <input
                type="number"
                min={0}
                max={500}
                value={task.points}
                onChange={(e) =>
                  onChange({
                    ...value,
                    tasks: value.tasks.map((t, i) =>
                      i === idx
                        ? { ...t, points: Math.max(0, Number(e.target.value) || 0) }
                        : t,
                    ),
                  })
                }
                className="input !mt-0 bg-white font-mono"
              />
              <label className="flex items-center justify-end gap-1.5 text-xs font-semibold text-[#5e5246]">
                <input
                  type="checkbox"
                  checked={task.isActive}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      tasks: value.tasks.map((t, i) =>
                        i === idx ? { ...t, isActive: e.target.checked } : t,
                      ),
                    })
                  }
                />
                啟用
              </label>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
