import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { requireAdminSession } from "@/server/adminAuth";
import { ApiError, apiError, readBody, verifyOrigin } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const actionSchema = z.discriminatedUnion("target", [
  z.object({ target: z.literal("post"), id: z.uuid(), status: z.enum(["PENDING", "PUBLISHED", "HIDDEN"]) }).strict(),
  z.object({ target: z.literal("comment"), id: z.uuid(), status: z.enum(["PUBLISHED", "HIDDEN"]) }).strict(),
]);

export async function GET() {
  try {
    await requireAdminSession();
    const posts = await db.communityPost.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { name: true, email: true } },
        comments: { orderBy: { createdAt: "desc" }, take: 20, select: { id: true, body: true, status: true, createdAt: true } },
        reports: { orderBy: { createdAt: "desc" }, take: 10, select: { reason: true, createdAt: true } },
        _count: { select: { likes: true, reports: true } },
      },
    });
    return NextResponse.json({ posts: posts.map((post) => ({
      id: post.id, title: post.title, body: post.body, imageUrl: post.imageUrl,
      petName: post.petName, petType: post.petType, lifeStage: post.lifeStage,
      status: post.status, createdAt: post.createdAt.toISOString(),
      author: post.author.name || post.author.email,
      likesCount: post._count.likes, reportsCount: post._count.reports,
      reports: post.reports.map((report) => report.reason),
      comments: post.comments.map((comment) => ({ id: comment.id, body: comment.body, status: comment.status, createdAt: comment.createdAt.toISOString() })),
    })) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    await requireAdminSession();
    verifyOrigin(request);
    const input = await readBody(request, actionSchema);
    if (input.target === "post") {
      const changed = await db.communityPost.updateMany({ where: { id: input.id }, data: { status: input.status } });
      if (!changed.count) throw new ApiError(404, "找不到日記");
    } else {
      const changed = await db.communityComment.updateMany({ where: { id: input.id }, data: { status: input.status } });
      if (!changed.count) throw new ApiError(404, "找不到留言");
    }
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
