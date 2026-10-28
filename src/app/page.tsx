import type { Metadata } from "next";
import { WarmBrandHomePage } from "@/components/brand/WarmBrandHomePage";
import { readSiteContent } from "@/server/siteContentRepository";

export const metadata: Metadata = {
  title: "PURESPOT｜懂牠，從每一口開始",
  description:
    "PURESPOT 整理寵物主食的成分、營養與過敏資訊，並依毛孩年齡、體重與生活狀態提供每日份量試算。",
  robots: { index: true, follow: true },
  openGraph: {
    title: "PURESPOT｜懂牠，從每一口開始",
    description: "清楚了解商品成分與營養，為毛孩找到合適的日常主食。",
    type: "website",
  },
};

export default async function HomePage() {
  return <WarmBrandHomePage content={await readSiteContent()} />;
}
