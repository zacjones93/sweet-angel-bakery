import { PageHeader } from "@/components/page-header";
import { getOrdersByFulfillmentAction } from "../../_actions/orders-by-fulfillment.action";
import { geocodeDeliveryAddresses } from "../../_actions/geocode-delivery-addresses.action";
import { getSessionFromCookie } from "@/utils/auth";
import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCents } from "@/utils/tax";
import { format } from "date-fns";
import Link from "next/link";
import { Package, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ExportDeliveryButton } from "../_components/export-delivery-button";
import { ExportPickupButton } from "../_components/export-pickup-button";
import { FulfillmentFilters } from "../_components/fulfillment-filters";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { DeliveryViewTabs } from "./_components/delivery-view-tabs";

export const metadata: Metadata = {
  title: "Orders by Fulfillment",
  description: "View orders grouped by delivery date and pickup location",
};

interface PageProps {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    method?: "delivery" | "pickup" | "all";
  }>;
}

export default async function OrdersByFulfillmentPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;

  // Get current user for depot address
  const session = await getSessionFromCookie();
  const user = session?.user;

  // Default to showing next 14 days
  const startDate = params.startDate || new Date().toISOString().split("T")[0];
  const endDate =
    params.endDate ||
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const method = params.method || "all";

  const [result, err] = await getOrdersByFulfillmentAction({
    startDate,
    endDate,
    fulfillmentMethod: method,
  });

  if (err) {
    console.error("Orders by fulfillment error:", err);
    // Show empty state instead of crashing
    return (
      <>
        <PageHeader
          items={[
            { href: "/admin", label: "Admin" },
            { href: "/admin/orders", label: "Orders" },
            { href: "/admin/orders/fulfillment", label: "By Fulfillment" },
          ]}
        />
        <div className="container mx-auto py-6">
          <Card>
            <CardContent className="py-8">
              <div className="text-center space-y-4">
                <p className="text-lg font-semibold text-destructive">
                  Error Loading Orders
                </p>
                <p className="text-sm text-muted-foreground">{err.message}</p>
                <p className="text-xs text-muted-foreground">
                  Check console for details
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const { deliveries, pickups, summary } = result;

  return (
    <NuqsAdapter>
      <PageHeader
        items={[
          { href: "/admin", label: "Admin" },
          { href: "/admin/orders", label: "Orders" },
          { href: "/admin/orders/fulfillment", label: "By Fulfillment" },
        ]}
      />
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <FulfillmentFilters />
        </div>
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Deliveries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.totalDeliveryOrders}
              </div>
              <p className="text-xs text-muted-foreground">
                Revenue: {formatCents(summary.totalDeliveryRevenue)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Pickups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.totalPickupOrders}
              </div>
              <p className="text-xs text-muted-foreground">
                Revenue: {formatCents(summary.totalPickupRevenue)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Delivery Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCents(summary.totalDeliveryRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                {summary.totalDeliveryOrders} orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Pickup Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCents(summary.totalPickupRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                {summary.totalPickupOrders} orders
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Deliveries by Date */}
        {deliveries.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Deliveries</h2>
            {await Promise.all(deliveries.map(async (delivery) => {
              // Geocode all delivery addresses for this date
              const addresses = delivery.orders
                .map((orderData) => {
                  if (!orderData.order.deliveryAddressJson) return null;
                  try {
                    return JSON.parse(orderData.order.deliveryAddressJson);
                  } catch {
                    return null;
                  }
                })
                .filter(Boolean);

              // Geocode addresses if Google Maps API key is available
              let geocodedAddresses: Array<{
                street: string;
                city: string;
                state: string;
                zip: string;
                lat: number;
                lng: number;
              }> = [];

              if (addresses.length > 0 && process.env.GOOGLE_MAPS_API_KEY) {
                const [data, err] = await geocodeDeliveryAddresses({ addresses });
                if (!err && data) {
                  geocodedAddresses = data.filter((addr): addr is {
                    street: string;
                    city: string;
                    state: string;
                    zip: string;
                    lat: number;
                    lng: number;
                  } => addr !== null);
                } else if (err) {
                  console.error('Geocoding error:', err);
                }
              }

              // Create delivery stops with geocoded coordinates
              const deliveryStops = delivery.orders
                .map((orderData, index) => {
                  const geocoded = geocodedAddresses[index];
                  if (!geocoded) return null;

                  return {
                    orderId: orderData.order.id,
                    address: {
                      street: geocoded.street,
                      city: geocoded.city,
                      state: geocoded.state,
                      zip: geocoded.zip,
                    },
                    lat: geocoded.lat,
                    lng: geocoded.lng,
                    customerName: orderData.order.customerName,
                    timeWindow: orderData.order.deliveryTimeWindow || undefined,
                  };
                })
                .filter(Boolean) as Array<{
                  orderId: string;
                  address: { street: string; city: string; state: string; zip: string };
                  lat: number;
                  lng: number;
                  customerName: string;
                  timeWindow?: string;
                }>;

              // Get depot address from current user's profile
              let depotAddress = {
                lat: 43.6187,
                lng: -116.2146,
                name: 'Sweet Angel Bakery (Default)',
              };

              // Use logged-in user's address as depot starting point
              if (user?.streetAddress1 && user?.city && user?.state && user?.zipCode) {
                const [depotGeocode] = await geocodeDeliveryAddresses({
                  addresses: [{
                    street: user.streetAddress1 + (user.streetAddress2 ? ` ${user.streetAddress2}` : ''),
                    city: user.city,
                    state: user.state,
                    zip: user.zipCode,
                  }]
                });

                if (depotGeocode && depotGeocode.length > 0 && depotGeocode[0]) {
                  const geocoded = depotGeocode[0];
                  const userName = user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.email || 'Your Location';
                  depotAddress = {
                    lat: geocoded.lat,
                    lng: geocoded.lng,
                    name: userName,
                  };
                }
              }

              // Calculate start time based on delivery date
              // If delivery is today, use current time; otherwise use 9:00 AM
              const deliveryDateObj = new Date(delivery.date);
              const today = new Date();
              const isToday = deliveryDateObj.toDateString() === today.toDateString();
              const startTime = isToday
                ? format(today, 'HH:mm:ss')
                : '09:00:00';

              return (
                <Card key={delivery.date}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Truck className="h-5 w-5" />
                          {format(new Date(delivery.date), "EEEE, MMMM d, yyyy")}
                        </CardTitle>
                        <CardDescription>
                          {delivery.count} orders · Revenue:{" "}
                          {formatCents(delivery.totalRevenue)}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <ExportDeliveryButton deliveryDate={delivery.date} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <DeliveryViewTabs
                      deliveryDate={delivery.date}
                      orders={delivery.orders}
                      deliveryStops={deliveryStops}
                      depotAddress={depotAddress}
                      startTime={startTime}
                    />
                  </CardContent>
                </Card>
              );
            }))}
          </div>
        )}

        {/* Pickups by Date and Location */}
        {pickups.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Pickups</h2>
            {pickups.map((pickup) => (
              <Card key={pickup.date}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    {format(new Date(pickup.date), "EEEE, MMMM d, yyyy")}
                  </CardTitle>
                  <CardDescription>
                    {pickup.totalCount} orders · Revenue:{" "}
                    {formatCents(pickup.totalRevenue)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pickup.locations.map((location) => (
                    <div key={location.locationId} className="space-y-3">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div>
                          <h3 className="font-semibold">
                            {location.locationName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {location.count} orders · Revenue:{" "}
                            {formatCents(location.totalRevenue)}
                          </p>
                        </div>
                        <ExportPickupButton
                          pickupDate={pickup.date}
                          pickupLocationId={location.locationId}
                        />
                      </div>

                      {location.orders.map((orderData) => (
                        <Link
                          key={orderData.order.id}
                          href={`/admin/orders/${orderData.order.id}`}
                          className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
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
                              {orderData.order.customerPhone && (
                                <div className="text-sm text-muted-foreground">
                                  {orderData.order.customerPhone}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                {orderData.items.length} items
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">
                                {formatCents(orderData.order.totalAmount)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {orderData.order.pickupTimeWindow}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {deliveries.length === 0 && pickups.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No orders found for the selected date range
            </CardContent>
          </Card>
        )}
      </div>
    </NuqsAdapter>
  );
}
