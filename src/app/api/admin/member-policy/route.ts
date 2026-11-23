import { NextResponse } from "next/server";
import { requireAdminSession } from "@/server/adminAuth";
import { apiError, readBody, verifyOrigin } from "@/server/http";
import {
  getMemberPolicy,
  saveMemberPolicy,
} from "@/server/memberPolicyRepository";
import { memberPolicySchema } from "@/lib/memberPolicy";
export async function GET() {
  try {
    await requireAdminSession();
    return NextResponse.json({ policy: await getMemberPolicy() });
  } catch (e) {
    return apiError(e);
  }
}
export async function PUT(r: Request) {
  try {
    await requireAdminSession();
    verifyOrigin(r);
    return NextResponse.json({
      policy: await saveMemberPolicy(await readBody(r, memberPolicySchema)),
    });
  } catch (e) {
    return apiError(e);
  }
}
