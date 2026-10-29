"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Cat, Dog, Rabbit, Mouse } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useActivePet, usePetContextStore } from "@/store/usePetContextStore";
import { useUiStore } from "@/store/useUiStore";
import { petSchema, petLabels, type ActivePet } from "@/lib/types";

const allergens = ["雞肉", "牛肉", "魚類", "大豆", "乳製品", "小麥"];

export function PetEditor() {
  const pet = useActivePet();
  const [draft, setDraft] = useState<ActivePet>(pet);
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState("");
  const close = useUiStore((s) => s.setPetEditorOpen);
  const update = usePetContextStore((s) => s.updatePet);
  const add = usePetContextStore((s) => s.addPet);

  function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = petSchema.safeParse(draft);
    if (!parsed.success) {
      setError("請確認姓名、體重（0.02–90 公斤）與月齡（1–360 個月）。");
      return;
    }
    try {
      if (isNew) add(parsed.data);
      else update(pet.id, parsed.data);
      toast.success("毛孩資料已儲存，選物與配糧同步更新");
      close(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗，請再試一次");
    }
  }

  return (
    <Dialog open onOpenChange={close}>
      <DialogContent className="max-w-xl">
        <DialogTitle className="pr-10 text-2xl font-semibold text-[#302b26]">
          {isNew ? "認識新家人" : "毛孩的小檔案"}
        </DialogTitle>
        <DialogDescription className="mt-2 text-sm text-[#8a7f75]">
          每一個細節，都讓我們更懂牠的需要。
        </DialogDescription>
        <form onSubmit={save} className="mt-6 space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["CAT", "DOG", "HAMSTER", "RABBIT"] as const).map((type) => (
              <Button
                key={type}
                type="button"
                variant={draft.type === type ? "default" : "secondary"}
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    type,
                    breed: type === "CAT" ? "家貓" : type === "DOG" ? "家犬" : type === "HAMSTER" ? "倉鼠" : "家兔",
                    weightKg: type === "HAMSTER" ? 0.1 : type === "RABBIT" ? 2 : d.weightKg < 0.5 ? 4 : d.weightKg,
                  }))
                }
              >
                {type === "CAT" ? <Cat /> : type === "DOG" ? <Dog /> : type === "HAMSTER" ? <Mouse /> : <Rabbit />}
                {petLabels[type]}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="field-label">
              毛孩名稱
              <input
                className="input"
                value={draft.name}
                maxLength={24}
                required
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
              />
            </label>
            <label className="field-label">
              品種
              <input
                className="input"
                value={draft.breed}
                maxLength={40}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, breed: e.target.value }))
                }
              />
            </label>
            <label className="field-label">
              體重（公斤）
              <input
                className="input"
                type="number"
                min="0.02"
                max="90"
                step="0.01"
                required
                value={draft.weightKg}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, weightKg: Number(e.target.value) }))
                }
              />
            </label>
            <label className="field-label">
              年齡（月）
              <input
                className="input"
                type="number"
                min="1"
                max="360"
                required
                value={draft.ageMonths}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, ageMonths: Number(e.target.value) }))
                }
              />
            </label>
          </div>
          <label className="field-label">
            活動量
            <select
              className="input"
              value={draft.activityLevel}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  activityLevel: e.target.value as ActivePet["activityLevel"],
                }))
              }
            >
              <option value="SEDENTARY">悠閒少動</option>
              <option value="MODERATE">一般活動</option>
              <option value="HIGH">活潑好動</option>
              <option value="ATHLETIC">高強度活動</option>
            </select>
          </label>
          <label className="flex items-center gap-3 text-sm text-[#302b26]">
            <input
              type="checkbox"
              className="size-4 accent-[#935941]"
              checked={draft.isNeutered}
              onChange={(e) =>
                setDraft((d) => ({ ...d, isNeutered: e.target.checked }))
              }
            />
            已結紮
          </label>
          <fieldset>
            <legend className="mb-3 text-sm text-[#5e544a] font-medium">
              需要避開的過敏原
            </legend>
            <div className="flex flex-wrap gap-2">
              {allergens.map((a) => (
                <button
                  type="button"
                  key={a}
                  aria-pressed={draft.allergies.includes(a)}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      allergies: d.allergies.includes(a)
                        ? d.allergies.filter((x) => x !== a)
                        : [...d.allergies, a],
                    }))
                  }
                  className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                    draft.allergies.includes(a)
                      ? "border-[#935941] bg-[#935941]/10 text-[#935941] font-semibold"
                      : "border-[#d9cfc3] bg-white text-[#675e53] hover:bg-[#f3ede3]"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </fieldset>
          {error && (
            <p role="alert" className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2">
              {error}
            </p>
          )}
          <div className="flex justify-between gap-3 pt-2">
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setIsNew(true);
                setDraft({
                  ...pet,
                  id: crypto.randomUUID(),
                  name: "",
                  allergies: [],
                  avatarUrl: undefined,
                });
              }}
            >
              <Plus />
              新增毛孩
            </Button>
            <Button type="submit">儲存毛孩資料</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
