import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/server/auth";
import { apiError, readBody, verifyOrigin } from "@/server/http";
import { arcadeState, playArcade } from "@/server/arcadeService";
import { reconcilePoints } from "@/server/membership";
import { WHEEL_KEYS } from "@/lib/pointsArcadeConfig";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) {
  try {
    const userId = await requireUser();
    // Full reconciliation is explicit; ordinary entry and per-play requests use the ledger directly.
    if (new URL(request.url).searchParams.get("sync") === "1") await reconcilePoints(userId);
    return NextResponse.json(await arcadeState(userId), { headers });
  } catch (error) { return apiError(error); }
}
const schema = z.object({
  requestId: z.string().uuid(), game: z.enum(["wheel", "capsule", "scratch"]),
  wheelKey: z.enum(WHEEL_KEYS).optional(), revision: z.string().regex(/^[a-f0-9]{16}$/).optional(),
}).strict();
export async function POST(request: Request) {
  const start = performance.now();
  try {
    verifyOrigin(request);
    const userId = await requireUser();
    const input = await readBody(request, schema);
    const result = await playArcade(userId, input);
    return NextResponse.json({ result }, { status: 201, headers: { ...headers, "Server-Timing": `arcade;dur=${(performance.now() - start).toFixed(0)}` } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2028", "P2034"].includes(error.code))
      return NextResponse.json({ error: "本回合仍在確認，請用同一回合重試以取回結果" }, { status: 503, headers });
    return apiError(error);
  }
}
