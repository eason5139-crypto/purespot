import type { ActivePet } from "./types";
import { petSchema } from "./types";
import { usePetContextStore } from "@/store/usePetContextStore";
import { useCartStore } from "@/store/useCartStore";
import { useCareStore } from "@/store/useCareStore";

type CloudPet = {
  id: string;
  name: string;
  type: ActivePet["type"];
  breed: string;
  birthday: string;
  weightKg: number;
  isNeutered: boolean;
  activityLevel: ActivePet["activityLevel"];
  allergies: string[];
  goal: string;
  avatarUrl: string | null;
};

function toLocalPet(pet: CloudPet): ActivePet {
  const birthday = new Date(pet.birthday);
  const now = new Date();
  const ageMonths = Math.max(1, Math.min(360, (now.getUTCFullYear() - birthday.getUTCFullYear()) * 12 + now.getUTCMonth() - birthday.getUTCMonth()));
  return petSchema.parse({
    id: pet.id,
    cloudId: pet.id,
    name: pet.name,
    type: pet.type,
    breed: pet.breed,
    weightKg: pet.weightKg,
    ageMonths,
    isNeutered: pet.isNeutered,
    activityLevel: pet.activityLevel,
    allergies: pet.allergies,
    goal: pet.goal === "WEIGHT_LOSS" ? "WEIGHT_LOSS" : "MAINTAIN",
    avatarUrl: pet.avatarUrl || undefined,
  });
}

async function loadCloudPets(): Promise<ActivePet[]> {
  const response = await fetch("/api/pets", { cache: "no-store" });
  if (!response.ok) throw new Error("毛孩資料暫時無法同步");
  const data = await response.json() as { pets?: CloudPet[] };
  return (data.pets ?? []).map(toLocalPet);
}

async function pushPets(pets: ActivePet[]): Promise<{ pets: ActivePet[]; mapping: Record<string, string> }> {
  const response = await fetch("/api/pets/library", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pets }),
  });
  if (!response.ok) throw new Error("毛孩資料暫時無法同步");
  const data = await response.json() as { pets?: CloudPet[]; mapping?: Record<string, string> };
  return { pets: (data.pets ?? []).map(toLocalPet), mapping: data.mapping ?? {} };
}

function matches(local: ActivePet, cloud: ActivePet) {
  return local.cloudId === cloud.cloudId || local.id === cloud.id ||
    (local.name === cloud.name && local.type === cloud.type && local.breed === cloud.breed);
}

export async function syncSavedPets(userId: string) {
  const previousUserId = localStorage.getItem("purespot-last-member-id");
  if (previousUserId && previousUserId !== userId) {
    usePetContextStore.getState().resetPets();
    useCartStore.getState().clear();
    useCareStore.getState().resetCare();
  }
  const cloud = await loadCloudPets();
  const local = usePetContextStore.getState().allPets;
  const unsynced = local.filter((pet) => !cloud.some((item) => matches(pet, item)));
  const pushed = unsynced.length ? await pushPets(unsynced) : null;
  if (pushed) for (const pet of unsynced) {
    const cloudId = pushed.mapping[pet.id];
    if (cloudId) usePetContextStore.getState().updatePet(pet.id, { cloudId });
  }
  const allCloud = pushed?.pets ?? cloud;
  usePetContextStore.getState().mergeCloudPets(allCloud);
  localStorage.setItem("purespot-last-member-id", userId);
}

export async function savePetToCloud(pet: ActivePet) {
  const pushed = await pushPets([pet]);
  const cloudId = pushed.mapping[pet.id];
  if (cloudId) usePetContextStore.getState().updatePet(pet.id, { cloudId });
  usePetContextStore.getState().mergeCloudPets(pushed.pets);
}
