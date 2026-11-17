"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, PawPrint, Sparkles } from "lucide-react";
import { Navbar } from "./Navbar";
import { OverlayHub } from "./OverlayHub";
import { SitePromotions } from "./SitePromotions";
import { FlyToCartLayer } from "./FlyToCartLayer";
import type { SiteContent } from "@/lib/siteContent";
import { useSiteContentPreview } from "@/lib/useSiteContentPreview";

const FOOTER_CRAFT_LINKS = [
  { no: "01", href: "/shop#bento-builder", label: "曲木旬食配餐盒" },
  { no: "02", href: "/care/compass", label: "選物羅盤提案" },
  { no: "03", href: "/care/ingredients", label: "成分微距檢視" },
  { no: "04", href: "/community#id-card-studio", label: "里民手形銘牌印製" },
  { no: "05", href: "/care/refill", label: "存糧週期預報" },
  { no: "06", href: "/care/missions", label: "探索集章手冊" },
] as const;

export function SiteChrome({
  children,
  content,
}: {
  children: React.ReactNode;
  content: SiteContent;
}) {
  const path = usePathname();
  const displayContent = useSiteContentPreview(content);
  const isBackoffice = path.startsWith("/admin") || path === "/admin-login";

  if (isBackoffice) return <>{children}</>;

  return (
    <div className="public-site">
      <Navbar announcement={displayContent.announcement} />
      {children}
      <footer
        id="site-footer"
        className="border-t border-[#d8cbb9] bg-[#f3eadf] py-12 text-[#5e5246]"
      >
        <div className="page-shell">
          <div className="grid gap-8 border-b border-[#dfd2c2] pb-8 md:grid-cols-[1.2fr_1fr_1fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d6c6b2] bg-[#fffaf2] px-3.5 py-1 text-xs font-semibold text-[#935941]">
                <PawPrint size={13} />
                PURESPOT ・ 日台生活工藝毛孩道具店
              </div>
              <p className="editorial-title mt-3 text-lg font-bold text-[#302b26]">
                {displayContent.footerTagline}
              </p>
              <p className="mt-2 text-xs leading-6 text-[#786b5e]">
                從每日第一口看得出產地的真實鮮肉主糧，到貼合台灣居家的清潔與互動器物。我們把繁複的營養檢驗資料整理成清晰手記，陪伴每位飼主安穩照護家人。
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold tracking-[0.18em] text-[#935941] uppercase">
                WORKSHOP INDEX ・ 互動工藝角落
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2.5 text-xs font-medium">
                {FOOTER_CRAFT_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-center gap-2 text-[#5a4e43] transition-colors hover:text-[#935941]"
                  >
                    <span className="font-mono text-[10px] font-bold text-[#a3876e] group-hover:text-[#935941]">
                      No.{item.no}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
            <div className="craft-letterpress rounded-2xl p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold text-[#4e6752]">
                <Sparkles size={14} />
                海島濕氣・食材保存手記
              </p>
              <p className="mt-2 text-xs leading-5 text-[#6b5e52]">
                台灣四時相對濕度偏高，主食與凍乾開封後請排氣壓緊雙軌夾鏈並置於乾燥陰涼處，建議於 30 至 45 日內鮮食完畢。
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs leading-6 text-[#7c6f63]">
            <span className="flex items-center gap-1.5">
              <Heart size={13} className="text-[#c85a48]" fill="currentColor" />
              誠實選材・溫潤陪伴台灣毛孩家庭的每一日
            </span>
            <span>{displayContent.footerNotice}</span>
          </div>
        </div>
      </footer>
      <OverlayHub />
      <FlyToCartLayer />
      <SitePromotions promotions={displayContent.promotions} path={path} />
    </div>
  );
}
