import { z } from "zod";

export function isMediaUrl(value: string) {
  if (/^\/(images|uploads)\/[a-zA-Z0-9._/-]+$/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/.test(url.hostname) &&
      url.pathname.startsWith("/media/");
  } catch {
    return false;
  }
}

export const mediaUrlSchema = z.string().refine(isMediaUrl, "請使用媒體庫內的圖片");
