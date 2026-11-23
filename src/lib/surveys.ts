import { z } from "zod";
import { mediaUrlSchema } from "./mediaUrl";
const option = z
  .object({
    id: z.string().min(1).max(50),
    label: z.string().trim().min(1).max(100),
  })
  .strict();
export const questionSchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .max(60),
    title: z.string().trim().min(1).max(160),
    description: z.string().max(250),
    type: z.enum(["SINGLE", "MULTIPLE", "RATING", "TEXT"]),
    required: z.boolean(),
    options: z.array(option).max(12),
    maxSelections: z.number().int().min(1).max(12),
    logic: z
      .array(
        z
          .object({ value: z.string().max(100), target: z.string().max(60) })
          .strict(),
      )
      .max(12),
  })
  .strict();
export const surveySchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .max(60),
    title: z.string().trim().min(2).max(80),
    description: z.string().max(400),
    image: mediaUrlSchema,
    status: z.enum(["DRAFT", "ACTIVE", "CLOSED"]),
    startsAt: z.iso.datetime().nullable(),
    endsAt: z.iso.datetime().nullable(),
    version: z.number().int().min(1),
    maxResponses: z.number().int().min(1).max(100000),
    reward: z
      .object({
        kind: z.enum(["POINTS", "VOUCHER"]),
        points: z.number().int().min(0).max(1000),
        title: z.string().min(1).max(60),
        discountNt: z.number().int().min(1).max(2000),
        minSpendNt: z.number().int().min(0).max(100000),
        validDays: z.number().int().min(1).max(365),
      })
      .strict(),
    questions: z.array(questionSchema).min(1).max(20),
  })
  .strict()
  .superRefine((s, ctx) => {
    if (s.startsAt && s.endsAt && s.startsAt >= s.endsAt)
      ctx.addIssue({ code: "custom", message: "結束時間須晚於開始時間" });
    if (
      s.reward.kind === "VOUCHER" &&
      s.reward.discountNt > s.reward.minSpendNt
    )
      ctx.addIssue({ code: "custom", message: "票券門檻不得低於折抵金額" });
    const ids = s.questions.map((q) => q.id);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: "custom", message: "題目代碼重複" });
    s.questions.forEach((q, i) => {
      if (
        ["SINGLE", "MULTIPLE"].includes(q.type) &&
        (q.options.length < 2 ||
          new Set(q.options.map((o) => o.id)).size !== q.options.length)
      )
        ctx.addIssue({
          code: "custom",
          message: `第 ${i + 1} 題至少需要兩個不重複的選項`,
        });
      q.logic.forEach((r) => {
        if (
          (r.target !== "END" && ids.indexOf(r.target) <= i) ||
          !["SINGLE", "MULTIPLE", "RATING"].includes(q.type) ||
          (!q.options.some((o) => o.id === r.value) &&
            !(q.type === "RATING" && /^[1-5]$/.test(r.value)))
        )
          ctx.addIssue({
            code: "custom",
            message: `第 ${i + 1} 題跳題目標須為後面的題目或完成，條件須對應有效選項`,
          });
      });
    });
  });
export type Survey = z.infer<typeof surveySchema>;
export type SurveyQuestion = z.infer<typeof questionSchema>;
export type Answer = string | string[] | number;
export type Answers = Record<string, Answer>;
export function isSurveyOpen(s: Survey, now = new Date()) {
  return (
    s.status === "ACTIVE" &&
    (!s.startsAt || new Date(s.startsAt) <= now) &&
    (!s.endsAt || new Date(s.endsAt) > now)
  );
}
export function answerError(q: SurveyQuestion, a: Answer | undefined) {
  const empty =
    a == null ||
    (typeof a === "string" && a.trim() === "") ||
    (Array.isArray(a) && a.length === 0);
  if (empty) return q.required ? "請先完成這一題" : "";
  if (q.type === "TEXT")
    return typeof a === "string" && a.trim().length <= 1000
      ? ""
      : "請輸入 1,000 字內的文字";
  if (q.type === "RATING")
    return typeof a === "number" && Number.isInteger(a) && a >= 1 && a <= 5
      ? ""
      : "請選擇 1 至 5 分";
  if (q.type === "SINGLE")
    return typeof a === "string" && q.options.some((o) => o.id === a)
      ? ""
      : "請選擇有效選項";
  return Array.isArray(a) &&
    a.length <= q.maxSelections &&
    new Set(a).size === a.length &&
    a.every((x) => q.options.some((o) => o.id === x))
    ? ""
    : `最多選 ${q.maxSelections} 項`;
}
export function nextQuestion(
  s: Survey,
  q: SurveyQuestion,
  a: Answer | undefined,
) {
  const branch = q.logic.find((r) =>
    Array.isArray(a) ? a.includes(r.value) : String(a) === r.value,
  );
  if (branch)
    return branch.target === "END"
      ? null
      : (s.questions.find((x) => x.id === branch.target) ?? null);
  return s.questions[s.questions.findIndex((x) => x.id === q.id) + 1] ?? null;
}
export function validatedAnswers(s: Survey, answers: Answers) {
  const cleaned: Answers = {};
  let q: SurveyQuestion | null = s.questions[0] ?? null;
  const visited = new Set<string>();
  while (q) {
    if (visited.has(q.id)) throw Error("問卷跳題規則有循環");
    visited.add(q.id);
    const a = answers[q.id],
      e = answerError(q, a);
    if (e) throw Error(`${q.title}：${e}`);
    if (a !== undefined) cleaned[q.id] = a;
    q = nextQuestion(s, q, a);
  }
  return cleaned;
}
const choice = (
  id: string,
  title: string,
  options: string[],
  multiple = false,
): SurveyQuestion => ({
  id,
  title,
  description: "",
  type: multiple ? "MULTIPLE" : "SINGLE",
  required: true,
  options: options.map((label, i) => ({ id: `o${i + 1}`, label })),
  maxSelections: multiple ? options.length : 1,
  logic: [],
});
export const DEFAULT_SURVEYS: Survey[] = [
  {
    id: "pet-preferences",
    title: "聊聊牠的日常，找到更合適的選物",
    description:
      "約 2 分鐘。了解你的毛孩與購物習慣，完成後送 30 點。每位會員限領一次，答案用於站內選物與服務調整。",
    image: "/images/campaigns/survey-v3.webp",
    status: "ACTIVE",
    startsAt: null,
    endsAt: null,
    version: 1,
    maxResponses: 3000,
    reward: {
      kind: "POINTS",
      points: 30,
      title: "毛孩生活問卷回饋",
      discountNt: 50,
      minSpendNt: 600,
      validDays: 30,
    },
    questions: [
      choice(
        "species",
        "你和哪些毛孩一起生活？",
        ["貓咪", "狗狗", "倉鼠", "兔兔"],
        true,
      ),
      choice("priority", "挑食物時，你最在意什麼？", [
        "成分與過敏原",
        "價格與份量",
        "毛孩喜歡的口味",
        "方便定期購買",
      ]),
      choice("shopping", "平常多久買一次毛孩用品？", [
        "每兩週",
        "每月",
        "每兩個月",
        "沒有固定時間",
      ]),
      {
        ...choice("autoship", "你會想嘗試定期配送嗎？", [
          "想了解",
          "目前不需要",
        ]),
        logic: [{ value: "o2", target: "END" }],
      },
      choice("frequency", "哪種配送節奏最方便？", [
        "每兩週",
        "每四週",
        "每六週",
        "每八週",
      ]),
    ],
  },
  {
    id: "site-feedback",
    title: "這裡好不好用，想聽你說",
    description:
      "約 2 分鐘。告訴我們找商品與使用工具的感受，完成送 50 元購物券，商品折後滿 600 元可用，有效 30 天。",
    image: "/images/campaigns/survey-v3.webp",
    status: "ACTIVE",
    startsAt: null,
    endsAt: null,
    version: 1,
    maxResponses: 3000,
    reward: {
      kind: "VOUCHER",
      points: 30,
      title: "網站回饋 50 元券",
      discountNt: 50,
      minSpendNt: 600,
      validDays: 30,
    },
    questions: [
      {
        id: "ease",
        title: "找商品的過程順不順？",
        description: "1 分是很不順，5 分是很順。",
        type: "RATING",
        required: true,
        options: [],
        maxSelections: 1,
        logic: [],
      },
      choice("feature", "哪個功能最幫得上忙？", [
        "選物羅盤",
        "成分比較",
        "家庭共買",
        "定期配送",
        "還沒使用工具",
      ]),
      choice("improve", "你最希望先改進哪裡？", [
        "分類與搜尋",
        "商品資訊",
        "會員權益",
        "購物與結帳",
      ]),
      {
        id: "note",
        title: "還想跟我們說什麼？",
        description: "不用填姓名、電話或其他個人資料。",
        type: "TEXT",
        required: false,
        options: [],
        maxSelections: 1,
        logic: [],
      },
    ],
  },
];
