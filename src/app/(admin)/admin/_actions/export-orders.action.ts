"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import { getDB } from "@/db";
import { orderTable, orderItemTable, productTable, pickupLocationTable, deliveryZoneTable } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * Export delivery orders for a specific date as CSV for route planning
 */
export const exportDeliveryRoutesAction = createServerAction()
  .input(
    z.object({
      deliveryDate: z.string(), // ISO date string
    })
  )
  .handler(async ({ input }) => {
    const db = getDB();

    // Get all delivery orders for this date
    // Extract just the date portion (YYYY-MM-DD) from ISO timestamps for comparison
    const orders = await db
      .select({
        order: orderTable,
        item: orderItemTable,
        product: productTable,
        deliveryZone: deliveryZoneTable,
      })
      .from(orderTable)
      .leftJoin(orderItemTable, eq(orderTable.id, orderItemTable.orderId))
      .leftJoin(productTable, eq(orderItemTable.productId, productTable.id))
      .leftJoin(deliveryZoneTable, eq(orderTable.deliveryZoneId, deliveryZoneTable.id))
      .where(
        and(
          eq(orderTable.fulfillmentMethod, "delivery"),
          sql`substr(${orderTable.deliveryDate}, 1, 10) = ${input.deliveryDate}`
        )
      );

    // Group items by order
    const orderMap = new Map<string, {
      order: typeof orders[0]["order"];
      items: Array<{ item: typeof orders[0]["item"]; product: typeof orders[0]["product"] }>;
      deliveryZone: typeof orders[0]["deliveryZone"];
    }>();

    for (const row of orders) {
      if (!orderMap.has(row.order.id)) {
        orderMap.set(row.order.id, {
          order: row.order,
          items: [],
          deliveryZone: row.deliveryZone,
        });
      }
      if (row.item && row.product) {
        orderMap.get(row.order.id)!.items.push({
          item: row.item,
          product: row.product,
        });
      }
    }

    // Build CSV content
    const csvRows: string[] = [
      // Header row
      "Order ID,Customer Name,Phone,Address,City,State,ZIP,Delivery Window,Zone,Fee,Total,Items,Instructions,Status",
    ];

    for (const orderData of orderMap.values()) {
      const order = orderData.order;
      const itemsSummary = orderData.items
        .map((i) => `${i.product?.name || "Unknown"} (x${i.item?.quantity || 0})`)
        .join("; ");

      // Parse delivery address if available
      let address = "";
      let city = "";
      let state = "";
      let zip = "";
      if (order.deliveryAddressJson) {
        try {
          const parsed = JSON.parse(order.deliveryAddressJson);
          address = parsed.street || "";
          city = parsed.city || "";
          state = parsed.state || "";
          zip = parsed.zip || "";
        } catch {
          // Ignore parse errors
        }
      }

      csvRows.push(
        [
          order.id,
          `"${order.customerName}"`,
          order.customerPhone || "",
          `"${address}"`,
          city,
          state,
          zip,
          order.deliveryTimeWindow || "",
          orderData.deliveryZone?.name || "",
          (order.deliveryFee || 0) / 100, // Convert cents to dollars
          order.totalAmount / 100,
          `"${itemsSummary}"`,
          `"${order.deliveryInstructions || ""}"`,
          order.deliveryStatus || "pending",
        ].join(",")
      );
    }

    const csvContent = csvRows.join("\n");

    return {
      csvContent,
      filename: `delivery-routes-${input.deliveryDate}.csv`,
      orderCount: orderMap.size,
    };
  });

/**
 * Export pickup orders for a specific date and location for printing
 */
export const exportPickupListAction = createServerAction()
  .input(
    z.object({
      pickupDate: z.string(), // ISO date string
      pickupLocationId: z.string(),
    })
  )
  .handler(async ({ input }) => {
    const db = getDB();

    // Get all pickup orders for this date and location
    // Extract just the date portion (YYYY-MM-DD) from ISO timestamps for comparison
    const orders = await db
      .select({
        order: orderTable,
        item: orderItemTable,
        product: productTable,
        pickupLocation: pickupLocationTable,
      })
      .from(orderTable)
      .leftJoin(orderItemTable, eq(orderTable.id, orderItemTable.orderId))
      .leftJoin(productTable, eq(orderItemTable.productId, productTable.id))
      .leftJoin(pickupLocationTable, eq(orderTable.pickupLocationId, pickupLocationTable.id))
      .where(
        and(
          eq(orderTable.fulfillmentMethod, "pickup"),
          sql`substr(${orderTable.pickupDate}, 1, 10) = ${input.pickupDate}`,
          eq(orderTable.pickupLocationId, input.pickupLocationId)
        )
      );

    // Group items by order
    const orderMap = new Map<string, {
      order: typeof orders[0]["order"];
      items: Array<{ item: typeof orders[0]["item"]; product: typeof orders[0]["product"] }>;
      pickupLocation: typeof orders[0]["pickupLocation"];
    }>();

    for (const row of orders) {
      if (!orderMap.has(row.order.id)) {
        orderMap.set(row.order.id, {
          order: row.order,
          items: [],
          pickupLocation: row.pickupLocation,
        });
      }
      if (row.item && row.product) {
        orderMap.get(row.order.id)!.items.push({
          item: row.item,
          product: row.product,
        });
      }
    }

    // Build CSV content
    const csvRows: string[] = [
      // Header row
      "Order ID,Customer Name,Phone,Email,Items,Pickup Window,Instructions,Status,Total",
    ];

    for (const orderData of orderMap.values()) {
      const order = orderData.order;
      const itemsSummary = orderData.items
        .map((i) => `${i.product?.name || "Unknown"} (x${i.item?.quantity || 0})`)
        .join("; ");

      csvRows.push(
        [
          order.id,
          `"${order.customerName}"`,
          order.customerPhone || "",
          order.customerEmail,
          `"${itemsSummary}"`,
          order.pickupTimeWindow || "",
          `"${order.pickupInstructions || ""}"`,
          order.pickupStatus || "pending",
          order.totalAmount / 100,
        ].join(",")
      );
    }

    const csvContent = csvRows.join("\n");
    const locationName = orderMap.values().next().value?.pickupLocation?.name || "Unknown";

    return {
      csvContent,
      filename: `pickup-list-${locationName.replace(/\s+/g, "-")}-${input.pickupDate}.csv`,
      orderCount: orderMap.size,
      locationName,
    };
  });
