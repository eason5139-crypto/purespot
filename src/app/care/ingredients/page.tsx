import type { Metadata } from "next";
import { IngredientLens } from "@/components/care/IngredientLens";

export const metadata: Metadata = {
  title: "成分放大鏡｜安心選物",
  description: "從商品照片逐層查看配方、已知過敏原與批次狀態，並排比較兩款食品。",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const { product } = await searchParams;
  return <IngredientLens initialSlug={product ?? ""} />;
}
