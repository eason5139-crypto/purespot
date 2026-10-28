import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authenticateAdmin,
  createAdminSession,
  destroyAdminSession,
  getAdminSession,
} from "@/server/adminAuth";
import { apiError, readBody, verifyOrigin } from "@/server/http";
import { rateLimit } from "@/server/rateLimit";

export const runtime = "nodejs";

const loginSchema = z
  .object({
    email: z.string().email().max(254),
    password: z.string().min(12).max(128),
  })
  .strict();

export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    const input = await readBody(request, loginSchema);
    await rateLimit(`admin-login:${input.email.toLowerCase()}`, 6, 900);
    const admin = await authenticateAdmin(input.email, input.password);
    await createAdminSession(admin.email);
    return NextResponse.json({ admin, message: "登入成功" });
  } catch (error) {
    return apiError(error);
  }
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "尚未登入" }, { status: 401 });
  }
  return NextResponse.json(
    { admin },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function DELETE(request: Request) {
  try {
    verifyOrigin(request);
    await destroyAdminSession();
    return NextResponse.json({ message: "已安全登出" });
  } catch (error) {
    return apiError(error);
  }
}
