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
          <p className="px-3 pb-2 text-[11px] font-bold tracking-[.14em] text-[#935941]">{group.title}</p>
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
                  className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
                    active
                      ? "bg-[#935941] text-white shadow-sm font-semibold"
                      : "text-[#5e544a] hover:bg-[#f5ede3] hover:text-[#302b26]"
                  }`}
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
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-[#e8ded3] bg-white px-4 lg:hidden">
        <Link href="/admin/dashboard" className="text-sm font-semibold tracking-wide text-[#302b26]">PURESPOT 管理中心</Link>
        <button type="button" onClick={() => setMobileOpen((value) => !value)} aria-label="管理選單" aria-expanded={mobileOpen} className="flex size-11 items-center justify-center rounded-xl text-[#5e544a]">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {mobileOpen && (
        <div className="fixed inset-x-0 top-14 z-40 max-h-[calc(100vh-3.5rem)] overflow-y-auto border-b border-[#e8ded3] bg-white p-4 shadow-2xl lg:hidden">
          <nav aria-label="後台導覽">{navigation}</nav>
          <Link href="/" target="_blank" className="flex min-h-11 items-center gap-2 px-3 text-sm text-[#5e544a] hover:text-[#935941]"><ExternalLink size={16} />開啟官網</Link>
          <button type="button" onClick={() => void logout()} className="flex min-h-11 w-full items-center gap-2 px-3 text-sm text-[#5e544a] hover:text-rose-600"><LogOut size={16} />登出</button>
        </div>
      )}
      <aside className="hidden min-h-screen w-64 shrink-0 flex-col border-r border-[#e8ded3] bg-white lg:flex">
        <div className="border-b border-[#e8ded3] px-6 py-6">
          <Link href="/admin/dashboard" className="text-lg font-bold tracking-wide text-[#302b26]">PURESPOT</Link>
          <p className="mt-1 text-xs text-[#8a7f75]">內容與營運管理中心</p>
        </div>
        <nav aria-label="後台導覽" className="flex-1 px-3 py-6">{navigation}</nav>
        <div className="border-t border-[#e8ded3] px-3 py-4 bg-[#fcfaf7]">
          <p className="truncate px-3 pb-2 text-xs text-[#8a7f75]">{adminEmail}</p>
          <Link href="/" target="_blank" className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm text-[#5e544a] hover:bg-[#f5ede3] hover:text-[#302b26]"><ExternalLink size={16} />開啟官網</Link>
          <button type="button" onClick={() => void logout()} className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-sm text-[#5e544a] hover:bg-[#f5ede3] hover:text-rose-600"><LogOut size={16} />安全登出</button>
        </div>
      </aside>
    </>
  );
}
