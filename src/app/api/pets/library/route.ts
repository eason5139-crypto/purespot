import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { apiError, readBody, verifyOrigin } from "@/server/http";
import { petSchema } from "@/lib/types";
import { cloudPetId, syncExperiencePets } from "@/server/experienceOrder";
import { rateLimit } from "@/server/rateLimit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    const userId = await requireUser();
    await rateLimit(`pets-library:${userId}`, 30, 60);
    const { pets } = await readBody(request, z.object({ pets: z.array(petSchema).min(1).max(20) }).strict());
    await syncExperiencePets(userId, pets);
    const saved = await db.pet.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
    return NextResponse.json({ pets: saved, mapping: Object.fromEntries(pets.map((pet) => [pet.id, cloudPetId(userId, pet)])) });
  } catch (error) {
    return apiError(error);
  }
}
