import "server-only";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { get, put } from "@vercel/blob";
import { defaultSiteContent, siteContentSchema, type SiteContent } from "@/lib/siteContent";

const contentPath = join(process.cwd(), "data", "site-content.json");
const blobPath = "content/site-content.json";
let pendingWrite = Promise.resolve();

function refreshLegacyArt(content: SiteContent): SiteContent {
  return {
    ...content,
    heroImage: content.heroImage === "/images/cat-life.png" || content.heroImage.includes("c6b5137e-941f-47f9-8ac0-709f5dac7b21") ? defaultSiteContent.heroImage : content.heroImage,
    shopImage: content.shopImage === "/images/cat-life.png" ? defaultSiteContent.shopImage : content.shopImage,
    communityImage: content.communityImage === "/images/chicken-dog.png" ? defaultSiteContent.communityImage : content.communityImage,
    heroAccent: content.heroAccent === "從每一口開始。" ? defaultSiteContent.heroAccent : content.heroAccent,
    heroImageAlt: content.heroImageAlt === "毛孩在溫暖的家中享用餐食" ? defaultSiteContent.heroImageAlt : content.heroImageAlt,
    heroPrimaryLabel: content.heroPrimaryLabel === "為毛孩挑主食" ? defaultSiteContent.heroPrimaryLabel : content.heroPrimaryLabel,
    heroDescription: content.heroDescription === "把成分、來源、日常與家人的照顧放在一起。從專屬配糧到共享購物車，讓每次選擇都更安心，也更像生活。" ? defaultSiteContent.heroDescription : content.heroDescription,
    shopBadge: content.shopBadge === "專屬營養，從理解開始" ? defaultSiteContent.shopBadge : content.shopBadge,
    shopDescription: content.shopDescription === "從避開過敏原到剛剛好的份量，把複雜的選擇，變成簡單的日常。" ? defaultSiteContent.shopDescription : content.shopDescription,
  };
}

function usesBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

export async function readSiteContent(): Promise<SiteContent> {
  if (usesBlob()) {
    const result = await get(blobPath, { access: "public", useCache: false });
    if (!result || result.statusCode !== 200) return defaultSiteContent;
    return refreshLegacyArt(siteContentSchema.parse(JSON.parse(await new Response(result.stream).text())));
  }
  try {
    const raw = await readFile(contentPath, "utf8");
    return refreshLegacyArt(siteContentSchema.parse(JSON.parse(raw)));
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
