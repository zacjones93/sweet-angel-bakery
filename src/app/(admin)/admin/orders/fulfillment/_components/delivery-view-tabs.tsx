'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeliveryMapView } from "./delivery-map-view";
import { formatCents } from "@/utils/tax";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navigation, Bell } from "lucide-react";
import { useServerAction } from "zsa-react";
import { notifyDeliveryETA } from "../../../_actions/notify-delivery-eta.action";
import { toast } from "sonner";

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
  deliveryDate: string; // ISO date "2024-10-26"
  orders: OrderData[];
  deliveryStops: DeliveryStop[];
  depotAddress: {
    lat: number;
    lng: number;
    name: string;
  };
  startTime?: string; // "09:00:00" or current time
}

export function DeliveryViewTabs({ deliveryDate, orders, deliveryStops, depotAddress, startTime = "09:00:00" }: Props) {
  const { execute: sendNotifications, isPending: isSendingNotifications } = useServerAction(notifyDeliveryETA);

  // Send delivery ETA notifications to customers
  const handleSendNotifications = async () => {
    try {
      const [data, err] = await sendNotifications({
        deliveryDate,
      });

      if (err) {
        toast.error('Failed to send notifications: ' + err.message);
        return;
      }

      if (!data) {
        toast.error('No notification data returned');
        return;
      }

      // Show success message with details
      if (data.sent > 0) {
        toast.success(data.message, { duration: 5000 });
      } else if (data.skipped > 0) {
        toast.warning(data.message, { duration: 5000 });
      } else {
        toast.info(data.message);
      }

      // Show any failures
      if (data.details.failed.length > 0) {
        console.error('Failed notifications:', data.details.failed);
      }
    } catch (error) {
      toast.error('Failed to send notifications');
      console.error(error);
    }
  };

  return (
    <Tabs defaultValue="list" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="list">List View</TabsTrigger>
        <TabsTrigger value="map">Map View</TabsTrigger>
      </TabsList>

      <TabsContent value="list" className="mt-4">
        <div className="mb-3 flex justify-end">
          <Button
            variant="default"
            size="sm"
            onClick={handleSendNotifications}
            disabled={isSendingNotifications || orders.length === 0}
            title="Notify customers of estimated delivery time"
            className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm"
          >
            <Bell className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
            <span className="hidden sm:inline">{isSendingNotifications ? 'Sending...' : 'Notify Customers'}</span>
            <span className="sm:hidden">{isSendingNotifications ? '...' : 'Notify'}</span>
          </Button>
        </div>
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
                className="p-3 sm:p-4 rounded-lg border"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                  <Link
                    href={`/admin/orders/${orderData.order.id}`}
                    className="flex-1 space-y-1 hover:opacity-80 transition-opacity min-w-0"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs sm:text-sm">
                        #{orderData.order.id.slice(-8)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {orderData.order.status}
                      </Badge>
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground break-words">
                      {orderData.order.customerName}
                    </div>
                    <div className="text-xs text-muted-foreground break-all">
                      {orderData.order.customerEmail}
                    </div>
                    {orderData.deliveryZone && (
                      <div className="text-xs sm:text-sm text-muted-foreground">
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
                  <div className="flex sm:flex-col items-center sm:items-end gap-2 justify-between sm:justify-start">
                    <div className="text-left sm:text-right">
                      <div className="font-semibold text-sm sm:text-base">
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
                        className="shrink-0"
                      >
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Navigation className="h-3 w-3 sm:mr-1" />
                          <span className="hidden sm:inline">Directions</span>
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
            deliveryDate={deliveryDate}
            startTime={startTime}
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
