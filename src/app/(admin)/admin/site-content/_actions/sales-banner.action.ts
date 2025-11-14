"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import { getDB } from "@/db";
import { salesBannerTable } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "@/utils/auth";

// Get the most recent sales banner
export const getSalesBannerAction = createServerAction()
  .handler(async () => {
    await requireAdmin();

    const db = getDB();
    const [banner] = await db
      .select()
      .from(salesBannerTable)
      .orderBy(desc(salesBannerTable.createdAt))
      .limit(1);

    return banner || null;
  });

// Create or update sales banner (upsert approach)
export const upsertSalesBannerAction = createServerAction()
  .input(
    z.object({
      id: z.string().optional(), // If provided, update; otherwise create
      message: z.string().min(1, "Message is required").max(500),
      backgroundColor: z.string().max(50).default("#FCACC5"), // bakery-pink
      textColor: z.string().max(50).default("#ffffff"),
      endDateTime: z.date(),
      isActive: z.boolean().default(true),
      isDismissible: z.boolean().default(true),
      ctaText: z.string().max(100).optional(),
      ctaLink: z.string().max(500).optional(),
    })
  )
  .handler(async ({ input }) => {
    await requireAdmin();

    const db = getDB();

    // If ID provided, update existing banner
    if (input.id) {
      const [banner] = await db
        .update(salesBannerTable)
        .set({
          message: input.message,
          backgroundColor: input.backgroundColor,
          textColor: input.textColor,
          endDateTime: input.endDateTime,
          isActive: input.isActive ? 1 : 0,
          isDismissible: input.isDismissible ? 1 : 0,
          ctaText: input.ctaText,
          ctaLink: input.ctaLink,
          updatedAt: new Date(),
        })
        .where(eq(salesBannerTable.id, input.id))
        .returning();

      return banner;
    }

    // Otherwise, create new banner
    const [banner] = await db
      .insert(salesBannerTable)
      .values({
        message: input.message,
        backgroundColor: input.backgroundColor,
        textColor: input.textColor,
        endDateTime: input.endDateTime,
        isActive: input.isActive ? 1 : 0,
        isDismissible: input.isDismissible ? 1 : 0,
        ctaText: input.ctaText,
        ctaLink: input.ctaLink,
      })
      .returning();

    return banner;
  });

// Toggle active status
export const toggleSalesBannerActiveAction = createServerAction()
  .input(
    z.object({
      id: z.string(),
      isActive: z.boolean(),
    })
  )
  .handler(async ({ input }) => {
    await requireAdmin();

    const db = getDB();
    const [banner] = await db
      .update(salesBannerTable)
      .set({
        isActive: input.isActive ? 1 : 0,
        updatedAt: new Date(),
      })
      .where(eq(salesBannerTable.id, input.id))
      .returning();

    return banner;
  });

// Delete a sales banner
export const deleteSalesBannerAction = createServerAction()
  .input(
    z.object({
      id: z.string(),
    })
  )
  .handler(async ({ input }) => {
    await requireAdmin();

    const db = getDB();
    await db
      .delete(salesBannerTable)
      .where(eq(salesBannerTable.id, input.id));

    return { success: true };
  });
