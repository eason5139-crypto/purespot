import "server-only";

import { ApiError } from "./http";
import { requireUser } from "./auth";

export async function optionalCommunityUser() {
  try {
    return await requireUser();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export function assertCommunityImage(url: string | null | undefined, userId: string) {
  if (!url) return null;
  if (url.startsWith(`/uploads/community/${userId}/`)) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" && /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/.test(parsed.hostname) && parsed.pathname.startsWith(`/community/${userId}/`)) return url;
  } catch { /* Invalid URL */ }
  throw new ApiError(400, "請重新上傳社群圖片");
}
