import type { Metadata } from "next";
import { Storefront } from "@/components/shop/Storefront";
import { readSiteContent } from "@/server/siteContentRepository";

export const metadata: Metadata = {
  title: "精品商城｜PURESPOT",
  description: "依毛孩資料查看主食適配提示，搜尋成分、篩選有貨商品並比較售價與營養資訊。",
};

export default async function ShopPage() {
  return <Storefront content={await readSiteContent()} />;
}
