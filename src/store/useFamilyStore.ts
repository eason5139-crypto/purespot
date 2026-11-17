"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getProduct } from "@/lib/catalog";
import { toast } from "sonner";
import type { ActivePet } from "@/lib/types";

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
  groupId: string | null;
  role: "OWNER" | "MEMBER" | null;
  familyPets: ActivePet[];
  loadCloud: () => Promise<void>;
  resetFamily: () => void;
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
      groupId: null,
      role: null,
      familyPets: [],
      members: [{ id: "m1", name: "我", avatar: "主", role: "OWNER", relationship: "主購人", linePayConnected: false }],
      sharedItems: [],
      loadCloud: async () => {
        const response = await fetch("/api/account/family", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json() as {
          group: { id: string; name: string; inviteCode: string }; role: "OWNER" | "MEMBER";
          members: { userId: string; role: "OWNER" | "MEMBER"; user: { name: string | null; email: string } }[];
          items: { id: string; productId: string; petId: string | null; quantity: number; note: string; addedById: string; createdAt: string }[];
          pets: { id: string; name: string; type: ActivePet["type"]; breed: string; birthday: string; weightKg: number; isNeutered: boolean; activityLevel: ActivePet["activityLevel"]; allergies: string[]; goal: string; avatarUrl: string | null }[];
        };
        set({
          groupId: data.group.id, role: data.role, groupName: data.group.name, inviteCode: data.group.inviteCode,
          members: data.members.map((member) => ({ id: member.userId, name: member.user.name || member.user.email, avatar: (member.user.name || member.user.email).slice(0, 1), role: member.role, relationship: member.role === "OWNER" ? "主帳戶" : "家庭成員" })),
          familyPets: data.pets.map((pet) => ({ id: pet.id, cloudId: pet.id, name: pet.name, type: pet.type, breed: pet.breed, weightKg: pet.weightKg, ageMonths: Math.max(1, Math.min(360, Math.round((Date.now() - new Date(pet.birthday).getTime()) / (30.44 * 86400000)))), isNeutered: pet.isNeutered, activityLevel: pet.activityLevel, allergies: pet.allergies, goal: pet.goal === "WEIGHT_LOSS" ? "WEIGHT_LOSS" : "MAINTAIN", avatarUrl: pet.avatarUrl || undefined })),
          sharedItems: data.items.map((item) => {
            const product = getProduct(item.productId);
            const member = data.members.find((candidate) => candidate.userId === item.addedById);
            return { id: item.id, productId: item.productId, petId: item.petId || undefined, name: product?.name || "已下架商品", image: product?.image || "", priceNt: product?.priceNt || 0, quantity: item.quantity, addedBy: member?.user.name || "家庭成員", memberAvatar: (member?.user.name || "家").slice(0, 1), note: item.note, addedAt: item.createdAt };
          }),
        });
      },
      resetFamily: () => set({ groupId: null, role: null, familyPets: [], groupName: "我的家庭清單", inviteCode: "", members: [], sharedItems: [], cartMode: "PERSONAL" }),
      setCartMode: (mode) => set({ cartMode: mode }),
      addSharedItem: (item) => {
        set((state) => ({
          sharedItems: [
            ...state.sharedItems,
            {
              ...item,
              id: `si-${Date.now()}`,
              addedAt: "剛剛",
            },
          ],
        }));
        void fetch("/api/account/family", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add", productId: item.productId, petId: item.petId, quantity: item.quantity, note: item.note }) }).then(async (response) => { if (!response.ok) throw new Error((await response.json()).error); await get().loadCloud(); }).catch((error) => { toast.error(error instanceof Error ? error.message : "家庭清單儲存失敗"); void get().loadCloud(); });
      },
      removeSharedItem: (id) => {
        set((state) => ({
          sharedItems: state.sharedItems.filter((i) => i.id !== id),
        }));
        void fetch("/api/account/family", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "remove", itemId: id }) }).then(() => get().loadCloud()).catch(() => toast.error("移除失敗，請重試"));
      },
      updateQuantity: (id, quantity) => {
        set((state) => ({
          sharedItems: state.sharedItems.map((i) =>
            i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i
          ),
        }));
        void fetch("/api/account/family", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "quantity", itemId: id, quantity: Math.max(1, quantity) }) }).then(() => get().loadCloud()).catch(() => toast.error("數量更新失敗，請重試"));
      },
      clearSharedItems: () => set({ sharedItems: [] }),
      inviteMember: (name, relationship) => {
        const id = `m-${Date.now()}`;
        const newMember: FamilyMember = {
          id,
          name,
          avatar: name.trim().slice(0, 1) || "友",
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
      migrate: (saved) => ({ ...(saved as object), groupId: null, role: null }),
      partialize: (state) => ({ cartMode: state.cartMode, sharedItems: state.groupId ? [] : state.sharedItems }),
      storage: createJSONStorage(() => localStorage),
    }
  )
);
