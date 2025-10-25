"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import { getDB } from "@/db";
import { orderTable, orderItemTable, productTable, pickupLocationTable, deliveryZoneTable } from "@/db/schema";
import { eq, and, or, gte, lte, isNotNull, desc, sql } from "drizzle-orm";

/**
 * Get orders grouped by delivery date and pickup location
 * For admin order management by fulfillment method
 */
export const getOrdersByFulfillmentAction = createServerAction()
  .input(
    z.object({
      startDate: z.string().optional(), // ISO date string
      endDate: z.string().optional(), // ISO date string
      fulfillmentMethod: z.enum(["delivery", "pickup", "all"]).default("all"),
    })
  )
  .handler(async ({ input }) => {
    const db = getDB();

    // Build query conditions
    const conditions = [];

    // Date filtering based on fulfillment method
    // Note: deliveryDate and pickupDate are stored as ISO strings with timestamps,
    // but we need to compare just the date portion (YYYY-MM-DD)
    if (input.fulfillmentMethod === "delivery") {
      conditions.push(eq(orderTable.fulfillmentMethod, "delivery"));
      conditions.push(isNotNull(orderTable.deliveryDate));
      if (input.startDate) {
        conditions.push(sql`substr(${orderTable.deliveryDate}, 1, 10) >= ${input.startDate}`);
      }
      if (input.endDate) {
        conditions.push(sql`substr(${orderTable.deliveryDate}, 1, 10) <= ${input.endDate}`);
      }
    } else if (input.fulfillmentMethod === "pickup") {
      conditions.push(eq(orderTable.fulfillmentMethod, "pickup"));
      conditions.push(isNotNull(orderTable.pickupDate));
      if (input.startDate) {
        conditions.push(sql`substr(${orderTable.pickupDate}, 1, 10) >= ${input.startDate}`);
      }
      if (input.endDate) {
        conditions.push(sql`substr(${orderTable.pickupDate}, 1, 10) <= ${input.endDate}`);
      }
    } else {
      // For "all", we need to check both delivery and pickup dates
      if (input.startDate && input.endDate) {
        conditions.push(
          or(
            and(
              eq(orderTable.fulfillmentMethod, "delivery"),
              isNotNull(orderTable.deliveryDate),
              sql`substr(${orderTable.deliveryDate}, 1, 10) >= ${input.startDate}`,
              sql`substr(${orderTable.deliveryDate}, 1, 10) <= ${input.endDate}`
            ),
            and(
              eq(orderTable.fulfillmentMethod, "pickup"),
              isNotNull(orderTable.pickupDate),
              sql`substr(${orderTable.pickupDate}, 1, 10) >= ${input.startDate}`,
              sql`substr(${orderTable.pickupDate}, 1, 10) <= ${input.endDate}`
            )
          )
        );
      } else if (input.startDate) {
        conditions.push(
          or(
            and(
              eq(orderTable.fulfillmentMethod, "delivery"),
              isNotNull(orderTable.deliveryDate),
              sql`substr(${orderTable.deliveryDate}, 1, 10) >= ${input.startDate}`
            ),
            and(
              eq(orderTable.fulfillmentMethod, "pickup"),
              isNotNull(orderTable.pickupDate),
              sql`substr(${orderTable.pickupDate}, 1, 10) >= ${input.startDate}`
            )
          )
        );
      } else if (input.endDate) {
        conditions.push(
          or(
            and(
              eq(orderTable.fulfillmentMethod, "delivery"),
              isNotNull(orderTable.deliveryDate),
              sql`substr(${orderTable.deliveryDate}, 1, 10) <= ${input.endDate}`
            ),
            and(
              eq(orderTable.fulfillmentMethod, "pickup"),
              isNotNull(orderTable.pickupDate),
              sql`substr(${orderTable.pickupDate}, 1, 10) <= ${input.endDate}`
            )
          )
        );
      }
    }

    // Get orders with their items
    let orders;
    try {
      const baseQuery = db
        .select({
          order: orderTable,
          item: orderItemTable,
          product: productTable,
          pickupLocation: pickupLocationTable,
          deliveryZone: deliveryZoneTable,
        })
        .from(orderTable)
        .leftJoin(orderItemTable, eq(orderTable.id, orderItemTable.orderId))
        .leftJoin(productTable, eq(orderItemTable.productId, productTable.id))
        .leftJoin(pickupLocationTable, eq(orderTable.pickupLocationId, pickupLocationTable.id))
        .leftJoin(deliveryZoneTable, eq(orderTable.deliveryZoneId, deliveryZoneTable.id));

      orders = conditions.length > 0
        ? await baseQuery.where(and(...conditions)).orderBy(desc(orderTable.createdAt))
        : await baseQuery.orderBy(desc(orderTable.createdAt));
    } catch (error) {
      console.error("Database query error:", error);
      throw new Error(
        `Database query failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }

    // Group orders by fulfillment date and location
    // Extract just the date portion (YYYY-MM-DD) from ISO timestamps for grouping
    const deliveriesByDate = new Map<string, typeof orders>();
    const pickupsByDateAndLocation = new Map<string, Map<string, typeof orders>>();

    for (const row of orders) {
      if (row.order.fulfillmentMethod === "delivery" && row.order.deliveryDate) {
        // Extract date portion only (first 10 chars: YYYY-MM-DD)
        const date = row.order.deliveryDate.substring(0, 10);
        if (!deliveriesByDate.has(date)) {
          deliveriesByDate.set(date, []);
        }
        deliveriesByDate.get(date)!.push(row);
      } else if (row.order.fulfillmentMethod === "pickup" && row.order.pickupDate) {
        // Extract date portion only (first 10 chars: YYYY-MM-DD)
        const date = row.order.pickupDate.substring(0, 10);
        const locationId = row.order.pickupLocationId || "unknown";

        if (!pickupsByDateAndLocation.has(date)) {
          pickupsByDateAndLocation.set(date, new Map());
        }
        const locationsMap = pickupsByDateAndLocation.get(date)!;
        if (!locationsMap.has(locationId)) {
          locationsMap.set(locationId, []);
        }
        locationsMap.get(locationId)!.push(row);
      }
    }

    // Convert maps to arrays for JSON serialization
    const deliveries = Array.from(deliveriesByDate.entries()).map(([date, orders]) => {
      // Group order items by order ID
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

      const ordersArray = Array.from(orderMap.values());
      const totalRevenue = ordersArray.reduce((sum, o) => sum + o.order.totalAmount, 0);

      return {
        date,
        orders: ordersArray,
        count: ordersArray.length,
        totalRevenue,
      };
    });

    const pickups = Array.from(pickupsByDateAndLocation.entries()).map(([date, locationsMap]) => {
      const locations = Array.from(locationsMap.entries()).map(([locationId, orders]) => {
        // Group order items by order ID
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

        const ordersArray = Array.from(orderMap.values());
        const totalRevenue = ordersArray.reduce((sum, o) => sum + o.order.totalAmount, 0);

        return {
          locationId,
          locationName: ordersArray[0]?.pickupLocation?.name || "Unknown Location",
          orders: ordersArray,
          count: ordersArray.length,
          totalRevenue,
        };
      });

      return {
        date,
        locations,
        totalCount: locations.reduce((sum, loc) => sum + loc.count, 0),
        totalRevenue: locations.reduce((sum, loc) => sum + loc.totalRevenue, 0),
      };
    });

    return {
      deliveries,
      pickups,
      summary: {
        totalDeliveryOrders: deliveries.reduce((sum, d) => sum + d.count, 0),
        totalPickupOrders: pickups.reduce((sum, p) => sum + p.totalCount, 0),
        totalDeliveryRevenue: deliveries.reduce((sum, d) => sum + d.totalRevenue, 0),
        totalPickupRevenue: pickups.reduce((sum, p) => sum + p.totalRevenue, 0),
      },
    };
  });
