import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { Prisma } from "@prisma/client";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function verifyOrigin(request: Request) {
  const expected = process.env.APP_ORIGIN;
  if (!expected) throw new ApiError(503, "服務網址尚未設定");
  if (request.headers.get("origin") !== new URL(expected).origin)
    throw new ApiError(403, "請從本站提交操作");
}
export async function readBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new ApiError(415, "請使用 JSON 格式提交");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "請提供請求內容");
  const parts: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 32_768) {
        await reader.cancel();
        throw new ApiError(413, "提交內容過大");
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  try {
    return schema.parse(JSON.parse(new TextDecoder().decode(bytes)) as unknown);
  } catch (e) {
    if (e instanceof ZodError) throw e;
    throw new ApiError(400, "請求內容不是有效的 JSON");
  }
}
export function apiError(error: unknown) {
  if (error instanceof ApiError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: "資料格式不正確，請確認欄位後再試" },
      { status: 400 },
    );
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
    return NextResponse.json(
      { error: "資料已存在或正在處理，請重新整理確認" },
      { status: 409 },
    );
  return NextResponse.json(
    { error: "服務暫時無法使用，請稍後再試" },
    { status: 503 },
  );
}
