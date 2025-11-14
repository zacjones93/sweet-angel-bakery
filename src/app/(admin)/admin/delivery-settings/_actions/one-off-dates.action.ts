"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import { getDB } from "@/db";
import { deliveryOneOffDateTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionFromCookie } from "@/utils/auth";

// List all one-off dates
export const listOneOffDatesAction = createServerAction()
  .handler(async () => {
    const session = await getSessionFromCookie();
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const db = await getDB();
    const oneOffDates = await db
      .select()
      .from(deliveryOneOffDateTable)
      .orderBy(deliveryOneOffDateTable.date);

    return oneOffDates;
  });

// Add a one-off date
// NOTE: date is stored as ISO string (YYYY-MM-DD) in Mountain Time (America/Boise)
// The delivery system (src/utils/delivery.ts) reads these dates and treats them as MT dates
export const addOneOffDateAction = createServerAction()
  .input(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
      type: z.enum(["delivery", "pickup"]),
      reason: z.string().max(500).optional(),
      // Optional overrides - if not provided, use default schedule settings
      timeWindowStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      timeWindowEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      cutoffDay: z.number().min(0).max(6).optional(),
      cutoffTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      leadTimeDays: z.number().min(0).optional(),
    })
  )
  .handler(async ({ input }) => {
    const session = await getSessionFromCookie();
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const db = await getDB();

    // Check if one-off date already exists for this date and type
    const existing = await db
      .select()
      .from(deliveryOneOffDateTable)
      .where(
        and(
          eq(deliveryOneOffDateTable.date, input.date),
          eq(deliveryOneOffDateTable.type, input.type)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new Error(`A ${input.type} one-off date already exists for this date`);
    }

    const [oneOffDate] = await db
      .insert(deliveryOneOffDateTable)
      .values({
        date: input.date,
        type: input.type,
        reason: input.reason || null,
        timeWindowStart: input.timeWindowStart || null,
        timeWindowEnd: input.timeWindowEnd || null,
        cutoffDay: input.cutoffDay ?? null,
        cutoffTime: input.cutoffTime || null,
        leadTimeDays: input.leadTimeDays ?? null,
      })
      .returning();

    return oneOffDate;
  });

// Delete a one-off date
export const deleteOneOffDateAction = createServerAction()
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
      .delete(deliveryOneOffDateTable)
      .where(eq(deliveryOneOffDateTable.id, input.id));

    return { success: true };
  });
