"use server";

import { createServerAction } from "zsa";
import { getDB } from "@/db";
import { homeNotificationTable, salesBannerTable } from "@/db/schema";
import { and, eq, or, lte, gte, isNull, desc } from "drizzle-orm";

// Get active home notification for display on homepage
export const getActiveHomeNotificationAction = createServerAction()
  .handler(async () => {
    const db = getDB();
    const now = new Date();

    // Get the highest priority active notification that is within its date range (if specified)
    const [notification] = await db
      .select()
      .from(homeNotificationTable)
      .where(
        and(
          eq(homeNotificationTable.isActive, 1),
          // Check start date: either null or in the past
          or(
            isNull(homeNotificationTable.startDate),
            lte(homeNotificationTable.startDate, now)
          ),
          // Check end date: either null or in the future
          or(
            isNull(homeNotificationTable.endDate),
            gte(homeNotificationTable.endDate, now)
          )
        )
      )
      .orderBy(desc(homeNotificationTable.displayOrder), desc(homeNotificationTable.createdAt))
      .limit(1);

    return notification || null;
  });

// Get active sales banner for display
export const getActiveSalesBannerAction = createServerAction()
  .handler(async () => {
    const db = getDB();
    const now = new Date();

    // Get the most recent active banner that hasn't expired yet
    const [banner] = await db
      .select()
      .from(salesBannerTable)
      .where(
        and(
          eq(salesBannerTable.isActive, 1),
          gte(salesBannerTable.endDateTime, now) // Countdown hasn't ended yet
        )
      )
      .orderBy(desc(salesBannerTable.createdAt))
      .limit(1);

    return banner || null;
  });
