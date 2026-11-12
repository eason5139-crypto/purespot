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
    <>
      <Navbar announcement={displayContent.announcement} />
      {children}
      <footer
        id="site-footer"
        className="border-t-2 border-dashed border-[#dfd2c2] bg-[#f3eadf] py-12 text-[#5e5246]"
      >
        <div className="page-shell">
          <div className="grid gap-8 pb-8 border-b border-[#e2d6c7] md:grid-cols-[1.2fr_1fr_1fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#fffaf2] border border-[#dfd2c2] px-3.5 py-1 text-xs font-semibold text-[#935941]">
                <PawPrint size={13} />
                台灣在地毛孩生活選物所
              </div>
              <p className="mt-3 text-base font-semibold text-[#302b26]">
                {displayContent.footerTagline}
              </p>
              <p className="mt-2 text-xs leading-6 text-[#786b5e]">
                從主子每天吃進肚子裡的第一口飯，到散步回來的安心角落。我們把複雜的營養數據翻譯成看得懂的家常話，陪你把毛孩養得白白胖胖。
              </p>
            </div>
            <div>
              <p className="text-xs font-bold tracking-wider text-[#935941]">
                人氣好玩角落
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-medium">
                <Link href="/shop#bento-builder" className="hover:text-[#935941] transition-colors">
                  🍱 毛孩便當自由配
                </Link>
                <Link href="/care/compass" className="hover:text-[#935941] transition-colors">
                  🧭 選物羅盤提案
                </Link>
                <Link href="/care/ingredients" className="hover:text-[#935941] transition-colors">
                  🔍 成分白話放大鏡
                </Link>
                <Link href="/community#id-card-studio" className="hover:text-[#935941] transition-colors">
                  🪪 榮譽里民證印製
                </Link>
                <Link href="/care/refill" className="hover:text-[#935941] transition-colors">
                  ⛅ 存糧斷糧預報
                </Link>
                <Link href="/care/missions" className="hover:text-[#935941] transition-colors">
                  💮 探索集章護照
                </Link>
              </div>
            </div>
            <div className="rounded-2xl border border-[#dfd2c2] bg-[#fffcf7] p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold text-[#4e6752]">
                <Sparkles size={14} />
                台灣氣候餵食小叮嚀
              </p>
              <p className="mt-2 text-xs leading-5 text-[#6b5e52]">
                台灣四季濕度偏高，主食與凍乾開封後請務必壓緊夾鏈袋並置於陰涼處，30–45 天內吃完最香脆！
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs leading-6 text-[#7c6f63]">
            <span className="flex items-center gap-1.5">
              <Heart size={13} className="text-[#c85a48]" fill="currentColor" />
              用心對待每一隻台灣毛孩的日常
            </span>
            <span>{displayContent.footerNotice}</span>
          </div>
        </div>
      </footer>
      <OverlayHub />
      <FlyToCartLayer />
      <SitePromotions promotions={displayContent.promotions} path={path} />
    </>
  );
}
