"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import { getDB } from "@/db";
import { homeNotificationTable } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "@/utils/auth";

// List all home notifications
export const listHomeNotificationsAction = createServerAction()
  .handler(async () => {
    await requireAdmin();

    const db = getDB();
    const notifications = await db
      .select()
      .from(homeNotificationTable)
      .orderBy(desc(homeNotificationTable.displayOrder), desc(homeNotificationTable.createdAt));

    return notifications;
  });

// Create a home notification
export const createHomeNotificationAction = createServerAction()
  .input(
    z.object({
      title: z.string().min(1, "Title is required").max(255),
      message: z.string().min(1, "Message is required").max(2000),
      imageUrl: z.string().max(600).optional(),
      icon: z.string().max(10).default('ℹ️'),
      isActive: z.boolean().default(true),
      displayOrder: z.number().int().default(0),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    })
  )
  .handler(async ({ input }) => {
    await requireAdmin();

    const db = getDB();
    const [notification] = await db
      .insert(homeNotificationTable)
      .values({
        title: input.title,
        message: input.message,
        imageUrl: input.imageUrl,
        icon: input.icon,
        isActive: input.isActive ? 1 : 0,
        displayOrder: input.displayOrder,
        startDate: input.startDate,
        endDate: input.endDate,
      })
      .returning();

    return notification;
  });

// Update a home notification
export const updateHomeNotificationAction = createServerAction()
  .input(
    z.object({
      id: z.string(),
      title: z.string().min(1, "Title is required").max(255),
      message: z.string().min(1, "Message is required").max(2000),
      imageUrl: z.string().max(600).optional(),
      icon: z.string().max(10),
      isActive: z.boolean(),
      displayOrder: z.number().int(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    })
  )
  .handler(async ({ input }) => {
    await requireAdmin();

    const db = getDB();
    const [notification] = await db
      .update(homeNotificationTable)
      .set({
        title: input.title,
        message: input.message,
        imageUrl: input.imageUrl,
        icon: input.icon,
        isActive: input.isActive ? 1 : 0,
        displayOrder: input.displayOrder,
        startDate: input.startDate,
        endDate: input.endDate,
        updatedAt: new Date(),
      })
      .where(eq(homeNotificationTable.id, input.id))
      .returning();

    return notification;
  });

// Toggle active status
export const toggleHomeNotificationActiveAction = createServerAction()
  .input(
    z.object({
      id: z.string(),
      isActive: z.boolean(),
    })
  )
  .handler(async ({ input }) => {
    await requireAdmin();

    const db = getDB();
    const [notification] = await db
      .update(homeNotificationTable)
      .set({
        isActive: input.isActive ? 1 : 0,
        updatedAt: new Date(),
      })
      .where(eq(homeNotificationTable.id, input.id))
      .returning();

    return notification;
  });

// Delete a home notification
export const deleteHomeNotificationAction = createServerAction()
  .input(
    z.object({
      id: z.string(),
    })
  )
  .handler(async ({ input }) => {
    await requireAdmin();

    const db = getDB();
    await db
      .delete(homeNotificationTable)
      .where(eq(homeNotificationTable.id, input.id));

    return { success: true };
  });
