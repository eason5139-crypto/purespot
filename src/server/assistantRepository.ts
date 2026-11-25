import "server-only";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { ApiError } from "./http";
import { serializable } from "./memberPolicyRepository";
import {
  assistantSettingsSchema,
  defaultAssistantSettings,
  redactAssistantQuestion,
  type AssistantSettings,
  type AssistantMetric,
  type AssistantThread,
  type AssistantTurn,
} from "@/lib/assistant";
const json = (v: unknown) =>
  JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
const THREAD = "LITTLE_P_THREAD",
  METRIC = "LITTLE_P_METRIC";
export async function getAssistantSettings(): Promise<AssistantSettings> {
  const row = await db.outboxEvent.findUnique({
    where: { dedupeKey: "LITTLE_P_SETTINGS:v1" },
    select: { payload: true },
  });
  return row
    ? assistantSettingsSchema.parse(row.payload)
    : structuredClone(defaultAssistantSettings);
}
export async function saveAssistantSettings(input: unknown) {
  const settings = assistantSettingsSchema.parse(input);
  await db.outboxEvent.upsert({
    where: { dedupeKey: "LITTLE_P_SETTINGS:v1" },
    create: {
      dedupeKey: "LITTLE_P_SETTINGS:v1",
      type: "LITTLE_P_SETTINGS",
      payload: json(settings),
      processedAt: new Date(),
    },
    update: { payload: json(settings) },
  });
  return settings;
}
export async function assistantRateLimit(
  request: Request,
  userId: string | null,
) {
  const identity =
    userId ??
    (request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "local-guest");
  const hash = createHash("sha256").update(identity).digest("hex").slice(0, 32);
  const minute = Math.floor(Date.now() / 60000),
    key = `LITTLE_P_RATE:${hash}:${minute}`;
  await serializable(async (tx) => {
    const row = await tx.outboxEvent.findUnique({ where: { dedupeKey: key } });
    const count =
      ((row?.payload as { count?: number } | undefined)?.count ?? 0) + 1;
    if (count > 18)
      throw new ApiError(429, "小P正整理不少問題，請稍等一分鐘再問。");
    await tx.outboxEvent.upsert({
      where: { dedupeKey: key },
      create: {
        dedupeKey: key,
        type: "LITTLE_P_RATE",
        payload: { count },
        processedAt: new Date(),
      },
      update: { payload: { count } },
    });
  });
}
export async function listAssistantThreads(userId: string, days: number) {
  const rows = await db.outboxEvent.findMany({
    where: {
      type: THREAD,
      payload: { path: ["userId"], equals: userId },
      availableAt: { gte: new Date(Date.now() - days * 86400000) },
    },
    orderBy: { availableAt: "desc" },
    take: 30,
    select: { payload: true },
  });
  return rows.map(
    (r) => (r.payload as unknown as { thread: AssistantThread }).thread,
  );
}
export async function getAssistantThread(
  userId: string,
  id: string,
  days: number,
) {
  const row = await db.outboxEvent.findFirst({
    where: {
      dedupeKey: `LITTLE_P_THREAD:${id}`,
      type: THREAD,
      payload: { path: ["userId"], equals: userId },
      availableAt: { gte: new Date(Date.now() - days * 86400000) },
    },
    select: { payload: true },
  });
  if (!row)
    throw new ApiError(404, "這段對話已刪除或不屬於目前帳戶，請開始新對話。");
  return (row.payload as unknown as { thread: AssistantThread }).thread;
}
export async function saveAssistantTurn(
  userId: string,
  threadId: string,
  turn: AssistantTurn,
  mustExist = false,
) {
  return serializable(async (tx) => {
    const key = `LITTLE_P_THREAD:${threadId}`;
    const row = await tx.outboxEvent.findUnique({ where: { dedupeKey: key } });
    const saved = row?.payload as unknown as
      | { userId: string; thread: AssistantThread }
      | undefined;
    if (mustExist && !saved)
      throw new ApiError(404, "這段對話已刪除，請開始新對話。");
    if (saved && saved.userId !== userId)
      throw new ApiError(404, "找不到這段對話");
    if (saved?.thread.turns.some((t) => t.id === turn.id)) return saved.thread;
    const thread: AssistantThread = {
      id: threadId,
      title: saved?.thread.title ?? turn.question.slice(0, 32),
      turns: [...(saved?.thread.turns ?? []), turn].slice(-30),
      updatedAt: turn.createdAt,
    };
    await tx.outboxEvent.upsert({
      where: { dedupeKey: key },
      create: {
        dedupeKey: key,
        type: THREAD,
        payload: json({ userId, thread }),
        processedAt: new Date(),
        availableAt: new Date(),
      },
      update: { payload: json({ userId, thread }), availableAt: new Date() },
    });
    return thread;
  });
}
export async function deleteAssistantThreads(userId: string, id?: string) {
  return db.outboxEvent.deleteMany({
    where: {
      type: THREAD,
      ...(id ? { dedupeKey: `LITTLE_P_THREAD:${id}` } : {}),
      payload: { path: ["userId"], equals: userId },
    },
  });
}
export async function saveAssistantMetric(metric: AssistantMetric) {
  const redacted = {
    ...metric,
    question: redactAssistantQuestion(metric.question),
  };
  await db.outboxEvent.upsert({
    where: { dedupeKey: `LITTLE_P_METRIC:${metric.id}` },
    create: {
      dedupeKey: `LITTLE_P_METRIC:${metric.id}`,
      type: METRIC,
      payload: json(redacted),
      processedAt: new Date(),
    },
    update: {},
  });
}
export async function assistantMetrics(days: number) {
  const rows = await db.outboxEvent.findMany({
    where: {
      type: METRIC,
      createdAt: { gte: new Date(Date.now() - days * 86400000) },
    },
    orderBy: { createdAt: "desc" },
    take: 15000,
    select: { payload: true },
  });
  return rows.map((r) => r.payload as unknown as AssistantMetric);
}
export async function pruneAssistantData(settings: AssistantSettings) {
  await db.outboxEvent.deleteMany({
    where: {
      OR: [
        {
          type: METRIC,
          createdAt: {
            lt: new Date(Date.now() - settings.analyticsDays * 86400000),
          },
        },
        {
          type: THREAD,
          availableAt: {
            lt: new Date(Date.now() - settings.historyDays * 86400000),
          },
        },
        {
          type: "LITTLE_P_RATE",
          createdAt: { lt: new Date(Date.now() - 86400000) },
        },
      ],
    },
  });
}
