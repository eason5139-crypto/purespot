import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { products as defaults } from "@/lib/catalog";
import { getCatalogProducts } from "@/server/productCatalog";
import { ProductDetail } from "@/components/shop/ProductDetail";
export const dynamic = "force-dynamic";
async function loadProduct(slug: string) {
  try {
    return (await getCatalogProducts()).find((p) => p.slug === slug);
  } catch {
    return defaults.find((p) => p.slug === slug);
  }
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: (await loadProduct(slug))?.name ?? "找不到商品" };
}
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) notFound();
  return <ProductDetail product={product} />;
}
