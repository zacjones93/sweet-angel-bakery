"use server";

import { createServerAction } from "zsa";
import { z } from "zod";

const DeliveryStopSchema = z.object({
  orderId: z.string(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
  }),
  lat: z.number(),
  lng: z.number(),
  customerName: z.string(),
  timeWindow: z.string().optional(),
  estimatedArrival: z.string().optional(),
});

const DepotAddressSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  name: z.string(),
});

interface RouteSegment {
  orderId: string;
  sequence: number;
  estimatedArrival: string;
  estimatedDeparture: string;
  durationFromPrevious: number; // seconds
  distanceFromPrevious: number; // meters
}

// Google Maps API Response Types
interface GoogleMapsLeg {
  distance: { value: number; text: string };
  duration: { value: number; text: string };
  start_address: string;
  end_address: string;
}

interface GoogleMapsRoute {
  legs: GoogleMapsLeg[];
  waypoint_order: number[];
}

interface GoogleMapsDirectionsResponse {
  status: string;
  routes: GoogleMapsRoute[];
}

/**
 * Optimize delivery route using Google Directions API
 * Returns optimized order of stops with timing information
 */
export const optimizeDeliveryRoute = createServerAction()
  .input(
    z.object({
      deliveries: z.array(DeliveryStopSchema),
      depotAddress: DepotAddressSchema,
      startTime: z.string().default("09:00:00"), // HH:mm:ss
      stopDuration: z.number().default(300), // seconds (5 min)
    })
  )
  .handler(async ({ input }) => {
    const { deliveries, depotAddress, startTime, stopDuration } = input;

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      throw new Error("GOOGLE_MAPS_API_KEY not configured");
    }

    if (deliveries.length === 0) {
      return {
        optimizedDeliveries: [],
        segments: [],
        totalDistance: 0,
        totalDuration: 0,
        savings: {
          distanceSaved: 0,
          timeSaved: 0,
        },
      };
    }

    // Build waypoints for Google Directions API
    const waypoints = deliveries.map((d) => `${d.lat},${d.lng}`);

    // Call Google Directions API with optimization enabled
    const origin = `${depotAddress.lat},${depotAddress.lng}`;
    const destination = origin; // Return to depot

    // IMPORTANT: Don't use 'via:' prefix - that makes them pass-through points, not stops!
    const waypointsParam = waypoints.join("|");

    const url = new URL(
      "https://maps.googleapis.com/maps/api/directions/json"
    );
    url.searchParams.set("origin", origin);
    url.searchParams.set("destination", destination);
    url.searchParams.set("waypoints", `optimize:true|${waypointsParam}`);
    url.searchParams.set("mode", "driving");
    url.searchParams.set("key", process.env.GOOGLE_MAPS_API_KEY);

    const response = await fetch(url.toString());
    const data = (await response.json()) as GoogleMapsDirectionsResponse;

    if (data.status !== "OK" || !data.routes?.[0]) {
      throw new Error(`Route optimization failed: ${data.status}`);
    }

    const route = data.routes[0];
    const waypointOrder = route.waypoint_order as number[];
    const legs = route.legs;

    console.log('[Optimize] Input deliveries count:', deliveries.length);
    console.log('[Optimize] Waypoint order from Google:', waypointOrder);
    console.log('[Optimize] Legs count:', legs.length);

    // Reorder deliveries based on optimized waypoint order
    const optimizedDeliveries = waypointOrder.map((idx) => deliveries[idx]);
    console.log('[Optimize] Optimized deliveries count:', optimizedDeliveries.length);

    // Calculate segment timing
    const [hours, minutes] = startTime.split(":").map(Number);
    let currentTime = new Date();
    currentTime.setHours(hours, minutes, 0, 0);

    const segments: RouteSegment[] = [];

    legs.forEach((leg, index) => {
      // Skip last leg (return to depot)
      if (index >= optimizedDeliveries.length) {
        console.log(`[Optimize] Skipping leg ${index} (return to depot)`);
        return;
      }

      const driveDuration = leg.duration.value; // seconds
      const driveDistance = leg.distance.value; // meters

      // Arrival time = current time + drive time
      const arrivalTime = new Date(currentTime.getTime() + driveDuration * 1000);
      // Departure time = arrival time + stop duration
      const departureTime = new Date(
        arrivalTime.getTime() + stopDuration * 1000
      );

      segments.push({
        orderId: optimizedDeliveries[index].orderId,
        sequence: index,
        estimatedArrival: arrivalTime.toTimeString().slice(0, 8), // HH:mm:ss
        estimatedDeparture: departureTime.toTimeString().slice(0, 8),
        durationFromPrevious: driveDuration,
        distanceFromPrevious: driveDistance,
      });

      // Update current time for next leg
      currentTime = departureTime;
    });

    console.log('[Optimize] Segments built:', segments.length);

    // Calculate totals
    const totalDistance = legs.reduce(
      (sum, leg) => sum + leg.distance.value,
      0
    );
    const totalDuration = legs.reduce(
      (sum, leg) => sum + leg.duration.value,
      0
    );

    // Calculate savings (we'll need to compare with original route)
    // For now, we'll calculate the original route distance/duration
    const originalUrl = new URL(
      "https://maps.googleapis.com/maps/api/directions/json"
    );
    originalUrl.searchParams.set("origin", origin);
    originalUrl.searchParams.set("destination", destination);
    originalUrl.searchParams.set(
      "waypoints",
      waypoints.join("|") // No 'via:' prefix - we want actual stops, not pass-through points
    );
    originalUrl.searchParams.set("mode", "driving");
    originalUrl.searchParams.set("key", process.env.GOOGLE_MAPS_API_KEY);

    const originalResponse = await fetch(originalUrl.toString());
    const originalData =
      (await originalResponse.json()) as GoogleMapsDirectionsResponse;

    let originalDistance = 0;
    let originalDuration = 0;

    if (originalData.status === "OK" && originalData.routes?.[0]) {
      const originalRoute = originalData.routes[0];
      originalDistance = originalRoute.legs.reduce(
        (sum, leg) => sum + (leg as GoogleMapsLeg).distance.value,
        0
      );
      originalDuration = originalRoute.legs.reduce(
        (sum, leg) => sum + (leg as GoogleMapsLeg).duration.value,
        0
      );
    }

    return {
      optimizedDeliveries,
      segments,
      totalDistance,
      totalDuration,
      waypointOrder,
      savings: {
        distanceSaved: Math.max(0, originalDistance - totalDistance),
        timeSaved: Math.max(0, originalDuration - totalDuration),
      },
    };
  });
