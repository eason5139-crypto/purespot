"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  BarChart3,
  Menu,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: "數據總覽" },
  { href: "/admin/orders", icon: ShoppingCart, label: "訂單管理" },
  { href: "/admin/products", icon: Package, label: "商品管理" },
  { href: "/admin/members", icon: Users, label: "會員管理" },
  { href: "/admin/inventory", icon: AlertTriangle, label: "庫存警報" },
  { href: "/admin/analytics", icon: BarChart3, label: "營業分析" },
];

export function AdminSidebar() {
  const path = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* 行動端頂部橫條 */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-[#080C14] px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-cyan-400/10">
            <ShieldCheck size={14} className="text-cyan-400" />
          </div>
          <span className="text-xs font-bold tracking-wider text-white">PURESPOT ADMIN</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
          aria-label="管理選單"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* 行動端選單抽屜 */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="lg:hidden fixed inset-x-0 top-14 z-30 border-b border-white/10 bg-[#080C14] p-4 shadow-2xl"
          >
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = path === item.href || (item.href !== "/admin" && path.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-cyan-500/10 text-cyan-300"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <item.icon size={17} className={isActive ? "text-cyan-400" : "text-slate-500"} />
                    {item.label}
                  </Link>
                );
              })}
              <Link
                href="/shop"
                target="_blank"
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs text-slate-500 hover:text-slate-300"
              >
                <ExternalLink size={14} />
                前往消費者官網
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 桌面端側欄 */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-white/8 bg-[#080C14] min-h-screen">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-cyan-400/10">
              <ShieldCheck size={16} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white tracking-wide">PURESPOT</p>
              <p className="text-[10px] text-slate-500 tracking-widest uppercase">Enterprise Admin</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const isActive = path === item.href || (item.href !== "/admin" && path.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-cyan-500/10 text-cyan-300"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon size={17} className={isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300"} />
                {item.label}
                {isActive && (
                  <motion.span
                    layoutId="admin-nav-indicator"
                    className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer link to consumer site */}
        <div className="px-3 py-4 border-t border-white/8">
          <Link
            href="/shop"
            target="_blank"
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ExternalLink size={14} />
            前往消費者官網
            <ChevronRight size={12} className="ml-auto" />
          </Link>
          <div className="mt-2 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-slate-600">系統運作中</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
