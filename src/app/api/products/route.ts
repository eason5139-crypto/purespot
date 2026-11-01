import { NextResponse } from "next/server";
import { getCatalogProducts } from "@/server/productCatalog";
import { products as defaults } from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await getCatalogProducts();
    if (products.length === 0) throw new Error("商品資料為空");
    return NextResponse.json({ products }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ products: defaults, source: "fallback" }, {
      headers: { "Cache-Control": "no-store" },
    });
  }
}
