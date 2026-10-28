"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3, Boxes, ExternalLink, FilePenLine, Images, LayoutDashboard,
  LogOut, Menu, Package, ShoppingCart, Users, X,
} from "lucide-react";

const groups = [
  { title: "工作台", links: [
    { href: "/admin/dashboard", label: "營運總覽", icon: LayoutDashboard },
    { href: "/admin/analytics", label: "數據分析", icon: BarChart3 },
  ] },
  { title: "網站與商品", links: [
    { href: "/admin/content", label: "網站內容", icon: FilePenLine },
    { href: "/admin/media", label: "圖片媒體庫", icon: Images },
    { href: "/admin/products", label: "商品管理", icon: Package },
    { href: "/admin/inventory", label: "庫存管理", icon: Boxes },
  ] },
  { title: "交易與顧客", links: [
    { href: "/admin/orders", label: "訂單管理", icon: ShoppingCart },
    { href: "/admin/members", label: "會員管理", icon: Users },
  ] },
];

export function AdminSidebar({ adminEmail }: { adminEmail: string }) {
  const path = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function logout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    router.replace("/admin-login");
    router.refresh();
  }

  const navigation = (
    <>
      {groups.map((group) => (
        <div key={group.title} className="mb-6">
          <p className="px-3 pb-2 text-[11px] font-semibold tracking-[.14em] text-[#846d5f]">{group.title}</p>
          <div className="space-y-1">
            {group.links.map((item) => {
              const active = path === item.href || path.startsWith(`${item.href}/`) ||
                (path === "/admin" && item.href === "/admin/dashboard");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${active ? "bg-[#f4a261]/15 text-[#ffc38e]" : "text-[#b39a8b] hover:bg-white/5 hover:text-[#fff7ec]"}`}
                >
                  <item.icon size={17} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-[#f4a261]/15 bg-[#21150f] px-4 lg:hidden">
        <Link href="/admin/dashboard" className="text-sm font-semibold tracking-wide text-[#fff7ec]">PURESPOT 管理中心</Link>
        <button type="button" onClick={() => setMobileOpen((value) => !value)} aria-label="管理選單" aria-expanded={mobileOpen} className="flex size-11 items-center justify-center rounded-xl text-[#d8bfae]">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {mobileOpen && (
        <div className="fixed inset-x-0 top-14 z-40 max-h-[calc(100vh-3.5rem)] overflow-y-auto border-b border-[#f4a261]/15 bg-[#21150f] p-4 shadow-2xl lg:hidden">
          <nav aria-label="後台導覽">{navigation}</nav>
          <Link href="/" target="_blank" className="flex min-h-11 items-center gap-2 px-3 text-sm text-[#b39a8b]"><ExternalLink size={16} />開啟官網</Link>
          <button type="button" onClick={() => void logout()} className="flex min-h-11 w-full items-center gap-2 px-3 text-sm text-[#b39a8b]"><LogOut size={16} />登出</button>
        </div>
      )}
      <aside className="hidden min-h-screen w-64 shrink-0 flex-col border-r border-[#f4a261]/10 bg-[#21150f] lg:flex">
        <div className="border-b border-white/10 px-6 py-6">
          <Link href="/admin/dashboard" className="text-base font-semibold tracking-wide text-[#fff7ec]">PURESPOT</Link>
          <p className="mt-1 text-xs text-[#927667]">內容與營運管理中心</p>
        </div>
        <nav aria-label="後台導覽" className="flex-1 px-3 py-6">{navigation}</nav>
        <div className="border-t border-white/10 px-3 py-4">
          <p className="truncate px-3 pb-2 text-xs text-[#927667]">{adminEmail}</p>
          <Link href="/" target="_blank" className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm text-[#b39a8b] hover:bg-white/5"><ExternalLink size={16} />開啟官網</Link>
          <button type="button" onClick={() => void logout()} className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-sm text-[#b39a8b] hover:bg-white/5"><LogOut size={16} />安全登出</button>
        </div>
      </aside>
    </>
  );
}
