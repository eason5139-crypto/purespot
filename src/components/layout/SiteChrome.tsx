"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";
import { OverlayHub } from "./OverlayHub";
import { SitePromotions } from "./SitePromotions";
import type { SiteContent } from "@/lib/siteContent";
import { useSiteContentPreview } from "@/lib/useSiteContentPreview";

export function SiteChrome({ children, content }: { children: React.ReactNode; content: SiteContent }) {
  const path = usePathname();
  const displayContent = useSiteContentPreview(content);
  const isBackoffice = path.startsWith("/admin") || path === "/admin-login";

  if (isBackoffice) return <>{children}</>;

  return (
    <>
      <Navbar announcement={displayContent.announcement} />
      {children}
      <footer id="site-footer" className="border-t border-[#e8ded3] bg-[#f4ece1] py-8 text-[#7c6f63]">
        <div className="page-shell flex flex-wrap items-center justify-between gap-3 text-xs leading-6">
          <span>{displayContent.footerTagline}</span>
          <span>{displayContent.footerNotice}</span>
        </div>
      </footer>
      <OverlayHub />
      <SitePromotions promotions={displayContent.promotions} path={path} />
    </>
  );
}
