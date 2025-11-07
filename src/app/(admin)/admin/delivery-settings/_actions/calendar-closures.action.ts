"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import { getDB } from "@/db";
import { deliveryCalendarClosureTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionFromCookie } from "@/utils/auth";

// List all calendar closures
export const listCalendarClosuresAction = createServerAction()
  .handler(async () => {
    const session = await getSessionFromCookie();
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const db = await getDB();
    const closures = await db
      .select()
      .from(deliveryCalendarClosureTable)
      .orderBy(deliveryCalendarClosureTable.closureDate);

    return closures;
  });

// Add a calendar closure
// NOTE: closureDate is stored as ISO string (YYYY-MM-DD) in Mountain Time (America/Boise)
// The delivery system (src/utils/delivery.ts) reads these dates and treats them as MT dates
export const addCalendarClosureAction = createServerAction()
  .input(
    z.object({
      closureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
      reason: z.string().min(1, "Reason is required").max(500),
      affectsDelivery: z.boolean().default(true),
      affectsPickup: z.boolean().default(true),
    })
  )
  .handler(async ({ input }) => {
    const session = await getSessionFromCookie();
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const db = await getDB();

    // Check if closure already exists for this date
    const existing = await db
      .select()
      .from(deliveryCalendarClosureTable)
      .where(eq(deliveryCalendarClosureTable.closureDate, input.closureDate))
      .limit(1);

    if (existing.length > 0) {
      throw new Error("A closure already exists for this date");
    }

    const [closure] = await db
      .insert(deliveryCalendarClosureTable)
      .values({
        closureDate: input.closureDate,
        reason: input.reason,
        affectsDelivery: input.affectsDelivery ? 1 : 0,
        affectsPickup: input.affectsPickup ? 1 : 0,
      })
      .returning();

    return closure;
  });

// Delete a calendar closure
export const deleteCalendarClosureAction = createServerAction()
  .input(
    z.object({
      id: z.string(),
    })
  )
  .handler(async ({ input }) => {
    const session = await getSessionFromCookie();
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const db = await getDB();
    await db
      .delete(deliveryCalendarClosureTable)
      .where(eq(deliveryCalendarClosureTable.id, input.id));

    return { success: true };
  });
