import "server-only";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import { ApiError } from "./http";
import { reconcilePoints } from "./membership";
import { memberStatus, serializable } from "./memberPolicyRepository";
import { priceForMember } from "@/lib/memberPolicy";
export const orderInputSchema = z
  .object({
    idempotencyKey: z.uuid(),
    items: z
      .array(
        z.object({
          variantId: z.string().min(1).max(100),
          petId: z.uuid(),
          quantity: z.number().int().min(1).max(99),
          intervalDays: z
            .union([z.literal(14), z.literal(28), z.literal(42), z.literal(56)])
            .nullable(),
        }),
      )
      .min(1)
      .max(50),
    shippingAddress: z.object({
      name: z.string().trim().min(1).max(50),
      phone: z.string().regex(/^09\d{8}$/),
      postalCode: z.string().regex(/^\d{3}(\d{2,3})?$/),
      address: z.string().trim().min(5).max(200),
    }),
  })
  .strict();
export async function createOrder(
  userId: string,
  input: z.infer<typeof orderInputSchema>,
  paymentReference: string,
  options?: {
    discountCode?: string;
    pointsToUse?: number;
    familyGroupId?: string;
    giftCard?: {
      included: boolean;
      recipient: string;
      message: string;
      signature: string;
      font: "serif" | "sans";
      tone: "clay" | "blue";
    };
  },
) {
  await reconcilePoints(userId);
  const membership = await memberStatus(userId);
  const requestHash = createHash("sha256")
    .update(
      JSON.stringify({
        items: input.items,
        shippingAddress: input.shippingAddress,
        options,
      }),
    )
    .digest("hex");
  const existing = await db.order.findUnique({
    where: {
      userId_idempotencyKey: { userId, idempotencyKey: input.idempotencyKey },
    },
  });
  if (existing) {
    if (existing.requestHash !== requestHash)
      throw new ApiError(409, "重試識別碼與訂單內容不一致");
    return existing;
  }
  return serializable(
    async (tx) => {
      const variants = await tx.productVariant.findMany({
        where: { id: { in: input.items.map((i) => i.variantId) } },
        include: { product: true },
      });
      const pets = await tx.pet.findMany({
        where: { id: { in: input.items.map((i) => i.petId) }, ...(options?.familyGroupId ? { user: { familyMembership: { groupId: options.familyGroupId } } } : { userId }) },
      });
      if (options?.familyGroupId) {
        const owner = await tx.familyMemberRecord.findFirst({ where: { userId, groupId: options.familyGroupId, role: "OWNER" } });
        if (!owner) throw new ApiError(403, "家庭訂單須由主帳戶確認");
        const shared = await tx.familyListItem.findMany({ where: { groupId: options.familyGroupId } });
        if (shared.length !== input.items.length || !input.items.every((item) => shared.some((entry) => entry.productId === variants.find((variant) => variant.id === item.variantId)?.productId && entry.petId === item.petId && entry.quantity === item.quantity)))
          throw new ApiError(409, "家庭清單已更新，請重新整理後結帳");
      }
      const demand = new Map<string, number>();
      const keys = new Set<string>();
      const lines = input.items.map((item) => {
        const key = `${item.variantId}:${item.petId}:${item.intervalDays ?? 0}`;
        if (keys.has(key)) throw new ApiError(400, "請合併重複的商品項目");
        keys.add(key);
        const variant = variants.find((v) => v.id === item.variantId);
        const pet = pets.find((p) => p.id === item.petId);
        if (!variant || !variant.product.isPublished || !pet)
          throw new ApiError(400, "商品或毛孩資料無法使用");
        const p = variant.product;
        const ageMonths =
          (new Date().getUTCFullYear() - pet.birthday.getUTCFullYear()) * 12 +
          new Date().getUTCMonth() -
          pet.birthday.getUTCMonth();
        const stage =
          ageMonths < 12 ? "JUNIOR" : ageMonths >= 84 ? "SENIOR" : "ADULT";
        if (
          p.targetPetType !== pet.type ||
          !p.lifeStages.includes(stage) ||
          pet.allergies.some((a) => p.allergens.includes(a))
        )
          throw new ApiError(400, "商品不適合此毛孩，請重新選擇");
        if (item.intervalDays && !p.isAutoshipEligible)
          throw new ApiError(400, "此商品不支援循環補貨");
        const qty = (demand.get(variant.id) ?? 0) + item.quantity;
        demand.set(variant.id, qty);
        if (qty > variant.stock)
          throw new ApiError(409, "商品庫存不足，請調整數量");
        const unitPriceNt = priceForMember(variant.priceNt,Boolean(item.intervalDays),membership.current,Number(p.autoshipDiscountRate));
        return {
          variantId: variant.id,
          petId: pet.id,
          productName: p.name,
          quantity: item.quantity,
          unitPriceNt,
          unitCostNt: variant.unitCostNt,
          unitCostSource: variant.costSource,
          isAutoship: !!item.intervalDays,
          intervalDays: item.intervalDays,
        };
      });
      const subtotalNt = lines.reduce(
        (s, i) => s + i.unitPriceNt * i.quantity,
        0,
      );
      const threshold = Math.min(membership.current.freeShippingNt,lines.every((i) => i.isAutoship) ? 699 : 999);
      const shippingNt = subtotalNt >= threshold ? 0 : 80;
      const redemption = options?.discountCode ? await tx.rewardRedemption.findFirst({ where: { code: options.discountCode.toUpperCase(), userId, orderId: null } }) : null;
      if (options?.discountCode && !redemption) throw new ApiError(400, "優惠代碼無效或已使用");
      if(redemption) {
        const row=await tx.outboxEvent.findUnique({where:{dedupeKey:`COUPON_META:${redemption.id}`}});
        const meta=row?.payload as {minSpendNt?:number;expiresAt?:string}|undefined;
        if(meta?.expiresAt && new Date(meta.expiresAt)<=new Date()) throw new ApiError(400,"這張票券已到期");
        if(subtotalNt<(meta?.minSpendNt??0)) throw new ApiError(400,`這張票券須滿 NT$${meta?.minSpendNt} 才能使用`);
      }
      const pointsToUse = Math.max(0, Math.floor(options?.pointsToUse ?? 0));
      if (pointsToUse > 0) {
        const balance = await tx.pointEntry.aggregate({ where: { userId }, _sum: { points: true } });
        const currentPoints = Math.max(0, balance._sum.points ?? 0);
        if (pointsToUse > currentPoints) throw new ApiError(400, "會員可用點數不足，請調整折抵點數");
        if(pointsToUse>Math.floor(Math.max(0,subtotalNt-(redemption?.discountNt??0))*membership.current.maxRedeemRatio)) throw new ApiError(400,"超過目前會員等級的點數折抵上限");
      }
      const couponDiscountNt = redemption?.discountNt ?? 0;
      const discountNt = couponDiscountNt + pointsToUse;
      if (discountNt > subtotalNt) throw new ApiError(400, "本次商品金額低於總折抵額");
      for (const [variantId, quantity] of demand) {
        const reserved = await tx.productVariant.updateMany({
          where: { id: variantId, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } },
        });
        if (reserved.count !== 1) throw new ApiError(409, "商品庫存不足，請調整數量");
        const variant = variants.find((item) => item.id === variantId);
        if (variant && variant.stock === quantity) {
          await tx.favorite.updateMany({ where: { productId: variant.productId, watchRestock: true }, data: { savedOutOfStock: true } });
        }
      }
      const pendingGifts=(await tx.outboxEvent.findMany({where:{type:"POINTS_SHOP_ITEM",payload:{path:["userId"],equals:userId}}})).filter(r=>(r.payload as {status?:string}).status==="PENDING");
      const pointsGifts=pendingGifts.map(r=>(r.payload as {title:string}).title);
      const order = await tx.order.create({
        data: {
          userId,
          idempotencyKey: input.idempotencyKey,
          requestHash,
          subtotalNt,
          shippingNt,
          totalNt: subtotalNt + shippingNt - discountNt,
          discountNt,
          familyGroupId: options?.familyGroupId,
          ...(options?.giftCard ? { giftCard: options.giftCard } : {}),
          shippingAddress: {...input.shippingAddress,...(pointsGifts.length?{pointsGifts}:{})},
          paymentReference,
          status: "PAID",
          expiresAt: new Date(Date.now() + 30 * 60_000),
          items: { create: lines },
        },
      });
      for(const gift of pendingGifts) await tx.outboxEvent.update({where:{id:gift.id},data:{payload:{...gift.payload as Prisma.JsonObject,status:"ATTACHED",orderId:order.id}}});
      if (redemption) await tx.rewardRedemption.update({ where: { id: redemption.id }, data: { orderId: order.id } });
      if (pointsToUse > 0) {
        await tx.pointEntry.create({
          data: {
            userId,
            sourceKey: `order-points-use:${order.id}`,
            title: `結帳點數折抵現金（1點折NT$1 · 訂單 #${order.id.slice(0, 8)}）`,
            points: -pointsToUse,
          },
        });
      }
      await tx.outboxEvent.create({data:{dedupeKey:`ORDER_MEMBER_PRICING:${order.id}`,type:"ORDER_MEMBER_PRICING",payload:{userId,orderId:order.id,tierCode:membership.current.code,earnPercent:membership.current.earnPercent,discountPercent:membership.current.discountPercent},processedAt:new Date()}});
      for (const days of [14,28,42,56] as const) {
        const scheduled=lines.filter(line=>line.intervalDays===days);
        if(!scheduled.length) continue;
        const frequency=days===14?"EVERY_2_WEEKS":days===28?"EVERY_4_WEEKS":days===42?"EVERY_6_WEEKS":"EVERY_8_WEEKS";
        await tx.autoshipPlan.create({data:{userId,frequency,nextBillingDate:new Date(Date.now()+days*86400000),shippingAddress:input.shippingAddress,paymentMethodToken:paymentReference,status:"ACTIVE",isActive:true,items:{create:scheduled.map(line=>({variantId:line.variantId,petId:line.petId,quantity:line.quantity}))}}});
      }
      if (options?.familyGroupId) await tx.familyListItem.deleteMany({ where: { groupId: options.familyGroupId } });
      return order;
    },
  );
}
