import type { Metadata, Viewport } from "next";
import "@fontsource/noto-sans-tc/400.css";
import "@fontsource/noto-sans-tc/500.css";
import "@fontsource/noto-sans-tc/600.css";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { readSiteContent } from "@/server/siteContentRepository";
export const metadata: Metadata = {
  title: { default: "PURESPOT｜懂牠，從每一口開始", template: "%s｜PURESPOT" },
  description:
    "依毛孩的年齡、體重與過敏原，找到適合的主食、透明批次履歷與專屬循環補貨計畫。",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  themeColor: "#FFFAF3",
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
      <body>
        <a
          href="#main-content"
          className="fixed -top-20 left-4 z-[100] rounded-lg bg-[#f4a261] px-4 py-3 text-[#2b170f] focus:top-4"
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
