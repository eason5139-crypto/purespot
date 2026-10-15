import { NextResponse } from "next/server";
import { db } from "@/server/db";

export const runtime = "nodejs";

// 展示模式下從靜態目錄讀取；資料庫連線後改由 Prisma 查詢
export async function GET() {
  try {
    const products = await db.product.findMany({
      where: { isPublished: true },
      include: {
        variants: { select: { id: true, sku: true, label: true, bagGrams: true, priceNt: true, stock: true } },
        batches: { orderBy: { testedAt: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(
      { products },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
    );
  } catch {
    // 資料庫未連線時回傳空陣列，不中斷展示模式
    return NextResponse.json(
      { products: [], note: "資料庫未連線，正以展示模式提供靜態目錄" },
      { status: 200 },
    );
  }
}
