import type { Metadata } from "next";
import { SelectionCompass } from "@/components/care/SelectionCompass";

export const metadata: Metadata = {
  title: "選物羅盤｜PURESPOT",
  description: "從毛孩資料與生活情境出發，查看有理由的選物提案、比較商品並加入購物袋。",
};

export default function CompassPage() {
  return <SelectionCompass />;
}
