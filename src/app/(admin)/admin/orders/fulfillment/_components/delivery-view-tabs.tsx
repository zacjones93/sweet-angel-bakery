'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeliveryMapView } from "./delivery-map-view";
import { formatCents } from "@/utils/tax";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "lucide-react";

interface DeliveryStop {
  orderId: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  lat: number;
  lng: number;
  customerName: string;
  timeWindow?: string;
}

interface OrderData {
  order: {
    id: string;
    customerName: string;
    customerEmail: string;
    status: string;
    totalAmount: number;
    deliveryAddressJson: string | null;
    deliveryTimeWindow: string | null;
    deliveryFee: number | null;
  };
  items: Array<{ item: unknown; product: unknown }>;
  deliveryZone: { name: string } | null;
}

interface Props {
  orders: OrderData[];
  deliveryStops: DeliveryStop[];
  depotAddress: {
    lat: number;
    lng: number;
    name: string;
  };
}

export function DeliveryViewTabs({ orders, deliveryStops, depotAddress }: Props) {
  return (
    <Tabs defaultValue="list" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="list">List View</TabsTrigger>
        <TabsTrigger value="map">Map View</TabsTrigger>
      </TabsList>

      <TabsContent value="list" className="mt-4">
        <div className="space-y-3">
          {orders.map((orderData) => {
            // Parse delivery address for Google Maps
            let mapsUrl = "";
            if (orderData.order.deliveryAddressJson) {
              try {
                const address = JSON.parse(
                  orderData.order.deliveryAddressJson
                );
                const addressString = [
                  address.street,
                  address.city,
                  address.state,
                  address.zip,
                ]
                  .filter(Boolean)
                  .join(", ");
                mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                  addressString
                )}`;
              } catch {
                // Ignore parse errors
              }
            }

            return (
              <div
                key={orderData.order.id}
                className="p-4 rounded-lg border"
              >
                <div className="flex items-start justify-between gap-4">
                  <Link
                    href={`/admin/orders/${orderData.order.id}`}
                    className="flex-1 space-y-1 hover:opacity-80 transition-opacity"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">
                        #{orderData.order.id.slice(-8)}
                      </span>
                      <Badge variant="outline">
                        {orderData.order.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {orderData.order.customerName} ·{" "}
                      {orderData.order.customerEmail}
                    </div>
                    {orderData.deliveryZone && (
                      <div className="text-sm text-muted-foreground">
                        Zone: {orderData.deliveryZone.name} · Fee:{" "}
                        {formatCents(
                          orderData.order.deliveryFee || 0
                        )}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {orderData.items.length} items
                    </div>
                  </Link>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCents(orderData.order.totalAmount)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {orderData.order.deliveryTimeWindow}
                      </div>
                    </div>
                    {mapsUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="w-full"
                      >
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Navigation className="h-3 w-3 mr-1" />
                          Directions
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </TabsContent>

      <TabsContent value="map" className="mt-4">
        {deliveryStops.length > 0 ? (
          <DeliveryMapView
            deliveries={deliveryStops}
            depotAddress={depotAddress}
            startTime="09:00:00"
            stopDuration={300}
          />
        ) : (
          <div className="flex items-center justify-center h-[400px] bg-muted rounded-lg">
            <p className="text-muted-foreground">
              No delivery addresses available for mapping
            </p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
