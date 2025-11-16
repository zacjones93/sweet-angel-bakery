"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import {
  getAvailablePickupLocations,
  calculateDeliveryFee,
  getAvailableDeliveryDates,
  getAvailablePickupDates,
} from "@/utils/delivery";
import { getMountainISODate } from "@/utils/timezone";

/**
 * Get delivery options for a cart
 * Returns all available delivery dates (e.g., Thursday and Saturday) and fee for a given ZIP code
 */
export const getCartDeliveryOptionsAction = createServerAction()
  .input(
    z.object({
      items: z.array(
        z.object({
          productId: z.string(),
          quantity: z.number(),
          price: z.number(),
        })
      ),
      deliveryZipCode: z.string().optional(),
    })
  )
  .handler(async ({ input }) => {
    const { items, deliveryZipCode } = input;

    console.log('[getCartDeliveryOptions] Input:', { itemsCount: items.length, deliveryZipCode });

    // Get all available delivery dates for the cart
    // For carts with multiple products, we need to find dates that work for all products
    // Start by getting dates for the first product (with most restrictive rules)
    const firstProductId = items[0]?.productId;

    const deliveryDateOptions = await getAvailableDeliveryDates({
      productId: firstProductId
    });

    console.log('[getCartDeliveryOptions] Delivery date options:', deliveryDateOptions.length);

    if (deliveryDateOptions.length === 0) {
      console.log('[getCartDeliveryOptions] No delivery dates available');
      return {
        available: false,
        deliveryDates: [],
        feeAmount: 0,
        zoneName: null,
        zoneId: null,
      };
    }

    // Calculate delivery fee if ZIP code provided
    let feeAmount = 0;
    let zoneName: string | null = null;
    let zoneId: string | null = null;

    if (deliveryZipCode) {
      const feeResult = await calculateDeliveryFee({
        cartItems: items,
        deliveryZipCode,
      });

      // If no zone matches the ZIP code, delivery is not available
      if (!feeResult.appliedZone) {
        return {
          available: false,
          deliveryDates: [],
          feeAmount: 0,
          zoneName: null,
          zoneId: null,
        };
      }

      feeAmount = feeResult.feeAmount;
      zoneName = feeResult.appliedZone.name;
      zoneId = feeResult.appliedZone.id;
    }

    return {
      available: true,
      deliveryDates: deliveryDateOptions.map(option => ({
        // Return ISO date strings in Mountain Time (YYYY-MM-DD)
        deliveryDate: getMountainISODate(option.deliveryDate),
        cutoffDate: option.cutoffDate.toISOString(),
        timeWindow: option.timeWindow,
        dayOfWeek: option.schedule.dayOfWeek,
        scheduleName: option.schedule.name,
      })),
      feeAmount,
      zoneName,
      zoneId,
    };
  });

/**
 * Get pickup options for a cart
 * Returns all available pickup locations with multiple available pickup dates
 */
export const getCartPickupOptionsAction = createServerAction()
  .input(
    z.object({
      items: z.array(
        z.object({
          productId: z.string(),
          quantity: z.number(),
        })
      ),
    })
  )
  .handler(async ({ input }) => {
    const { items } = input;

    // Get available pickup locations (we'll use the first product's ID for simplicity)
    const firstProductId = items[0]?.productId;

    const locations = await getAvailablePickupLocations({
      productId: firstProductId,
    });

    // For each location, get all available pickup dates
    const locationsWithDates = await Promise.all(
      locations.map(async (loc) => {
        const pickupDates = await getAvailablePickupDates({
          pickupLocationId: loc.id,
          productId: firstProductId,
          maxDates: 4, // Show up to 4 pickup date options
        });

        return {
          id: loc.id,
          name: loc.name,
          address: JSON.parse(loc.address),
          instructions: loc.instructions,
          pickupDates: pickupDates.map((date) => ({
            // Return ISO date strings in Mountain Time (YYYY-MM-DD)
            pickupDate: getMountainISODate(date.pickupDate),
            cutoffDate: date.cutoffDate.toISOString(),
            pickupTimeWindow: date.timeWindow,
          })),
        };
      })
    );

    return {
      available: locationsWithDates.length > 0,
      locations: locationsWithDates,
    };
  });

/**
 * Calculate delivery fee for a given ZIP code
 */
export const calculateDeliveryFeeAction = createServerAction()
  .input(
    z.object({
      cartItems: z.array(
        z.object({
          productId: z.string(),
          quantity: z.number(),
          price: z.number(),
        })
      ),
      deliveryZipCode: z.string(),
    })
  )
  .handler(async ({ input }) => {
    const { cartItems, deliveryZipCode } = input;

    const result = await calculateDeliveryFee({
      cartItems,
      deliveryZipCode,
    });

    return {
      feeAmount: result.feeAmount,
      zoneName: result.appliedZone?.name || null,
      zoneId: result.appliedZone?.id || null,
      breakdown: result.breakdown,
    };
  });
