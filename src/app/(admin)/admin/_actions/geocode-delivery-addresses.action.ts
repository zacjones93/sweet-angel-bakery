'use server'

import { createServerAction } from 'zsa';
import { z } from 'zod';

export const geocodeDeliveryAddresses = createServerAction()
  .input(z.object({
    addresses: z.array(z.object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
    })),
  }))
  .handler(async ({ input }) => {
    const geocodeResults = await Promise.all(
      input.addresses.map(async (address) => {
        const addressString = `${address.street}, ${address.city}, ${address.state} ${address.zip}`;

        try {
          // Use Google Geocoding API (server-side)
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressString)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
          );

          const data = await response.json() as {
            results?: Array<{
              geometry: {
                location: {
                  lat: number;
                  lng: number;
                };
              };
            }>;
          };

          if (data.results?.[0]) {
            return {
              ...address,
              lat: data.results[0].geometry.location.lat,
              lng: data.results[0].geometry.location.lng,
            };
          }

          return null;
        } catch (error) {
          console.error(`Failed to geocode address: ${addressString}`, error);
          return null;
        }
      })
    );

    return geocodeResults.filter(Boolean);
  });
