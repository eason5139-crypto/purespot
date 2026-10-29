"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";
import { OverlayHub } from "./OverlayHub";
import type { SiteContent } from "@/lib/siteContent";

export function SiteChrome({ children, content }: { children: React.ReactNode; content: SiteContent }) {
  const path = usePathname();
  const isBackoffice = path.startsWith("/admin") || path === "/admin-login";

  if (isBackoffice) return <>{children}</>;

  return (
    <>
      <Navbar announcement={content.announcement} />
      {children}
      <footer className="border-t border-[#e8ded3] bg-[#f4ece1] py-8 text-[#7c6f63]">
        <div className="page-shell flex flex-wrap items-center justify-between gap-3 text-xs leading-6">
          <span>{content.footerTagline}</span>
          <span>{content.footerNotice}</span>
        </div>
      </footer>
      <OverlayHub />
    </>
  );
}
