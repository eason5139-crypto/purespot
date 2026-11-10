export type PassportStamp = "lens" | "packing" | "quiz";
const KEY = "purespot-explore-passport-v1";
export function readPassport(): PassportStamp[] {
  if (typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is PassportStamp => item === "lens" || item === "packing" || item === "quiz") : [];
  } catch { return []; }
}
export function awardStamp(stamp: PassportStamp) {
  const current = readPassport();
  if (current.includes(stamp)) return;
  localStorage.setItem(KEY, JSON.stringify([...current, stamp]));
  window.dispatchEvent(new Event("purespot-passport-change"));
}
