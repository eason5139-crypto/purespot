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
  User,
  LogOut,
  Compass,
  ScanSearch,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import { usePetContextStore, useActivePet } from "@/store/usePetContextStore";
import { useCartStore } from "@/store/useCartStore";
import { useUiStore } from "@/store/useUiStore";
import { useAuthStore } from "@/store/useAuthStore";
import { CART_BUMP_EVENT } from "@/lib/flyToCart";
import { LittleP } from "@/components/assistant/LittleP";
import type { PublicAssistantSettings } from "@/lib/assistant";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

const links = [
  { href: "/", label: "首頁" },
  { href: "/shop", label: "選物本舖" },
  { href: "/rewards", label: "點數商店" },
  { href: "/community", label: "毛孩生活圈" },
  { href: "/autoship", label: "定期配送" },
];

export function Navbar({ announcement, assistant }: { announcement: string; assistant: PublicAssistantSettings | null }) {
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
      setBumpLabel(detail?.label ? `已納入購物籃：${detail.label}` : "+1 納入購物籃");
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
    <header className="site-header sticky top-0 z-40 border-b border-[#dce4e7] bg-[#fffefa]/95 backdrop-blur-xl">
      <div className="flex min-h-8 items-center justify-center gap-2 bg-[#e5eef3] px-3 py-1 text-xs font-medium text-[#315f86]">
        <Repeat2 size={13} className="shrink-0 text-[#315f86]" />
        <span className="truncate">{announcement}</span>
        <span className="hidden text-[#c2b09c] sm:inline">｜</span>
        <Link
          href="/autoship"
          className="hidden items-center gap-1 rounded-full bg-[#fffefa] px-2.5 py-0.5 text-[11px] font-bold text-[#315f86] shadow-2xs transition-transform hover:scale-105 sm:inline-flex"
        >
          <Sparkles size={11} />
          定期配糧 9 折・滿 $699 免運送到家
        </Link>
      </div>
      <LittleP initialSettings={assistant} />
      <div className="page-shell flex h-[76px] items-center justify-between gap-3">
        <Link
          href="/"
          aria-label="PURESPOT 首頁"
          className="group shrink-0 py-2 transition-transform active:scale-95"
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
          className="hidden h-full shrink-0 items-center gap-1 xl:gap-3 lg:flex"
        >
          {links.map((link) => {
            const active = link.href === "/" ? path === "/" : path.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`group relative flex h-11 shrink-0 items-center whitespace-nowrap rounded-full px-2 xl:px-3 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#f5ebe0] font-semibold text-[#315f86]"
                    : "text-[#5e544a] hover:bg-[#f9f3eb] hover:text-[#315f86]"
                }`}
              >
                <span>{link.label}</span>
                {active && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute inset-x-3 -bottom-2 h-0.5 rounded-full bg-[#315f86]"
                  />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                className="gap-2 rounded-full px-2.5 sm:px-3.5 !border-[#cbdbe5] !bg-[#fffefa] !text-[#18344c] shadow-[0_2px_0_#cbdbe5] hover:!bg-[#edf3f7] active:translate-y-0.5"
                aria-label="切換毛孩"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-[#315f86]/15 text-[#315f86]">
                  <PetIcon size={16} />
                </span>
                <span className="hidden sm:inline text-xs text-[#8a7f75]">陪著</span>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={pet.id}
                    initial={{ y: 4, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -4, opacity: 0 }}
                    className="hidden max-w-24 truncate min-[420px]:inline font-semibold text-[#18344c]"
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
                    <Check size={16} className="text-[#315f86]" />
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
              className="relative flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#cbdbe5] bg-white px-3.5 text-sm font-semibold text-[#18344c] transition-colors hover:border-[#315f86] hover:bg-[#edf3f7]"
              aria-label={`購物車，${count} 件商品`}
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag className="size-4.5 text-[#315f86]" />
              <span className="hidden text-xs font-bold sm:inline">購物籃</span>
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0.4, y: -4 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 450, damping: 16 }}
                  className="flex min-w-5 items-center justify-center rounded-full bg-[#315f86] px-1.5 text-xs font-bold leading-5 text-white shadow-xs"
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
                  className="pointer-events-none absolute right-0 top-13 z-50 flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[#315f86]/30 bg-[#18344c] px-3 py-1 text-[11px] font-semibold text-[#fffefa] shadow-lg"
                >
                  <PawPrint size={12} className="text-[#e2a84c]" />
                  <span>{bumpLabel}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="會員選單"
                  className="rounded-full !text-[#5e544a] hover:!bg-[#f5ebe0] hover:!text-[#315f86]"
                >
                  <User className="!size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="max-w-64 truncate px-3 py-2 text-xs text-[#647581]">{authUser ? authUser.name ?? authUser.email : "歡迎來到 PURESPOT"}</div>
                <DropdownMenuSeparator />
                {authUser ? <DropdownMenuItem asChild><Link href="/account"><User size={16} />我的帳戶</Link></DropdownMenuItem>
                  : <DropdownMenuItem onSelect={() => setAuthOpen(true)}><User size={16} />登入或建立帳戶</DropdownMenuItem>}
                <DropdownMenuSub><DropdownMenuSubTrigger className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm outline-none focus:bg-[#edf3f6] data-[state=open]:bg-[#edf3f6]"><Compass size={16}/>照顧工具<ChevronDown size={14} className="ml-auto -rotate-90"/></DropdownMenuSubTrigger><DropdownMenuSubContent className="z-50 max-h-[70vh] min-w-52 overflow-y-auto rounded-2xl border border-[#d3e0e7] bg-white p-2 text-[#18344c] shadow-xl" sideOffset={6}>{[["/care/compass","選物羅盤"],["/care/ingredients","成分放大鏡"],["/care/packing","旅前打包桌"],["/care/selection","選物實驗室"],["/care/feeding","一日餵食時鐘"],["/care/refill","存糧週期預報"],["/care/transition","七日換糧陪跑"],["/care/missions","探索任務手冊"],["/health","毛孩健康手札"]].map(([href,label])=><DropdownMenuItem key={href} asChild><Link href={href!}>{label}</Link></DropdownMenuItem>)}</DropdownMenuSubContent></DropdownMenuSub>
                <DropdownMenuItem asChild><Link href="/account?tab=tasks"><Check size={16}/>簽到與任務</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/account?tab=games"><Sparkles size={16}/>遊戲室</Link></DropdownMenuItem>
                {authUser&&<DropdownMenuItem asChild><Link href="/account?tab=support"><User size={16}/>客服紀錄</Link></DropdownMenuItem>}
                <DropdownMenuItem asChild><Link href="/transparency"><ScanSearch size={16} />成分與批次資料</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/health"><PawPrint size={16} />毛孩健康手札</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/autoship"><CalendarDays size={16} />定期配糧</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                {authUser && <DropdownMenuItem
                  onSelect={() => void logout()}
                  className="text-rose-600 focus:text-rose-700 focus:bg-rose-50"
                >
                  <LogOut size={16} />
                  登出
                </DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
      <nav aria-label="行動版主要導覽" className="page-shell grid grid-cols-5 gap-0.5 border-t border-[#edf1f1] py-2 lg:hidden">{links.map((link) => <Link key={link.href} href={link.href}
        aria-current={path === link.href ? "page" : undefined} className={`whitespace-nowrap rounded-full px-0.5 py-2 text-center text-[11px] min-[400px]:text-xs font-medium ${path === link.href ? "bg-[#e5eef3] text-[#315f86]" : "text-[#4f6574]"}`}>{link.label}</Link>)}</nav>
    </header>
  );
}
