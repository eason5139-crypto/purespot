import "server-only";
import { checkoutPaymentMethod } from "./checkoutOrder";

type OrderRecord = {
  id: string; status: string; subtotalNt: number; shippingNt: number; totalNt: number;
  createdAt: Date; updatedAt: Date; paymentReference: string | null; shippingAddress: unknown;
  items: { id: string; productName: string; quantity: number; unitPriceNt: number; petId: string; pet: { name: string }; variant: { productId: string; product: { slug: string; imageUrl: string } } }[];
  supportRequests: { id: string; kind: string; status: string; message: string; response: string | null; createdAt: Date }[];
};

export const accountOrderInclude = {
  items: { include: { pet: { select: { name: true } }, variant: { include: { product: { select: { slug: true, imageUrl: true } } } } } },
  supportRequests: { orderBy: { createdAt: "desc" as const } },
} as const;

export function formatAccountOrder(order: OrderRecord) {
  return {
    id: order.id, status: order.status, subtotalNt: order.subtotalNt, shippingNt: order.shippingNt, totalNt: order.totalNt,
    createdAt: order.createdAt, updatedAt: order.updatedAt, paymentMethod: checkoutPaymentMethod(order.paymentReference),
    shippingAddress: order.shippingAddress,
    items: order.items.map((item) => ({ id: item.id, productName: item.productName, quantity: item.quantity, unitPriceNt: item.unitPriceNt, petId: item.petId, petName: item.pet.name, productId: item.variant.productId, slug: item.variant.product.slug, image: item.variant.product.imageUrl })),
    supportRequests: order.supportRequests.map((request) => ({ id: request.id, kind: request.kind, status: request.status, message: request.message, response: request.response, createdAt: request.createdAt })),
  };
}
