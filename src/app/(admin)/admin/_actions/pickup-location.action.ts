"use server";

import { getDB } from "@/db";
import { pickupLocationTable, ROLES_ENUM } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createServerAction } from "zsa";
import { getSessionFromCookie } from "@/utils/auth";

// Schema for address (stored as JSON)
const addressSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
});

// Schema for creating/updating pickup location
const pickupLocationSchema = z.object({
  name: z.string().min(1).max(255),
  address: addressSchema,
  pickupDays: z.array(z.number().min(0).max(6)), // Array of day numbers 0-6
  pickupTimeWindows: z.string().min(1).max(255),
  instructions: z.string().max(1000).optional(),
  isActive: z.boolean().default(true),
  requiresPreorder: z.boolean().default(false),
  cutoffDay: z.number().min(0).max(6).optional(),
  cutoffTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(), // HH:MM format
  leadTimeDays: z.number().min(0).default(0),
});

const updatePickupLocationSchema = pickupLocationSchema.extend({
  id: z.string(),
});

/**
 * Get all pickup locations
 */
export const getPickupLocationsAction = createServerAction()
  .handler(async () => {
    const session = await getSessionFromCookie();

    if (!session?.user || session.user.role !== ROLES_ENUM.ADMIN) {
      throw new Error("Unauthorized");
    }

    const db = getDB();

    const locations = await db
      .select()
      .from(pickupLocationTable)
      .orderBy(pickupLocationTable.name);

    // Parse JSON fields
    return locations.map(loc => ({
      ...loc,
      address: JSON.parse(loc.address),
      pickupDays: JSON.parse(loc.pickupDays),
    }));
  });

/**
 * Get a single pickup location by ID
 */
export const getPickupLocationByIdAction = createServerAction()
  .input(z.string())
  .handler(async ({ input: id }) => {
    const session = await getSessionFromCookie();

    if (!session?.user || session.user.role !== ROLES_ENUM.ADMIN) {
      throw new Error("Unauthorized");
    }

    const db = getDB();

    const [location] = await db
      .select()
      .from(pickupLocationTable)
      .where(eq(pickupLocationTable.id, id))
      .limit(1);

    if (!location) {
      throw new Error("Pickup location not found");
    }

    // Parse JSON fields
    return {
      ...location,
      address: JSON.parse(location.address),
      pickupDays: JSON.parse(location.pickupDays),
    };
  });

/**
 * Create a new pickup location
 */
export const createPickupLocationAction = createServerAction()
  .input(pickupLocationSchema)
  .handler(async ({ input }) => {
    const session = await getSessionFromCookie();

    if (!session?.user || session.user.role !== ROLES_ENUM.ADMIN) {
      throw new Error("Unauthorized");
    }

    const db = getDB();

    const [newLocation] = await db
      .insert(pickupLocationTable)
      .values({
        name: input.name,
        address: JSON.stringify(input.address),
        pickupDays: JSON.stringify(input.pickupDays),
        pickupTimeWindows: input.pickupTimeWindows,
        instructions: input.instructions || null,
        isActive: input.isActive ? 1 : 0,
        requiresPreorder: input.requiresPreorder ? 1 : 0,
        cutoffDay: input.cutoffDay ?? null,
        cutoffTime: input.cutoffTime || null,
        leadTimeDays: input.leadTimeDays,
      })
      .returning();

    // Parse JSON fields for response
    return {
      ...newLocation,
      address: JSON.parse(newLocation.address),
      pickupDays: JSON.parse(newLocation.pickupDays),
    };
  });

/**
 * Update an existing pickup location
 */
export const updatePickupLocationAction = createServerAction()
  .input(updatePickupLocationSchema)
  .handler(async ({ input }) => {
    const session = await getSessionFromCookie();

    if (!session?.user || session.user.role !== ROLES_ENUM.ADMIN) {
      throw new Error("Unauthorized");
    }

    const db = getDB();

    // Verify location exists
    const [existingLocation] = await db
      .select()
      .from(pickupLocationTable)
      .where(eq(pickupLocationTable.id, input.id))
      .limit(1);

    if (!existingLocation) {
      throw new Error("Pickup location not found");
    }

    // Update the location
    const [updatedLocation] = await db
      .update(pickupLocationTable)
      .set({
        name: input.name,
        address: JSON.stringify(input.address),
        pickupDays: JSON.stringify(input.pickupDays),
        pickupTimeWindows: input.pickupTimeWindows,
        instructions: input.instructions || null,
        isActive: input.isActive ? 1 : 0,
        requiresPreorder: input.requiresPreorder ? 1 : 0,
        cutoffDay: input.cutoffDay ?? null,
        cutoffTime: input.cutoffTime || null,
        leadTimeDays: input.leadTimeDays,
      })
      .where(eq(pickupLocationTable.id, input.id))
      .returning();

    // Parse JSON fields for response
    return {
      ...updatedLocation,
      address: JSON.parse(updatedLocation.address),
      pickupDays: JSON.parse(updatedLocation.pickupDays),
    };
  });

/**
 * Delete a pickup location
 */
export const deletePickupLocationAction = createServerAction()
  .input(z.string())
  .handler(async ({ input: id }) => {
    const session = await getSessionFromCookie();

    if (!session?.user || session.user.role !== ROLES_ENUM.ADMIN) {
      throw new Error("Unauthorized");
    }

    const db = getDB();

    // Verify location exists
    const [existingLocation] = await db
      .select()
      .from(pickupLocationTable)
      .where(eq(pickupLocationTable.id, id))
      .limit(1);

    if (!existingLocation) {
      throw new Error("Pickup location not found");
    }

    // Delete the location
    await db
      .delete(pickupLocationTable)
      .where(eq(pickupLocationTable.id, id));

    return { success: true };
  });

/**
 * Toggle pickup location active status
 */
export const togglePickupLocationAction = createServerAction()
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

    // Verify location exists
    const [existingLocation] = await db
      .select()
      .from(pickupLocationTable)
      .where(eq(pickupLocationTable.id, input.id))
      .limit(1);

    if (!existingLocation) {
      throw new Error("Pickup location not found");
    }

    // Toggle active status
    const [updatedLocation] = await db
      .update(pickupLocationTable)
      .set({
        isActive: input.isActive ? 1 : 0,
      })
      .where(eq(pickupLocationTable.id, input.id))
      .returning();

    // Parse JSON fields for response
    return {
      ...updatedLocation,
      address: JSON.parse(updatedLocation.address),
      pickupDays: JSON.parse(updatedLocation.pickupDays),
    };
  });
