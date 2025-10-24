"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import { getDB } from "@/db";
import { orderTable } from "@/db/schema";
import { eq } from "drizzle-orm";

// Delivery status workflow: pending → confirmed → preparing → out_for_delivery → delivered
const deliveryStatusEnum = z.enum([
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
]);

// Pickup status workflow: pending → confirmed → preparing → ready_for_pickup → picked_up
const pickupStatusEnum = z.enum([
  "pending",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "picked_up",
]);

/**
 * Update delivery status for an order
 */
export const updateDeliveryStatusAction = createServerAction()
  .input(
    z.object({
      orderId: z.string(),
      deliveryStatus: deliveryStatusEnum,
      notifyCustomer: z.boolean().default(false),
    })
  )
  .handler(async ({ input }) => {
    const db = getDB();

    // Update delivery status
    await db
      .update(orderTable)
      .set({
        deliveryStatus: input.deliveryStatus,
        updatedAt: new Date(),
      })
      .where(eq(orderTable.id, input.orderId));

    // TODO: Send customer notification if notifyCustomer is true

    return {
      success: true,
      orderId: input.orderId,
      newStatus: input.deliveryStatus,
    };
  });

/**
 * Update pickup status for an order
 */
export const updatePickupStatusAction = createServerAction()
  .input(
    z.object({
      orderId: z.string(),
      pickupStatus: pickupStatusEnum,
      notifyCustomer: z.boolean().default(false),
    })
  )
  .handler(async ({ input }) => {
    const db = getDB();

    // Update pickup status
    await db
      .update(orderTable)
      .set({
        pickupStatus: input.pickupStatus,
        updatedAt: new Date(),
      })
      .where(eq(orderTable.id, input.orderId));

    // TODO: Send customer notification if notifyCustomer is true

    return {
      success: true,
      orderId: input.orderId,
      newStatus: input.pickupStatus,
    };
  });

/**
 * Batch update delivery status for multiple orders
 * Useful for marking all deliveries as "out_for_delivery" at once
 */
export const batchUpdateDeliveryStatusAction = createServerAction()
  .input(
    z.object({
      orderIds: z.array(z.string()),
      deliveryStatus: deliveryStatusEnum,
      notifyCustomers: z.boolean().default(false),
    })
  )
  .handler(async ({ input }) => {
    const db = getDB();

    // Update all orders
    for (const orderId of input.orderIds) {
      await db
        .update(orderTable)
        .set({
          deliveryStatus: input.deliveryStatus,
          updatedAt: new Date(),
        })
        .where(eq(orderTable.id, orderId));

      // TODO: Send customer notification if notifyCustomers is true
    }

    return {
      success: true,
      updatedCount: input.orderIds.length,
      newStatus: input.deliveryStatus,
    };
  });

/**
 * Batch update pickup status for multiple orders
 * Useful for marking all pickups at a location as "ready_for_pickup"
 */
export const batchUpdatePickupStatusAction = createServerAction()
  .input(
    z.object({
      orderIds: z.array(z.string()),
      pickupStatus: pickupStatusEnum,
      notifyCustomers: z.boolean().default(false),
    })
  )
  .handler(async ({ input }) => {
    const db = getDB();

    // Update all orders
    for (const orderId of input.orderIds) {
      await db
        .update(orderTable)
        .set({
          pickupStatus: input.pickupStatus,
          updatedAt: new Date(),
        })
        .where(eq(orderTable.id, orderId));

      // TODO: Send customer notification if notifyCustomers is true
    }

    return {
      success: true,
      updatedCount: input.orderIds.length,
      newStatus: input.pickupStatus,
    };
  });
