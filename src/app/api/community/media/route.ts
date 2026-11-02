import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireUser } from "@/server/auth";
import { ApiError, apiError, verifyOrigin } from "@/server/http";
import { rateLimit } from "@/server/rateLimit";

export const runtime = "nodejs";
const maxBytes = 4 * 1024 * 1024;

function extension(bytes: Uint8Array) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "webp";
  return null;
}

export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    const userId = await requireUser();
    await rateLimit(`community-media:${userId}`, 12, 3600);
    const body = await request.formData();
    const file = body.get("file");
    if (!(file instanceof File) || file.size === 0 || file.size > maxBytes) throw new ApiError(400, "請選擇 4 MB 以內的圖片");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const ext = extension(bytes);
    if (!ext) throw new ApiError(400, "只支援 PNG、JPG 或 WebP 圖片");
    const name = `${randomUUID()}.${ext}`;
    if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) {
      const blob = await put(`community/${userId}/${name}`, Buffer.from(bytes), { access: "public", contentType: ext === "jpg" ? "image/jpeg" : `image/${ext}` });
      return NextResponse.json({ url: blob.url }, { status: 201 });
    }
    if (process.env.VERCEL) throw new ApiError(503, "圖片服務暫時無法使用");
    const directory = join(process.cwd(), "public", "uploads", "community", userId);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, name), bytes, { flag: "wx" });
    return NextResponse.json({ url: `/uploads/community/${userId}/${name}` }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
