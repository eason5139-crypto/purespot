import { z } from "zod";

export const petTypes = ["CAT", "DOG", "HAMSTER", "RABBIT"] as const;
export const lifeStages = ["JUNIOR", "ADULT", "SENIOR"] as const;

export const communityPostInput = z.object({
  petId: z.uuid(),
  title: z.string().trim().min(4).max(80),
  body: z.string().trim().min(10).max(1200),
  imageUrl: z.string().min(1).max(1000).optional().nullable(),
}).strict();

export const communityActionInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("like") }).strict(),
  z.object({ action: z.literal("bookmark") }).strict(),
  z.object({ action: z.literal("comment"), body: z.string().trim().min(1).max(300) }).strict(),
  z.object({ action: z.literal("report"), reason: z.enum(["SPAM", "HARASSMENT", "MISINFORMATION", "OTHER"]) }).strict(),
]);

export function stageForBirthday(birthday: Date, now = new Date()) {
  const months = (now.getUTCFullYear() - birthday.getUTCFullYear()) * 12 + now.getUTCMonth() - birthday.getUTCMonth();
  return months < 12 ? "JUNIOR" : months >= 84 ? "SENIOR" : "ADULT";
}

export type CommunityPostView = {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  petName: string;
  petType: typeof petTypes[number];
  lifeStage: typeof lifeStages[number];
  status: "PENDING" | "PUBLISHED" | "HIDDEN";
  createdAt: string;
  mine: boolean;
  liked: boolean;
  saved: boolean;
  likesCount: number;
  comments: { id: string; body: string; author: string; createdAt: string }[];
  reportsCount?: number;
};
