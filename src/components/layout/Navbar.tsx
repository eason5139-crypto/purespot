"use client";
import { useEffect } from "react";
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
  { href: "/", label: "專屬選物" },
  { href: "/community", label: "毛孩日常" },
  { href: "/autoship", label: "循環補貨" },
  { href: "/health", label: "健康儀表板" },
  { href: "/account", label: "我的帳戶" },
  { href: "/admin", label: "後台管理" },
];
export function Navbar() {
  const path = usePathname();
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
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const PetIcon = pet.type === "CAT" ? Cat : Dog;
  // 掛載時嘗試讀取已登入的會員（不影響展示模式）
  useEffect(() => {
    void fetchUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#090D16]/90 backdrop-blur-xl">
      <div className="flex h-8 items-center justify-center gap-2 border-b border-cyan-500/10 bg-cyan-400/5 px-3 text-xs tracking-wide text-cyan-100">
        <Repeat2 size={13} />
        <span>把補貨交給我們，把時間留給毛孩。</span>
        <Link
          href="/autoship"
          className="hidden underline decoration-cyan-400/50 underline-offset-4 sm:inline"
        >
          循環補貨享 9 折 · 滿 $699 免運
        </Link>
      </div>
      <div className="page-shell flex h-20 items-center justify-between gap-3">
        <Link
          href="/"
          aria-label="PURESPOT 首頁"
          className="shrink-0 rounded-lg bg-[#edf1f3] px-2 py-1"
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
              className={`relative flex h-full items-center text-sm font-medium transition-colors hover:text-white ${path === link.href ? "text-cyan-300" : "text-slate-400"}`}
            >
              {link.label}
              {path === link.href && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-cyan-400"
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
                className="gap-2 px-2 sm:px-3"
                aria-label="切換毛孩"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300">
                  <PetIcon />
                </span>
                <span className="hidden text-slate-400 sm:inline">正在為</span>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={pet.id}
                    initial={{ y: 4, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -4, opacity: 0 }}
                  >
                    {pet.name}
                  </motion.span>
                </AnimatePresence>
                <ChevronDown className="text-slate-500" />
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
                    <Check size={16} className="text-cyan-300" />
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
            className="relative"
            aria-label={`購物車，${count} 件商品`}
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag className="!size-5" />
            {count > 0 && (
              <motion.span
                key={count}
                initial={{ scale: 0.6 }}
                animate={{ scale: 1 }}
                className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-cyan-400 px-1 text-xs leading-5 text-slate-950"
              >
                {count}
              </motion.span>
            )}
          </Button>
          {authUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="會員選單">
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
            >
              <LogIn className="!size-5" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
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
