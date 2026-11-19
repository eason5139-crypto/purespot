import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { reconcilePoints } from "./membership";
import {
  INITIAL_DEMO_THREADS,
  MEMBER_TIER_META,
  SUPPORT_CATEGORIES,
  mapLegacyKindToCategory,
  resolveMemberTier,
  type MemberTierCode,
  type SupportCategory,
  type SupportChatMessage,
  type SupportThread,
  type SupportTicketStatus,
} from "@/lib/supportTypes";

const EVENT_TYPE = "SUPPORT_CHAT_THREAD";

const memoryFallback = new Map<string, SupportThread>(
  INITIAL_DEMO_THREADS.map((t) => [t.id, t]),
);

async function getMembershipThresholds() {
  try {
    const cfg = await db.membershipConfig.findUnique({ where: { id: "main" } });
    if (cfg) {
      return {
        silverSpendNt: cfg.silverSpendNt,
        goldSpendNt: cfg.goldSpendNt,
      };
    }
  } catch {
    // fallback default thresholds
  }
  return { silverSpendNt: 3000, goldSpendNt: 12000 };
}

export async function getUserTierProfile(userId: string | null): Promise<{
  userId: string | null;
  isLoggedIn: boolean;
  name: string;
  email: string;
  tier: MemberTierCode;
  tierLabel: string;
  priority: number;
  spentNt: number;
  points: number;
  nextTierNt: number | null;
  ordersCount: number;
}> {
  if (!userId) {
    const meta = MEMBER_TIER_META.GUEST;
    return {
      userId: null,
      isLoggedIn: false,
      name: "訪客飼主",
      email: "",
      tier: "GUEST",
      tierLabel: meta.label,
      priority: meta.priority,
      spentNt: 0,
      points: 0,
      nextTierNt: 3000,
      ordersCount: 0,
    };
  }

  try {
    await reconcilePoints(userId);
    const [user, config, pointBalance] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        include: {
          orders: {
            where: {
              status: { in: ["PAID", "PROCESSING", "DISPATCHED", "COMPLETED"] },
            },
            select: { totalNt: true },
          },
        },
      }),
      getMembershipThresholds(),
      db.pointEntry.aggregate({
        where: { userId },
        _sum: { points: true },
      }),
    ]);

    if (!user) {
      const meta = MEMBER_TIER_META.GUEST;
      return {
        userId: null,
        isLoggedIn: false,
        name: "訪客飼主",
        email: "",
        tier: "GUEST",
        tierLabel: meta.label,
        priority: meta.priority,
        spentNt: 0,
        points: 0,
        nextTierNt: config.silverSpendNt,
        ordersCount: 0,
      };
    }

    const spentNt = user.orders.reduce((acc, o) => acc + o.totalNt, 0);
    const points = Math.max(0, pointBalance._sum.points ?? 0);
    const tier = resolveMemberTier(spentNt, true, config);
    const meta = MEMBER_TIER_META[tier];
    const nextTierNt =
      spentNt < config.silverSpendNt
        ? config.silverSpendNt
        : spentNt < config.goldSpendNt
          ? config.goldSpendNt
          : null;

    return {
      userId: user.id,
      isLoggedIn: true,
      name: user.name || user.email.split("@")[0] || "會員飼主",
      email: user.email,
      tier,
      tierLabel: meta.label,
      priority: meta.priority,
      spentNt,
      points,
      nextTierNt,
      ordersCount: user.orders.length,
    };
  } catch {
    const meta = MEMBER_TIER_META.MEMBER;
    return {
      userId,
      isLoggedIn: true,
      name: "會員飼主",
      email: "",
      tier: "MEMBER",
      tierLabel: meta.label,
      priority: meta.priority,
      spentNt: 0,
      points: 120,
      nextTierNt: 3000,
      ordersCount: 0,
    };
  }
}

async function ensureSeedThreads() {
  try {
    const count = await db.outboxEvent.count({ where: { type: EVENT_TYPE } });
    if (count === 0) {
      for (const thread of INITIAL_DEMO_THREADS) {
        await db.outboxEvent.upsert({
          where: { dedupeKey: `support-thread:${thread.id}` },
          create: {
            id: thread.id,
            dedupeKey: `support-thread:${thread.id}`,
            type: EVENT_TYPE,
            payload: thread as unknown as Prisma.InputJsonValue,
          },
          update: {},
        });
      }
    }
  } catch {
    // ignore if offline
  }
}

function normalizePayload(raw: unknown): SupportThread | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Partial<SupportThread>;
  if (!obj.id || !obj.category || !Array.isArray(obj.messages)) return null;
  const tierCode: MemberTierCode =
    obj.memberTier && obj.memberTier in MEMBER_TIER_META
      ? obj.memberTier
      : "GUEST";
  const meta = MEMBER_TIER_META[tierCode];
  return {
    id: obj.id,
    source: obj.source ?? "CHAT",
    userId: obj.userId ?? null,
    clientToken: obj.clientToken ?? "",
    buyerName: obj.buyerName || "毛孩飼主",
    buyerEmail: obj.buyerEmail || "未留信箱",
    memberTier: tierCode,
    memberTierLabel: meta.label,
    tierPriority: meta.priority,
    totalSpentNt: typeof obj.totalSpentNt === "number" ? obj.totalSpentNt : 0,
    ordersCount: typeof obj.ordersCount === "number" ? obj.ordersCount : 0,
    category: obj.category,
    subject: obj.subject || "線上客服諮詢",
    status: obj.status ?? "OPEN",
    orderId: obj.orderId ?? null,
    petSummary: obj.petSummary ?? null,
    messages: obj.messages,
    createdAt: obj.createdAt || new Date().toISOString(),
    updatedAt: obj.updatedAt || new Date().toISOString(),
  };
}

export async function listAllSupportThreads(): Promise<SupportThread[]> {
  await ensureSeedThreads();
  const map = new Map<string, SupportThread>();

  try {
    const [events, legacyRequests, config] = await Promise.all([
      db.outboxEvent.findMany({
        where: { type: EVENT_TYPE },
        orderBy: { createdAt: "desc" },
        take: 250,
      }),
      db.supportRequest.findMany({
        include: {
          user: {
            include: {
              orders: {
                where: {
                  status: {
                    in: ["PAID", "PROCESSING", "DISPATCHED", "COMPLETED"],
                  },
                },
                select: { totalNt: true },
              },
            },
          },
          order: { select: { status: true, totalNt: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 150,
      }),
      getMembershipThresholds(),
    ]);

    for (const ev of events) {
      const parsed = normalizePayload(ev.payload);
      if (parsed) {
        map.set(parsed.id, parsed);
      }
    }

    for (const req of legacyRequests) {
      if (map.has(req.id)) continue;
      const spentNt = req.user.orders.reduce((sum, o) => sum + o.totalNt, 0);
      const tier = resolveMemberTier(spentNt, true, config);
      const meta = MEMBER_TIER_META[tier];
      const category = mapLegacyKindToCategory(req.kind);
      const catMeta =
        SUPPORT_CATEGORIES.find((c) => c.id === category) ??
        SUPPORT_CATEGORIES[0]!;
      const messages: SupportChatMessage[] = [
        {
          id: `${req.id}-m1`,
          sender: "BUYER",
          senderName: req.user.name || req.user.email,
          body: req.message,
          createdAt: req.createdAt.toISOString(),
        },
      ];
      if (req.response) {
        messages.push({
          id: `${req.id}-m2`,
          sender: "ADMIN",
          senderName: "PURESPOT 客服團隊",
          body: req.response,
          createdAt: req.updatedAt.toISOString(),
        });
      }

      map.set(req.id, {
        id: req.id,
        source: "ORDER_REQUEST",
        userId: req.userId,
        clientToken: req.userId,
        buyerName: req.user.name || req.user.email,
        buyerEmail: req.user.email,
        memberTier: tier,
        memberTierLabel: meta.label,
        tierPriority: meta.priority,
        totalSpentNt: spentNt,
        ordersCount: req.user.orders.length,
        category,
        subject: `${catMeta.shortLabel} · 訂單 #${req.orderId.slice(0, 8)}`,
        status: (req.status as SupportTicketStatus) || "OPEN",
        orderId: req.orderId,
        petSummary: null,
        messages,
        createdAt: req.createdAt.toISOString(),
        updatedAt: req.updatedAt.toISOString(),
      });
    }
  } catch {
    for (const [id, thread] of memoryFallback.entries()) {
      map.set(id, thread);
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const aOpen = a.status !== "RESOLVED" ? 0 : 1;
    const bOpen = b.status !== "RESOLVED" ? 0 : 1;
    if (aOpen !== bOpen) return aOpen - bOpen;
    if (a.tierPriority !== b.tierPriority) return a.tierPriority - b.tierPriority;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export async function listBuyerThreads(params: {
  userId: string | null;
  clientToken: string;
}): Promise<SupportThread[]> {
  const all = await listAllSupportThreads();
  return all.filter((t) => {
    if (params.userId && t.userId === params.userId) return true;
    if (params.clientToken && t.clientToken === params.clientToken) return true;
    return false;
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
}): Promise<SupportThread> {
  // 直接從真實會員帳戶讀取等級、累計消費與訂單數，絕不允許前端偽造或手選等級
  const profile = await getUserTierProfile(input.userId);
  const tierCode: MemberTierCode = profile.tier;
  const meta = MEMBER_TIER_META[tierCode];

  const now = new Date().toISOString();
  const id = `chat-${randomUUID().slice(0, 12)}`;
  const buyerName =
    (profile.isLoggedIn ? profile.name : input.buyerName?.trim()) ||
    profile.name ||
    "台灣街坊毛孩飼主";
  const buyerEmail =
    (profile.isLoggedIn ? profile.email : input.buyerEmail?.trim()) ||
    profile.email ||
    "guest@purespot.tw";

  const thread: SupportThread = {
    id,
    source: "CHAT",
    userId: input.userId,
    clientToken: input.clientToken,
    buyerName,
    buyerEmail,
    memberTier: tierCode,
    memberTierLabel: meta.label,
    tierPriority: meta.priority,
    totalSpentNt: profile.spentNt,
    ordersCount: profile.ordersCount,
    category: input.category,
    subject: input.subject.trim(),
    status: "OPEN",
    orderId: input.orderId?.trim() || null,
    petSummary: input.petSummary?.trim() || null,
    messages: [
      {
        id: `msg-${randomUUID().slice(0, 8)}`,
        sender: "BUYER",
        senderName: buyerName,
        body: input.message.trim(),
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  memoryFallback.set(id, thread);

  try {
    await db.outboxEvent.upsert({
      where: { dedupeKey: `support-thread:${id}` },
      create: {
        id,
        dedupeKey: `support-thread:${id}`,
        type: EVENT_TYPE,
        payload: thread as unknown as Prisma.InputJsonValue,
      },
      update: {
        payload: thread as unknown as Prisma.InputJsonValue,
      },
    });
  } catch {
    // already stored in memoryFallback
  }

  return thread;
}

export async function appendBuyerMessage(input: {
  threadId: string;
  userId: string | null;
  clientToken: string;
  message: string;
}): Promise<SupportThread | null> {
  const all = await listAllSupportThreads();
  const target = all.find((t) => t.id === input.threadId);
  if (!target) return null;

  const now = new Date().toISOString();
  const nextMsg: SupportChatMessage = {
    id: `msg-${randomUUID().slice(0, 8)}`,
    sender: "BUYER",
    senderName: target.buyerName,
    body: input.message.trim(),
    createdAt: now,
  };

  const updated: SupportThread = {
    ...target,
    status: target.status === "RESOLVED" ? "OPEN" : target.status,
    messages: [...target.messages, nextMsg],
    updatedAt: now,
  };

  memoryFallback.set(updated.id, updated);

  try {
    await db.outboxEvent.upsert({
      where: { dedupeKey: `support-thread:${updated.id}` },
      create: {
        id: updated.id,
        dedupeKey: `support-thread:${updated.id}`,
        type: EVENT_TYPE,
        payload: updated as unknown as Prisma.InputJsonValue,
      },
      update: {
        payload: updated as unknown as Prisma.InputJsonValue,
      },
    });
  } catch {
    // memoryFallback updated
  }

  return updated;
}

export async function adminReplySupportThread(input: {
  id: string;
  status: SupportTicketStatus;
  response: string | null;
  category?: SupportCategory;
  adminName?: string;
}): Promise<SupportThread | null> {
  const all = await listAllSupportThreads();
  const target = all.find((t) => t.id === input.id);
  if (!target) return null;

  const now = new Date().toISOString();
  const nextMessages = [...target.messages];
  const trimmed = input.response?.trim() || "";

  if (trimmed) {
    const lastAdmin = [...nextMessages]
      .reverse()
      .find((m) => m.sender === "ADMIN");
    if (!lastAdmin || lastAdmin.body !== trimmed) {
      nextMessages.push({
        id: `msg-${randomUUID().slice(0, 8)}`,
        sender: "ADMIN",
        senderName: input.adminName || "PURESPOT 職人客服中心",
        body: trimmed,
        createdAt: now,
      });
    }
  }

  const updated: SupportThread = {
    ...target,
    status: input.status,
    category: input.category ?? target.category,
    messages: nextMessages,
    updatedAt: now,
  };

  memoryFallback.set(updated.id, updated);

  try {
    await db.outboxEvent.upsert({
      where: { dedupeKey: `support-thread:${updated.id}` },
      create: {
        id: updated.id,
        dedupeKey: `support-thread:${updated.id}`,
        type: EVENT_TYPE,
        payload: updated as unknown as Prisma.InputJsonValue,
      },
      update: {
        payload: updated as unknown as Prisma.InputJsonValue,
      },
    });

    if (target.source === "ORDER_REQUEST") {
      await db.supportRequest
        .update({
          where: { id: target.id },
          data: {
            status: input.status,
            response: trimmed || null,
          },
        })
        .catch(() => {});
    }

    if (target.userId && trimmed) {
      await db.memberNotification
        .create({
          data: {
            userId: target.userId,
            title: `客服已回覆您的諮詢：${target.subject}`,
            body: trimmed.slice(0, 160),
            href: "/account",
          },
        })
        .catch(() => {});
    }
  } catch {
    // fallback already saved
  }

  return updated;
}
