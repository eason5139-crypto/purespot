import { NextResponse } from "next/server";
import { isSurveyOpen } from "@/lib/surveys";
import { listSurveys } from "@/server/surveyRepository";
import { apiError } from "@/server/http";
export async function GET() {
  try {
    return NextResponse.json({
      surveys: (await listSurveys())
        .filter((s) => isSurveyOpen(s))
        .map(({ id, title, description, image, reward }) => ({
          id,
          title,
          description,
          image,
          reward,
        })),
    });
  } catch (e) {
    return apiError(e);
  }
}
