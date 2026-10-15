import type { Metadata } from "next";
import { TransparencyPage } from "@/components/brand/TransparencyPage";

export const metadata: Metadata = {
  title: "7C 透明度報告｜PURESPOT",
  description: "PURESPOT 7C 透明度完整報告：成分來源、台灣在地產地溯源地圖、SGS 第三方化驗結果、每款主食完整營養保證值對照表。",
};

export default function TransparencyRoute() {
  return <TransparencyPage />;
}
