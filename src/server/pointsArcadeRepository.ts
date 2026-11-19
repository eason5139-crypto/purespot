import "server-only";

import { Prisma } from "@prisma/client";
import { db } from "./db";
import { ApiError } from "./http";
import {
  DEFAULT_ARCADE_CONFIG,
  pointsArcadeConfigSchema,
  type IssuedCertificateRecord,
  type PointsArcadeConfig,
} from "@/lib/pointsArcadeConfig";

const CONFIG_DEDUPE_KEY = "ARCADE_CONFIG:main";
const CONFIG_EVENT_TYPE = "POINTS_ARCADE_CONFIG";
const CERT_EVENT_TYPE = "PET_DIGITAL_CERTIFICATE";
const TASK_EVENT_TYPE = "MEMBER_TASK_SIGNAL";

export const taipeiDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Taipei",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getTaipeiDateKey(date = new Date()): string {
  return taipeiDateFormatter.format(date);
}

export function getTaipeiOffsetDateKey(daysOffset: number): string {
  const d = new Date(Date.now() + daysOffset * 86_400_000);
  return taipeiDateFormatter.format(d);
}

export async function getArcadeConfig(): Promise<PointsArcadeConfig> {
  try {
    const row = await db.outboxEvent.findUnique({
      where: { dedupeKey: CONFIG_DEDUPE_KEY },
      select: { payload: true },
    });
    if (!row?.payload) return DEFAULT_ARCADE_CONFIG;
    const parsed = pointsArcadeConfigSchema.safeParse(row.payload);
    if (parsed.success) return parsed.data;
  } catch {
    // fallback default
  }
  return DEFAULT_ARCADE_CONFIG;
}

export async function saveArcadeConfig(
  input: unknown,
): Promise<PointsArcadeConfig> {
  const validated = pointsArcadeConfigSchema.parse(input);
  await db.outboxEvent.upsert({
    where: { dedupeKey: CONFIG_DEDUPE_KEY },
    create: {
      dedupeKey: CONFIG_DEDUPE_KEY,
      type: CONFIG_EVENT_TYPE,
      payload: validated as unknown as Prisma.InputJsonValue,
      processedAt: new Date(),
    },
    update: {
      payload: validated as unknown as Prisma.InputJsonValue,
      processedAt: new Date(),
    },
  });
  return validated;
}

/** 記錄站內任務行為事件（每日或一次性），用於驗證真實行為 */
export async function recordTaskSignal(
  userId: string,
  taskKey: "daily_browse_shop" | "daily_community_interact" | "mile_nutrition_calc",
): Promise<void> {
  const datePart = taskKey.startsWith("daily_") ? getTaipeiDateKey() : "once";
  const dedupeKey = `TASK_SIGNAL:${userId}:${taskKey}:${datePart}`;
  await db.outboxEvent.upsert({
    where: { dedupeKey },
    create: {
      dedupeKey,
      type: TASK_EVENT_TYPE,
      payload: { userId, taskKey, datePart, at: new Date().toISOString() },
      processedAt: new Date(),
    },
    update: {},
  });
}

export async function hasTaskSignal(
  userId: string,
  taskKey: string,
  daily: boolean,
): Promise<boolean> {
  const datePart = daily ? getTaipeiDateKey() : "once";
  const dedupeKey = `TASK_SIGNAL:${userId}:${taskKey}:${datePart}`;
  const found = await db.outboxEvent.findUnique({
    where: { dedupeKey },
    select: { id: true },
  });
  return Boolean(found);
}

/** 取得會員所有已核發之限量數位證書（每隻毛孩僅限 1 張） */
export async function listUserCertificates(userId: string): Promise<{
  certificates: IssuedCertificateRecord[];
  totalIssuedGlobal: number;
}> {
  const [rows, totalIssuedGlobal] = await Promise.all([
    db.outboxEvent.findMany({
      where: {
        type: CERT_EVENT_TYPE,
        dedupeKey: { startsWith: `PET_CERT:${userId}:` },
      },
      orderBy: { createdAt: "asc" },
      select: { payload: true },
    }),
    db.outboxEvent.count({ where: { type: CERT_EVENT_TYPE } }),
  ]);

  const certificates = rows
    .map((r) => r.payload as unknown as IssuedCertificateRecord)
    .filter((c) => c && typeof c.serialNo === "string");

  return { certificates, totalIssuedGlobal };
}

/** 核發限量毛孩數位證書：每隻毛孩僅能核發 1 次，頒發唯一遞增官方編號並永久封存 */
export async function issuePetCertificate(
  userId: string,
  input: {
    petId: string;
    petName: string;
    petType: string;
    breedText: string;
    weightText: string;
    allergyText: string;
    honorTitle: string;
    sealText: string;
    pledgeText: string;
    ownerName: string;
  },
): Promise<{
  certificate: IssuedCertificateRecord;
  alreadyIssued: boolean;
  totalIssuedGlobal: number;
}> {
  const petKey = input.petId.trim() || input.petName.trim();
  if (!petKey) throw new ApiError(400, "請先選擇已建檔的毛孩");

  // 驗證該毛孩是否屬於此會員（允許 demo/未在 DB 的 fallback 僅限正式 DB 內 pet，確保不可透過亂打 ID 無限刷證書）
  const ownedPet = await db.pet.findFirst({
    where: { id: input.petId, userId },
    select: { id: true, name: true, type: true },
  });
  if (!ownedPet) {
    throw new ApiError(
      400,
      "每張官方數位證書須綁定帳戶內的毛孩檔案，請先至「會員中心 → 毛孩檔案」建檔後再核發。",
    );
  }

  const dedupeKey = `PET_CERT:${userId}:${ownedPet.id}`;
  const existing = await db.outboxEvent.findUnique({
    where: { dedupeKey },
    select: { payload: true },
  });

  const totalCount = await db.outboxEvent.count({
    where: { type: CERT_EVENT_TYPE },
  });

  if (existing?.payload) {
    return {
      certificate: existing.payload as unknown as IssuedCertificateRecord,
      alreadyIssued: true,
      totalIssuedGlobal: totalCount,
    };
  }

  const editionNumber = totalCount + 1;
  const year = getTaipeiDateKey().slice(0, 4);
  const serialNo = `PS-${year}-${String(editionNumber).padStart(4, "0")}`;
  const record: IssuedCertificateRecord = {
    serialNo,
    editionNumber,
    petId: ownedPet.id,
    petName: input.petName.trim().slice(0, 24) || ownedPet.name,
    petType: ownedPet.type,
    breedText: input.breedText.trim().slice(0, 30),
    weightText: input.weightText.trim().slice(0, 20),
    allergyText: input.allergyText.trim().slice(0, 50),
    honorTitle: input.honorTitle.trim().slice(0, 36),
    sealText: input.sealText.trim().slice(0, 20),
    pledgeText: input.pledgeText.trim().slice(0, 120),
    ownerName: input.ownerName.trim().slice(0, 24) || "毛孩家人",
    issuedAt: getTaipeiDateKey().replaceAll("-", "."),
  };

  await db.outboxEvent.create({
    data: {
      dedupeKey,
      type: CERT_EVENT_TYPE,
      payload: record as unknown as Prisma.InputJsonValue,
      processedAt: new Date(),
    },
  });

  await db.memberNotification.create({
    data: {
      userId,
      title: `官方數位證書已核發：${record.petName}（${record.serialNo}）`,
      body: `已永久封存專屬編號 ${record.serialNo}，每隻毛孩限量 1 張，可隨時重複下載原件並於任務中心領取點數。`,
      href: "/rewards",
    },
  });

  return {
    certificate: record,
    alreadyIssued: false,
    totalIssuedGlobal: editionNumber,
  };
}
