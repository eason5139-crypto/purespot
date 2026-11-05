import { z } from "zod";

export const addressFields = z.object({
  label: z.string().trim().min(1).max(30),
  name: z.string().trim().min(1).max(50),
  phone: z.string().regex(/^09\d{8}$/, "請輸入 09 開頭的 10 位手機號碼"),
  postalCode: z.string().regex(/^\d{3}(\d{2,3})?$/, "郵遞區號需為 3、5 或 6 位數"),
  city: z.string().trim().min(1).max(30),
  district: z.string().trim().min(1).max(30),
  address: z.string().trim().min(2).max(150),
  note: z.string().trim().max(150).default(""),
  isDefault: z.boolean().default(false),
}).strict();

export const preferenceFields = z.object({
  orderUpdates: z.boolean(),
  refillReminders: z.boolean(),
  restockAlerts: z.boolean(),
  careReminders: z.boolean(),
}).strict();

export const careRecordFields = z.object({
  petId: z.string().min(1).max(100),
  kind: z.enum(["WEIGHT", "FOOD", "ALLERGY", "NOTE"]),
  note: z.string().trim().min(1).max(500),
  weightKg: z.number().min(0.02).max(90).nullable().optional(),
}).strict();

export const reminderFields = z.object({
  petId: z.string().min(1).max(100),
  title: z.string().trim().min(1).max(100),
  dueAt: z.iso.datetime(),
  repeatDays: z.number().int().min(1).max(365).nullable().optional(),
}).strict();

export const supportFields = z.object({
  orderId: z.string().min(1).max(100),
  kind: z.enum(["RETURN", "ISSUE", "OTHER"]),
  message: z.string().trim().min(10).max(1000),
}).strict();

export type AddressInput = z.infer<typeof addressFields>;
export type Preferences = z.infer<typeof preferenceFields>;
