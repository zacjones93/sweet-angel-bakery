/**
 * Delivery System Utilities
 *
 * Core business logic for Sweet Angel Bakery delivery system.
 * Implements delivery date calculations, fee calculations, and fulfillment logic
 * as per docs/delivery-system-prd.md
 *
 * CRITICAL: All date/time calculations use Mountain Time (America/Boise)
 */

import "server-only";

import { eq, and, inArray } from "drizzle-orm";
import type { DeliverySchedule, DeliveryZone, PickupLocation, ProductDeliveryRules, DeliveryCalendarClosure, Order } from "@/db/schema";
import {
  deliveryScheduleTable,
  deliveryZoneTable,
  pickupLocationTable,
  productDeliveryRulesTable,
  deliveryCalendarClosureTable,
  orderTable,
} from "@/db/schema";
import { getDB } from "@/db";
import {
  getCurrentMountainTime,
  getMountainDayOfWeek,
  getNextDayOfWeek,
  getWeekAfterNextDayOfWeek,
  isBeforeMountainCutoff,
  getDaysBetween,
  getMountainISODate,
  addDaysMountainTime,
  isClosureDate,
} from "./timezone";

// ============================================================================
// TYPES
// ============================================================================

export interface DeliveryDateResult {
  deliveryDate: Date;
  cutoffDate: Date;
  timeWindow: string;
  schedule: DeliverySchedule;
}

export interface PickupDateResult {
  pickupDate: Date;
  cutoffDate: Date;
  timeWindow: string;
}

export interface PickupLocationWithDate extends PickupLocation {
  nextPickupDate: Date;
  pickupTimeWindow: string;
  instructions: string | null;
}

export interface DeliveryFeeResult {
  feeAmount: number; // In cents
  appliedZone: DeliveryZone | null;
  breakdown: {
    zoneFee: number;
    adjustments: Array<{ reason: string; amount: number }>;
  };
}

export interface CartDeliveryDateResult {
  deliveryDate: Date;
  cutoffDate: Date;
  timeWindow: string;
  itemsGroupedByDate: Map<string, string[]>; // ISO date -> productIds
}

// ============================================================================
// DELIVERY DATE CALCULATION
// ============================================================================

/**
 * Get all active delivery schedules
 */
async function getActiveDeliverySchedules(): Promise<DeliverySchedule[]> {
  const db = await getDB();
  return db
    .select()
    .from(deliveryScheduleTable)
    .where(eq(deliveryScheduleTable.isActive, 1))
    .all();
}

/**
 * Get all active closure dates
 */
async function getActiveClosureDates(): Promise<string[]> {
  const db = await getDB();
  const closures = await db
    .select()
    .from(deliveryCalendarClosureTable)
    .where(eq(deliveryCalendarClosureTable.affectsDelivery, 1))
    .all();

  return closures.map((c) => c.closureDate);
}

/**
 * Get all available delivery date options for a product
 * Returns delivery dates for next week (simplified - no complex cutoff logic)
 * Useful for letting customers choose their preferred delivery date
 */
export async function getAvailableDeliveryDates({
  productId,
  orderDate = new Date(),
}: {
  productId?: string;
  orderDate?: Date;
}): Promise<DeliveryDateResult[]> {
  const db = await getDB();
  const now = getCurrentMountainTime();

  // Get active delivery schedules
  const schedules = await getActiveDeliverySchedules();
  if (schedules.length === 0) {
    return []; // No delivery schedules configured
  }

  // Get closure dates that affect delivery
  const closureDates = await getActiveClosureDates();

  // Get product-specific delivery rules if productId provided
  let productRules: ProductDeliveryRules | undefined;
  if (productId) {
    productRules = await db
      .select()
      .from(productDeliveryRulesTable)
      .where(eq(productDeliveryRulesTable.productId, productId))
      .get();
  }

  // Filter schedules based on product rules
  let validSchedules = schedules;
  if (productRules?.allowedDeliveryDays) {
    const allowedDays = JSON.parse(productRules.allowedDeliveryDays) as number[];
    validSchedules = schedules.filter((s) => allowedDays.includes(s.dayOfWeek));
  }

  if (validSchedules.length === 0) {
    return []; // No valid delivery days for this product
  }

  // Get all available delivery dates from all schedules
  const deliveryOptions: DeliveryDateResult[] = [];
  const currentDayOfWeek = getMountainDayOfWeek(now);

  for (const schedule of validSchedules) {
    // Check if we're before the cutoff for this schedule
    const beforeCutoff = isBeforeMountainCutoff({
      cutoffDay: schedule.cutoffDay,
      cutoffTime: schedule.cutoffTime,
    });

    // Get next occurrence of this delivery day
    let nextDeliveryDate = getNextDayOfWeek(schedule.dayOfWeek, now);

    // If we're AFTER the cutoff and the next occurrence is still this week, move to next week
    if (!beforeCutoff) {
      // If delivery day is later this week (hasn't passed yet), push to next week
      if (schedule.dayOfWeek > currentDayOfWeek) {
        nextDeliveryDate = addDaysMountainTime(nextDeliveryDate, 7);
      }
    }

    // Skip this date if it's a closure date (don't move forward - just omit it)
    if (isClosureDate(nextDeliveryDate, closureDates)) {
      continue;
    }

    // Calculate cutoff date for this delivery
    const cutoffDate = new Date(nextDeliveryDate);
    cutoffDate.setDate(cutoffDate.getDate() - getDaysBetween(new Date(0), nextDeliveryDate) + schedule.cutoffDay);
    const [cutoffHour, cutoffMinute] = schedule.cutoffTime.split(':').map(Number);
    cutoffDate.setHours(cutoffHour, cutoffMinute, 0, 0);

    deliveryOptions.push({
      deliveryDate: nextDeliveryDate,
      cutoffDate,
      timeWindow: schedule.deliveryTimeWindow || '',
      schedule,
    });
  }

  // Sort by delivery date
  return deliveryOptions.sort((a, b) => a.deliveryDate.getTime() - b.deliveryDate.getTime());
}

/**
 * Get all active pickup locations
 */
async function getActivePickupLocations(): Promise<PickupLocation[]> {
  const db = await getDB();
  return db
    .select()
    .from(pickupLocationTable)
    .where(eq(pickupLocationTable.isActive, 1))
    .all();
}

/**
 * Get all available pickup dates for a specific location
 * Returns pickup dates for next week (simplified - no complex cutoff logic)
 * Returns multiple pickup date options based on the location's configured pickup days
 */
export async function getAvailablePickupDates({
  pickupLocationId,
  productId,
  orderDate = new Date(),
  maxDates = 4, // Return up to 4 pickup date options
}: {
  pickupLocationId: string;
  productId?: string;
  orderDate?: Date;
  maxDates?: number;
}): Promise<PickupDateResult[]> {
  const db = await getDB();
  const now = getCurrentMountainTime();

  const location = await db
    .select()
    .from(pickupLocationTable)
    .where(and(eq(pickupLocationTable.id, pickupLocationId), eq(pickupLocationTable.isActive, 1)))
    .get();

  if (!location) {
    return [];
  }

  // Get product-specific delivery rules if productId provided
  let productRules: ProductDeliveryRules | undefined;
  if (productId) {
    productRules = await db
      .select()
      .from(productDeliveryRulesTable)
      .where(eq(productDeliveryRulesTable.productId, productId))
      .get();

    // Check if product allows pickup
    if (productRules?.allowPickup === 0) {
      return [];
    }
  }

  // Get closure dates that affect pickup
  const closures = await db
    .select()
    .from(deliveryCalendarClosureTable)
    .where(eq(deliveryCalendarClosureTable.affectsPickup, 1))
    .all();
  const closureDates = closures.map((c) => c.closureDate);

  // Parse pickup days
  const pickupDays = JSON.parse(location.pickupDays) as number[];

  const pickupOptions: PickupDateResult[] = [];
  const currentDayOfWeek = getMountainDayOfWeek(now);

  // Check if we're before cutoff (if location requires preorder)
  let beforeCutoff = true;
  if (location.requiresPreorder && location.cutoffDay !== null && location.cutoffTime) {
    beforeCutoff = isBeforeMountainCutoff({
      cutoffDay: location.cutoffDay,
      cutoffTime: location.cutoffTime,
    });
  }

  for (const day of pickupDays.sort()) {
    // Get next occurrence of this pickup day
    let pickupDate = getNextDayOfWeek(day, now);

    // If we're AFTER the cutoff and the next occurrence is still this week, move to next week
    if (!beforeCutoff) {
      // If pickup day is later this week (hasn't passed yet), push to next week
      if (day > currentDayOfWeek) {
        pickupDate = addDaysMountainTime(pickupDate, 7);
      }
    }

    // Skip this date if it's a closure date (don't move forward - just omit it)
    if (isClosureDate(pickupDate, closureDates)) {
      continue;
    }

    // Calculate cutoff date for this pickup
    let cutoffDate = pickupDate;
    if (location.requiresPreorder && location.cutoffDay !== null && location.cutoffTime) {
      cutoffDate = new Date(pickupDate);
      cutoffDate.setDate(cutoffDate.getDate() - getDaysBetween(new Date(0), pickupDate) + location.cutoffDay);
      const [cutoffHour, cutoffMinute] = location.cutoffTime.split(':').map(Number);
      cutoffDate.setHours(cutoffHour, cutoffMinute, 0, 0);
    }

    pickupOptions.push({
      pickupDate,
      cutoffDate,
      timeWindow: location.pickupTimeWindows,
    });

    if (pickupOptions.length >= maxDates) break;
  }

  // Sort by pickup date
  return pickupOptions.sort((a, b) => a.pickupDate.getTime() - b.pickupDate.getTime());
}

/**
 * Get the next available pickup date for a location
 */
export async function getNextPickupDate({
  pickupLocationId,
  productId,
  orderDate = new Date(),
}: {
  pickupLocationId: string;
  productId?: string;
  orderDate?: Date;
}): Promise<PickupDateResult | null> {
  const dates = await getAvailablePickupDates({
    pickupLocationId,
    productId,
    orderDate,
    maxDates: 1,
  });

  return dates.length > 0 ? dates[0] : null;
}

/**
 * Get available pickup locations for a product with next available dates
 */
export async function getAvailablePickupLocations({
  productId,
  orderDate = new Date(),
}: {
  productId?: string;
  orderDate?: Date;
}): Promise<PickupLocationWithDate[]> {
  const locations = await getActivePickupLocations();
  const results: PickupLocationWithDate[] = [];

  for (const location of locations) {
    const pickupDate = await getNextPickupDate({
      pickupLocationId: location.id,
      productId,
      orderDate,
    });

    if (pickupDate) {
      results.push({
        ...location,
        nextPickupDate: pickupDate.pickupDate,
        pickupTimeWindow: pickupDate.timeWindow,
      });
    }
  }

  return results;
}

// ============================================================================
// DELIVERY FEE CALCULATION
// ============================================================================

/**
 * Calculate delivery fee for an order based on ZIP code zone
 *
 * Algorithm:
 * 1. If fulfillment method is PICKUP → Fee = $0.00 (ALWAYS FREE)
 * 2. For DELIVERY:
 *    a. Lookup delivery zone by customer's ZIP code
 *    b. Start with zone-based fee ($5 local, $10 extended)
 *    c. Check if order meets free delivery threshold → Fee = $0
 *    d. Apply product category fee overrides (highest priority)
 *    e. Return final calculated fee
 */
export async function calculateDeliveryFee({
  cartItems,
  deliveryZipCode,
}: {
  cartItems: Array<{ productId: string; quantity: number; price: number }>;
  deliveryZipCode: string;
}): Promise<DeliveryFeeResult> {
  const db = await getDB();

  // Get all active delivery zones sorted by priority (highest first)
  const zones = await db
    .select()
    .from(deliveryZoneTable)
    .where(eq(deliveryZoneTable.isActive, 1))
    .all();

  zones.sort((a, b) => b.priority - a.priority);

  // Find matching zone by ZIP code
  let matchedZone: DeliveryZone | null = null;
  for (const zone of zones) {
    const zipCodes = JSON.parse(zone.zipCodes) as string[];
    if (zipCodes.includes(deliveryZipCode)) {
      matchedZone = zone;
      break; // Use highest priority match
    }
  }

  // If no zone matches, return 0 fee (or could return error)
  if (!matchedZone) {
    return {
      feeAmount: 0,
      appliedZone: null,
      breakdown: {
        zoneFee: 0,
        adjustments: [{ reason: 'ZIP code not in delivery zones', amount: 0 }],
      },
    };
  }

  // Start with zone-based fee
  const feeAmount = matchedZone.feeAmount;
  const adjustments: Array<{ reason: string; amount: number }> = [];

  // Check for free delivery thresholds (would be implemented with delivery fee rules)
  // For now, just return zone-based fee

  return {
    feeAmount,
    appliedZone: matchedZone,
    breakdown: {
      zoneFee: matchedZone.feeAmount,
      adjustments,
    },
  };
}

// ============================================================================
// ADMIN UTILITIES
// ============================================================================

/**
 * Get all orders grouped by delivery date and pickup location
 */
export async function getOrdersByFulfillment(): Promise<{
  deliveries: Map<string, Order[]>;
  pickups: Map<string, Map<string, Order[]>>;
}> {
  const db = await getDB();

  // Get all orders
  const query = db.select().from(orderTable);

  // Apply date filters if provided
  // Note: Would need to add proper date filtering logic

  const orders = await query.all();

  const deliveries = new Map<string, Order[]>();
  const pickups = new Map<string, Map<string, Order[]>>();

  for (const order of orders) {
    if (order.fulfillmentMethod === 'delivery' && order.deliveryDate) {
      if (!deliveries.has(order.deliveryDate)) {
        deliveries.set(order.deliveryDate, []);
      }
      deliveries.get(order.deliveryDate)!.push(order);
    } else if (order.fulfillmentMethod === 'pickup' && order.pickupDate && order.pickupLocationId) {
      if (!pickups.has(order.pickupDate)) {
        pickups.set(order.pickupDate, new Map());
      }
      const dateMap = pickups.get(order.pickupDate)!;
      if (!dateMap.has(order.pickupLocationId)) {
        dateMap.set(order.pickupLocationId, []);
      }
      dateMap.get(order.pickupLocationId)!.push(order);
    }
  }

  return { deliveries, pickups };
}
