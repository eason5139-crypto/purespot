import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { apiError, readBody, verifyOrigin } from "@/server/http";
import {
  issuePetCertificate,
  listUserCertificates,
} from "@/server/pointsArcadeRepository";

export const runtime = "nodejs";

export async function GET() {
  try {
    const userId = await requireUser();
    const data = await listUserCertificates(userId);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}

const issueSchema = z
  .object({
    petId: z.string().min(1).max(100),
    petName: z.string().trim().min(1).max(24),
    petType: z.string().min(1).max(20),
    breedText: z.string().trim().max(30).default(""),
    weightText: z.string().trim().max(20).default(""),
    allergyText: z.string().trim().max(50).default(""),
    honorTitle: z.string().trim().min(1).max(36),
    sealText: z.string().trim().min(1).max(20),
    pledgeText: z.string().trim().min(1).max(120),
    ownerName: z.string().trim().min(1).max(24),
  })
  .strict();

export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    const userId = await requireUser();
    const input = await readBody(request, issueSchema);
    const result = await issuePetCertificate(userId, input);
    return NextResponse.json(result, {
      status: result.alreadyIssued ? 200 : 201,
    });
  } catch (error) {
    return apiError(error);
  }
}
