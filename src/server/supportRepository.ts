import "server-only";

import { Prisma } from "@prisma/client";
import { db } from "./db";
import { categoryLabel } from "@/lib/supportDesk";

import { getMemberPolicy } from "./memberPolicyRepository";
import { evaluateCycle, type MemberCycle } from "@/lib/memberPolicy";
import {
  MEMBER_TIER_META,
  SUPPORT_CATEGORIES,
  mapLegacyKindToCategory,
  type MemberTierCode,
  type SupportCategory,
  type SupportChatMessage,
  type SupportThread,
  type SupportTicketStatus,
} from "@/lib/supportTypes";

const EVENT_TYPE = "SUPPORT_CHAT_THREAD";

export async function getUserTierProfile(userId: string | null) {
  if (!userId) {
    const m = MEMBER_TIER_META.GUEST;
    return {
      userId: null,
      isLoggedIn: false,
      name: "訪客",
      email: "",
      tier: "GUEST" as MemberTierCode,
      tierLabel: m.label,
      priority: m.priority,
      spentNt: 0,
      points: 0,
      nextTierNt: 3000,
      ordersCount: 0,
    };
  }
  const [user, policy, cycle, orders] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    }),
    getMemberPolicy(),
    db.outboxEvent.findUnique({
      where: { dedupeKey: `MEMBER_CYCLE:${userId}` },
      select: { payload: true },
    }),
    db.order.findMany({
      where: { userId, status: "COMPLETED" },
      select: {
        createdAt: true,
        status: true,
        totalNt: true,
        shippingNt: true,
      },
    }),
  ]);
  const membership = evaluateCycle(
      policy,
      cycle?.payload as MemberCycle | null,
      orders,
    ),
    tier = membership.current.code;
  return {
    userId,
    isLoggedIn: true,
    name: user.name || "會員",
    email: user.email,
    tier: tier as MemberTierCode,
    tierLabel: membership.current.name,
    priority: MEMBER_TIER_META[tier].priority,
    spentNt: membership.spendNt,
    points: 0,
    nextTierNt: membership.next?.spendNt ?? null,
    ordersCount: orders.length,
  };
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
    ...obj,
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
    createdAt: obj.createdAt || "",
    updatedAt: obj.updatedAt || "",
  };
}

export async function listAllSupportThreads(scope?: {
  userId: string | null;
  browserKey: string;
}): Promise<SupportThread[]> {
  const map = new Map<string, SupportThread>();

  const [events, legacyRequests, config] = await Promise.all([
    db.outboxEvent.findMany({
      where: {
        type: EVENT_TYPE,
        ...(scope
          ? {
              OR: [
                ...(scope.userId
                  ? [{ payload: { path: ["userId"], equals: scope.userId } }]
                  : []),
                {
                  AND: [
                    { payload: { path: ["userId"], equals: Prisma.JsonNull } },
                    {
                      payload: {
                        path: ["clientToken"],
                        equals: scope.browserKey,
                      },
                    },
                  ],
                },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    }),
    db.supportRequest.findMany({
      ...(scope
        ? { where: { userId: scope.userId || "__no_guest_orders__" } }
        : {}),
      include: {
        user: {
          include: {
            orders: {
              where: {
                status: {
                  in: ["PAID", "PROCESSING", "DISPATCHED", "COMPLETED"],
                },
              },
              select: {
                createdAt: true,
                status: true,
                totalNt: true,
                shippingNt: true,
              },
            },
          },
        },
        order: { select: { status: true, totalNt: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    getMemberPolicy(),
  ]);

  for (const ev of events) {
    const parsed = normalizePayload(ev.payload);
    if (parsed) {
      map.set(parsed.id, parsed);
    }
  }

  const cycleRows = await db.outboxEvent.findMany({
    where: {
      dedupeKey: {
        in: [...new Set(legacyRequests.map((r) => `MEMBER_CYCLE:${r.userId}`))],
      },
    },
    select: { dedupeKey: true, payload: true },
  });
  const cycleByUser = new Map(
    cycleRows.map((r) => [r.dedupeKey, r.payload as MemberCycle]),
  );
  for (const req of legacyRequests) {
    if (map.has(req.id)) continue;
    const membership = evaluateCycle(
      config,
      cycleByUser.get(`MEMBER_CYCLE:${req.userId}`) ?? null,
      req.user.orders,
    );
    const spentNt = membership.spendNt;
    const tier = membership.current.code;
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
      subject: `${categoryLabel(category)} · 訂單 #${req.orderId.slice(0, 8)}`,
      status: (req.status as SupportTicketStatus) || "OPEN",
      orderId: req.orderId,
      petSummary: null,
      messages,
      createdAt: req.createdAt.toISOString(),
      updatedAt: req.updatedAt.toISOString(),
    });
  }

  return Array.from(map.values()).sort((a, b) => {
    const aOpen = a.status !== "RESOLVED" ? 0 : 1;
    const bOpen = b.status !== "RESOLVED" ? 0 : 1;
    if (aOpen !== bOpen) return aOpen - bOpen;
    if (a.tierPriority !== b.tierPriority)
      return a.tierPriority - b.tierPriority;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export async function listBuyerThreads(params: {
  userId: string | null;
  clientToken: string;
}) {
  const all = await listAllSupportThreads({
    userId: params.userId,
    browserKey: params.clientToken,
  });
  return all.filter((t) =>
    t.userId
      ? t.userId === params.userId
      : t.source === "CHAT" && t.clientToken === params.clientToken,
  );
}
export { createSupportThread, appendBuyerMessage } from "./supportOperations";
