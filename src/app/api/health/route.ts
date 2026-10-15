import { NextResponse } from "next/server";
export function GET() {
  return NextResponse.json({
    status: "正常",
    service: "PURESPOT",
    paymentEnabled: false,
  });
}
