import { NextResponse } from "next/server";
import { readSiteContent } from "@/server/siteContentRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(
      { content: await readSiteContent() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "無法讀取網站內容" }, { status: 500 });
  }
}
