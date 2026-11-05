import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { apiError } from "@/server/http";
import { calculatePetNutrition } from "@/lib/nutritionCalculator";

export const runtime = "nodejs";
export async function GET() {
  try {
    const userId = await requireUser();
    const [pets, orders, plans, reminders] = await Promise.all([
      db.pet.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }], take: 20 }),
      db.order.findMany({ where: { userId, status: { in: ["DISPATCHED", "COMPLETED"] } }, orderBy: { updatedAt: "desc" }, take: 50, include: { items: { include: { variant: { include: { product: true } } } } } }),
      db.autoshipPlan.findMany({ where: { userId, status: "ACTIVE" }, select: { id: true, nextBillingDate: true, items: { select: { petId: true } } }, orderBy: { nextBillingDate: "asc" }, take: 50 }),
      db.careReminder.findMany({ where: { userId, completedAt: null }, orderBy: { dueAt: "asc" }, take: 20 }),
    ]);
    const cards = pets.map((pet) => {
      const order = orders.find((entry) => entry.items.some((item) => item.petId === pet.id && (item.variant.product.guaranteedAnalysis as { kind?: string; kcalPer100g?: number }).kind !== "SUPPLIES"));
      const item = order?.items.find((entry) => entry.petId === pet.id && (entry.variant.product.guaranteedAnalysis as { kind?: string; kcalPer100g?: number }).kind !== "SUPPLIES");
      const analysis = item?.variant.product.guaranteedAnalysis as { kcalPer100g?: number } | undefined;
      let dailyGrams: number | null = null;
      let remainingDays: number | null = null;
      if (order && item && analysis?.kcalPer100g && (pet.type === "CAT" || pet.type === "DOG")) {
        try {
          const birthday = pet.birthday;
          const ageMonths = Math.max(1, (new Date().getUTCFullYear() - birthday.getUTCFullYear()) * 12 + new Date().getUTCMonth() - birthday.getUTCMonth());
          dailyGrams = Math.round(calculatePetNutrition({ petType: pet.type, weightKg: pet.weightKg, ageMonths, isNeutered: pet.isNeutered, activityLevel: pet.activityLevel, isWeightLossGoal: pet.goal === "WEIGHT_LOSS", foodKcalPer100g: analysis.kcalPer100g }, item.variant.bagGrams, item.unitPriceNt).dailyGrams);
          const daysElapsed = Math.max(0, Math.floor((Date.now() - order.updatedAt.getTime()) / 86_400_000));
          remainingDays = Math.max(0, Math.round((item.variant.bagGrams * item.quantity) / dailyGrams - daysElapsed));
        } catch { dailyGrams = null; remainingDays = null; }
      }
      const nextPlan = plans.find((plan) => plan.items.some((planItem) => planItem.petId === pet.id));
      return { petId: pet.id, petName: pet.name, petType: pet.type, weightKg: pet.weightKg, productName: item?.productName ?? null, productId: item?.variant.productId ?? null, dailyGrams, remainingDays, lastOrderAt: order?.updatedAt ?? null, nextDeliveryAt: nextPlan?.nextBillingDate ?? null, openReminderCount: reminders.filter((reminder) => reminder.petId === pet.id).length };
    });
    return NextResponse.json({ cards, upcoming: reminders.slice(0, 5).map((reminder) => ({ id: reminder.id, petId: reminder.petId, title: reminder.title, dueAt: reminder.dueAt })) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
