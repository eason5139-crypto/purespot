export type SavedAddress = {
  id: string; label: string; name: string; phone: string; postalCode: string;
  city: string; district: string; address: string; note: string; isDefault: boolean;
};

export type AccountOrder = {
  id: string; status: string; subtotalNt: number; shippingNt: number; totalNt: number;
  createdAt: string; updatedAt: string; paymentMethod: string | null;
  shippingAddress: { name?: string; phone?: string; postalCode?: string; address?: string };
  items: { id: string; productName: string; quantity: number; unitPriceNt: number; petId: string; petName: string; productId: string; slug: string; image: string }[];
  supportRequests: { id: string; kind: string; status: string; message: string; response: string | null; createdAt: string }[];
};

export type AccountFavorite = {
  productId: string; petId: string | null; watchRestock: boolean; restocked: boolean;
  product: { name: string; slug: string; image: string; type: string; priceNt: number; stock: number };
};

export type CareRecord = { id: string; petId: string; kind: string; note: string; weightKg: number | null; recordedAt: string };
export type CareReminder = { id: string; petId: string; title: string; dueAt: string; repeatDays: number | null; completedAt: string | null };
export type RhythmCard = { petId: string; petName: string; petType: string; weightKg: number; productName: string | null; productId: string | null; dailyGrams: number | null; remainingDays: number | null; lastOrderAt: string | null; nextDeliveryAt: string | null; openReminderCount: number };

export async function accountJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { cache: "no-store", ...init });
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "暫時無法完成操作，請稍後再試");
  return data;
}

export function jsonRequest(method: string, value: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) };
}
