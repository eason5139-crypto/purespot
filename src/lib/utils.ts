import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
export const money = (n: number) =>
  new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(n);
export const decimal = (n: number, digits = 1) =>
  new Intl.NumberFormat("zh-TW", { maximumFractionDigits: digits }).format(n);
export const packageSize = (grams: number) =>
  grams < 1000 ? `${grams} 克` : `${decimal(grams / 1000, 2)} 公斤`;
export function addDays(date: string, days: number): string {
  const value = new Date(date);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString();
}
export const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("zh-TW", {
    month: "long",
    day: "numeric",
    timeZone: "Asia/Taipei",
  }).format(new Date(date));
