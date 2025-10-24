"use server";

import { getDB } from "@/db";
import { deliveryScheduleTable, ROLES_ENUM } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { createServerAction } from "zsa";
import { getSessionFromCookie } from "@/utils/auth";

// Schema for creating/updating delivery schedule
const deliveryScheduleSchema = z.object({
  name: z.string().min(1).max(255), // e.g., "Thursday Delivery", "Saturday Delivery"
  dayOfWeek: z.number().min(0).max(6), // 0=Sunday, 6=Saturday
  cutoffDay: z.number().min(0).max(6),
  cutoffTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/), // HH:MM format
  leadTimeDays: z.number().min(0).default(2),
  deliveryTimeWindow: z.string().optional(),
  isActive: z.boolean().default(true),
});

const updateDeliveryScheduleSchema = deliveryScheduleSchema.extend({
  id: z.string(),
});

/**
 * Get all delivery schedules
 */
export const getDeliverySchedulesAction = createServerAction()
  .handler(async () => {
    const session = await getSessionFromCookie();

    if (!session?.user || session.user.role !== ROLES_ENUM.ADMIN) {
      throw new Error("Unauthorized");
    }

    const db = getDB();

    const schedules = await db
      .select()
      .from(deliveryScheduleTable)
      .orderBy(deliveryScheduleTable.dayOfWeek);

    return schedules;
  });

/**
 * Get a single delivery schedule by ID
 */
export const getDeliveryScheduleByIdAction = createServerAction()
  .input(z.string())
  .handler(async ({ input: id }) => {
    const session = await getSessionFromCookie();

    if (!session?.user || session.user.role !== ROLES_ENUM.ADMIN) {
      throw new Error("Unauthorized");
    }

    const db = getDB();

    const [schedule] = await db
      .select()
      .from(deliveryScheduleTable)
      .where(eq(deliveryScheduleTable.id, id))
      .limit(1);

    if (!schedule) {
      throw new Error("Delivery schedule not found");
    }

    return schedule;
  });

/**
 * Create a new delivery schedule
 */
export const createDeliveryScheduleAction = createServerAction()
  .input(deliveryScheduleSchema)
  .handler(async ({ input }) => {
    const session = await getSessionFromCookie();

    if (!session?.user || session.user.role !== ROLES_ENUM.ADMIN) {
      throw new Error("Unauthorized");
    }

    const db = getDB();

    const [newSchedule] = await db
      .insert(deliveryScheduleTable)
      .values({
        name: input.name,
        dayOfWeek: input.dayOfWeek,
        cutoffDay: input.cutoffDay,
        cutoffTime: input.cutoffTime,
        leadTimeDays: input.leadTimeDays,
        deliveryTimeWindow: input.deliveryTimeWindow || null,
        isActive: input.isActive ? 1 : 0,
      })
      .returning();

    return newSchedule;
  });

/**
 * Update an existing delivery schedule
 */
export const updateDeliveryScheduleAction = createServerAction()
  .input(updateDeliveryScheduleSchema)
  .handler(async ({ input }) => {
    const session = await getSessionFromCookie();

    if (!session?.user || session.user.role !== ROLES_ENUM.ADMIN) {
      throw new Error("Unauthorized");
    }

    const db = getDB();

    // Verify schedule exists
    const [existingSchedule] = await db
      .select()
      .from(deliveryScheduleTable)
      .where(eq(deliveryScheduleTable.id, input.id))
      .limit(1);

    if (!existingSchedule) {
      throw new Error("Delivery schedule not found");
    }

    // Update the schedule
    const [updatedSchedule] = await db
      .update(deliveryScheduleTable)
      .set({
        name: input.name,
        dayOfWeek: input.dayOfWeek,
        cutoffDay: input.cutoffDay,
        cutoffTime: input.cutoffTime,
        leadTimeDays: input.leadTimeDays,
        deliveryTimeWindow: input.deliveryTimeWindow || null,
        isActive: input.isActive ? 1 : 0,
      })
      .where(eq(deliveryScheduleTable.id, input.id))
      .returning();

    return updatedSchedule;
  });

/**
 * Delete a delivery schedule
 */
export const deleteDeliveryScheduleAction = createServerAction()
  .input(z.string())
  .handler(async ({ input: id }) => {
    const session = await getSessionFromCookie();

    if (!session?.user || session.user.role !== ROLES_ENUM.ADMIN) {
      throw new Error("Unauthorized");
    }

    const db = getDB();

    // Verify schedule exists
    const [existingSchedule] = await db
      .select()
      .from(deliveryScheduleTable)
      .where(eq(deliveryScheduleTable.id, id))
      .limit(1);

    if (!existingSchedule) {
      throw new Error("Delivery schedule not found");
    }

    // Delete the schedule
    await db
      .delete(deliveryScheduleTable)
      .where(eq(deliveryScheduleTable.id, id));

    return { success: true };
  });

/**
 * Toggle delivery schedule active status
 */
export const toggleDeliveryScheduleAction = createServerAction()
  .input(z.object({
    id: z.string(),
    isActive: z.boolean(),
  }))
  .handler(async ({ input }) => {
    const session = await getSessionFromCookie();

    if (!session?.user || session.user.role !== ROLES_ENUM.ADMIN) {
      throw new Error("Unauthorized");
    }

    const db = getDB();

    // Verify schedule exists
    const [existingSchedule] = await db
      .select()
      .from(deliveryScheduleTable)
      .where(eq(deliveryScheduleTable.id, input.id))
      .limit(1);

    if (!existingSchedule) {
      throw new Error("Delivery schedule not found");
    }

    // Toggle active status
    const [updatedSchedule] = await db
      .update(deliveryScheduleTable)
      .set({
        isActive: input.isActive ? 1 : 0,
      })
      .where(eq(deliveryScheduleTable.id, input.id))
      .returning();

    return updatedSchedule;
  });
