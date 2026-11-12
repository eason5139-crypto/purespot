"use client";
import { useEffect, useState } from "react";
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
  Sparkles,
} from "lucide-react";
import { usePetContextStore, useActivePet } from "@/store/usePetContextStore";
import { useCartStore } from "@/store/useCartStore";
import { useUiStore } from "@/store/useUiStore";
import { useAuthStore } from "@/store/useAuthStore";
import { CART_BUMP_EVENT } from "@/lib/flyToCart";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const links = [
  { href: "/", label: "品牌首頁", badge: "" },
  { href: "/shop", label: "柑仔選物店", badge: "便當自由配" },
  { href: "/transparency", label: "透明履歷", badge: "" },
  { href: "/community", label: "街坊毛孩牆", badge: "印里民證" },
  { href: "/care", label: "照顧小工具", badge: "" },
  { href: "/account", label: "我的帳戶", badge: "" },
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

  const [cartBumping, setCartBumping] = useState(false);
  const [bumpLabel, setBumpLabel] = useState<string | null>(null);

  useEffect(() => {
    const onBump = (event: Event) => {
      const detail = (event as CustomEvent<{ label?: string }>).detail;
      setCartBumping(true);
      setBumpLabel(detail?.label ? `已放進：${detail.label}` : "+1 放進菜籃囉！");
      const t1 = window.setTimeout(() => setCartBumping(false), 600);
      const t2 = window.setTimeout(() => setBumpLabel(null), 1900);
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
      };
    };
    window.addEventListener(CART_BUMP_EVENT, onBump);
    return () => window.removeEventListener(CART_BUMP_EVENT, onBump);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-[#e5d9c8] bg-[#fffcf7]/95 backdrop-blur-xl">
      <div className="flex min-h-9 items-center justify-center gap-2 border-b border-[#e8dccb] bg-[#f4e8d7] px-3 py-1 text-xs font-medium tracking-wide text-[#7c4d38]">
        <Repeat2 size={13} className="shrink-0 text-[#935941]" />
        <span className="truncate">{announcement}</span>
        <span className="hidden text-[#c2b09c] sm:inline">｜</span>
        <Link
          href="/autoship"
          className="hidden items-center gap-1 rounded-full bg-[#fffaf2] px-2.5 py-0.5 text-[11px] font-bold text-[#935941] shadow-2xs transition-transform hover:scale-105 sm:inline-flex"
        >
          <Sparkles size={11} />
          定期配糧 9 折・滿 $699 免運送到家
        </Link>
      </div>
      <div className="page-shell flex h-20 items-center justify-between gap-3">
        <Link
          href="/"
          aria-label="PURESPOT 首頁"
          className="group shrink-0 rounded-xl bg-white px-2.5 py-1.5 shadow-2xs ring-1 ring-[#ece0d1] transition-transform active:scale-95"
        >
          <Image
            src="/images/brand-logo.png"
            alt="PURESPOT"
            width={143}
            height={35}
            priority
            className="h-auto w-[115px] transition-transform duration-300 group-hover:scale-[1.03] sm:w-[143px]"
          />
        </Link>
        <nav
          aria-label="主要導覽"
          className="hidden h-full items-center gap-2 xl:gap-5 lg:flex"
        >
          {links.map((link) => {
            const active = path === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`group relative flex h-11 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-[#f5ebe0] font-semibold text-[#935941]"
                    : "text-[#5e544a] hover:bg-[#f9f3eb] hover:text-[#935941]"
                }`}
              >
                <span>{link.label}</span>
                {link.badge && (
                  <span className="rounded-full bg-[#935941]/12 px-1.5 py-0.5 text-[10px] font-bold text-[#935941] transition-transform group-hover:scale-105">
                    {link.badge}
                  </span>
                )}
                {active && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute inset-x-3 -bottom-2 h-0.5 rounded-full bg-[#935941]"
                  />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                className="gap-2 rounded-full px-2.5 sm:px-3.5 !border-[#dfd0be] !bg-[#fffaf2] !text-[#302b26] shadow-[0_2px_0_#dfd0be] hover:!bg-[#f7efe4] active:translate-y-0.5"
                aria-label="切換毛孩"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-[#935941]/15 text-[#935941]">
                  <PetIcon size={16} />
                </span>
                <span className="hidden sm:inline text-xs text-[#8a7f75]">陪著</span>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={pet.id}
                    initial={{ y: 4, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -4, opacity: 0 }}
                    className="hidden min-[420px]:inline font-semibold text-[#302b26]"
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
                編輯毛孩小檔案
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="relative">
            <motion.button
              id="navbar-cart-button"
              type="button"
              animate={
                cartBumping
                  ? {
                      scale: [1, 1.35, 0.88, 1.12, 1],
                      rotate: [0, -14, 14, -6, 0],
                    }
                  : { scale: 1, rotate: 0 }
              }
              transition={{ duration: 0.52, ease: "easeOut" }}
              whileHover={{ scale: 1.06, y: -1 }}
              whileTap={{ scale: 0.92, y: 2 }}
              className="relative flex h-11 items-center gap-1.5 rounded-full border border-[#dfd0be] bg-[#fffaf2] px-3.5 text-sm font-semibold text-[#302b26] shadow-[0_2px_0_#dfd0be] transition-colors hover:border-[#935941] hover:bg-[#f7efe4]"
              aria-label={`購物車，${count} 件商品`}
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag className="size-4.5 text-[#935941]" />
              <span className="hidden text-xs font-bold sm:inline">菜籃</span>
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0.4, y: -4 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 450, damping: 16 }}
                  className="flex min-w-5 items-center justify-center rounded-full bg-[#935941] px-1.5 text-xs font-bold leading-5 text-white shadow-xs"
                >
                  {count}
                </motion.span>
              )}
            </motion.button>

            <AnimatePresence>
              {bumpLabel && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.9 }}
                  className="pointer-events-none absolute right-0 top-13 z-50 whitespace-nowrap rounded-full border border-[#935941]/30 bg-[#302b26] px-3 py-1 text-[11px] font-semibold text-[#fffaf2] shadow-lg"
                >
                  🐾 {bumpLabel}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {authUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="會員選單"
                  className="rounded-full !text-[#5e544a] hover:!bg-[#f5ebe0] hover:!text-[#935941]"
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
              className="rounded-full !text-[#5e544a] hover:!bg-[#f5ebe0] hover:!text-[#935941]"
            >
              <LogIn className="!size-5" />
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden rounded-full !text-[#5e544a] hover:!bg-[#f5ebe0]"
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
              <DropdownMenuItem asChild>
                <Link href="/health">健康儀表板</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
