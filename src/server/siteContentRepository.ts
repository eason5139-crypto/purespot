import "server-only";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { get, put } from "@vercel/blob";
import { defaultSiteContent, siteContentSchema, type SiteContent } from "@/lib/siteContent";

const contentPath = join(process.cwd(), "data", "site-content.json");
const blobPath = "content/site-content.json";
let pendingWrite = Promise.resolve();

function usesBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

export async function readSiteContent(): Promise<SiteContent> {
  if (usesBlob()) {
    const result = await get(blobPath, { access: "public", useCache: false });
    if (!result || result.statusCode !== 200) return defaultSiteContent;
    return siteContentSchema.parse(JSON.parse(await new Response(result.stream).text()));
  }
  try {
    const raw = await readFile(contentPath, "utf8");
    return siteContentSchema.parse(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return defaultSiteContent;
    throw error;
  }
}

export function saveSiteContent(content: SiteContent): Promise<void> {
  const validated = siteContentSchema.parse(content);
  const write = pendingWrite.then(async () => {
    if (usesBlob()) {
      await put(blobPath, JSON.stringify(validated, null, 2) + "\n", {
        access: "public",
        allowOverwrite: true,
        contentType: "application/json",
      });
      return;
    }
    await mkdir(dirname(contentPath), { recursive: true });
    const temporaryPath = `${contentPath}.${randomUUID()}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(validated, null, 2) + "\n", "utf8");
    await rename(temporaryPath, contentPath);
  });
  pendingWrite = write.catch(() => {});
  return write;
}
