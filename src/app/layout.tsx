import type { Metadata, Viewport } from "next";
import "@fontsource/noto-sans-tc/400.css";
import "@fontsource/noto-sans-tc/500.css";
import "@fontsource/noto-sans-tc/600.css";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/layout/Navbar";
import { OverlayHub } from "@/components/layout/OverlayHub";
export const metadata: Metadata = {
  title: { default: "PURESPOT｜懂牠，從每一口開始", template: "%s｜PURESPOT" },
  description:
    "依毛孩的年齡、體重與過敏原，找到適合的主食、透明批次履歷與專屬循環補貨計畫。",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  themeColor: "#090D16",
  width: "device-width",
  initialScale: 1,
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>
        <a
          href="#main-content"
          className="fixed -top-20 left-4 z-[100] rounded-lg bg-cyan-300 px-4 py-3 text-slate-950 focus:top-4"
        >
          跳至主要內容
        </a>
        <Providers>
          <Navbar />
          {children}
          <footer className="border-t border-white/8 py-7">
            <div className="page-shell flex flex-wrap items-center justify-between gap-3 text-xs leading-6 text-slate-500">
              <span>PURESPOT · 讓每一份陪伴，回到純粹。</span>
              <span>商品、檢驗與社群內容為展示樣本 · 未啟用真實扣款</span>
            </div>
          </footer>
          <OverlayHub />
        </Providers>
      </body>
    </html>
  );
}
