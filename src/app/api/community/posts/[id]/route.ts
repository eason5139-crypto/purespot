import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { ApiError, apiError, readBody, verifyOrigin } from "@/server/http";
import { rateLimit } from "@/server/rateLimit";
import { communityActionInput } from "@/lib/community";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    verifyOrigin(request);
    const userId = await requireUser();
    const { id } = await context.params;
    const input = await readBody(request, communityActionInput);
    const post = await db.communityPost.findUnique({ where: { id }, select: { id: true, status: true, authorId: true } });
    if (!post || post.status !== "PUBLISHED") throw new ApiError(404, "找不到這篇日記");
    await rateLimit(`community-action:${userId}`, 50, 3600);
    if (input.action === "like") {
      const existing = await db.communityLike.findUnique({ where: { postId_userId: { postId: id, userId } } });
      if (existing) await db.communityLike.delete({ where: { postId_userId: { postId: id, userId } } });
      else await db.communityLike.create({ data: { postId: id, userId } });
      return NextResponse.json({ liked: !existing });
    }
    if (input.action === "bookmark") {
      const existing = await db.communityBookmark.findUnique({ where: { postId_userId: { postId: id, userId } } });
      if (existing) await db.communityBookmark.delete({ where: { postId_userId: { postId: id, userId } } });
      else await db.communityBookmark.create({ data: { postId: id, userId } });
      return NextResponse.json({ saved: !existing });
    }
    if (input.action === "report") {
      if (post.authorId === userId) throw new ApiError(400, "無法檢舉自己的日記");
      await db.communityReport.upsert({ where: { postId_reporterId: { postId: id, reporterId: userId } }, create: { postId: id, reporterId: userId, reason: input.reason }, update: { reason: input.reason } });
      return NextResponse.json({ message: "已收到檢舉，管理員會查看" });
    }
    await rateLimit(`community-comment:${userId}`, 20, 3600);
    const comment = await db.communityComment.create({ data: { postId: id, authorId: userId, body: input.body } });
    return NextResponse.json({ comment: { id: comment.id, body: comment.body, author: "我", createdAt: comment.createdAt.toISOString() } }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    verifyOrigin(request);
    const userId = await requireUser();
    const { id } = await context.params;
    const deleted = await db.communityPost.deleteMany({ where: { id, authorId: userId } });
    if (deleted.count !== 1) throw new ApiError(404, "找不到自己的日記");
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
