"use server";

import { getDB } from "@/db";
import { orderTable, orderItemTable, productTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createServerAction } from "zsa";
import { z } from "zod";
import { getCurrentLoyaltyCustomer } from "../../_lib/get-loyalty-customer";

export const getOrderDetailsAction = createServerAction()
  .input(
    z.object({
      orderId: z.string(),
    })
  )
  .handler(async ({ input }) => {
    const customer = await getCurrentLoyaltyCustomer();
    if (!customer) {
      throw new Error("Not authenticated");
    }

    const { env } = await getCloudflareContext();
    const db = getDB(env.NEXT_TAG_CACHE_D1);

    // Fetch the order
    const order = await db
      .select()
      .from(orderTable)
      .where(eq(orderTable.id, input.orderId))
      .get();

    if (!order) {
      throw new Error("Order not found");
    }

    // Verify the order belongs to this customer
    if (order.loyaltyCustomerId !== customer.id) {
      throw new Error("Unauthorized");
    }

    // Fetch order items with product details
    const items = await db
      .select()
      .from(orderItemTable)
      .innerJoin(productTable, eq(orderItemTable.productId, productTable.id))
      .where(eq(orderItemTable.orderId, input.orderId))
      .all();

    return {
      order,
      items: items.map((item) => ({
        id: item.order_item.id,
        productId: item.order_item.productId,
        quantity: item.order_item.quantity,
        priceAtPurchase: item.order_item.priceAtPurchase,
        customizations: item.order_item.customizations,
        product: {
          id: item.product.id,
          name: item.product.name,
          description: item.product.description,
          imageUrl: item.product.imageUrl,
        },
      })),
    };
  });
