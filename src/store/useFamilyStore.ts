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
  petId?: string;
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
  clearSharedItems: () => void;
  inviteMember: (name: string, relationship: string) => string;
}

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set, get) => ({
      groupName: "我的家庭清單",
      inviteCode: "PURE-BOBI-8821",
      cartMode: "PERSONAL",
      members: [{ id: "m1", name: "我", avatar: "🧑", role: "OWNER", relationship: "主購人", linePayConnected: false }],
      sharedItems: [],
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
      clearSharedItems: () => set({ sharedItems: [] }),
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
      version: 2,
      migrate: (saved) => ({ ...(saved as object), sharedItems: [] }),
      storage: createJSONStorage(() => localStorage),
    }
  )
);
