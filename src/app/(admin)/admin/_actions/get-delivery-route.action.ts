'use server'

import { createServerAction } from 'zsa';
import { z } from 'zod';
import { getDB } from '@/db';
import { orderTable } from '@/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';

export const getDeliveryRoute = createServerAction()
  .input(z.object({
    deliveryDate: z.string(), // ISO date "2024-10-26"
  }))
  .handler(async ({ input }) => {
    const db = getDB();

    // Get all orders for this delivery date that have route information
    const orders = await db
      .select({
        id: orderTable.id,
        deliverySequence: orderTable.deliverySequence,
        estimatedArrivalTime: orderTable.estimatedArrivalTime,
        routeDurationFromPrevious: orderTable.routeDurationFromPrevious,
        routeDistanceFromPrevious: orderTable.routeDistanceFromPrevious,
      })
      .from(orderTable)
      .where(
        and(
          eq(orderTable.deliveryDate, input.deliveryDate),
          isNotNull(orderTable.deliverySequence)
        )
      )
      .orderBy(orderTable.deliverySequence);

    if (orders.length === 0) {
      return null;
    }

    return {
      deliveryDate: input.deliveryDate,
      routeSegments: orders.map(order => ({
        orderId: order.id,
        sequence: order.deliverySequence!,
        estimatedArrival: order.estimatedArrivalTime!,
        durationFromPrevious: order.routeDurationFromPrevious!,
        distanceFromPrevious: order.routeDistanceFromPrevious!,
      })),
    };
  });
