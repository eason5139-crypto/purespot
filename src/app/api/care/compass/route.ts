import { NextResponse } from "next/server";
import { z } from "zod";
import {
  compassIntentSchema,
  buildCompassRecommendations,
  eligibleCompassProducts,
} from "@/lib/selectionCompass";
import { petSchema } from "@/lib/types";
import { interpretCompassQuery } from "@/server/compassAI";
import { apiError, readBody, verifyOrigin } from "@/server/http";
import { getCatalogProducts } from "@/server/productCatalog";
import { rateLimit } from "@/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const inputSchema = z.object({
  pet: petSchema,
  intent: compassIntentSchema,
  query: z.string().trim().max(500).default(""),
});

export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    const ip =
      request.headers.get("x-real-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    await rateLimit("compass:global", 600, 3600);
    await rateLimit(`compass:${ip}`, 20, 3600);
    const input = await readBody(request, inputSchema);
    const products = await getCatalogProducts();
    const safeCandidates = eligibleCompassProducts(
      products,
      input.pet,
      input.intent,
    ).eligible;
    const ai = await interpretCompassQuery(
      input.query,
      input.intent,
      input.pet,
      safeCandidates,
    );
    const recommendations = buildCompassRecommendations(
      products,
      input.pet,
      ai.intent,
      ai.suggestedIds,
    );
    return NextResponse.json(
      {
        ...recommendations,
        intent: ai.intent,
        aiUsed: ai.aiUsed,
        followUp: ai.followUp,
        catalogUpdatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
