import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { apiError, readBody, verifyOrigin } from "@/server/http";
import { hashPassword } from "@/server/auth";
import { requireAdminSession } from "@/server/adminAuth";
import { z } from "zod";

export const runtime = "nodejs";

const createMemberSchema = z.object({
  name: z.string().trim().min(1, "請輸入姓名"),
  email: z.string().email("請輸入有效 Email").toLowerCase(),
  password: z.string().min(8, "密碼長度至少需 8 碼"),
  phone: z.string().optional(),
});

// 公司端：取得所有真實會員清單
export async function GET() {
  try {
    await requireAdminSession();
    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        pets: { select: { id: true } },
        orders: { select: { id: true, totalNt: true } },
      },
    });

    const members = users.map((u) => {
      const ordersCount = u.orders.length;
      const totalSpentNt = u.orders.reduce((acc, o) => acc + o.totalNt, 0);

      return {
        id: u.id,
        name: u.name || "未填寫",
        email: u.email,
        phone: u.phone || "未填寫",
        joinedAt: u.createdAt.toISOString(),
        ordersCount,
        totalSpentNt,
        status: "ACTIVE" as const,
        petCount: u.pets.length,
      };
    });

    return NextResponse.json({ members });
  } catch (error) {
    return apiError(error);
  }
}

// 公司端：新增會員
export async function POST(request: Request) {
  try {
    await requireAdminSession();
    verifyOrigin(request);
    const input = await readBody(request, createMemberSchema);

    const existing = await db.user.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      return NextResponse.json({ error: "此 Email 已經註冊過會員" }, { status: 409 });
    }

    const passwordHash = await hashPassword(input.password);
    const user = await db.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        phone: input.phone || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        member: {
          id: user.id,
          name: user.name || "未填寫",
          email: user.email,
          phone: user.phone || "未填寫",
          joinedAt: user.createdAt.toISOString(),
          ordersCount: 0,
          totalSpentNt: 0,
          status: "ACTIVE",
          petCount: 0,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}

// 公司端：刪除會員
export async function DELETE(request: Request) {
  try {
    await requireAdminSession();
    verifyOrigin(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "缺少會員 ID" }, { status: 400 });
    }

    // 級聯刪除會員及連帶資料
    await db.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    return apiError(error);
  }
}
