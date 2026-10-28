"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";
import { OverlayHub } from "./OverlayHub";
import type { SiteContent } from "@/lib/siteContent";

export function SiteChrome({ children, content }: { children: React.ReactNode; content: SiteContent }) {
  const path = usePathname();
  const isBackoffice = path.startsWith("/admin") || path === "/admin-login";
  const light = path === "/" || path === "/transparency" || path === "/shop" || path.startsWith("/products/");

  if (isBackoffice) return <>{children}</>;

  return (
    <>
      <Navbar announcement={content.announcement} />
      {children}
      <footer className={`border-t py-8 ${light ? "border-[#e8d9ca] bg-[#f4e8d9]" : "border-[#f3b77d]/12 bg-[#1c110d]"}`}>
        <div className={`page-shell flex flex-wrap items-center justify-between gap-3 text-xs leading-6 ${light ? "text-[#806756]" : "text-[#a88d7d]"}`}>
          <span>{content.footerTagline}</span>
          <span>{content.footerNotice}</span>
        </div>
      </footer>
      <OverlayHub />
    </>
  );
}
