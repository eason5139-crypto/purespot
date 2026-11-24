import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { db } from "./db";
import { ApiError } from "./http";
import { getUserTierProfile, listAllSupportThreads } from "./supportRepository";
import {
  DEFAULT_SUPPORT_SETTINGS,
  firstSupportResponse,
  hasUnknownLegacyResponse,
  supportSettingsSchema,
} from "@/lib/supportDesk";
import type {
  SupportCategory,
  SupportThread,
  SupportTicketStatus,
} from "@/lib/supportTypes";

const key = (id: string) => `support-thread:${id}`;
const json = (v: unknown) => v as Prisma.InputJsonValue;
export async function supportBrowserKey() {
  const jar = await cookies();
  const saved = jar.get("purespot-support-browser")?.value;
  if (saved && /^visitor-[a-f0-9-]{36}$/.test(saved)) return saved;
  const token = `visitor-${randomUUID()}`;
  jar.set("purespot-support-browser", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 31536000,
  });
  return token;
}
export function ownsThread(
  t: SupportThread,
  userId: string | null,
  browserKey: string,
) {
  return t.userId
    ? t.userId === userId
    : !!browserKey && t.source === "CHAT" && t.clientToken === browserKey;
}
export async function getSupportSettings() {
  const row = await db.outboxEvent.findUnique({
    where: { dedupeKey: "SUPPORT_SETTINGS:v2" },
    select: { payload: true },
  });
  return row
    ? supportSettingsSchema.parse(row.payload)
    : DEFAULT_SUPPORT_SETTINGS;
}
export async function saveSupportSettings(input: unknown) {
  const value = supportSettingsSchema.parse(input);
  await db.outboxEvent.upsert({
    where: { dedupeKey: "SUPPORT_SETTINGS:v2" },
    create: {
      dedupeKey: "SUPPORT_SETTINGS:v2",
      type: "SUPPORT_SETTINGS",
      payload: json(value),
      processedAt: new Date(),
    },
    update: { payload: json(value), processedAt: new Date() },
  });
  return value;
}
async function transaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++)
    try {
      return await db.$transaction(fn, {
        isolationLevel: "Serializable",
        timeout: 30000,
      });
    } catch (e) {
      if (
        attempt < 3 &&
        e instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2034", "P2002"].includes(e.code)
      )
        continue;
      throw e;
    }
}
async function ensureThread(id: string) {
  const saved = await db.outboxEvent.findUnique({
    where: { dedupeKey: key(id) },
  });
  if (saved) return;
  const legacy = (await listAllSupportThreads()).find((t) => t.id === id);
  if (!legacy) throw new ApiError(404, "找不到這筆諮詢");
  await db.outboxEvent.upsert({
    where: { dedupeKey: key(id) },
    create: {
      dedupeKey: key(id),
      type: "SUPPORT_CHAT_THREAD",
      payload: json(legacy),
      processedAt: new Date(),
    },
    update: {},
  });
}
export async function mutateSupport(
  ids: string[],
  author: string,
  requestId: string,
  fn: (t: SupportThread) => SupportThread,
  notify = false,
) {
  const unique = [...new Set(ids)];
  if (!unique.length || unique.length > 20)
    throw new ApiError(400, "一次請選取 1 至 20 筆案件");
  await Promise.all(unique.map(ensureThread));
  return transaction(async (tx) => {
    const receiptKey = `SUPPORT_ACTION:${author}:${requestId}`;
    const receipt = await tx.outboxEvent.findUnique({
      where: { dedupeKey: receiptKey },
    });
    const rows = await tx.outboxEvent.findMany({
      where: { dedupeKey: { in: unique.map(key) } },
    });
    if (rows.length !== unique.length)
      throw new ApiError(404, "部分案件已找不到，請更新列表");
    if (receipt) {
      const prior = receipt.payload as unknown as SupportThread[];
      if (
        JSON.stringify(prior.map((t) => t.id).sort()) !==
        JSON.stringify([...unique].sort())
      )
        throw new ApiError(409, "本次操作已用於其他案件，請更新後再確認");
      if (!author.startsWith("admin:"))
        for (const row of rows) {
          const t = row.payload as unknown as SupportThread;
          if (t.userId ? t.userId !== author : t.clientToken !== author)
            throw new ApiError(404, "找不到這筆諮詢");
        }
      return prior;
    }
    const changed = rows.map((row) =>
      fn(row.payload as unknown as SupportThread),
    );
    for (const t of changed) {
      await tx.outboxEvent.update({
        where: { dedupeKey: key(t.id) },
        data: { payload: json(t), processedAt: new Date() },
      });
      if (t.source === "ORDER_REQUEST")
        await tx.supportRequest.update({
          where: { id: t.id },
          data: {
            status: t.status,
            response:
              [...t.messages].reverse().find((m) => m.sender === "ADMIN")
                ?.body ?? null,
          },
        });
    }
    const notifications = changed
      .filter((t) => {
        const old = rows.find((r) => r.dedupeKey === key(t.id))!
          .payload as unknown as SupportThread;
        return (
          notify &&
          t.userId &&
          (t.messages.length > old.messages.length ||
            (t.status === "RESOLVED" && old.status !== "RESOLVED"))
        );
      })
      .map((t) => ({
        userId: t.userId!,
        title:
          t.status === "RESOLVED"
            ? `諮詢已完成：${t.subject}`
            : `客服已回覆：${t.subject}`,
        body:
          [...t.messages]
            .reverse()
            .find((m) => m.sender === "ADMIN")
            ?.body.slice(0, 160) || "您可在客服紀錄查看處理結果。",
        href: `/account?tab=support&ticket=${t.id}`,
      }));
    if (notifications.length)
      await tx.memberNotification.createMany({ data: notifications });
    await tx.outboxEvent.create({
      data: {
        dedupeKey: receiptKey,
        type: "SUPPORT_ACTION",
        payload: json(changed),
        processedAt: new Date(),
      },
    });
    return changed;
  });
}
export async function createSupportThread(input: {
  userId: string | null;
  clientToken: string;
  buyerName?: string;
  buyerEmail?: string;
  category: SupportCategory;
  subject: string;
  message: string;
  orderId?: string | null;
  petSummary?: string | null;
  parentId?: string | null;
  requestId?: string;
}) {
  const requestId = input.requestId ?? randomUUID(),
    receiptKey = `SUPPORT_CREATE:${input.userId ?? input.clientToken}:${requestId}`;
  const profile = await getUserTierProfile(input.userId);
  if (
    input.orderId &&
    (!input.userId ||
      !(await db.order.findFirst({
        where: { id: input.orderId, userId: input.userId },
        select: { id: true },
      })))
  )
    throw new ApiError(404, "請選擇自己帳戶的訂單");
  if (input.parentId) {
    const parent = (
      await listAllSupportThreads({
        userId: input.userId,
        browserKey: input.clientToken,
      })
    ).find((t) => t.id === input.parentId);
    if (
      !parent ||
      !ownsThread(parent, input.userId, input.clientToken) ||
      parent.status !== "RESOLVED"
    )
      throw new ApiError(404, "找不到可延伸提問的歷史案件");
  }
  return transaction(async (tx) => {
    const old = await tx.outboxEvent.findUnique({
      where: { dedupeKey: receiptKey },
    });
    if (old) return old.payload as unknown as SupportThread;
    const now = new Date().toISOString(),
      id = `chat-${randomUUID()}`;
    const t: SupportThread = {
      id,
      source: "CHAT",
      userId: input.userId,
      clientToken: input.clientToken,
      buyerName:
        (input.userId ? profile.name : input.buyerName?.trim()) || "訪客",
      buyerEmail:
        (input.userId ? profile.email : input.buyerEmail?.trim()) || "",
      memberTier: profile.tier,
      memberTierLabel: profile.tierLabel,
      tierPriority: profile.priority,
      totalSpentNt: profile.spentNt,
      ordersCount: profile.ordersCount,
      category: input.category,
      subject: input.subject.trim(),
      status: "OPEN",
      orderId: input.orderId ?? null,
      petSummary: input.petSummary ?? null,
      parentId: input.parentId ?? null,
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
      firstResponseAt: null,
      tags: [],
      internalNotes: [],
      activity: [{ action: "建立諮詢", author: "買家", at: now }],
      version: 1,
      feedback: null,
      messages: [
        {
          id: randomUUID(),
          sender: "BUYER",
          senderName: (input.userId ? profile.name : input.buyerName) || "訪客",
          body: input.message.trim(),
          createdAt: now,
        },
      ],
    };
    await tx.outboxEvent.createMany({
      data: [
        {
          dedupeKey: key(id),
          type: "SUPPORT_CHAT_THREAD",
          payload: json(t),
          processedAt: new Date(),
        },
        {
          dedupeKey: receiptKey,
          type: "SUPPORT_CREATE",
          payload: json(t),
          processedAt: new Date(),
        },
      ],
    });
    return t;
  });
}
export async function appendBuyerMessage(input: {
  threadId: string;
  userId: string | null;
  clientToken: string;
  message: string;
  requestId?: string;
}) {
  return (
    await mutateSupport(
      [input.threadId],
      input.userId ?? input.clientToken,
      input.requestId ?? randomUUID(),
      (t) => {
        if (!ownsThread(t, input.userId, input.clientToken))
          throw new ApiError(404, "找不到這筆諮詢");
        if (t.status === "RESOLVED")
          throw new ApiError(409, "這筆諮詢已完成，請從歷史紀錄另開新諮詢");
        const now = new Date().toISOString();
        return {
          ...t,
          updatedAt: now,
          version: (t.version ?? 0) + 1,
          messages: [
            ...t.messages,
            {
              id: randomUUID(),
              sender: "BUYER",
              senderName: t.buyerName,
              body: input.message.trim(),
              createdAt: now,
            },
          ],
        };
      },
    )
  )[0]!;
}
export async function adminUpdateSupport(input: {
  ids: string[];
  status?: SupportTicketStatus;
  response?: string | null;
  category?: SupportCategory;
  note?: string;
  tags?: string[];
  adminName: string;
  requestId: string;
  expectedVersion?: number;
}) {
  return mutateSupport(
    input.ids,
    `admin:${input.adminName}`,
    input.requestId,
    (t) => {
      if (
        input.expectedVersion !== undefined &&
        (t.version ?? 0) !== input.expectedVersion
      )
        throw new ApiError(
          409,
          "案件剛有新訊息，請更新後再處理；你的回覆內容仍保留",
        );
      if (
        t.status === "RESOLVED" &&
        ((input.status && input.status !== "RESOLVED") ||
          input.response?.trim())
      )
        throw new ApiError(409, "已完成的對話保留為歷史，請另開新諮詢");
      const now = new Date().toISOString(),
        response = input.response?.trim();
      const closing = t.status !== "RESOLVED" && input.status === "RESOLVED";
      return {
        ...t,
        status: input.status ?? t.status,
        category: input.category ?? t.category,
        tags: input.tags ?? t.tags ?? [],
        version: (t.version ?? 0) + 1,
        updatedAt: now,
        resolvedAt: closing ? now : (t.resolvedAt ?? null),
        firstResponseAt: response
          ? hasUnknownLegacyResponse(t)
            ? null
            : firstSupportResponse(t) || now
          : (t.firstResponseAt ?? null),
        messages: response
          ? [
              ...t.messages,
              {
                id: randomUUID(),
                sender: "ADMIN",
                senderName: "PURESPOT 客服",
                body: response,
                createdAt: now,
              },
            ]
          : t.messages,
        internalNotes: input.note?.trim()
          ? [
              ...(t.internalNotes ?? []),
              {
                id: randomUUID(),
                body: input.note.trim(),
                author: input.adminName,
                at: now,
              },
            ]
          : (t.internalNotes ?? []),
        activity: [
          ...(t.activity ?? []),
          {
            action: closing
              ? "完成結案"
              : response
                ? "回覆買家"
                : input.note?.trim()
                  ? "新增內部備註"
                  : "更新分類與標籤",
            author: input.adminName,
            at: now,
          },
        ],
      };
    },
    !!input.response?.trim() || input.status === "RESOLVED",
  );
}
export async function rateSupport(input: {
  id: string;
  userId: string | null;
  clientToken: string;
  score: number;
  comment: string;
  requestId: string;
}) {
  return (
    await mutateSupport(
      [input.id],
      input.userId ?? input.clientToken,
      input.requestId,
      (t) => {
        if (!ownsThread(t, input.userId, input.clientToken))
          throw new ApiError(404, "找不到這筆諮詢");
        if (t.status !== "RESOLVED")
          throw new ApiError(409, "完成的諮詢才能評價");
        if (t.feedback) throw new ApiError(409, "這筆諮詢已經評價過了");
        return {
          ...t,
          version: (t.version ?? 0) + 1,
          feedback: {
            score: input.score,
            comment: input.comment.trim(),
            at: new Date().toISOString(),
          },
        };
      },
    )
  )[0]!;
}
export async function claimSupport(userId: string, browserKey: string) {
  const guests = (
    await listAllSupportThreads({ userId: null, browserKey })
  ).filter((t) => !t.userId && ownsThread(t, null, browserKey));
  let count = 0;
  for (let i = 0; i < guests.length; i += 20) {
    const changed = await mutateSupport(
      guests.slice(i, i + 20).map((t) => t.id),
      userId,
      randomUUID(),
      (t) => {
        if (!ownsThread(t, null, browserKey))
          throw new ApiError(409, "紀錄歸屬已變更，請更新後確認");
        return { ...t, userId, version: (t.version ?? 0) + 1 };
      },
    );
    count += changed.length;
  }
  return count;
}
