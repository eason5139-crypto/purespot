import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { ApiError, apiError, readBody, verifyOrigin } from "@/server/http";

export const runtime = "nodejs";
const productInput = z.object({ productId: z.string().min(1).max(100) }).strict();
const editInput = productInput.extend({ petId: z.string().min(1).max(100).nullable(), watchRestock: z.boolean() });

export async function GET() {
  try {
    const userId = await requireUser();
    const favorites = await db.favorite.findMany({
      where: { userId, product: { isPublished: true } },
      include: { product: { include: { variants: { orderBy: { sku: "asc" }, take: 1 } } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ favorites: favorites.map((favorite) => ({
      productId: favorite.productId,
      petId: favorite.petId,
      watchRestock: favorite.watchRestock,
      restocked: favorite.watchRestock && favorite.savedOutOfStock && (favorite.product.variants[0]?.stock ?? 0) > 0,
      product: {
        name: favorite.product.name,
        slug: favorite.product.slug,
        image: favorite.product.imageUrl,
        type: favorite.product.targetPetType,
        priceNt: favorite.product.variants[0]?.priceNt ?? 0,
        stock: favorite.product.variants[0]?.stock ?? 0,
      },
    })) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    const userId = await requireUser();
    const { productId } = await readBody(request, productInput);
    const product = await db.product.findFirst({ where: { id: productId, isPublished: true } });
    if (!product) throw new ApiError(404, "商品已下架");
    await db.favorite.upsert({ where: { userId_productId: { userId, productId } }, create: { userId, productId }, update: {} });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function PUT(request: Request) {
  try {
    verifyOrigin(request);
    const userId = await requireUser();
    const { ids } = await readBody(request, z.object({ ids: z.array(z.string().min(1).max(100)).max(200) }).strict());
    const products = await db.product.findMany({ where: { id: { in: [...new Set(ids)] }, isPublished: true }, select: { id: true } });
    await db.favorite.createMany({ data: products.map((product) => ({ userId, productId: product.id })), skipDuplicates: true });
    return NextResponse.json({ imported: products.length });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    verifyOrigin(request);
    const userId = await requireUser();
    const { productId, petId, watchRestock } = await readBody(request, editInput);
    if (petId && !await db.pet.findFirst({ where: { id: petId, userId }, select: { id: true } })) throw new ApiError(400, "請選擇自己的毛孩");
    const favorite = await db.favorite.findUnique({ where: { userId_productId: { userId, productId } }, include: { product: { include: { variants: { take: 1 } } } } });
    if (!favorite) throw new ApiError(404, "找不到收藏商品");
    await db.favorite.update({ where: { userId_productId: { userId, productId } }, data: {
      petId, watchRestock,
      savedOutOfStock: watchRestock ? favorite.savedOutOfStock || (favorite.product.variants[0]?.stock ?? 0) === 0 : false,
    } });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  try {
    verifyOrigin(request);
    const userId = await requireUser();
    const { productId } = await readBody(request, productInput);
    await db.favorite.deleteMany({ where: { userId, productId } });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
