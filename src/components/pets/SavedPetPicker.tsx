"use client";

import { usePetContextStore } from "@/store/usePetContextStore";
import { petLabels } from "@/lib/types";

export function SavedPetPicker({ className = "" }: { className?: string }) {
  const pets = usePetContextStore((state) => state.allPets);
  const activePetId = usePetContextStore((state) => state.activePetId);
  const setActivePet = usePetContextStore((state) => state.setActivePet);

  return (
    <label className={`block text-sm font-medium text-[#5e544a] ${className}`}>
      選擇已儲存的毛孩
      <select
        aria-label="選擇已儲存的毛孩"
        className="input mt-2 w-full bg-white"
        value={activePetId}
        onChange={(event) => setActivePet(event.target.value)}
      >
        {pets.map((pet) => (
          <option key={pet.id} value={pet.id}>
            {pet.name} · {petLabels[pet.type]} · {pet.weightKg} 公斤
          </option>
        ))}
      </select>
    </label>
  );
}
