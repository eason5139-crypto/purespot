import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { apiError, readBody, verifyOrigin } from "@/server/http";
import { surveyForUser, submitSurvey } from "@/server/surveyRepository";
const input = z
  .object({
    version: z.number().int(),
    answers: z.record(
      z.string().max(60),
      z.union([
        z.string().max(1000),
        z.array(z.string().max(100)).max(12),
        z.number(),
      ]),
    ),
  })
  .strict();
export async function GET(
  _r: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    return NextResponse.json(
      await surveyForUser((await ctx.params).id, await requireUser()),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(
  r: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    verifyOrigin(r);
    const user = await requireUser(),
      data = await readBody(r, input, 96_000);
    return NextResponse.json(
      await submitSurvey(
        (await ctx.params).id,
        user,
        data.version,
        data.answers,
      ),
    );
  } catch (e) {
    return apiError(e);
  }
}
