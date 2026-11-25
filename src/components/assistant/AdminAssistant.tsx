"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
  BarChart3,
  Cat,
  ChevronRight,
  Download,
  ExternalLink,
  FileQuestion,
  MessageCircle,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  assistantCategories,
  assistantSettingsSchema,
  buildAssistantAnalytics,
  defaultAssistantSettings,
  type AssistantCategory,
  type AssistantSettings,
} from "@/lib/assistant";
import "./little-p.css";
type Analytics = ReturnType<typeof buildAssistantAnalytics>;
type Data = {
  settings: AssistantSettings;
  analytics: Analytics;
  days: number;
  aiConfigured: boolean;
  model: string;
};
const capabilityLabels: Record<
  keyof AssistantSettings["capabilities"],
  string
> = {
  products: "搜尋上架商品與價格",
  ingredients: "查看成分、過敏原與批次入口",
  features: "搜尋所有公開功能與操作說明",
  community: "搜尋已公開社群、活動與問卷",
  account: "登入後查詢自己的會員、毛孩與訂單",
  compare: "提供同物種食品並排比較",
  cart: "提供買家自行點擊的加車按鈕",
};
const tabs = [
  { id: "overview", label: "問題與圖表", icon: BarChart3 },
  { id: "settings", label: "小P與搜尋設定", icon: Settings2 },
  { id: "knowledge", label: "補充知識", icon: FileQuestion },
] as const;
const inputClass =
  "mt-2 w-full rounded-xl border border-[#d5dfe3] bg-white px-3 py-2.5 text-sm text-[#294b61] outline-none focus:border-[#4f8ab8] focus:ring-2 focus:ring-[#4f8ab820]";
const panelClass = "rounded-2xl border border-[#dce4e6] bg-white p-5 sm:p-6";
const buttonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#d2dee5] bg-white px-4 text-sm font-medium text-[#315f86] transition-colors hover:bg-[#edf4f8] disabled:opacity-50";
function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-5 border-b border-[#eef1f1] py-3 last:border-0">
      <span>
        <strong className="block text-sm font-medium text-[#294b61]">
          {label}
        </strong>
        {hint && (
          <span className="mt-1 block text-xs leading-6 text-[#8c9798]">
            {hint}
          </span>
        )}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 shrink-0 accent-[#315f86]"
      />
    </label>
  );
}
export default function AdminAssistant() {
  const [data, setData] = useState<Data | null>(null),
    [draft, setDraft] = useState<AssistantSettings>(
      structuredClone(defaultAssistantSettings),
    );
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("overview"),
    [days, setDays] = useState(30),
    [busy, setBusy] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const [category, setCategory] = useState("all"),
    [query, setQuery] = useState(""),
    [onlyEmpty, setOnlyEmpty] = useState(false),
    [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState(""),
    [list] = useAutoAnimate<HTMLDivElement>({ duration: 160 });
  const load = useCallback(
    async (initial = false) => {
      setBusy(true);
      setError("");
      try {
        const r = await fetch(`/api/admin/assistant?days=${days}`, {
          cache: "no-store",
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setData(d);
        if (initial) setDraft(d.settings);
      } catch (e) {
        setError(e instanceof Error ? e.message : "資料讀取失敗");
      } finally {
        setBusy(false);
      }
    },
    [days],
  );
  useEffect(() => {
    void load(!data);
  }, [days]); // Preserve unsaved settings while changing the analytics period.
  const dirty = data && JSON.stringify(draft) !== JSON.stringify(data.settings);
  function update<K extends keyof AssistantSettings>(
    key: K,
    value: AssistantSettings[K],
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }
  async function save() {
    const result = assistantSettingsSchema.safeParse(draft);
    if (!result.success) {
      setError(
        "請補齊問候、常用問題與知識內容，並確認數字在欄位標示的範圍內；連結請使用公開的站內頁面。",
      );
      return;
    }
    setSaving(true);
    setError("");
    try {
      const r = await fetch("/api/admin/assistant", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setData((prev) => (prev ? { ...prev, settings: d.settings } : prev));
      setDraft(d.settings);
      toast.success("小P設定已儲存，前台重新整理即可看到");
    } catch (e) {
      setError(e instanceof Error ? e.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }
  const filtered = useMemo(
    () =>
      data?.analytics.recent.filter(
        (m) =>
          (category === "all" || m.category === category) &&
          (!onlyEmpty || !m.resultCount) &&
          (!selectedDate ||
            new Date(m.at).toLocaleDateString("en-CA", {
              timeZone: "Asia/Taipei",
            }) === selectedDate) &&
          (!query || m.question.includes(query)),
      ) ?? [],
    [data, category, onlyEmpty, query, selectedDate],
  );
  function addKnowledge(question = "") {
    setDraft((prev) => ({
      ...prev,
      knowledge: [
        ...prev.knowledge,
        {
          id: crypto.randomUUID(),
          title: question.slice(0, 70),
          text: "",
          keywords: "",
          href: "/shop",
          enabled: true,
        },
      ],
    }));
    setTab("knowledge");
  }
  function exportCsv() {
    if (!data) return;
    const rows = [
      ["時間", "問題", "分類", "結果數", "使用者", "說明方式"],
      ...data.analytics.recent.map((m) => [
        new Date(m.at).toLocaleString("zh-TW"),
        m.question,
        assistantCategories[m.category],
        String(m.resultCount),
        m.member ? "會員" : "訪客",
        m.ai,
      ]),
    ];
    const csv =
      "\uFEFF" +
      rows
        .map((r) =>
          r
            .map(
              (v) =>
                `"${String(v)
                  .replace(/"/g, '""')
                  .replace(/^[=+@-]/, "'")}"`,
            )
            .join(","),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "小P詢問統計.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  const a = data?.analytics;
  if (!data)
    return (
      <main className="p-8 text-[#315f86]">
        <h1 className="text-2xl font-semibold">小P AI 貓咪助理</h1>
        <p className="mt-5 text-sm">{error || "正在讀取設定與詢問統計…"}</p>
        {error && (
          <button
            type="button"
            className={`${buttonClass} mt-4`}
            onClick={() => void load(true)}
          >
            重新讀取
          </button>
        )}
      </main>
    );
  return (
    <main className="p-4 text-[#294b61] sm:p-7 lg:p-9">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#4f8ab8]">
            <Cat size={18} />
            小P AI 貓咪助理
          </div>
          <h1 className="text-3xl font-bold">讓小P更懂你的店</h1>
          <p className="mt-2 text-sm text-[#849297]">
            調整搜尋範圍與常見問答，看看買家真正想找什麼。
          </p>
        </div>
        <div className="flex gap-2">
          <Link className={buttonClass} href="/" target="_blank">
            <ExternalLink size={15} />
            開啟前台
          </Link>
          <button
            type="button"
            className={buttonClass}
            onClick={() => void load()}
            disabled={busy}
          >
            <RefreshCw size={15} className={busy ? "animate-spin" : ""} />
            更新資料
          </button>
        </div>
      </div>
      {error && (
        <div
          role="alert"
          className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      <div className="mt-7 flex flex-wrap gap-2 border-b border-[#dbe3e6] pb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold ${tab === t.id ? "bg-[#315f86] text-white" : "bg-white text-[#6a818f]"}`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
        {dirty && (
          <span className="ml-auto self-center text-xs text-[#a36045]">
            有尚未儲存的變更
          </span>
        )}
      </div>
      {tab === "overview" && (
        <div className="mt-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[#89999a]">
              圖表按臺灣時間計算；問題會遮蔽電子郵件、電話與密碼。
              {data && `最多顯示最近 ${data.settings.analyticsDays} 天。`}
            </p>
            <div className="flex gap-1 rounded-xl bg-[#e5edf1] p-1">
              {[7, 30, 90].map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => {
                    setDays(n);
                    setSelectedDate(null);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs ${days === n ? "bg-white shadow-sm" : ""}`}
                >
                  {n}天
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              {
                label: "買家詢問",
                value: a?.total ?? 0,
                hint: "這段期間的提問次數",
              },
              {
                label: "沒有直接結果",
                value: a?.noResults ?? 0,
                hint: "優先補充資料的問題",
              },
              {
                label: "會員提問",
                value: a?.members ?? 0,
                hint: "已登入帳戶的提問",
              },
              {
                label: "站內結果平均時間",
                value: `${((a?.avgLatencyMs ?? 0) / 1000).toFixed(1)}秒`,
                hint: "先呈現結果，說明稍後補上",
              },
            ].map((m) => (
              <div key={m.label} className={panelClass}>
                <p className="text-xs text-[#7c929f]">{m.label}</p>
                <strong className="mt-2 block text-3xl">{m.value}</strong>
                <span className="mt-2 block text-[11px] text-[#99a3a1]">
                  {m.hint}
                </span>
              </div>
            ))}
          </div>
          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <section className={panelClass}>
              <div className="flex justify-between">
                <h2 className="font-semibold">每天有多少提問</h2>
                {selectedDate && (
                  <button
                    type="button"
                    className="text-xs text-[#4f8ab8]"
                    onClick={() => setSelectedDate(null)}
                  >
                    清除日期篩選
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-[#91a0a6]">
                點柱狀圖，可看當天的詢問紀錄。
              </p>
              <div
                className="mt-5 flex h-40 items-end gap-1 border-b border-[#cad9df]"
                role="img"
                aria-label={`每日提問柱狀圖，共 ${a?.total ?? 0} 筆`}
              >
                {a?.daily.map((d) => (
                  <button
                    type="button"
                    key={d.date}
                    title={`${d.date}：${d.count} 筆`}
                    aria-label={`${d.date}，${d.count}筆，點選篩選`}
                    onClick={() => setSelectedDate(d.date)}
                    className={`min-h-1 min-w-1 flex-1 rounded-t transition-colors ${selectedDate === d.date ? "bg-[#a36045]" : "bg-[#70a0bd] hover:bg-[#315f86]"}`}
                    style={{
                      height: `${Math.max(2, (d.count / Math.max(1, ...a.daily.map((v) => v.count))) * 100)}%`,
                    }}
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-[#8b9a9d]">
                <span>{a?.daily[0]?.date}</span>
                <span>{a?.daily.at(-1)?.date}</span>
              </div>
              {!a?.total && (
                <p className="mt-3 text-xs text-[#99a4a1]">
                  還沒有紀錄，前台提問後便會顯示。
                </p>
              )}
            </section>
            <section className={panelClass}>
              <h2 className="font-semibold">買家問題分類</h2>
              <div className="mt-4 space-y-2.5">
                {a?.categories.map((c) => (
                  <button
                    type="button"
                    key={c.key}
                    onClick={() => setCategory(c.key)}
                    className="flex w-full items-center gap-3 text-left text-xs"
                  >
                    <span className="w-24 shrink-0">{c.label}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#edf2f2]">
                      <span
                        className="block h-full rounded-full bg-[#83a8b9]"
                        style={{
                          width: `${(c.count / Math.max(1, a.total)) * 100}%`,
                        }}
                      />
                    </span>
                    <span className="w-12 text-right">{c.count} 筆</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <section className={panelClass}>
              <h2 className="font-semibold">最常被問的問題</h2>
              <ol className="mt-4 space-y-3">
                {a?.topQuestions.slice(0, 7).map((q, i) => (
                  <li key={q.question} className="flex gap-3 text-sm">
                    <span className="font-mono text-[#a4b7c2]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1">{q.question}</span>
                    <span className="text-xs text-[#7a919d]">{q.count} 次</span>
                  </li>
                ))}
              </ol>
              {!a?.topQuestions.length && (
                <p className="mt-4 text-sm text-[#91a0a1]">
                  買家問過的問題會整理在這裡。
                </p>
              )}
            </section>
            <section className={panelClass}>
              <h2 className="font-semibold">值得補上答案</h2>
              <p className="mt-1 text-xs text-[#91a0a6]">
                點「補充答案」帶入知識編輯；確認後儲存才會影響前台。
              </p>
              <div className="mt-4 space-y-3">
                {a?.unanswered.slice(0, 5).map((m) => (
                  <div
                    className="flex items-center justify-between gap-4 text-xs"
                    key={m.id}
                  >
                    <span>{m.question}</span>
                    <button
                      type="button"
                      onClick={() => addKnowledge(m.question)}
                      className="shrink-0 text-[#4f8ab8]"
                    >
                      補充答案
                      <ChevronRight size={12} className="inline" />
                    </button>
                  </div>
                ))}
              </div>
              {!a?.unanswered.length && (
                <p className="mt-4 text-sm text-[#91a0a1]">
                  這段期間沒有找不到結果的問題。
                </p>
              )}
            </section>
          </div>
          <section className={panelClass}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">詢問紀錄</h2>
              <button type="button" className={buttonClass} onClick={exportCsv}>
                <Download size={14} />
                下載紀錄
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <label className="flex flex-1 items-center gap-2 rounded-xl border border-[#d7e2e7] px-3">
                <Search size={15} />
                <input
                  aria-label="搜尋問題"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="min-w-40 flex-1 bg-transparent py-2.5 text-sm outline-none"
                  placeholder="搜尋買家問過的內容"
                />
              </label>
              <select
                aria-label="問題分類"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-xl border border-[#d7e2e7] px-3 text-sm"
              >
                <option value="all">全部分類</option>
                {Object.entries(assistantCategories).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={onlyEmpty}
                  onChange={(e) => setOnlyEmpty(e.target.checked)}
                />
                只看沒有結果
              </label>
            </div>
            <div className="mt-4 max-h-[450px] overflow-auto">
              <table className="w-full min-w-[650px] text-left text-xs">
                <thead className="sticky top-0 bg-[#f2f6f7] text-[#80929b]">
                  <tr>
                    {["時間", "問題", "分類", "結果", "說明"].map((t) => (
                      <th className="p-3 font-medium" key={t}>
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr key={m.id} className="border-b border-[#edf1f1]">
                      <td className="whitespace-nowrap p-3 text-[#85969f]">
                        {new Date(m.at).toLocaleString("zh-TW", {
                          timeZone: "Asia/Taipei",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        <span className="block text-[10px]">
                          {m.member ? "會員" : "訪客"}
                        </span>
                      </td>
                      <td className="max-w-md p-3 leading-6">{m.question}</td>
                      <td className="whitespace-nowrap p-3">
                        {assistantCategories[m.category as AssistantCategory]}
                      </td>
                      <td className="p-3">{m.resultCount}</td>
                      <td className="whitespace-nowrap p-3 text-[#8a9b9f]">
                        {
                          {
                            used: "AI 整理",
                            local: "站內資料",
                            timeout: "保留站內結果",
                            unavailable: "保留站內結果",
                          }[m.ai]
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && (
                <p className="p-8 text-center text-sm text-[#8b9b9f]">
                  目前條件沒有詢問紀錄。
                </p>
              )}
            </div>
          </section>
        </div>
      )}
      {tab === "settings" && (
        <div className="mt-6 grid items-start gap-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <section className={panelClass}>
              <h2 className="mb-2 text-lg font-semibold">出場與說話方式</h2>
              <Toggle
                label="啟用小P"
                hint="關閉後，前台不會顯示貓咪與搜尋入口。"
                value={draft.enabled}
                onChange={(v) => update("enabled", v)}
              />
              <Toggle
                label="首頁自然走動"
                hint="其他前台頁面固定停留；減少動態效果的裝置保持靜止。"
                value={draft.roaming}
                onChange={(v) => update("roaming", v)}
              />
              <label className="mt-4 block text-sm">
                第一次打開時說的話
                <textarea
                  value={draft.welcome}
                  onChange={(e) => update("welcome", e.target.value)}
                  maxLength={180}
                  rows={3}
                  className={inputClass}
                />
              </label>
              <label className="mt-4 block text-sm">
                常用問題（每行一題，最多 8 題）
                <textarea
                  value={draft.quickQuestions.join("\n")}
                  onChange={(e) =>
                    update("quickQuestions", e.target.value.split("\n"))
                  }
                  rows={5}
                  className={inputClass}
                />
              </label>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <label className="text-xs">
                  說話風格
                  <select
                    className={inputClass}
                    value={draft.tone}
                    onChange={(e) =>
                      update(
                        "tone",
                        e.target.value as AssistantSettings["tone"],
                      )
                    }
                  >
                    <option value="warm">親切、輕巧</option>
                    <option value="concise">簡潔、直接</option>
                  </select>
                </label>
                <label className="text-xs">
                  回答長度
                  <select
                    className={inputClass}
                    value={draft.answerLength}
                    onChange={(e) =>
                      update(
                        "answerLength",
                        e.target.value as AssistantSettings["answerLength"],
                      )
                    }
                  >
                    <option value="short">簡短（約 60–120 字）</option>
                    <option value="standard">完整（約 100–180 字）</option>
                  </select>
                </label>
                <label className="text-xs">
                  每次最多幾個結果
                  <input
                    type="number"
                    min={2}
                    max={8}
                    value={draft.maxResults}
                    className={inputClass}
                    onChange={(e) =>
                      update("maxResults", Number(e.target.value))
                    }
                  />
                </label>
                <label className="text-xs">
                  走動之間休息幾秒
                  <input
                    type="number"
                    min={3}
                    max={20}
                    value={draft.walkPauseSeconds}
                    className={inputClass}
                    onChange={(e) =>
                      update("walkPauseSeconds", Number(e.target.value))
                    }
                  />
                </label>
              </div>
            </section>
            <section className={panelClass}>
              <h2 className="text-lg font-semibold">可以幫買家做什麼</h2>
              <p className="mt-2 text-xs leading-6 text-[#8a999d]">
                個人資料由登入身分決定；小P不能查其他會員，也不能代替買家結帳、領券或改訂單。
              </p>
              {Object.entries(capabilityLabels).map(([key, label]) => (
                <Toggle
                  key={key}
                  label={label}
                  value={
                    draft.capabilities[key as keyof typeof capabilityLabels]
                  }
                  onChange={(v) =>
                    update("capabilities", { ...draft.capabilities, [key]: v })
                  }
                />
              ))}
            </section>
            <section className={panelClass}>
              <h2 className="text-lg font-semibold">AI 與紀錄保存</h2>
              <Toggle
                label="用 Gemini 整理簡短說明"
                hint="站內結果先出現；未能取得 AI 回覆時，保留搜尋結果與原有說明。"
                value={draft.aiEnabled}
                onChange={(v) => update("aiEnabled", v)}
              />
              <p className="mt-3 rounded-xl bg-[#eff4f6] p-3 text-xs leading-6">
                連線設定：{data?.aiConfigured ? "已設定" : "尚未設定"} · 模型{" "}
                {data?.model ?? "讀取中"}。API 金鑰只放在伺服器，這裡不顯示。
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <label className="text-xs">
                  AI 等待上限（秒）
                  <input
                    className={inputClass}
                    type="number"
                    min={3}
                    max={15}
                    value={draft.aiTimeoutSeconds}
                    onChange={(e) =>
                      update("aiTimeoutSeconds", Number(e.target.value))
                    }
                  />
                </label>
                <label className="text-xs">
                  會員對話保留（天）
                  <input
                    className={inputClass}
                    type="number"
                    min={7}
                    max={365}
                    value={draft.historyDays}
                    onChange={(e) =>
                      update("historyDays", Number(e.target.value))
                    }
                  />
                </label>
                <label className="text-xs">
                  問題統計保留（天）
                  <input
                    className={inputClass}
                    type="number"
                    min={7}
                    max={365}
                    value={draft.analyticsDays}
                    onChange={(e) =>
                      update("analyticsDays", Number(e.target.value))
                    }
                  />
                </label>
              </div>
              <Toggle
                label="記錄提問分類與搜尋結果"
                hint="只記錄遮蔽後的提問與統計，不記錄個人資料回答、密碼或完整訂單內容。"
                value={draft.analyticsEnabled}
                onChange={(v) => update("analyticsEnabled", v)}
              />
            </section>
          </div>
          <aside className="sticky top-5 rounded-2xl border border-[#dce4e6] bg-[#f6f4eb] p-5">
            <h2 className="text-sm font-semibold">出場預覽</h2>
            <p className="mt-2 text-xs leading-6 text-[#899593]">
              這裡先看問候與常用問題；正式搜尋請開啟前台。
            </p>
            <div className="mt-5 overflow-hidden rounded-2xl border border-[#dce4e6] bg-[#fffefa]">
              <div className="little-p-welcome p-4">
                <span className="little-p-welcome-cat" />
                <p>{draft.welcome}</p>
                <div className="little-p-quick">
                  {draft.quickQuestions.filter(Boolean).map((q, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setPreviewQuestion(q)}
                    >
                      <Search size={13} />
                      {q}
                    </button>
                  ))}
                </div>
                {previewQuestion && (
                  <p className="mt-4! text-xs! text-[#4f8ab8]!">
                    買家會詢問：{previewQuestion}
                  </p>
                )}
              </div>
            </div>
            <p className="mt-4 text-xs text-[#8c9993]">
              {draft.enabled ? "小P會在前台出現" : "小P目前關閉"} ·{" "}
              {draft.roaming ? "首頁會走動" : "固定位置"}
            </p>
          </aside>
        </div>
      )}
      {tab === "knowledge" && (
        <section className={`${panelClass} mt-6`}>
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">把買家常問的內容補給小P</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-[#85989e]">
                商品價格、庫存、會員規則會直接讀取網站資料；這裡補上公開服務說明與常見問答。請勿填公司密碼、顧客個資或尚未確認的優惠。
              </p>
            </div>
            <button
              type="button"
              className={buttonClass}
              onClick={() => addKnowledge()}
              disabled={draft.knowledge.length >= 60}
            >
              <Plus size={15} />
              新增知識
            </button>
          </div>
          <div ref={list} className="mt-6 space-y-4">
            {draft.knowledge.map((k, i) => (
              <article
                key={k.id}
                className="rounded-xl border border-[#dce5e8] bg-[#fafcfc] p-4"
              >
                <div className="flex items-center justify-between">
                  <strong className="text-xs text-[#7a929f]">
                    知識 {i + 1}
                  </strong>
                  <button
                    type="button"
                    className="p-2 text-[#a36045]"
                    aria-label={`刪除知識${i + 1}`}
                    onClick={() =>
                      update(
                        "knowledge",
                        draft.knowledge.filter((v) => v.id !== k.id),
                      )
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {(
                    [
                      ["title", "買家會問什麼？"],
                      ["keywords", "搜尋關鍵字"],
                      ["href", "對應站內網址"],
                    ] as const
                  ).map(([key, label]) => (
                    <label className="text-xs" key={key}>
                      {label}
                      <input
                        value={k[key]}
                        className={inputClass}
                        onChange={(e) =>
                          update(
                            "knowledge",
                            draft.knowledge.map((v) =>
                              v.id === k.id
                                ? { ...v, [key]: e.target.value }
                                : v,
                            ),
                          )
                        }
                      />
                    </label>
                  ))}
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={k.enabled}
                      onChange={(e) =>
                        update(
                          "knowledge",
                          draft.knowledge.map((v) =>
                            v.id === k.id
                              ? { ...v, enabled: e.target.checked }
                              : v,
                          ),
                        )
                      }
                    />
                    讓小P使用這筆內容
                  </label>
                </div>
                <label className="mt-4 block text-xs">
                  公開回答內容
                  <textarea
                    rows={4}
                    maxLength={900}
                    value={k.text}
                    className={inputClass}
                    onChange={(e) =>
                      update(
                        "knowledge",
                        draft.knowledge.map((v) =>
                          v.id === k.id ? { ...v, text: e.target.value } : v,
                        ),
                      )
                    }
                  />
                </label>
              </article>
            ))}
          </div>
          {!draft.knowledge.length && (
            <div className="py-14 text-center text-sm text-[#91a09f]">
              <MessageCircle className="mx-auto mb-3" />
              商品與功能已可搜尋；需要補充時，再新增常見問答。
            </div>
          )}
        </section>
      )}
      {tab !== "overview" && (
        <div className="sticky bottom-3 mt-5 flex items-center justify-between gap-3 rounded-2xl border border-[#d5e1e6] bg-white/95 p-4 shadow-lg backdrop-blur">
          <p className="text-xs text-[#80959e]">
            {dirty
              ? "儲存後套用到前台；已保存的對話不會被改寫。"
              : "目前設定已同步。"}
          </p>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !data}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#315f86] px-6 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Save size={15} />
            {saving ? "儲存中…" : "儲存設定"}
          </button>
        </div>
      )}
    </main>
  );
}
