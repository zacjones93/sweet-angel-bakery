"use server";

import { getDB } from "@/db";
import { deliveryZoneTable, ROLES_ENUM } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { createServerAction } from "zsa";
import { getSessionFromCookie } from "@/utils/auth";

// Schema for creating/updating delivery zone
const deliveryZoneSchema = z.object({
  name: z.string().min(1).max(255), // e.g., "Local Boise", "Extended Treasure Valley"
  zipCodes: z.array(z.string()).min(1), // Array of ZIP codes
  feeAmount: z.number().min(0), // In cents (e.g., 500 = $5.00)
  isActive: z.boolean().default(true),
  priority: z.number().default(0), // Higher priority overrides lower
});

const updateDeliveryZoneSchema = deliveryZoneSchema.extend({
  id: z.string(),
});

/**
 * Get all delivery zones
 */
export const getDeliveryZonesAction = createServerAction()
  .handler(async () => {
    const session = await getSessionFromCookie();

    if (!session?.user || session.user.role !== ROLES_ENUM.ADMIN) {
      throw new Error("Unauthorized");
    }

    const db = getDB();

    const zones = await db
      .select()
      .from(deliveryZoneTable)
      .orderBy(desc(deliveryZoneTable.priority), deliveryZoneTable.name);

    // Parse JSON fields
    return zones.map(zone => ({
      ...zone,
      zipCodes: JSON.parse(zone.zipCodes),
    }));
  });

/**
 * Get a single delivery zone by ID
 */
export const getDeliveryZoneByIdAction = createServerAction()
  .input(z.string())
  .handler(async ({ input: id }) => {
    const session = await getSessionFromCookie();

    if (!session?.user || session.user.role !== ROLES_ENUM.ADMIN) {
      throw new Error("Unauthorized");
    }

    const db = getDB();

    const [zone] = await db
      .select()
      .from(deliveryZoneTable)
      .where(eq(deliveryZoneTable.id, id))
      .limit(1);

    if (!zone) {
      throw new Error("Delivery zone not found");
    }

    // Parse JSON fields
    return {
      ...zone,
      zipCodes: JSON.parse(zone.zipCodes),
    };
  });

/**
 * Create a new delivery zone
 */
export const createDeliveryZoneAction = createServerAction()
  .input(deliveryZoneSchema)
  .handler(async ({ input }) => {
    const session = await getSessionFromCookie();

    if (!session?.user || session.user.role !== ROLES_ENUM.ADMIN) {
      throw new Error("Unauthorized");
    }

    const db = getDB();

    const [newZone] = await db
      .insert(deliveryZoneTable)
      .values({
        name: input.name,
        zipCodes: JSON.stringify(input.zipCodes),
        feeAmount: input.feeAmount,
        isActive: input.isActive ? 1 : 0,
        priority: input.priority,
      })
      .returning();

    // Parse JSON fields for response
    return {
      ...newZone,
      zipCodes: JSON.parse(newZone.zipCodes),
    };
  });

/**
 * Update an existing delivery zone
 */
export const updateDeliveryZoneAction = createServerAction()
  .input(updateDeliveryZoneSchema)
  .handler(async ({ input }) => {
    const session = await getSessionFromCookie();

    if (!session?.user || session.user.role !== ROLES_ENUM.ADMIN) {
      throw new Error("Unauthorized");
    }

    const db = getDB();

    // Verify zone exists
    const [existingZone] = await db
      .select()
      .from(deliveryZoneTable)
      .where(eq(deliveryZoneTable.id, input.id))
      .limit(1);

    if (!existingZone) {
      throw new Error("Delivery zone not found");
    }

    // Update the zone
    const [updatedZone] = await db
      .update(deliveryZoneTable)
      .set({
        name: input.name,
        zipCodes: JSON.stringify(input.zipCodes),
        feeAmount: input.feeAmount,
        isActive: input.isActive ? 1 : 0,
        priority: input.priority,
      })
      .where(eq(deliveryZoneTable.id, input.id))
      .returning();

    // Parse JSON fields for response
    return {
      ...updatedZone,
      zipCodes: JSON.parse(updatedZone.zipCodes),
    };
  });

/**
 * Delete a delivery zone
 */
export const deleteDeliveryZoneAction = createServerAction()
  .input(z.string())
  .handler(async ({ input: id }) => {
    const session = await getSessionFromCookie();

    if (!session?.user || session.user.role !== ROLES_ENUM.ADMIN) {
      throw new Error("Unauthorized");
    }

    const db = getDB();

    // Verify zone exists
    const [existingZone] = await db
      .select()
      .from(deliveryZoneTable)
      .where(eq(deliveryZoneTable.id, id))
      .limit(1);

    if (!existingZone) {
      throw new Error("Delivery zone not found");
    }

    // Delete the zone
    await db
      .delete(deliveryZoneTable)
      .where(eq(deliveryZoneTable.id, id));

    return { success: true };
  });

/**
 * Toggle delivery zone active status
 */
export const toggleDeliveryZoneAction = createServerAction()
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

    // Verify zone exists
    const [existingZone] = await db
      .select()
      .from(deliveryZoneTable)
      .where(eq(deliveryZoneTable.id, input.id))
      .limit(1);

    if (!existingZone) {
      throw new Error("Delivery zone not found");
    }

    // Toggle active status
    const [updatedZone] = await db
      .update(deliveryZoneTable)
      .set({
        isActive: input.isActive ? 1 : 0,
      })
      .where(eq(deliveryZoneTable.id, input.id))
      .returning();

    // Parse JSON fields for response
    return {
      ...updatedZone,
      zipCodes: JSON.parse(updatedZone.zipCodes),
    };
  });

/**
 * Lookup delivery zone by ZIP code
 */
export const lookupDeliveryZoneAction = createServerAction()
  .input(z.string())
  .handler(async ({ input: zipCode }) => {
    const session = await getSessionFromCookie();

    if (!session?.user || session.user.role !== ROLES_ENUM.ADMIN) {
      throw new Error("Unauthorized");
    }

    const db = getDB();

    // Get all active zones
    const zones = await db
      .select()
      .from(deliveryZoneTable)
      .where(eq(deliveryZoneTable.isActive, 1))
      .orderBy(desc(deliveryZoneTable.priority));

    // Find matching zone
    for (const zone of zones) {
      const zipCodes = JSON.parse(zone.zipCodes);
      if (zipCodes.includes(zipCode)) {
        return {
          ...zone,
          zipCodes,
        };
      }
    }

    return null;
  });
