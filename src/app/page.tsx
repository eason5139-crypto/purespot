import type { Metadata } from "next";
import { WarmBrandHomePage } from "@/components/brand/WarmBrandHomePage";
import { readSiteContent } from "@/server/siteContentRepository";

export const metadata: Metadata = {
  title: "PURESPOT｜懂牠，從每一天開始",
  description:
    "PURESPOT 為貓、狗、倉鼠與兔兔整理食物、玩具和日常用品，陪你選擇適合毛孩的生活提案。",
  robots: { index: true, follow: true },
  openGraph: {
    title: "PURESPOT｜懂牠，從每一天開始",
    description: "從食物到用品，為毛孩找到適合的日常選物。",
    type: "website",
  },
};

export default async function HomePage() {
  return <WarmBrandHomePage content={await readSiteContent()} />;
}
