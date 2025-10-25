"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import {
  getNextDeliveryDate,
  getAvailablePickupLocations,
  calculateDeliveryFee,
  getCartDeliveryDate,
  getAvailableDeliveryDates,
} from "@/utils/delivery";

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

    // Get all available delivery dates for the cart
    // For carts with multiple products, we need to find dates that work for all products
    // Start by getting dates for the first product (with most restrictive rules)
    const firstProductId = items[0]?.productId;

    const deliveryDateOptions = await getAvailableDeliveryDates({
      productId: firstProductId
    });

    if (deliveryDateOptions.length === 0) {
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
      feeAmount = feeResult.feeAmount;
      zoneName = feeResult.appliedZone?.name || null;
      zoneId = feeResult.appliedZone?.id || null;
    }

    return {
      available: true,
      deliveryDates: deliveryDateOptions.map(option => ({
        deliveryDate: option.deliveryDate.toISOString(),
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
 * Returns all available pickup locations with next available dates
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

    return {
      available: locations.length > 0,
      locations: locations.map((loc) => ({
        id: loc.id,
        name: loc.name,
        address: JSON.parse(loc.address),
        pickupDate: loc.nextPickupDate.toISOString(),
        pickupTimeWindow: loc.pickupTimeWindow,
        instructions: loc.instructions,
      })),
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
