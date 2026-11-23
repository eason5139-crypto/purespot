import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { ApiError } from "./http";
import { serializable } from "./memberPolicyRepository";
import {
  DEFAULT_SURVEYS,
  isSurveyOpen,
  surveySchema,
  validatedAnswers,
  type Answers,
  type Survey,
} from "@/lib/surveys";
const json = (v: unknown) => v as Prisma.InputJsonValue;
export type SurveyResponse = {
  surveyId: string;
  version: number;
  userId: string;
  answers: Answers;
  questions: Survey["questions"];
  submittedAt: string;
  reward: { kind: string; points?: number; code?: string; title: string };
};
export async function listSurveys() {
  const rows = await db.outboxEvent.findMany({
    where: { type: "SURVEY_DEFINITION" },
    orderBy: { createdAt: "asc" },
  });
  const saved = rows.map((r) => surveySchema.parse(r.payload));
  return [
    ...saved,
    ...DEFAULT_SURVEYS.filter((s) => !saved.some((v) => v.id === s.id)),
  ];
}
export async function getSurvey(id: string) {
  const s = (await listSurveys()).find((s) => s.id === id);
  if (!s) throw new ApiError(404, "找不到問卷");
  return s;
}
export async function saveSurvey(value: unknown) {
  const s = surveySchema.parse(value);
  const old = (await listSurveys()).find((v) => v.id === s.id);
  const next = { ...s, version: (old?.version ?? 0) + 1 };
  await db.outboxEvent.upsert({
    where: { dedupeKey: `SURVEY:${s.id}` },
    create: {
      dedupeKey: `SURVEY:${s.id}`,
      type: "SURVEY_DEFINITION",
      payload: json(next),
      processedAt: new Date(),
    },
    update: { payload: json(next) },
  });
  return next;
}
export async function surveyResponses(id: string) {
  const rows = await db.outboxEvent.findMany({
    where: {
      type: "SURVEY_RESPONSE",
      payload: { path: ["surveyId"], equals: id },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({ id: r.id, ...(r.payload as SurveyResponse) }));
}
export async function surveyForUser(id: string, userId: string) {
  const s = await getSurvey(id);
  const existing = await db.outboxEvent.findUnique({
    where: { dedupeKey: `SURVEY_RESPONSE:${id}:${userId}` },
  });
  return {
    survey: s,
    open: isSurveyOpen(s),
    completed: Boolean(existing),
    receipt: existing?.payload
      ? (existing.payload as SurveyResponse).reward
      : null,
  };
}
export async function submitSurvey(
  id: string,
  userId: string,
  version: number,
  answers: Answers,
) {
  return serializable(async (tx) => {
    const row = await tx.outboxEvent.findUnique({
      where: { dedupeKey: `SURVEY:${id}` },
    });
    const s = row
      ? surveySchema.parse(row.payload)
      : DEFAULT_SURVEYS.find((s) => s.id === id);
    if (!s || !isSurveyOpen(s)) throw new ApiError(400, "這份問卷目前未開放");
    if (s.version !== version)
      throw new ApiError(409, "問卷已更新，請重新整理後填寫");
    const key = `SURVEY_RESPONSE:${id}:${userId}`;
    if (await tx.outboxEvent.findUnique({ where: { dedupeKey: key } }))
      throw new ApiError(409, "你已完成這份問卷，獎勵已記錄在帳戶");
    const count = await tx.outboxEvent.count({
      where: {
        type: "SURVEY_RESPONSE",
        payload: { path: ["surveyId"], equals: id },
      },
    });
    if (count >= s.maxResponses)
      throw new ApiError(409, "這份問卷已達收件上限");
    let cleaned: Answers;
    try {
      cleaned = validatedAnswers(s, answers);
    } catch (e) {
      throw new ApiError(
        400,
        e instanceof Error ? e.message : "問卷答案不正確",
      );
    }
    const reward: SurveyResponse["reward"] = {
      kind: s.reward.kind,
      title: s.reward.title,
    };
    if (s.reward.kind === "POINTS") {
      reward.points = s.reward.points;
      await tx.pointEntry.create({
        data: {
          userId,
          sourceKey: key,
          title: `問卷回饋：${s.title}`,
          points: s.reward.points,
        },
      });
    } else {
      const definition = await tx.reward.upsert({
        where: { id: `survey-${id}` },
        create: {
          id: `survey-${id}`,
          title: s.reward.title,
          pointsCost: 0,
          discountNt: s.reward.discountNt,
          isActive: false,
        },
        update: { title: s.reward.title, discountNt: s.reward.discountNt },
      });
      reward.code = `SURV-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const coupon = await tx.rewardRedemption.create({
        data: {
          userId,
          rewardId: definition.id,
          code: reward.code,
          pointsCost: 0,
          discountNt: s.reward.discountNt,
        },
      });
      await tx.outboxEvent.create({
        data: {
          dedupeKey: `COUPON_META:${coupon.id}`,
          type: "COUPON_META",
          payload: {
            userId,
            minSpendNt: s.reward.minSpendNt,
            expiresAt: new Date(
              Date.now() + s.reward.validDays * 86400000,
            ).toISOString(),
            source: "問卷回饋",
          },
          processedAt: new Date(),
        },
      });
    }
    const response: SurveyResponse = {
      surveyId: id,
      userId,
      version: s.version,
      questions: s.questions,
      answers: cleaned,
      submittedAt: new Date().toISOString(),
      reward,
    };
    await tx.outboxEvent.create({
      data: {
        dedupeKey: key,
        type: "SURVEY_RESPONSE",
        payload: json(response),
        processedAt: new Date(),
      },
    });
    await tx.memberNotification.create({
      data: {
        userId,
        title: "謝謝你完成問卷",
        body:
          s.reward.kind === "POINTS"
            ? `${s.reward.points} 點已入帳`
            : `${s.reward.title} 已存入我的票券`,
        href:
          s.reward.kind === "POINTS"
            ? "/account?tab=membership"
            : "/account?tab=tickets",
      },
    });
    return { reward };
  });
}
