import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { products } from "@/lib/catalog";
import { ProductDetail } from "@/components/shop/ProductDetail";
export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: products.find((p) => p.slug === slug)?.name ?? "找不到商品" };
}
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = products.find((p) => p.slug === slug);
  if (!product) notFound();
  return <ProductDetail product={product} />;
}
