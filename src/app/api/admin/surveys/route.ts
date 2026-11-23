import { NextResponse } from "next/server";
import { requireAdminSession } from "@/server/adminAuth";
import { apiError, readBody, verifyOrigin } from "@/server/http";
import {
  listSurveys,
  saveSurvey,
  surveyResponses,
} from "@/server/surveyRepository";
import { surveySchema } from "@/lib/surveys";
export async function GET(r: Request) {
  try {
    await requireAdminSession();
    const id = new URL(r.url).searchParams.get("id");
    return NextResponse.json(
      id
        ? { responses: await surveyResponses(id) }
        : { surveys: await listSurveys() },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function PUT(r: Request) {
  try {
    await requireAdminSession();
    verifyOrigin(r);
    return NextResponse.json({
      survey: await saveSurvey(await readBody(r, surveySchema, 256_000)),
    });
  } catch (e) {
    return apiError(e);
  }
}
