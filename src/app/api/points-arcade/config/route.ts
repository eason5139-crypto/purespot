import { NextResponse } from "next/server";
import { getArcadeConfig } from "@/server/pointsArcadeRepository";

export const runtime = "nodejs";

export async function GET() {
  const arcadeConfig = await getArcadeConfig();
  return NextResponse.json(
    { arcadeConfig },
    { headers: { "Cache-Control": "no-store" } },
  );
}
