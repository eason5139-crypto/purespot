import { randomUUID } from "node:crypto";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { list, put } from "@vercel/blob";
import { requireAdminSession } from "@/server/adminAuth";
import { apiError, verifyOrigin, ApiError } from "@/server/http";

export const runtime = "nodejs";
const mediaDirectory = join(process.cwd(), "public", "uploads");
const bundledDirectory = join(process.cwd(), "public", "images");
const maximumBytes = 4 * 1024 * 1024;

function usesBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

function extensionFor(bytes: Uint8Array) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "webp";
  return null;
}

export async function GET() {
  try {
    await requireAdminSession();
    const uploaded = usesBlob()
      ? (await list({ prefix: "media/", limit: 1000 })).blobs
          .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
          .map((blob) => blob.url)
      : (await (async () => {
          await mkdir(mediaDirectory, { recursive: true });
          return (await readdir(mediaDirectory))
            .filter((name) => /^[a-f0-9-]+\.(png|jpg|webp)$/.test(name))
            .sort()
            .reverse()
            .map((name) => `/uploads/${name}`);
        })());
    const bundled = (await readdir(bundledDirectory))
      .filter((name) => /\.(png|jpg|jpeg|webp)$/i.test(name));
    return NextResponse.json({
      images: [
        ...uploaded,
        ...bundled.map((name) => `/images/${name}`),
      ],
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    verifyOrigin(request);
    const data = await request.formData();
    const file = data.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "請選擇圖片檔案");
    if (file.size === 0 || file.size > maximumBytes) throw new ApiError(400, "圖片大小需介於 1B 至 4MB");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const extension = extensionFor(bytes);
    if (!extension) throw new ApiError(400, "只支援 PNG、JPG 或 WebP 圖片");
    const name = `${randomUUID()}.${extension}`;
    if (usesBlob()) {
      const blob = await put(`media/${name}`, Buffer.from(bytes), {
        access: "public",
        contentType: extension === "jpg" ? "image/jpeg" : `image/${extension}`,
      });
      return NextResponse.json({ url: blob.url }, { status: 201 });
    }
    await mkdir(mediaDirectory, { recursive: true });
    await writeFile(join(mediaDirectory, name), bytes, { flag: "wx" });
    return NextResponse.json({ url: `/uploads/${name}` }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
