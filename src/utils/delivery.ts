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
 * Calculate next available delivery date for a product
 *
 * Algorithm (all times in Mountain Time - America/Boise):
 * 1. Get current date/time in MT
 * 2. Check if before Tuesday 11:59 PM MT cutoff
 * 3. If before cutoff: Next fulfillment options are this week's Thursday & Saturday
 * 4. If after cutoff: Next fulfillment options are following week's Thursday & Saturday
 * 5. Apply product-specific lead time requirements
 * 6. Skip closure dates
 * 7. Return earliest valid delivery date
 */
export async function getNextDeliveryDate({
  productId,
  orderDate = new Date(),
}: {
  productId?: string;
  orderDate?: Date;
}): Promise<DeliveryDateResult | null> {
  const db = await getDB();
  const now = getCurrentMountainTime();

  // Get active delivery schedules
  const schedules = await getActiveDeliverySchedules();
  if (schedules.length === 0) {
    return null; // No delivery schedules configured
  }

  // Get closure dates
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
    return null; // No valid delivery days for this product
  }

  // Check each schedule and find earliest valid delivery date
  let earliestDelivery: DeliveryDateResult | null = null;

  for (const schedule of validSchedules) {
    // Check if we're before the cutoff for this schedule
    const beforeCutoff = isBeforeMountainCutoff({
      cutoffDay: schedule.cutoffDay,
      cutoffTime: schedule.cutoffTime,
    });

    // Get next occurrence of this delivery day
    let nextDeliveryDate: Date;
    if (beforeCutoff) {
      // This week's delivery
      nextDeliveryDate = getNextDayOfWeek(schedule.dayOfWeek, now);
    } else {
      // Following week's delivery
      nextDeliveryDate = getWeekAfterNextDayOfWeek(schedule.dayOfWeek, now);
    }

    // Apply lead time requirement
    const leadTime = productRules?.minimumLeadTimeDays ?? schedule.leadTimeDays;
    const minDeliveryDate = addDaysMountainTime(now, leadTime);

    // If next delivery date is too soon, move to following week
    if (nextDeliveryDate < minDeliveryDate) {
      nextDeliveryDate = addDaysMountainTime(nextDeliveryDate, 7);
    }

    // Skip closure dates
    while (isClosureDate(nextDeliveryDate, closureDates)) {
      nextDeliveryDate = addDaysMountainTime(nextDeliveryDate, 7);
    }

    // Calculate cutoff date for this delivery
    const cutoffDate = new Date(nextDeliveryDate);
    cutoffDate.setDate(cutoffDate.getDate() - getDaysBetween(new Date(0), nextDeliveryDate) + schedule.cutoffDay);
    const [cutoffHour, cutoffMinute] = schedule.cutoffTime.split(':').map(Number);
    cutoffDate.setHours(cutoffHour, cutoffMinute, 0, 0);

    const result: DeliveryDateResult = {
      deliveryDate: nextDeliveryDate,
      cutoffDate,
      timeWindow: schedule.deliveryTimeWindow || '',
      schedule,
    };

    // Keep earliest delivery date
    if (!earliestDelivery || nextDeliveryDate < earliestDelivery.deliveryDate) {
      earliestDelivery = result;
    }
  }

  return earliestDelivery;
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
 * Calculate pickup date for a specific location
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
  const db = await getDB();
  const now = getCurrentMountainTime();

  const location = await db
    .select()
    .from(pickupLocationTable)
    .where(and(eq(pickupLocationTable.id, pickupLocationId), eq(pickupLocationTable.isActive, 1)))
    .get();

  if (!location) {
    return null;
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
      return null;
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

  // Check if we're before cutoff (if location requires preorder)
  let beforeCutoff = true;
  if (location.requiresPreorder && location.cutoffDay !== null && location.cutoffTime) {
    beforeCutoff = isBeforeMountainCutoff({
      cutoffDay: location.cutoffDay,
      cutoffTime: location.cutoffTime,
    });
  }

  // Find next available pickup day
  let nextPickupDate: Date | null = null;
  const currentDay = getMountainDayOfWeek(now);

  // Try each pickup day in order
  for (const day of pickupDays.sort()) {
    let candidateDate: Date;

    if (beforeCutoff && day > currentDay) {
      // This week
      candidateDate = getNextDayOfWeek(day, now);
    } else if (beforeCutoff && day === currentDay) {
      // Today if before cutoff and same day
      candidateDate = now;
    } else {
      // Following week
      candidateDate = getWeekAfterNextDayOfWeek(day, now);
    }

    // Apply lead time
    const leadTime = productRules?.minimumLeadTimeDays ?? location.leadTimeDays;
    const minPickupDate = addDaysMountainTime(now, leadTime);

    if (candidateDate < minPickupDate) {
      candidateDate = addDaysMountainTime(candidateDate, 7);
    }

    // Skip closure dates
    while (isClosureDate(candidateDate, closureDates)) {
      candidateDate = addDaysMountainTime(candidateDate, 7);
    }

    // Keep earliest date
    if (!nextPickupDate || candidateDate < nextPickupDate) {
      nextPickupDate = candidateDate;
    }
  }

  if (!nextPickupDate) {
    return null;
  }

  // Calculate cutoff date
  let cutoffDate = nextPickupDate;
  if (location.requiresPreorder && location.cutoffDay !== null && location.cutoffTime) {
    cutoffDate = new Date(nextPickupDate);
    cutoffDate.setDate(cutoffDate.getDate() - getDaysBetween(new Date(0), nextPickupDate) + location.cutoffDay);
    const [cutoffHour, cutoffMinute] = location.cutoffTime.split(':').map(Number);
    cutoffDate.setHours(cutoffHour, cutoffMinute, 0, 0);
  }

  return {
    pickupDate: nextPickupDate,
    cutoffDate,
    timeWindow: location.pickupTimeWindows,
  };
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

/**
 * Calculate delivery date for entire cart (returns latest delivery date if products have different requirements)
 */
export async function getCartDeliveryDate({
  items,
  orderDate = new Date(),
}: {
  items: Array<{ productId: string; quantity: number }>;
  orderDate?: Date;
}): Promise<CartDeliveryDateResult | null> {
  let latestDelivery: DeliveryDateResult | null = null;
  const itemsByDate = new Map<string, string[]>();

  for (const item of items) {
    const delivery = await getNextDeliveryDate({
      productId: item.productId,
      orderDate,
    });

    if (!delivery) {
      continue; // Skip if no delivery available for this product
    }

    const dateISO = getMountainISODate(delivery.deliveryDate);

    // Track which products need which delivery dates
    if (!itemsByDate.has(dateISO)) {
      itemsByDate.set(dateISO, []);
    }
    itemsByDate.get(dateISO)!.push(item.productId);

    // Keep latest delivery date (most restrictive)
    if (!latestDelivery || delivery.deliveryDate > latestDelivery.deliveryDate) {
      latestDelivery = delivery;
    }
  }

  if (!latestDelivery) {
    return null;
  }

  return {
    deliveryDate: latestDelivery.deliveryDate,
    cutoffDate: latestDelivery.cutoffDate,
    timeWindow: latestDelivery.timeWindow,
    itemsGroupedByDate: itemsByDate,
  };
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
// VALIDATION
// ============================================================================

/**
 * Validate if order can still make delivery cutoff
 */
export async function validateDeliveryCutoff({
  deliveryDate,
  orderDate = new Date(),
}: {
  deliveryDate: Date;
  orderDate?: Date;
}): Promise<{
  isValid: boolean;
  reason?: string;
}> {
  const schedules = await getActiveDeliverySchedules();
  const dayOfWeek = getMountainDayOfWeek(deliveryDate);

  const schedule = schedules.find((s) => s.dayOfWeek === dayOfWeek);
  if (!schedule) {
    return {
      isValid: false,
      reason: 'No delivery schedule for this day',
    };
  }

  const leadTimeDays = getDaysBetween(orderDate, deliveryDate);
  if (leadTimeDays < schedule.leadTimeDays) {
    return {
      isValid: false,
      reason: `Minimum ${schedule.leadTimeDays} days lead time required`,
    };
  }

  return { isValid: true };
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
