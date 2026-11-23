"use client";

import { useEffect, useState } from "react";
import {useSearchParams} from "next/navigation";
import { Award, Bell, BookHeart, Heart, HeartHandshake, KeyRound, ListChecks, LogIn, Map, MapPin, PawPrint, ReceiptText, Sparkles, UserRound } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { usePetContextStore } from "@/store/usePetContextStore";
import { useUiStore } from "@/store/useUiStore";
import { DailyRhythm } from "@/components/account/DailyRhythm";
import { AccountOrders } from "@/components/account/AccountOrders";
import { AccountSettings } from "@/components/account/AccountSettings";
import { AccountFavorites } from "@/components/account/AccountFavorites";
import { AccountCare } from "@/components/account/AccountCare";
import { MemberClub } from "@/components/account/MemberClub";
import { MemberExperience } from "@/components/account/MemberExperience";
import { FamilyWorkspace } from "@/components/account/FamilyWorkspace";
import { MemoryMap } from "@/components/account/MemoryMap";
import { GrowthAlbum } from "@/components/account/GrowthAlbum";
import { SecurityCenter } from "@/components/account/SecurityCenter";

const navGroups = [
  { title: "日常與毛孩", tabs: [ { id: "rhythm", label: "日常節奏板", icon: Sparkles }, { id: "care", label: "照顧紀錄", icon: ListChecks }, { id: "growth", label: "成長收藏冊", icon: BookHeart } ] },
  { title: "購物與收藏", tabs: [ { id: "orders", label: "完整訂單", icon: ReceiptText }, { id: "memory", label: "購物回憶地圖", icon: Map }, { id: "favorites", label: "雲端收藏", icon: Heart } ] },
  { title: "家人與會員", tabs: [ { id: "family", label: "家庭共買", icon: HeartHandshake }, { id: "membership", label: "等級・點數・徽章", icon: Award }, {id:"tickets",label:"我的票券",icon:ReceiptText}, {id:"tasks",label:"簽到與任務",icon:ListChecks}, {id:"games",label:"遊戲室",icon:Sparkles} ] },
  { title: "帳戶設定", tabs: [ { id: "settings", label: "收件與通知", icon: MapPin }, { id: "security", label: "帳戶安全", icon: KeyRound } ] },
] as const;
const tabs = navGroups.reduce<Array<(typeof navGroups)[number]["tabs"][number]>>((all, group) => [...all, ...group.tabs], []);
type Tab = typeof tabs[number]["id"];

export default function AccountPage() {
  const searchParams=useSearchParams();
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const fetchUser = useAuthStore((state) => state.fetchUser);
  const logout = useAuthStore((state) => state.logout);
  const openAuth = useUiStore((state) => state.setAuthOpen);
  const openPetEditor = useUiStore((state) => state.setPetEditorOpen);
  const allPets = usePetContextStore((state) => state.allPets);
  const activePetId = usePetContextStore((state) => state.activePetId);
  const setActivePet = usePetContextStore((state) => state.setActivePet);
  const [tab, setTab] = useState<Tab>("rhythm");

  useEffect(() => { void fetchUser(); }, [fetchUser]);
  useEffect(()=>{const candidate=searchParams.get("tab");setTab(tabs.some(item=>item.id===candidate)?candidate as Tab:"rhythm");},[searchParams]);
  function changeTab(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "rhythm") url.searchParams.delete("tab"); else url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  }

  if (loading && !user) return <main id="main-content" className="page-shell py-24"><p className="text-center text-sm text-[#687985]">正在載入帳戶…</p></main>;
  if (!user) return <main id="main-content" className="page-shell py-20"><div className="mx-auto max-w-lg rounded-[28px] border border-[#e1d7cc] bg-white p-9 text-center shadow-sm"><span className="mx-auto grid size-16 place-items-center rounded-full bg-[#e8f1f8] text-[#315F86]"><UserRound size={28} /></span><h1 className="editorial-title mt-6 text-3xl text-[#263746]">登入後，照顧更有條理。</h1><p className="mt-4 text-sm leading-7 text-[#687985]">查看完整訂單、保存收件地址與收藏，替每隻毛孩安排照顧紀錄和日常提醒。</p><button type="button" onClick={() => openAuth(true)} className="mx-auto mt-7 flex min-h-12 items-center gap-2 rounded-xl bg-[#315F86] px-6 text-sm font-semibold text-white"><LogIn size={17} />登入或建立帳戶</button></div></main>;

  return <main id="main-content" className="min-h-screen bg-[#f8f5ef] pb-20 text-[#263746]"><div className="page-shell pt-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="editorial-title text-4xl sm:text-5xl">{user.name ? `${user.name}的日常` : "我的帳戶"}</h1><p className="mt-3 text-sm text-[#687985]">{user.email} · 從訂單到陪伴，都在這裡慢慢整理。</p></div><button type="button" onClick={() => void logout()} className="min-h-10 rounded-full border border-[#cbd8e0] px-4 text-xs font-semibold text-[#315F86] hover:bg-white">登出帳戶</button></div>
    <section className="mt-8 flex flex-wrap items-center gap-2 rounded-[18px] border border-[#e0e4e2] bg-white p-3"><span className="flex items-center gap-2 px-2 text-xs font-semibold text-[#687985]"><PawPrint size={15} className="text-[#5B93C5]" />我的毛孩</span>{allPets.map((pet) => <button key={pet.id} type="button" aria-pressed={pet.id === activePetId} onClick={() => setActivePet(pet.id)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${pet.id === activePetId ? "bg-[#315F86] text-white" : "bg-[#f3f7f9] text-[#315F86]"}`}>{pet.name}</button>)}<button type="button" onClick={() => openPetEditor(true)} className="ml-auto rounded-full px-3 py-1.5 text-xs font-semibold text-[#315F86] hover:bg-[#e8f1f8]">新增或編輯毛孩</button></section>
    <div className="mt-7 grid items-start gap-7 lg:grid-cols-[250px_minmax(0,1fr)]"><nav aria-label="我的帳戶功能" className="rounded-[20px] border border-[#e1d7cc] bg-white p-3 lg:sticky lg:top-6">{navGroups.map((group) => <div key={group.title} className="mb-4 last:mb-0"><p className="px-3 pb-1 text-[11px] font-bold text-[#8b918f]">{group.title}</p><div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">{group.tabs.map((item) => <button key={item.id} type="button" onClick={() => changeTab(item.id)} aria-current={tab === item.id ? "page" : undefined} className={`flex min-h-11 items-center gap-2 rounded-xl px-3 text-left text-xs font-semibold transition-colors sm:text-sm ${tab === item.id ? "bg-[#315F86] text-white" : "text-[#66737a] hover:bg-[#e8f1f8] hover:text-[#315F86]"}`}><item.icon size={17} className="shrink-0" />{item.label}</button>)}</div></div>)}</nav><div className="min-w-0">{tab === "rhythm" && <DailyRhythm onTabChange={changeTab} />}{tab === "orders" && <AccountOrders />}{tab === "settings" && <AccountSettings />}{tab === "favorites" && <AccountFavorites />}{tab === "care" && <AccountCare />}{tab === "growth" && <GrowthAlbum />}{tab === "memory" && <MemoryMap />}{tab === "family" && <FamilyWorkspace />}{tab === "membership" && <MemberExperience />}{tab === "tickets" && <MemberExperience view="tickets" />}{tab === "tasks" && <MemberExperience view="tasks" />}{tab === "games" && <MemberExperience view="games" />}{tab === "security" && <SecurityCenter />}</div></div>
    <p className="mt-12 flex items-center gap-2 border-t border-[#e1d7cc] pt-6 text-xs leading-6 text-[#8b918f]"><Bell size={14} />帳戶資料僅在登入後顯示；可在收件與通知中調整站內提醒。</p></div></main>;
}
