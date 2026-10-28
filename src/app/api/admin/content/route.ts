import { NextResponse } from "next/server";
import { requireAdminSession } from "@/server/adminAuth";
import { readBody, apiError, verifyOrigin } from "@/server/http";
import { readSiteContent, saveSiteContent } from "@/server/siteContentRepository";
import { siteContentSchema } from "@/lib/siteContent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminSession();
    return NextResponse.json({ content: await readSiteContent() });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdminSession();
    verifyOrigin(request);
    const content = await readBody(request, siteContentSchema);
    await saveSiteContent(content);
    return NextResponse.json({ content, message: "網站內容已儲存" });
  } catch (error) {
    return apiError(error);
  }
}
