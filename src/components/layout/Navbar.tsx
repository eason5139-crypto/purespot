"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Cat,
  Dog,
  ChevronDown,
  ShoppingBag,
  Check,
  SlidersHorizontal,
  Repeat2,
  Menu,
  User,
  LogOut,
  LogIn,
} from "lucide-react";
import { usePetContextStore, useActivePet } from "@/store/usePetContextStore";
import { useCartStore } from "@/store/useCartStore";
import { useUiStore } from "@/store/useUiStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
const links = [
  { href: "/", label: "品牌首頁" },
  { href: "/shop", label: "精品商城" },
  { href: "/transparency", label: "7C 透明度" },
  { href: "/community", label: "毛孩日常" },
  { href: "/health", label: "健康儀表板" },
  { href: "/account", label: "我的帳戶" },
];
export function Navbar({ announcement }: { announcement: string }) {
  const path = usePathname();
  const light = path === "/" || path === "/transparency" || path === "/shop" || path.startsWith("/products/");
  const pet = useActivePet();
  const pets = usePetContextStore((s) => s.allPets);
  const setActive = usePetContextStore((s) => s.setActivePet);
  const count = useCartStore((s) =>
    s.items.reduce((n, i) => n + i.quantity, 0),
  );
  const setCartOpen = useUiStore((s) => s.setCartOpen);
  const setPetEditorOpen = useUiStore((s) => s.setPetEditorOpen);
  const setAuthOpen = useUiStore((s) => s.setAuthOpen);
  const authUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const PetIcon = pet.type === "CAT" ? Cat : Dog;
  return (
    <header className={`sticky top-0 z-40 border-b backdrop-blur-xl ${light ? "border-[#eadbcb] bg-[#fffaf3]/95" : "border-[#f4a261]/10 bg-[#1b110d]/92"}`}>
      <div className={`flex h-8 items-center justify-center gap-2 border-b px-3 text-xs tracking-wide ${light ? "border-[#eadbcb] bg-[#f5e9dc] text-[#95684e]" : "border-[#f4a261]/10 bg-[#f4a261]/7 text-[#f7c9a7]"}`}>
        <Repeat2 size={13} />
        <span>{announcement}</span>
        <Link
          href="/autoship"
          className="hidden underline decoration-[#f4a261]/50 underline-offset-4 sm:inline"
        >
          循環補貨享 9 折 · 滿 $699 免運
        </Link>
      </div>
      <div className="page-shell flex h-20 items-center justify-between gap-3">
        <Link
          href="/"
          aria-label="PURESPOT 首頁"
          className="shrink-0 rounded-lg bg-white px-2 py-1"
        >
          <Image
            src="/images/brand-logo.png"
            alt="PURESPOT"
            width={143}
            height={35}
            priority
            className="h-auto w-[115px] sm:w-[143px]"
          />
        </Link>
        <nav
          aria-label="主要導覽"
          className="hidden h-full items-center gap-7 lg:flex"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={path === link.href ? "page" : undefined}
              className={`relative flex h-full items-center text-sm font-medium transition-colors ${light ? "hover:text-[#a75b3d]" : "hover:text-[#fff7ec]"} ${path === link.href ? (light ? "text-[#ad5c3c]" : "text-[#f4a261]") : (light ? "text-[#796354]" : "text-[#b79d8e]")}`}
            >
              {link.label}
              {path === link.href && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-[#f4a261]"
                />
              )}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                className={`gap-2 px-2 sm:px-3 ${light ? "!border-[#e6d5c3] !bg-white !text-[#4f382c]" : ""}`}
                aria-label="切換毛孩"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-[#f4a261]/10 text-[#f4a261]">
                  <PetIcon />
                </span>
                <span className={`hidden sm:inline ${light ? "text-[#977b68]" : "text-slate-400"}`}>正在為</span>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={pet.id}
                    initial={{ y: 4, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -4, opacity: 0 }}
                    className="hidden min-[420px]:inline"
                  >
                    {pet.name}
                  </motion.span>
                </AnimatePresence>
                <ChevronDown className="hidden text-slate-500 min-[420px]:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {pets.map((p) => (
                <DropdownMenuItem key={p.id} onSelect={() => setActive(p.id)}>
                  {p.type === "CAT" ? <Cat size={20} /> : <Dog size={20} />}
                  <span className="flex-1">
                    {p.name}
                    <span className="ml-2 text-xs text-slate-400">
                      {p.weightKg} 公斤
                    </span>
                  </span>
                  {p.id === pet.id && (
                    <Check size={16} className="text-[#f4a261]" />
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setPetEditorOpen(true)}>
                <SlidersHorizontal size={17} />
                管理毛孩資料
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            className={`relative ${light ? "!text-[#715647] hover:!bg-[#f5e9dc]" : ""}`}
            aria-label={`購物車，${count} 件商品`}
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag className="!size-5" />
            {count > 0 && (
              <motion.span
                key={count}
                initial={{ scale: 0.6 }}
                animate={{ scale: 1 }}
                className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-[#f4a261] px-1 text-xs leading-5 text-[#2b170f]"
              >
                {count}
              </motion.span>
            )}
          </Button>
          {authUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="會員選單" className={light ? "!text-[#715647] hover:!bg-[#f5e9dc]" : ""}>
                  <User className="!size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled className="text-xs text-slate-500">
                  {authUser.name ?? authUser.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/account">我的帳戶</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => void logout()}
                  className="text-rose-300 focus:text-rose-200"
                >
                  <LogOut size={16} />
                  登出
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              aria-label="會員登入"
              onClick={() => setAuthOpen(true)}
              className={light ? "!text-[#715647] hover:!bg-[#f5e9dc]" : ""}
            >
              <LogIn className="!size-5" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`lg:hidden ${light ? "!text-[#715647] hover:!bg-[#f5e9dc]" : ""}`}
                aria-label="開啟導覽選單"
              >
                <Menu />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {links.map((link) => (
                <DropdownMenuItem key={link.href} asChild>
                  <Link href={link.href}>{link.label}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
