import { PageHeader } from "@/components/page-header";
import { getOrdersByFulfillmentAction } from "../../_actions/orders-by-fulfillment.action";
import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/utils/tax";
import { format } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileDown, Printer, Package, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

export default async function OrdersByFulfillmentPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Default to showing next 7 days
  const startDate = params.startDate || new Date().toISOString().split("T")[0];
  const endDate =
    params.endDate ||
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const method = params.method || "all";

  const [result, err] = await getOrdersByFulfillmentAction({
    startDate,
    endDate,
    fulfillmentMethod: method,
  });

  if (err) {
    throw new Error(err.message);
  }

  const { deliveries, pickups, summary } = result;

  return (
    <>
      <PageHeader
        items={[
          { href: "/admin", label: "Admin" },
          { href: "/admin/orders", label: "Orders" },
          { href: "/admin/orders/fulfillment", label: "By Fulfillment" },
        ]}
      />
      <div className="container mx-auto py-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalDeliveryOrders}</div>
              <p className="text-xs text-muted-foreground">
                Revenue: {formatCents(summary.totalDeliveryRevenue)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Pickups</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalPickupOrders}</div>
              <p className="text-xs text-muted-foreground">
                Revenue: {formatCents(summary.totalPickupRevenue)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Delivery Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCents(summary.totalDeliveryRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">{summary.totalDeliveryOrders} orders</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pickup Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCents(summary.totalPickupRevenue)}</div>
              <p className="text-xs text-muted-foreground">{summary.totalPickupOrders} orders</p>
            </CardContent>
          </Card>
        </div>

        {/* Deliveries by Date */}
        {deliveries.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Deliveries</h2>
            {deliveries.map((delivery) => (
              <Card key={delivery.date}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        {format(new Date(delivery.date), "EEEE, MMMM d, yyyy")}
                      </CardTitle>
                      <CardDescription>
                        {delivery.count} orders · Revenue: {formatCents(delivery.totalRevenue)}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <FileDown className="mr-2 h-4 w-4" />
                        Export Route
                      </Button>
                      <Button variant="outline" size="sm">
                        <Printer className="mr-2 h-4 w-4" />
                        Print List
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {delivery.orders.map((orderData) => (
                      <Link
                        key={orderData.order.id}
                        href={`/admin/orders/${orderData.order.id}`}
                        className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">#{orderData.order.id.slice(-8)}</span>
                              <Badge variant="outline">{orderData.order.status}</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {orderData.order.customerName} · {orderData.order.customerEmail}
                            </div>
                            {orderData.deliveryZone && (
                              <div className="text-sm text-muted-foreground">
                                Zone: {orderData.deliveryZone.name} ·
                                Fee: {formatCents(orderData.order.deliveryFee || 0)}
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
                              {orderData.order.deliveryTimeWindow}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
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
                    {pickup.totalCount} orders · Revenue: {formatCents(pickup.totalRevenue)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pickup.locations.map((location) => (
                    <div key={location.locationId} className="space-y-3">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div>
                          <h3 className="font-semibold">{location.locationName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {location.count} orders · Revenue: {formatCents(location.totalRevenue)}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Printer className="mr-2 h-4 w-4" />
                          Print List
                        </Button>
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
                                <Badge variant="outline">{orderData.order.status}</Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {orderData.order.customerName} · {orderData.order.customerEmail}
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
    </>
  );
}
