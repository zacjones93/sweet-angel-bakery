/**
 * Utilities for working with Google Maps
 */

interface DeliveryStop {
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  lat: number;
  lng: number;
  customerName: string;
}

interface DepotAddress {
  lat: number;
  lng: number;
  name: string;
}

/**
 * Generate a Google Maps URL with multiple waypoints for navigation
 * Opens in Google Maps app or web with route pre-loaded
 *
 * Uses lat/lng coordinates for all waypoints for maximum reliability
 * Format: https://www.google.com/maps/dir/?api=1&origin=LAT,LNG&destination=LAT,LNG&waypoints=LAT,LNG|LAT,LNG&travelmode=driving
 *
 * @param deliveries - Array of delivery stops in route order
 * @param depotAddress - Starting/ending location (bakery)
 * @returns Google Maps URL with route loaded
 */
export function generateGoogleMapsRouteUrl(
  deliveries: DeliveryStop[],
  depotAddress: DepotAddress
): string {
  if (deliveries.length === 0) {
    return "";
  }

  const baseUrl = "https://www.google.com/maps/dir/";
  const params = new URLSearchParams();

  params.set("api", "1");

  // Origin: Bakery/Depot (use lat/lng)
  const origin = `${depotAddress.lat},${depotAddress.lng}`;
  params.set("origin", origin);

  // Destination: Return to bakery/depot
  params.set("destination", origin);

  // Waypoints: All delivery stops in order (use lat/lng for consistency)
  const waypoints = deliveries
    .map((delivery) => `${delivery.lat},${delivery.lng}`)
    .join("|");

  if (waypoints) {
    params.set("waypoints", waypoints);
  }

  // Travel mode
  params.set("travelmode", "driving");

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Generate a simple Google Maps URL for a single address
 *
 * @param address - Address object
 * @returns Google Maps URL
 */
export function generateGoogleMapsAddressUrl(address: {
  street: string;
  city: string;
  state: string;
  zip: string;
}): string {
  const addressString = `${address.street}, ${address.city}, ${address.state} ${address.zip}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    addressString
  )}`;
}

/**
 * Generate a Google Maps directions URL from one address to another
 *
 * @param origin - Starting address
 * @param destination - Ending address
 * @returns Google Maps directions URL
 */
export function generateGoogleMapsDirectionsUrl(
  origin: {
    street: string;
    city: string;
    state: string;
    zip: string;
  },
  destination: {
    street: string;
    city: string;
    state: string;
    zip: string;
  }
): string {
  const originString = `${origin.street}, ${origin.city}, ${origin.state} ${origin.zip}`;
  const destinationString = `${destination.street}, ${destination.city}, ${destination.state} ${destination.zip}`;

  const params = new URLSearchParams();
  params.set("api", "1");
  params.set("origin", originString);
  params.set("destination", destinationString);
  params.set("travelmode", "driving");

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
