"use server";

import { getDB } from "@/db";
import { orderTable, orderItemTable, productTable, orderStatusTuple, PAYMENT_STATUS } from "@/db/schema";
import { desc, eq, like, or, sql } from "drizzle-orm";
import { z } from "zod";
import { createServerAction } from "zsa";
import { getSessionFromCookie } from "@/utils/auth";
import { ROLES_ENUM } from "@/db/schema";

// Schema for updating order status
const updateOrderStatusSchema = z.object({
  orderId: z.string(),
  status: z.enum(orderStatusTuple),
});

// Schema for order filtering
const getOrdersSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(orderStatusTuple).optional(),
});

/**
 * Get all orders with pagination and filtering
 */
export const getOrdersAction = createServerAction()
  .input(getOrdersSchema)
  .handler(async ({ input }) => {
    const session = await getSessionFromCookie();

    if (!session?.user || session.user.role !== ROLES_ENUM.ADMIN) {
      throw new Error("Unauthorized");
    }

    const db = getDB();
    const { page, limit, search, status } = input;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereConditions = [];

    if (status) {
      whereConditions.push(eq(orderTable.status, status));
    }

    if (search) {
      whereConditions.push(
        or(
          like(orderTable.customerEmail, `%${search}%`),
          like(orderTable.customerName, `%${search}%`),
          like(orderTable.id, `%${search}%`)
        )
      );
    }

    // Get orders with items count
    const orders = await db
      .select({
        id: orderTable.id,
        customerEmail: orderTable.customerEmail,
        customerName: orderTable.customerName,
        totalAmount: orderTable.totalAmount,
        paymentStatus: orderTable.paymentStatus,
        status: orderTable.status,
        stripePaymentIntentId: orderTable.stripePaymentIntentId,
        createdAt: orderTable.createdAt,
        updatedAt: orderTable.updatedAt,
        fulfillmentMethod: orderTable.fulfillmentMethod,
        fulfillmentType: orderTable.fulfillmentType,
        deliveryDate: orderTable.deliveryDate,
        itemsCount: sql<number>`count(${orderItemTable.id})`,
      })
      .from(orderTable)
      .leftJoin(orderItemTable, eq(orderTable.id, orderItemTable.orderId))
      .where(whereConditions.length > 0 ? sql`${whereConditions.join(' AND ')}` : undefined)
      .groupBy(orderTable.id)
      .orderBy(desc(orderTable.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orderTable)
      .where(whereConditions.length > 0 ? sql`${whereConditions.join(' AND ')}` : undefined);

    return {
      orders,
      totalCount: countResult?.count || 0,
      currentPage: page,
      totalPages: Math.ceil((countResult?.count || 0) / limit),
    };
  });

/**
 * Get a single order with all its items
 */
export const getOrderByIdAction = createServerAction()
  .input(z.string())
  .handler(async ({ input: orderId }) => {
    const session = await getSessionFromCookie();

    if (!session?.user || session.user.role !== ROLES_ENUM.ADMIN) {
      throw new Error("Unauthorized");
    }

    const db = getDB();

    const [order] = await db
      .select()
      .from(orderTable)
      .where(eq(orderTable.id, orderId))
      .limit(1);

    if (!order) {
      throw new Error("Order not found");
    }

    // Get order items with product details
    const items = await db
      .select({
        id: orderItemTable.id,
        orderId: orderItemTable.orderId,
        productId: orderItemTable.productId,
        quantity: orderItemTable.quantity,
        priceAtPurchase: orderItemTable.priceAtPurchase,
        productName: productTable.name,
        productImageUrl: productTable.imageUrl,
      })
      .from(orderItemTable)
      .leftJoin(productTable, eq(orderItemTable.productId, productTable.id))
      .where(eq(orderItemTable.orderId, orderId));

    return {
      ...order,
      items,
    };
  });

/**
 * Update order status
 */
export const updateOrderStatusAction = createServerAction()
  .input(updateOrderStatusSchema)
  .handler(async ({ input }) => {
    const session = await getSessionFromCookie();

    if (!session?.user || session.user.role !== ROLES_ENUM.ADMIN) {
      throw new Error("Unauthorized");
    }

    const db = getDB();
    const { orderId, status } = input;

    // Verify order exists
    const [existingOrder] = await db
      .select()
      .from(orderTable)
      .where(eq(orderTable.id, orderId))
      .limit(1);

    if (!existingOrder) {
      throw new Error("Order not found");
    }

    // Update the order status
    const [updatedOrder] = await db
      .update(orderTable)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(orderTable.id, orderId))
      .returning();

    // TODO: In the future, trigger email notification here based on status change
    // For example:
    // if (status === ORDER_STATUS.BAKED) {
    //   await sendOrderStatusEmail(updatedOrder);
    // }

    return updatedOrder;
  });

/**
 * Get order statistics
 */
export const getOrderStatsAction = createServerAction()
  .handler(async () => {
    const session = await getSessionFromCookie();

    if (!session?.user || session.user.role !== ROLES_ENUM.ADMIN) {
      throw new Error("Unauthorized");
    }

    const db = getDB();

    // Get counts by status
    const statusCounts = await db
      .select({
        status: orderTable.status,
        count: sql<number>`count(*)`,
      })
      .from(orderTable)
      .groupBy(orderTable.status);

    // Get total revenue (from paid orders only)
    const [revenueResult] = await db
      .select({
        total: sql<number>`sum(${orderTable.totalAmount})`,
      })
      .from(orderTable)
      .where(eq(orderTable.paymentStatus, PAYMENT_STATUS.PAID));

    // Get today's orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayOrdersResult] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(orderTable)
      .where(sql`${orderTable.createdAt} >= ${today.getTime()}`);

    return {
      statusCounts,
      totalRevenue: revenueResult?.total || 0,
      todayOrders: todayOrdersResult?.count || 0,
    };
  });

