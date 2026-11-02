import { loadEnvConfig } from "@next/env";
import { Prisma, PrismaClient } from "@prisma/client";

loadEnvConfig(process.cwd());
const db = new PrismaClient();
const apply = process.argv.includes("--apply");

async function main() {
  const legacy = await db.order.findMany({
    where: { paymentReference: { startsWith: "EXPERIENCE:" } },
    select: {
      id: true, status: true, totalNt: true, paymentReference: true,
      items: { select: { variantId: true, quantity: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const totals = await db.order.groupBy({ by: ["status"], _count: true, _sum: { totalNt: true } });
  const activeDemand = new Map<string, number>();
  for (const order of legacy) {
    if (order.status === "CANCELLED") continue;
    for (const item of order.items) activeDemand.set(item.variantId, (activeDemand.get(item.variantId) ?? 0) + item.quantity);
  }
  const variants = await db.productVariant.findMany({ where: { id: { in: [...activeDemand.keys()] } }, select: { id: true, stock: true } });
  const stockSufficient = variants.length === activeDemand.size && variants.every((variant) => variant.stock >= (activeDemand.get(variant.id) ?? 0));
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", existing: totals, legacy: {
    count: legacy.length,
    activeCount: legacy.filter((o) => o.status !== "CANCELLED").length,
    activeValueNt: legacy.filter((o) => o.status !== "CANCELLED").reduce((sum, o) => sum + o.totalNt, 0),
    stockSufficient,
  } }, null, 2));
  if (!apply) return;
  if (!stockSufficient) throw new Error("Legacy order stock cannot be reconciled safely");

  let migrated = 0;
  for (const order of legacy) {
    await db.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id: order.id }, include: { items: true } });
      if (!current?.paymentReference?.startsWith("EXPERIENCE:")) return;
      const nextReference = current.paymentReference.replace(/^EXPERIENCE:/, "CHECKOUT:");
      if (current.status !== "CANCELLED") {
        const demand = new Map<string, number>();
        for (const item of current.items) demand.set(item.variantId, (demand.get(item.variantId) ?? 0) + item.quantity);
        for (const [variantId, quantity] of demand) {
          const updated = await tx.productVariant.updateMany({
            where: { id: variantId, stock: { gte: quantity } },
            data: { stock: { decrement: quantity } },
          });
          if (updated.count !== 1) throw new Error(`Insufficient stock for legacy order ${current.id}`);
        }
      }
      await tx.order.update({
        where: { id: current.id },
        data: { paymentReference: nextReference, status: current.status === "PENDING_PAYMENT" ? "PAID" : current.status },
      });
      migrated++;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
  console.log(JSON.stringify({ migrated }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
