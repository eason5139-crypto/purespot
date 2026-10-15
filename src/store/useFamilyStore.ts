"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface FamilyMember {
  id: string;
  name: string;
  avatar: string;
  role: "OWNER" | "MEMBER";
  relationship: string;
  phone?: string;
  linePayConnected?: boolean;
}

export interface SharedCartItem {
  id: string;
  productId: string;
  name: string;
  image: string;
  priceNt: number;
  quantity: number;
  addedBy: string;
  memberAvatar: string;
  note: string;
  addedAt: string;
}

interface FamilyState {
  groupName: string;
  inviteCode: string;
  members: FamilyMember[];
  sharedItems: SharedCartItem[];
  cartMode: "PERSONAL" | "FAMILY";
  setCartMode: (mode: "PERSONAL" | "FAMILY") => void;
  addSharedItem: (item: Omit<SharedCartItem, "id" | "addedAt">) => void;
  removeSharedItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  inviteMember: (name: string, relationship: string) => string;
}

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set, get) => ({
      groupName: "波比的家 (毛孩共享群組)",
      inviteCode: "PURE-BOBI-8821",
      cartMode: "PERSONAL",
      members: [
        { id: "m1", name: "媽媽", avatar: "👩", role: "OWNER", relationship: "主購人", linePayConnected: true },
        { id: "m2", name: "哥哥", avatar: "👦", role: "MEMBER", relationship: "家人", linePayConnected: true },
        { id: "m3", name: "室友", avatar: "👧", role: "MEMBER", relationship: "同住室友", linePayConnected: true },
      ],
      sharedItems: [
        {
          id: "si-1",
          productId: "salmon-cat",
          name: "鮮雞原肉主食糧 (波比常備主糧)",
          image: "/images/salmon-cat.png",
          priceNt: 1280,
          quantity: 2,
          addedBy: "媽媽",
          memberAvatar: "👩",
          note: "波比的主糧快吃完了，趁免運補兩箱！",
          addedAt: "剛剛",
        },
        {
          id: "si-2",
          productId: "dental-chew",
          name: "天然超耐咬磨牙潔牙骨",
          image: "/images/salmon-cat.png",
          priceNt: 320,
          quantity: 1,
          addedBy: "哥哥",
          memberAvatar: "👦",
          note: "幫波比買潔牙骨～下午出門散步獎勵！",
          addedAt: "10分鐘前",
        },
        {
          id: "si-3",
          productId: "squeak-toy",
          name: "啾啾放電造型互動玩具",
          image: "/images/salmon-cat.png",
          priceNt: 450,
          quantity: 1,
          addedBy: "室友",
          memberAvatar: "👧",
          note: "看到這玩具超可愛，買給波比玩！",
          addedAt: "15分鐘前",
        },
      ],
      setCartMode: (mode) => set({ cartMode: mode }),
      addSharedItem: (item) =>
        set((state) => ({
          sharedItems: [
            ...state.sharedItems,
            {
              ...item,
              id: `si-${Date.now()}`,
              addedAt: "剛剛",
            },
          ],
        })),
      removeSharedItem: (id) =>
        set((state) => ({
          sharedItems: state.sharedItems.filter((i) => i.id !== id),
        })),
      updateQuantity: (id, quantity) =>
        set((state) => ({
          sharedItems: state.sharedItems.map((i) =>
            i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i
          ),
        })),
      inviteMember: (name, relationship) => {
        const id = `m-${Date.now()}`;
        const newMember: FamilyMember = {
          id,
          name,
          avatar: "🧑",
          role: "MEMBER",
          relationship,
          linePayConnected: true,
        };
        set((state) => ({ members: [...state.members, newMember] }));
        return get().inviteCode;
      },
    }),
    {
      name: "purespot-family-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
