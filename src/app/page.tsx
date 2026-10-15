import type { Metadata } from "next";
import { BrandHomePage } from "@/components/brand/BrandHomePage";

export const metadata: Metadata = {
  title: "PURESPOT｜懂牠，從每一口開始",
  description:
    "PURESPOT 以 7C 透明成分理念打造的頂級寵物天然主食品牌。依毛孩年齡、體重與過敏原，精準配糧。台灣在地研發，第三方檢驗，讓每一份陪伴回到純粹。",
  robots: { index: true, follow: true },
  openGraph: {
    title: "PURESPOT｜懂牠，從每一口開始",
    description: "7C 透明成分 · 台灣在地研發 · 第三方檢驗認證",
    type: "website",
  },
};

export default function HomePage() {
  return <BrandHomePage />;
}
