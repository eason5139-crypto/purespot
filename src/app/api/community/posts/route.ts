import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { optionalCommunityUser, assertCommunityImage } from "@/server/community";
import { ApiError, apiError, readBody, verifyOrigin } from "@/server/http";
import { rateLimit } from "@/server/rateLimit";
import { communityPostInput, petTypes, stageForBirthday } from "@/lib/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = await optionalCommunityUser();
    const params = new URL(request.url).searchParams;
    const mine = params.get("mine") === "1";
    const saved = params.get("saved") === "1";
    const matchPet = params.get("matchPet");
    const type = params.get("type");
    const search = params.get("search")?.trim().slice(0, 80);
    const cursor = params.get("cursor");
    if ((mine || saved || matchPet) && !userId) throw new ApiError(401, "請先登入會員");
    if (type && type !== "ALL" && !petTypes.includes(type as typeof petTypes[number])) throw new ApiError(400, "毛孩分類不正確");
    if (cursor && !/^[0-9a-f-]{36}$/i.test(cursor)) throw new ApiError(400, "分頁資料不正確");

    const where: Prisma.CommunityPostWhereInput = mine
      ? { authorId: userId! }
      : { status: "PUBLISHED" };
    if (saved) where.bookmarks = { some: { userId: userId! } };
    if (search) where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { body: { contains: search, mode: "insensitive" } },
      { petName: { contains: search, mode: "insensitive" } },
    ];
    if (matchPet) {
      const pet = await db.pet.findFirst({ where: { id: matchPet, userId: userId! }, select: { type: true, birthday: true } });
      if (!pet) throw new ApiError(404, "找不到已儲存的毛孩");
      where.petType = pet.type;
      where.lifeStage = stageForBirthday(pet.birthday);
    } else if (type && type !== "ALL") {
      where.petType = type as typeof petTypes[number];
    }

    const posts = await db.communityPost.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 24,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        likes: { where: { userId: userId ?? "" }, select: { userId: true } },
        bookmarks: { where: { userId: userId ?? "" }, select: { userId: true } },
        comments: { where: { status: "PUBLISHED" }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, body: true, authorId: true, createdAt: true } },
        _count: { select: { likes: true, reports: true } },
      },
    });
    return NextResponse.json({
      posts: posts.map((post) => ({
        id: post.id,
        title: post.title,
        body: post.body,
        imageUrl: post.imageUrl,
        petName: post.petName,
        petType: post.petType,
        lifeStage: post.lifeStage,
        status: post.status,
        createdAt: post.createdAt.toISOString(),
        mine: post.authorId === userId,
        liked: post.likes.length > 0,
        saved: post.bookmarks.length > 0,
        likesCount: post._count.likes,
        comments: post.comments.reverse().map((comment) => ({ id: comment.id, body: comment.body, author: comment.authorId === userId ? "我" : "毛孩家人", createdAt: comment.createdAt.toISOString() })),
      })),
      nextCursor: posts.length === 24 ? posts.at(-1)?.id : null,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    const userId = await requireUser();
    await rateLimit(`community-post:${userId}`, 8, 3600);
    const input = await readBody(request, communityPostInput);
    const pet = await db.pet.findFirst({ where: { id: input.petId, userId }, select: { id: true, name: true, type: true, birthday: true } });
    if (!pet) throw new ApiError(400, "請先選擇已儲存的毛孩");
    const post = await db.communityPost.create({ data: {
      authorId: userId,
      petId: pet.id,
      petName: pet.name,
      petType: pet.type,
      lifeStage: stageForBirthday(pet.birthday),
      title: input.title,
      body: input.body,
      imageUrl: assertCommunityImage(input.imageUrl, userId),
      status: "PENDING",
    } });
    return NextResponse.json({ post: { id: post.id, status: post.status }, message: "日記已送出，待管理員審核" }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
