"use client";
import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Download,
  Eye,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { SurveyRunner } from "@/components/surveys/SurveyRunner";
import { MediaUploadField } from "./MediaUploadField";
import { surveySchema, type Survey, type SurveyQuestion } from "@/lib/surveys";
import type { SurveyResponse } from "@/server/surveyRepository";
const localDate = (s: string | null) =>
  s
    ? new Date(new Date(s).getTime() - new Date(s).getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";
const csv = (s: unknown) => {
  let text = String(s ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
};
export function SurveyEditor() {
  const [surveys, setSurveys] = useState<Survey[]>([]),
    [id, setId] = useState(""),
    [tab, setTab] = useState<"edit" | "results">("edit"),
    [responses, setResponses] = useState<
      Array<SurveyResponse & { id: string }>
    >([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [previewKey, setPreviewKey] = useState(0),
    [version, setVersion] = useState("latest");
  const [listStatus,setListStatus]=useState("ACTIVE");
  const s = surveys.find((s) => s.id === id) ?? surveys[0];
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    void fetch("/api/admin/surveys")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        setSurveys(d.surveys);
        setId(d.surveys.find((item:Survey)=>item.status==="ACTIVE")?.id??d.surveys[0]?.id??"");
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (!s) return;
    let active = true;
    void fetch(`/api/admin/surveys?id=${s.id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        if (active) setResponses(d.responses);
      })
      .catch((e) => setError(e.message));
    return () => {
      active = false;
    };
  }, [s?.id, tab]);
  function edit(patch: Partial<Survey>) {
    if (!s) return;
    setSurveys((v) => v.map((x) => (x.id === s.id ? { ...x, ...patch } : x)));
    setDirty(true);
    setError("");
  }
  function question(i: number, patch: Partial<SurveyQuestion>) {
    if (s)
      edit({
        questions: s.questions.map((q, k) =>
          i === k ? { ...q, ...patch } : q,
        ),
      });
  }
  function move(i: number, d: number) {
    if (!s || i + d < 0 || i + d >= s.questions.length) return;
    const qs = [...s.questions];
    [qs[i], qs[i + d]] = [qs[i + d]!, qs[i]!];
    edit({ questions: qs });
  }
  async function save() {
    if (!s) return;
    const validated = surveySchema.safeParse(s);
    if (!validated.success) {
      setError(validated.error.issues.map((x) => x.message).join("；"));
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/admin/surveys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setSurveys((v) => v.map((x) => (x.id === s.id ? d.survey : x)));
      setDirty(false);
      toast.success("問卷已儲存，已填過的會員不會重複領獎");
    } catch (e) {
      setError(e instanceof Error ? e.message : "儲存失敗");
    } finally {
      setBusy(false);
    }
  }
  function duplicate() {
    if (!s) return;
    const copy = {
      ...structuredClone(s),
      id: `survey-${crypto.randomUUID().slice(0, 8)}`,
      title: `${s.title} 的副本`,
      status: "DRAFT" as const,
      version: 1,
    };
    setSurveys((v) => [...v, copy]);
    setId(copy.id);
    setListStatus("DRAFT");
    setTab("edit");
    setDirty(true);
  }
  const selectedVersion = version === "latest" ? s?.version : Number(version);
  const records = responses.filter((r) => r.version === selectedVersion);
  const reportQuestions = records[0]?.questions ?? s?.questions ?? [];
  function exportCsv() {
    if (!s) return;
    const qs = [
      ...new Map(
        responses.flatMap((r) => r.questions.map((q) => [q.id, q] as const)),
      ).values(),
    ];
    const rows = [
      ["填答時間", "問卷版本", ...qs.map((q) => q.title)],
      ...records.map((r) => [
        r.submittedAt,
        r.version,
        ...qs.map((q) => {
          const a = r.answers[q.id],
            original = r.questions.find((x) => x.id === q.id);
          return Array.isArray(a)
            ? a
                .map(
                  (x) => original?.options.find((o) => o.id === x)?.label ?? x,
                )
                .join("、")
            : (original?.options.find((o) => o.id === a)?.label ?? a ?? "");
        }),
      ]),
    ];
    const blob = new Blob(
      ["\ufeff" + rows.map((row) => row.map(csv).join(",")).join("\r\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `${s.id}-responses.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="mx-auto max-w-[1600px] space-y-6 text-[#18344c]">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">問卷與回饋</h1>
          <p className="mt-2 text-sm text-[#647581]">
            編輯題目與跳題、設定獎勵，再用右側畫面走一次填答流程。
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="member-secondary"
            onClick={duplicate}
            disabled={!s}
          >
            <Copy size={16} />
            複製問卷
          </button>
          <button
            className="member-primary"
            disabled={!s || busy}
            onClick={() => void save()}
          >
            <Save size={16} />
            {busy ? "儲存中…" : "儲存問卷"}
          </button>
        </div>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          {error}
        </p>
      )}
      {dirty && (
        <p className="text-xs text-[#94604a]">
          尚有未儲存的變更。每次儲存會建立新的題目版本，舊答案會保留。
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <select className="input !mt-0 !w-auto" aria-label="問卷列表狀態" value={listStatus} onChange={e=>{setListStatus(e.target.value);const first=surveys.find(x=>e.target.value==="ALL"||x.status===e.target.value);if(first)setId(first.id);setPreviewKey(k=>k+1);}}><option value="ACTIVE">啟用的問卷</option><option value="DRAFT">草稿</option><option value="CLOSED">已關閉</option><option value="ALL">全部問卷</option></select>
        {surveys.filter(x=>listStatus==="ALL"||x.status===listStatus).map((x) => (
          <button
            key={x.id}
            className="member-secondary"
            aria-pressed={s?.id === x.id}
            onClick={() => {
              setId(x.id);
              setPreviewKey((k) => k + 1);
            }}
          >
            {x.title}
            <span className="text-xs">
              {x.status === "DRAFT"
                ? "草稿"
                : x.status === "CLOSED"
                  ? "關閉"
                  : "啟用"}
            </span>
          </button>
        ))}
        <button
          className="member-secondary"
          onClick={() => {
            if (!s) return;
            const next: Survey = {
              ...structuredClone(s),
              id: `survey-${crypto.randomUUID().slice(0, 8)}`,
              title: "新的問卷",
              status: "DRAFT",
              version: 1,
              questions: [
                {
                  id: "q1",
                  title: "第一個問題",
                  description: "",
                  required: true,
                  type: "SINGLE",
                  options: [
                    { id: "a", label: "選項一" },
                    { id: "b", label: "選項二" },
                  ],
                  maxSelections: 1,
                  logic: [],
                },
              ],
            };
            setSurveys((v) => [...v, next]);
            setId(next.id);
            setListStatus("DRAFT");
            setDirty(true);
          }}
        >
          <Plus size={16} />
          新增問卷
        </button>
      </div>
      {s && (
        <>
          <div className="member-toolbar">
            <button
              aria-pressed={tab === "edit"}
              onClick={() => setTab("edit")}
            >
              編輯與預覽
            </button>
            <button
              aria-pressed={tab === "results"}
              onClick={() => setTab("results")}
            >
              結果統計 · {responses.length}
            </button>
          </div>
          {tab === "edit" ? (
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)]">
              <div className="space-y-5">
                <section className="member-panel">
                  <h2>問卷設定</h2>
                  <label className="mt-4 block text-sm">
                    問卷名稱
                    <input
                      className="input"
                      value={s.title}
                      onChange={(e) => edit({ title: e.target.value })}
                    />
                  </label>
                  <label className="mt-4 block text-sm">
                    開始前說明
                    <textarea
                      className="input min-h-24"
                      value={s.description}
                      onChange={(e) => edit({ description: e.target.value })}
                    />
                  </label>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="text-sm">
                      發布狀態
                      <select
                        className="input"
                        value={s.status}
                        onChange={(e) =>
                          edit({ status: e.target.value as Survey["status"] })
                        }
                      >
                        <option value="DRAFT">草稿</option>
                        <option value="ACTIVE">啟用並依排程開放</option>
                        <option value="CLOSED">關閉</option>
                      </select>
                    </label>
                    <label className="text-sm">
                      收件上限
                      <input
                        className="input"
                        type="number"
                        min={1}
                        value={s.maxResponses}
                        onChange={(e) =>
                          edit({ maxResponses: Number(e.target.value) })
                        }
                      />
                    </label>
                    {(
                      [
                        ["startsAt", "開始時間"],
                        ["endsAt", "結束時間"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="text-sm">
                        {label}（台灣時間）
                        <input
                          className="input"
                          type="datetime-local"
                          value={localDate(s[key])}
                          onChange={(e) =>
                            edit({
                              [key]: e.target.value
                                ? new Date(e.target.value).toISOString()
                                : null,
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-[#647581]">
                    留空代表不限制開始或結束時間。需登入填答，同一會員同份問卷限一次獎勵。
                  </p>
                  <div className="mt-4">
                    <MediaUploadField
                      label="問卷形象圖"
                      value={s.image}
                      onChange={(image) => edit({ image })}
                    />
                  </div>
                </section>
                <section className="member-panel">
                  <h2>完成回饋</h2>
                  <label className="mt-4 block text-sm">
                    回饋類型
                    <select
                      className="input"
                      value={s.reward.kind}
                      onChange={(e) =>
                        edit({
                          reward: {
                            ...s.reward,
                            kind: e.target.value as "POINTS" | "VOUCHER",
                          },
                        })
                      }
                    >
                      <option value="POINTS">點數</option>
                      <option value="VOUCHER">購物券</option>
                    </select>
                  </label>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {s.reward.kind === "POINTS" ? (
                      <label className="text-sm">
                        發放點數
                        <input
                          className="input"
                          type="number"
                          min={0}
                          max={1000}
                          value={s.reward.points}
                          onChange={(e) =>
                            edit({
                              reward: {
                                ...s.reward,
                                points: Number(e.target.value),
                              },
                            })
                          }
                        />
                      </label>
                    ) : (
                      <>
                        {(
                          [
                            ["title", "票券名稱"],
                            ["discountNt", "折抵金額"],
                            ["minSpendNt", "折後商品門檻"],
                            ["validDays", "有效天數"],
                          ] as const
                        ).map(([key, label]) => (
                          <label key={key} className="text-sm">
                            {label}
                            <input
                              className="input"
                              type={key === "title" ? "text" : "number"}
                              value={s.reward[key]}
                              onChange={(e) =>
                                edit({
                                  reward: {
                                    ...s.reward,
                                    [key]:
                                      key === "title"
                                        ? e.target.value
                                        : Number(e.target.value),
                                  },
                                })
                              }
                            />
                          </label>
                        ))}
                      </>
                    )}
                  </div>
                  <p className="mt-4 text-sm text-[#647581]">
                    最多可發 {s.maxResponses.toLocaleString()} 份，每份
                    {s.reward.kind === "POINTS"
                      ? ` ${s.reward.points} 點`
                      : ` ${s.reward.discountNt} 元券`}
                    。獎勵須完成整份有效題目才會入帳。
                  </p>
                </section>
                {s.questions.map((q, i) => (
                  <section key={q.id} className="member-panel">
                    <div className="flex items-center justify-between">
                      <h2>第 {i + 1} 題</h2>
                      <div className="flex gap-1">
                        <button
                          aria-label={`第 ${i + 1} 題向上`}
                          disabled={i === 0}
                          onClick={() => move(i, -1)}
                          className="p-2 disabled:opacity-20"
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          aria-label={`第 ${i + 1} 題向下`}
                          disabled={i === s.questions.length - 1}
                          onClick={() => move(i, 1)}
                          className="p-2 disabled:opacity-20"
                        >
                          <ArrowDown size={16} />
                        </button>
                        <button
                          aria-label={`刪除第 ${i + 1} 題`}
                          disabled={s.questions.length === 1}
                          className="p-2 text-rose-600 disabled:opacity-20"
                          onClick={() => {
                            edit({
                              questions: s.questions
                                .filter((x) => x.id !== q.id)
                                .map((x) => ({
                                  ...x,
                                  logic: x.logic.filter(
                                    (l) => l.target !== q.id,
                                  ),
                                })),
                            });
                            setPreviewKey((k) => k + 1);
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <label className="mt-4 block text-sm">
                      題目文字
                      <input
                        aria-label={`第 ${i + 1} 題文字`}
                        className="input"
                        value={q.title}
                        onChange={(e) => question(i, { title: e.target.value })}
                      />
                    </label>
                    <label className="mt-3 block text-sm">
                      補充說明
                      <input
                        className="input"
                        value={q.description}
                        onChange={(e) =>
                          question(i, { description: e.target.value })
                        }
                      />
                    </label>
                    <div className="mt-3 grid grid-cols-2 items-end gap-4">
                      <label className="text-sm">
                        題型
                        <select
                          aria-label={`第 ${i + 1} 題型`}
                          className="input"
                          value={q.type}
                          onChange={(e) => {
                            const type = e.target
                              .value as SurveyQuestion["type"];
                            question(i, {
                              type,
                              logic: [],
                              options: ["SINGLE", "MULTIPLE"].includes(type)
                                ? q.options.length
                                  ? q.options
                                  : [
                                      { id: "a", label: "選項一" },
                                      { id: "b", label: "選項二" },
                                    ]
                                : [],
                            });
                          }}
                        >
                          <option value="SINGLE">單選</option>
                          <option value="MULTIPLE">多選</option>
                          <option value="RATING">1 至 5 分評分</option>
                          <option value="TEXT">文字回答</option>
                        </select>
                      </label>
                      <label className="flex min-h-11 items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={q.required}
                          onChange={(e) =>
                            question(i, { required: e.target.checked })
                          }
                        />
                        必填
                      </label>
                    </div>
                    {["SINGLE", "MULTIPLE"].includes(q.type) && (
                      <label className="mt-4 block text-sm">
                        選項 每行一個
                        <textarea
                          className="input min-h-28"
                          aria-label={`第 ${i + 1} 題選項`}
                          value={q.options.map((o) => o.label).join("\n")}
                          onChange={(e) =>
                            question(i, {
                              options: e.target.value
                                .split("\n")
                                .slice(0, 12)
                                .map((label, j) => ({
                                  id:
                                    q.options[j]?.id ??
                                    `o-${crypto.randomUUID().slice(0, 6)}`,
                                  label,
                                })),
                            })
                          }
                        />
                      </label>
                    )}
                    {q.type === "MULTIPLE" && (
                      <label className="mt-3 block text-sm">
                        最多選幾項
                        <input
                          className="input"
                          type="number"
                          min={1}
                          max={12}
                          value={q.maxSelections}
                          onChange={(e) =>
                            question(i, {
                              maxSelections: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    )}
                    {q.type !== "TEXT" && (
                      <div className="mt-5 border-t border-[#dce4e7] pt-4">
                        <div className="flex justify-between">
                          <h3 className="text-sm font-semibold">條件跳題</h3>
                          <button
                            className="text-xs text-[#315f86]"
                            onClick={() =>
                              question(i, {
                                logic: [
                                  ...q.logic,
                                  {
                                    value:
                                      q.type === "RATING"
                                        ? "1"
                                        : (q.options[0]?.id ?? ""),
                                    target: "END",
                                  },
                                ],
                              })
                            }
                          >
                            ＋新增規則
                          </button>
                        </div>
                        {q.logic.map((l, j) => (
                          <div
                            key={j}
                            className="mt-3 flex flex-wrap items-center gap-2 text-xs"
                          >
                            <span>回答為</span>
                            <select
                              className="input !mt-0 !w-auto"
                              value={l.value}
                              onChange={(e) =>
                                question(i, {
                                  logic: q.logic.map((v, k) =>
                                    k === j
                                      ? { ...v, value: e.target.value }
                                      : v,
                                  ),
                                })
                              }
                            >
                              {q.type === "RATING"
                                ? [1, 2, 3, 4, 5].map((n) => (
                                    <option key={n} value={n}>
                                      {n} 分
                                    </option>
                                  ))
                                : q.options.map((o) => (
                                    <option key={o.id} value={o.id}>
                                      {o.label}
                                    </option>
                                  ))}
                            </select>
                            <span>跳到</span>
                            <select
                              className="input !mt-0 !w-auto"
                              value={l.target}
                              onChange={(e) =>
                                question(i, {
                                  logic: q.logic.map((v, k) =>
                                    k === j
                                      ? { ...v, target: e.target.value }
                                      : v,
                                  ),
                                })
                              }
                            >
                              <option value="END">完成問卷</option>
                              {s.questions.slice(i + 1).map((x) => (
                                <option key={x.id} value={x.id}>
                                  {x.title}
                                </option>
                              ))}
                            </select>
                            <button
                              aria-label="移除跳題規則"
                              onClick={() =>
                                question(i, {
                                  logic: q.logic.filter((_, k) => k !== j),
                                })
                              }
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))}
                        <p className="mt-3 text-xs text-[#647581]">
                          沒有符合的規則就進到下一題。多選題有多個符合條件時，依規則順序採第一個。
                        </p>
                      </div>
                    )}
                  </section>
                ))}
                <button
                  className="member-secondary"
                  disabled={s.questions.length >= 20}
                  onClick={() =>
                    edit({
                      questions: [
                        ...s.questions,
                        {
                          id: `q-${crypto.randomUUID().slice(0, 8)}`,
                          title: "新的問題",
                          description: "",
                          type: "SINGLE",
                          required: true,
                          options: [
                            { id: "a", label: "選項一" },
                            { id: "b", label: "選項二" },
                          ],
                          maxSelections: 1,
                          logic: [],
                        },
                      ],
                    })
                  }
                >
                  <Plus size={16} />
                  新增題目
                </button>
              </div>
              <aside className="survey-admin-preview xl:sticky xl:top-6">
                <div className="flex items-center justify-between border-b border-[#dce4e7] p-5">
                  <h2 className="font-semibold">填答即時預覽</h2>
                  <button
                    className="text-xs text-[#315f86]"
                    onClick={() => setPreviewKey((k) => k + 1)}
                  >
                    重新開始
                  </button>
                </div>
                <div className="p-5">
                  <h3 className="text-xl font-semibold">{s.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#647581]">
                    {s.description}
                  </p>
                  <div className="mt-6">
                    <SurveyRunner
                      key={`${s.id}-${previewKey}`}
                      survey={s}
                      preview
                    />
                  </div>
                </div>
              </aside>
            </div>
          ) : (
            <section className="member-panel">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2>填答結果 · {records.length} 份</h2>
                  <p className="mt-2 text-xs text-[#647581]">
                    每題以有回答該題的人數計算，多選題總占比可能超過 100%。
                  </p>
                </div>
                <div className="flex gap-3">
                  <select
                    aria-label="統計問卷版本"
                    className="input !mt-0 !w-auto"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                  >
                    <option value="latest">目前發布版本</option>
                    {[...new Set(responses.map((r) => r.version))].map((v) => (
                      <option key={v} value={v}>
                        版本 {v}
                      </option>
                    ))}
                  </select>
                  <button className="member-secondary" onClick={exportCsv}>
                    <Download size={16} />
                    匯出 CSV
                  </button>
                </div>
              </div>
              <div className="mt-7 space-y-8">
                {reportQuestions.map((q) => {
                  const entries = records
                    .map((r) => r.answers[q.id])
                    .filter((a) => a !== undefined && a !== "");
                  return (
                    <div key={q.id}>
                      <h3 className="font-semibold">
                        {q.title}{" "}
                        <span className="text-xs font-normal text-[#647581]">
                          {entries.length} 人回答
                        </span>
                      </h3>
                      {q.type === "TEXT" ? (
                        <div className="mt-3 space-y-2">
                          {entries.slice(0, 20).map((a, i) => (
                            <p
                              key={i}
                              className="rounded-lg bg-[#f1f5f7] p-3 text-sm"
                            >
                              {String(a)}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {(q.type === "RATING"
                            ? [1, 2, 3, 4, 5].map((n) => ({
                                id: String(n),
                                label: `${n} 分`,
                              }))
                            : q.options
                          ).map((o) => {
                            const count = entries.filter((a) =>
                                Array.isArray(a)
                                  ? a.includes(o.id)
                                  : String(a) === o.id,
                              ).length,
                              pct = entries.length
                                ? (count / entries.length) * 100
                                : 0;
                            return (
                              <div
                                key={o.id}
                                className="grid grid-cols-[140px_1fr_75px] items-center gap-3 text-sm"
                              >
                                <span>{o.label}</span>
                                <div className="member-progress">
                                  <span style={{ width: `${pct}%` }} />
                                </div>
                                <span>
                                  {count} · {pct.toFixed(0)}%
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {records.length === 0 && (
                <p className="mt-8 text-sm text-[#647581]">
                  目前沒有填答。可以先用預覽檢查流程，正式送出後才會進入統計。
                </p>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
