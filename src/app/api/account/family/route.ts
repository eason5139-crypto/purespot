import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { ApiError, apiError, readBody, verifyOrigin } from "@/server/http";

export const runtime = "nodejs";

async function groupFor(userId: string) {
  const member = await db.familyMemberRecord.findUnique({ where: { userId }, include: { group: true } });
  if (member) return member;
  const code = `FAM-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
  try {
    await db.familyGroup.create({ data: { name: `${user.name || "我的"}家庭清單`, inviteCode: code, members: { create: { userId, role: "OWNER" } } } });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
  }
  return db.familyMemberRecord.findUniqueOrThrow({ where: { userId }, include: { group: true } });
}

async function snapshot(userId: string) {
  const member = await groupFor(userId);
  const [members, items, pets] = await Promise.all([
    db.familyMemberRecord.findMany({ where: { groupId: member.groupId }, include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { joinedAt: "asc" } }),
    db.familyListItem.findMany({ where: { groupId: member.groupId }, orderBy: { createdAt: "asc" } }),
    db.pet.findMany({ where: { user: { familyMembership: { groupId: member.groupId } } }, select: { id: true, userId: true, name: true, type: true, breed: true, birthday: true, weightKg: true, isNeutered: true, activityLevel: true, allergies: true, goal: true, avatarUrl: true } }),
  ]);
  return { group: member.group, role: member.role, members, items, pets };
}

export async function GET() {
  try {
    const userId = await requireUser();
    return NextResponse.json(await snapshot(userId), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

const inputSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("join"), code: z.string().trim().min(8).max(40) }).strict(),
  z.object({ action: z.literal("rename"), name: z.string().trim().min(2).max(60) }).strict(),
  z.object({ action: z.literal("add"), productId: z.string().min(1).max(100), petId: z.string().max(100).optional(), quantity: z.number().int().min(1).max(99), note: z.string().max(200).default("") }).strict(),
  z.object({ action: z.literal("quantity"), itemId: z.string().uuid(), quantity: z.number().int().min(1).max(99) }).strict(),
  z.object({ action: z.literal("remove"), itemId: z.string().uuid() }).strict(),
  z.object({ action: z.literal("removeMember"), memberId: z.string().uuid() }).strict(),
  z.object({ action: z.literal("leave") }).strict(),
]);

export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    const userId = await requireUser();
    const input = await readBody(request, inputSchema);
    if (input.action === "join") {
      const target = await db.familyGroup.findUnique({ where: { inviteCode: input.code.toUpperCase() } });
      if (!target) throw new ApiError(404, "邀請碼無效");
      const current = await db.familyMemberRecord.findUnique({ where: { userId } });
      if (current?.role === "OWNER") {
        const count = await db.familyMemberRecord.count({ where: { groupId: current.groupId } });
        if (count > 1) throw new ApiError(409, "請先將原家庭交接或移除成員");
      }
      const targetCount = await db.familyMemberRecord.count({ where: { groupId: target.id } });
      if (targetCount >= 8) throw new ApiError(409, "家庭已達 8 人上限");
      if (current?.groupId === target.id) return NextResponse.json(await snapshot(userId));
      await db.$transaction(async (tx) => {
        if (current) {
          await tx.familyMemberRecord.delete({ where: { userId } });
          if (current.role === "OWNER") await tx.familyGroup.delete({ where: { id: current.groupId } });
        }
        await tx.familyMemberRecord.create({ data: { userId, groupId: target.id, role: "MEMBER" } });
      });
      return NextResponse.json(await snapshot(userId));
    }
    const member = await groupFor(userId);
    if (input.action === "removeMember") {
      if (member.role !== "OWNER" || input.memberId === userId) throw new ApiError(403, "只有主帳戶能移除其他成員");
      await db.familyMemberRecord.deleteMany({ where: { userId: input.memberId, groupId: member.groupId, role: "MEMBER" } });
    } else if (input.action === "leave") {
      if (member.role === "OWNER") throw new ApiError(403, "主帳戶不能直接退出家庭");
      await db.familyMemberRecord.delete({ where: { userId } });
    } else if (input.action === "rename") {
      if (member.role !== "OWNER") throw new ApiError(403, "只有主帳戶能更改家庭名稱");
      await db.familyGroup.update({ where: { id: member.groupId }, data: { name: input.name } });
    } else if (input.action === "add") {
      const product = await db.product.findUnique({ where: { id: input.productId }, select: { id: true, isPublished: true } });
      if (!product?.isPublished) throw new ApiError(404, "商品已下架");
      if (input.petId) {
        const pet = await db.pet.findFirst({ where: { id: input.petId, user: { familyMembership: { groupId: member.groupId } } } });
        if (!pet) throw new ApiError(404, "找不到家庭毛孩");
      }
      await db.familyListItem.create({ data: { groupId: member.groupId, productId: input.productId, petId: input.petId || null, quantity: input.quantity, note: input.note, addedById: userId } });
    } else if (input.action === "quantity") {
      const changed = await db.familyListItem.updateMany({ where: { id: input.itemId, groupId: member.groupId }, data: { quantity: input.quantity } });
      if (!changed.count) throw new ApiError(404, "找不到清單品項");
    } else {
      const changed = await db.familyListItem.deleteMany({ where: { id: input.itemId, groupId: member.groupId } });
      if (!changed.count) throw new ApiError(404, "找不到清單品項");
    }
    return NextResponse.json(await snapshot(userId));
  } catch (error) { return apiError(error); }
}
