import type { Metadata } from "next";
import { Storefront } from "@/components/shop/Storefront";
import { readSiteContent } from "@/server/siteContentRepository";

export const metadata: Metadata = {
  title: "精品商城｜PURESPOT",
  description: "探索貓、狗、倉鼠與兔兔的食物和用品，依種類、價格與收藏篩選，並排比較商品資訊。",
};

export default async function ShopPage() {
  return <Storefront content={await readSiteContent()} />;
}
