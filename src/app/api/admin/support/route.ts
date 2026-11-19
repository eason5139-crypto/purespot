import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/server/adminAuth";
import { ApiError, apiError, readBody, verifyOrigin } from "@/server/http";
import {
  adminReplySupportThread,
  listAllSupportThreads,
} from "@/server/supportRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminSession();
    const threads = await listAllSupportThreads();

    return NextResponse.json(
      {
        threads,
        requests: threads,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}

const patchSchema = z
  .object({
    id: z.string().min(1).max(120),
    status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]),
    response: z.string().trim().max(1500).nullable(),
    category: z
      .enum(["NUTRITION", "ALLERGY", "AUTOSHIP", "ORDER", "AFTER_SALES"])
      .optional(),
  })
  .strict();

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdminSession();
    verifyOrigin(request);
    const input = await readBody(request, patchSchema);
    const updated = await adminReplySupportThread({
      id: input.id,
      status: input.status,
      response: input.response,
      category: input.category,
      adminName: `PURESPOT 職人客服（${admin.username}）`,
    });
    if (!updated) {
      throw new ApiError(404, "找不到該筆客服諮詢單");
    }
    return NextResponse.json({
      thread: updated,
      request: updated,
    });
  } catch (error) {
    return apiError(error);
  }
}
