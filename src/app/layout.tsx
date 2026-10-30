import type { Metadata, Viewport } from "next";
import "@fontsource/noto-sans-tc/400.css";
import "@fontsource/noto-sans-tc/500.css";
import "@fontsource/noto-sans-tc/600.css";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { readSiteContent } from "@/server/siteContentRepository";

export const metadata: Metadata = {
  title: { default: "PURESPOT｜懂牠，從每一天開始", template: "%s｜PURESPOT" },
  description:
    "為貓、狗、倉鼠與兔兔找到適合的食物、玩具與日常用品，清楚比較價格與商品資訊。",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f8f5ef",
  width: "device-width",
  initialScale: 1,
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const content = await readSiteContent();
  return (
    <html lang="zh-Hant">
      <body className="bg-[#f8f5ef] text-[#302b26]">
        <a
          href="#main-content"
          className="fixed -top-20 left-4 z-[100] rounded-lg bg-[#5B93C5] px-4 py-3 text-white shadow-md focus:top-4"
        >
          跳至主要內容
        </a>
        <Providers>
          <SiteChrome content={content}>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
