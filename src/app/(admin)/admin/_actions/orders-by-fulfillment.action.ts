"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import { getDB } from "@/db";
import { orderTable, orderItemTable, productTable, pickupLocationTable, deliveryZoneTable } from "@/db/schema";
import { eq, and, gte, lte, isNotNull, desc } from "drizzle-orm";

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

    if (input.startDate) {
      conditions.push(
        gte(
          input.fulfillmentMethod === "delivery"
            ? orderTable.deliveryDate
            : orderTable.pickupDate,
          input.startDate
        )
      );
    }

    if (input.endDate) {
      conditions.push(
        lte(
          input.fulfillmentMethod === "delivery"
            ? orderTable.deliveryDate
            : orderTable.pickupDate,
          input.endDate
        )
      );
    }

    if (input.fulfillmentMethod !== "all") {
      conditions.push(eq(orderTable.fulfillmentMethod, input.fulfillmentMethod));
    }

    // Get orders with their items
    const orders = await db
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
      .leftJoin(deliveryZoneTable, eq(orderTable.deliveryZoneId, deliveryZoneTable.id))
      .where(and(...conditions))
      .orderBy(desc(orderTable.createdAt));

    // Group orders by fulfillment date and location
    const deliveriesByDate = new Map<string, typeof orders>();
    const pickupsByDateAndLocation = new Map<string, Map<string, typeof orders>>();

    for (const row of orders) {
      if (row.order.fulfillmentMethod === "delivery" && row.order.deliveryDate) {
        const date = row.order.deliveryDate;
        if (!deliveriesByDate.has(date)) {
          deliveriesByDate.set(date, []);
        }
        deliveriesByDate.get(date)!.push(row);
      } else if (row.order.fulfillmentMethod === "pickup" && row.order.pickupDate) {
        const date = row.order.pickupDate;
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
