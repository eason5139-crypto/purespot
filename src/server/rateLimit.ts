import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { ApiError } from "./http";
import { db } from "./db";
const local = new Map<string, { count: number; expires: number }>();
export async function rateLimit(
  identity: string,
  maximum = 10,
  windowSeconds = 900,
) {
  const key = `purespot:rate:${createHash("sha256").update(identity).digest("hex")}`;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        "EVAL",
        "local c = redis.call('INCR', KEYS[1]); if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end; return c",
        1,
        key,
        windowSeconds,
      ]),
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) throw new ApiError(503, "請稍後再試");
    const data: unknown = await response.json();
    if (
      !data ||
      typeof data !== "object" ||
      !("result" in data) ||
      typeof data.result !== "number"
    )
      throw new ApiError(503, "請稍後再試");
    if (data.result > maximum)
      throw new ApiError(429, "嘗試次數過多，請稍後再試");
    return;
  }
  if (process.env.NODE_ENV === "production") {
    try {
      const rows = await db.$queryRaw<{ count: number }[]>`
        INSERT INTO "OutboxEvent"
          ("id", "dedupeKey", "type", "payload", "attempts", "availableAt", "processedAt", "createdAt")
        VALUES
          (${randomUUID()}, ${key}, 'RATE_LIMIT', '{}'::jsonb, 1,
           now() + (${windowSeconds} * interval '1 second'), now(), now())
        ON CONFLICT ("dedupeKey") DO UPDATE SET
          "attempts" = CASE
            WHEN "OutboxEvent"."availableAt" <= now() THEN 1
            ELSE "OutboxEvent"."attempts" + 1
          END,
          "availableAt" = CASE
            WHEN "OutboxEvent"."availableAt" <= now()
              THEN now() + (${windowSeconds} * interval '1 second')
            ELSE "OutboxEvent"."availableAt"
          END,
          "processedAt" = now()
        RETURNING "attempts" AS "count"
      `;
      if ((rows[0]?.count ?? maximum + 1) > maximum)
        throw new ApiError(429, "嘗試次數過多，請稍後再試");
      return;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(503, "帳戶保護服務暫時無法使用");
    }
  }
  const now = Date.now();
  for (const [k, v] of local) if (v.expires <= now) local.delete(k);
  if (local.size > 10000) throw new ApiError(503, "請稍後再試");
  const record = local.get(key) ?? {
    count: 0,
    expires: now + windowSeconds * 1000,
  };
  record.count++;
  local.set(key, record);
  if (record.count > maximum)
    throw new ApiError(429, "嘗試次數過多，請稍後再試");
}
