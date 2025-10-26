'use server'

import { createServerAction } from 'zsa';
import { z } from 'zod';
import { getDB } from '@/db';
import { orderTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const saveDeliveryRoute = createServerAction()
  .input(z.object({
    deliveryDate: z.string(), // ISO date "2024-10-26"
    routeSegments: z.array(z.object({
      orderId: z.string(),
      sequence: z.number(),
      estimatedArrival: z.string(), // "09:15:00"
      durationFromPrevious: z.number(), // seconds
      distanceFromPrevious: z.number(), // meters
    })),
  }))
  .handler(async ({ input }) => {
    const db = getDB();

    // Update each order with its route information
    for (const segment of input.routeSegments) {
      await db
        .update(orderTable)
        .set({
          deliverySequence: segment.sequence,
          estimatedArrivalTime: segment.estimatedArrival,
          routeDurationFromPrevious: segment.durationFromPrevious,
          routeDistanceFromPrevious: segment.distanceFromPrevious,
          updatedAt: new Date(),
        })
        .where(eq(orderTable.id, segment.orderId));
    }

    return {
      success: true,
      updatedCount: input.routeSegments.length,
    };
  });
