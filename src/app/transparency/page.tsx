import type { Metadata } from "next";
import { TransparencyPage } from "@/components/brand/TransparencyPage";
import { readSiteContent } from "@/server/siteContentRepository";

export const metadata: Metadata = {
  title: "7C 透明度報告",
  description: "查看 PURESPOT 商品的原料、營養保證值與示範批次資料，清楚區分展示資訊與待核實的正式報告。",
};

export default async function TransparencyRoute() {
  return <TransparencyPage content={await readSiteContent()} />;
}
