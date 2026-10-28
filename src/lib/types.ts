import { z } from "zod";
export const petSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1, "請填寫毛孩名稱").max(24),
  type: z.enum(["CAT", "DOG", "HAMSTER", "RABBIT"]),
  breed: z.string().max(40),
  weightKg: z.number().finite().min(0.02).max(90),
  ageMonths: z.number().int().min(1).max(360),
  isNeutered: z.boolean(),
  activityLevel: z.enum(["SEDENTARY", "MODERATE", "HIGH", "ATHLETIC"]),
  allergies: z.array(z.string().max(30)).max(20),
  goal: z.enum(["MAINTAIN", "WEIGHT_LOSS"]),
  avatarUrl: z.string().max(500).optional(),
});
export type ActivePet = z.infer<typeof petSchema>;
export type PetType = ActivePet["type"];
export const petLabels: Record<PetType, string> = { CAT: "貓咪", DOG: "狗狗", HAMSTER: "倉鼠", RABBIT: "兔兔" };
export const supportsFoodCalculator = (type: PetType) => type === "CAT" || type === "DOG";
export type ActivityLevel = ActivePet["activityLevel"];
export interface BatchRecord {
  date: string;
  batch: string;
  protein: number;
  moisture: number;
  ash: number;
}
export interface Product {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  type: PetType;
  kind?: "FOOD" | "SUPPLIES";
  category: string;
  lifeStages: ("JUNIOR" | "ADULT" | "SENIOR")[];
  ingredients: string[];
  allergens: string[];
  kcalPer100g: number;
  bagGrams: number;
  priceNt: number;
  stock: number;
  image: string;
  gallery?: string[];
  videoUrl?: string;
  isPublished?: boolean;
  color: "cyan" | "amber" | "blue";
  proteinMin: number;
  moistureMax: number;
  ashMax: number;
  batches: BatchRecord[];
  autoshipEligible: boolean;
  description: string;
}
export const cartItemSchema = z.object({
  key: z.string().max(250),
  productId: z.string().max(100),
  petId: z.string().max(100),
  quantity: z.number().int().min(1).max(99),
  mode: z.enum(["ONCE", "AUTOSHIP"]),
  intervalDays: z
    .union([z.literal(14), z.literal(28), z.literal(42), z.literal(56)])
    .nullable(),
});
export type CartItem = z.infer<typeof cartItemSchema>;
export type IntervalDays = 14 | 28 | 42 | 56;
export interface UgcPost {
  id: string;
  author: string;
  petName: string;
  breed: string;
  age: string;
  weight: string;
  title: string;
  text: string;
  image: string;
  productId: string;
  media: { kind: "image" } | { kind: "video"; src: string; captionSrc: string };
}
export interface LocalPlan {
  id: string;
  petId: string;
  productId: string;
  quantity: number;
  intervalDays: IntervalDays;
  nextDeliveryDate: string;
  status: "ACTIVE" | "PAUSED";
}
export interface DemoOrder {
  id: string;
  createdAt: string;
  items: CartItem[];
  totalNt: number;
}
