"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Gift,
  Star,
} from "lucide-react";
import {
  answerError,
  nextQuestion,
  type Survey,
  type Answers,
  type Answer,
} from "@/lib/surveys";
export function SurveyRunner({
  survey,
  preview = false,
  onSubmit,
}: {
  survey: Survey;
  preview?: boolean;
  onSubmit?: (answers: Answers) => Promise<void>;
}) {
  const [answers, setAnswers] = useState<Answers>({}),
    [history, setHistory] = useState<string[]>([survey.questions[0]!.id]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [complete, setComplete] = useState(false);
  const current =
    survey.questions.find((q) => q.id === history.at(-1)) ??
    survey.questions[0]!;
  const value = answers[current.id];
  function choose(a: Answer) {
    setAnswers((v) => ({ ...v, [current.id]: a }));
    setError("");
  }
  async function next() {
    const e = answerError(current, value);
    if (e) {
      setError(e);
      return;
    }
    const q = nextQuestion(survey, current, value);
    if (q) {
      setHistory((v) => [...v, q.id]);
      setError("");
    } else {
      setBusy(true);
      try {
        if (!preview) await onSubmit?.(answers);
        setComplete(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "送出失敗，請重試");
      } finally {
        setBusy(false);
      }
    }
  }
  if (complete)
    return (
      <div className="survey-finish">
        <CheckCircle2 size={52} />
        <h2>謝謝你，讓我們更懂你的日常。</h2>
        <p>
          {preview
            ? "這是預覽，沒有送出答案或發放獎勵。"
            : survey.reward.kind === "POINTS"
              ? `${survey.reward.points} 點已加入你的帳戶。`
              : `${survey.reward.title} 已放進我的票券。`}
        </p>
        <a
          className="member-primary"
          href={
            survey.reward.kind === "POINTS"
              ? "/care/compass"
              : "/account?tab=tickets"
          }
        >
          {survey.reward.kind === "POINTS"
            ? "看看適合毛孩的選物"
            : "查看我的票券"}
          <ArrowRight size={17} />
        </a>
      </div>
    );
  return (
    <div className="survey-runner">
      <div className="survey-step">
        <span>第 {history.length} 題</span>
        <span>依回答顯示接下來的問題</span>
      </div>
      <div className="member-progress">
        <span
          style={{
            width: `${((survey.questions.findIndex((q) => q.id === current.id) + 1) / survey.questions.length) * 100}%`,
          }}
        />
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={current.id}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.18 }}
          className="survey-question"
        >
          <div className="mb-3 flex items-center gap-2 text-xs text-[#647581]">
            <span>{current.required ? "必填" : "選填"}</span>
            {current.type === "MULTIPLE" && (
              <span>最多選 {current.maxSelections} 項</span>
            )}
          </div>
          <h2>{current.title}</h2>
          {current.description && <p>{current.description}</p>}
          {current.type === "TEXT" ? (
            <textarea
              aria-label={current.title}
              className="input min-h-36"
              maxLength={1000}
              value={typeof value === "string" ? value : ""}
              onChange={(e) => choose(e.target.value)}
              placeholder="寫下你的想法…"
            />
          ) : current.type === "RATING" ? (
            <div
              className="survey-rating"
              role="group"
              aria-label={current.title}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} 分`}
                  aria-pressed={value === n}
                  onClick={() => choose(n)}
                >
                  <Star
                    size={25}
                    fill={
                      typeof value === "number" && n <= value
                        ? "currentColor"
                        : "none"
                    }
                  />
                  <span>{n}</span>
                </button>
              ))}
            </div>
          ) : (
            <div
              className="survey-options"
              role="group"
              aria-label={current.title}
            >
              {current.options.map((o) => {
                const selected = Array.isArray(value)
                  ? value.includes(o.id)
                  : value === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      if (current.type === "SINGLE") choose(o.id);
                      else {
                        const prev = Array.isArray(value) ? value : [];
                        if (!selected && prev.length >= current.maxSelections) {
                          setError(`最多選 ${current.maxSelections} 項`);
                          return;
                        }
                        choose(
                          selected
                            ? prev.filter((x) => x !== o.id)
                            : [...prev, o.id],
                        );
                      }
                    }}
                  >
                    <span
                      className={
                        current.type === "MULTIPLE"
                          ? "survey-check"
                          : "survey-radio"
                      }
                    >
                      {selected && <Check size={14} />}
                    </span>
                    {o.label}
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      {error && (
        <p role="alert" className="mt-4 text-sm text-rose-700">
          {error}
        </p>
      )}
      <div className="survey-navigation">
        <button
          type="button"
          disabled={history.length === 1 || busy}
          onClick={() => {
            setHistory((v) => v.slice(0, -1));
            setError("");
          }}
        >
          <ArrowLeft size={17} />
          上一題
        </button>
        <button
          className="member-primary"
          type="button"
          disabled={busy}
          onClick={() => void next()}
        >
          {busy
            ? "送出中…"
            : nextQuestion(survey, current, value)
              ? "下一題"
              : "完成問卷"}
          <ArrowRight size={17} />
        </button>
      </div>
    </div>
  );
}
