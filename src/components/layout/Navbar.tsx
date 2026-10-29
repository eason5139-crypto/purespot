"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Cat,
  Dog,
  PawPrint,
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
  const PetIcon = pet.type === "CAT" ? Cat : pet.type === "DOG" ? Dog : PawPrint;

  return (
    <header className="sticky top-0 z-40 border-b border-[#e8ded3] bg-white/95 backdrop-blur-xl">
      <div className="flex h-8 items-center justify-center gap-2 border-b border-[#e8ded3] bg-[#f5ebe0] px-3 text-xs tracking-wide text-[#935941]">
        <Repeat2 size={13} />
        <span>{announcement}</span>
        <Link
          href="/autoship"
          className="hidden underline decoration-[#935941]/40 underline-offset-4 sm:inline hover:text-[#794632]"
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
          {links.map((link) => {
            const active = path === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-full items-center text-sm font-medium transition-colors hover:text-[#935941] ${
                  active ? "text-[#935941]" : "text-[#5e544a]"
                }`}
              >
                {link.label}
                {active && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-[#935941]"
                  />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                className="gap-2 px-2 sm:px-3 !border-[#d9cfc3] !bg-[#fcfaf7] !text-[#302b26] hover:!bg-[#f4eee6]"
                aria-label="切換毛孩"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-[#935941]/10 text-[#935941]">
                  <PetIcon size={16} />
                </span>
                <span className="hidden sm:inline text-[#8a7f75]">正在為</span>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={pet.id}
                    initial={{ y: 4, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -4, opacity: 0 }}
                    className="hidden min-[420px]:inline font-medium"
                  >
                    {pet.name}
                  </motion.span>
                </AnimatePresence>
                <ChevronDown className="hidden text-[#8a7f75] min-[420px]:block" size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {pets.map((p) => (
                <DropdownMenuItem key={p.id} onSelect={() => setActive(p.id)}>
                  {p.type === "CAT" ? <Cat size={18} /> : p.type === "DOG" ? <Dog size={18} /> : <PawPrint size={18} />}
                  <span className="flex-1">
                    {p.name}
                    <span className="ml-2 text-xs text-[#8a7f75]">
                      {p.weightKg} 公斤
                    </span>
                  </span>
                  {p.id === pet.id && (
                    <Check size={16} className="text-[#935941]" />
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setPetEditorOpen(true)}>
                <SlidersHorizontal size={16} />
                管理毛孩資料
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="relative !text-[#5e544a] hover:!bg-[#f5ebe0] hover:!text-[#935941]"
            aria-label={`購物車，${count} 件商品`}
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag className="!size-5" />
            {count > 0 && (
              <motion.span
                key={count}
                initial={{ scale: 0.6 }}
                animate={{ scale: 1 }}
                className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-[#935941] px-1 text-xs font-semibold leading-5 text-white"
              >
                {count}
              </motion.span>
            )}
          </Button>

          {authUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="會員選單"
                  className="!text-[#5e544a] hover:!bg-[#f5ebe0] hover:!text-[#935941]"
                >
                  <User className="!size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled className="text-xs text-[#8a7f75]">
                  {authUser.name ?? authUser.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/account">我的帳戶</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => void logout()}
                  className="text-rose-600 focus:text-rose-700 focus:bg-rose-50"
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
              className="!text-[#5e544a] hover:!bg-[#f5ebe0] hover:!text-[#935941]"
            >
              <LogIn className="!size-5" />
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden !text-[#5e544a] hover:!bg-[#f5ebe0]"
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
