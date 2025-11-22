import { PageHeader } from "@/components/page-header";
import { getOrderByIdAction } from "../../_actions/orders.action";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderStatusBadge } from "../_components/order-status-badge";
import { UpdateOrderStatusDialog } from "../_components/update-order-status-dialog";
import { formatDate } from "@/utils/format-date";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { orderStatusTuple } from "@/db/schema";

interface PageProps {
  params: Promise<{
    orderId: string;
  }>;
}

export const metadata: Metadata = {
  title: "Order Details",
  description: "View and manage order details",
};

export default async function OrderDetailPage({ params }: PageProps) {
  const { orderId } = await params;

  const [result, err] = await getOrderByIdAction(orderId);

  if (err || !result) {
    notFound();
  }

  const order = result;

  return (
    <>
      <PageHeader
        items={[
          { href: "/admin", label: "Admin" },
          { href: "/admin/orders", label: "Orders" },
          {
            href: `/admin/orders/${orderId}`,
            label: order.id.substring(0, 12) + "...",
          },
        ]}
      />
      <div className="container mx-auto py-6 max-w-5xl">
        <div className="grid gap-6">
          {/* Order Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl mb-2">
                    Order {order.id}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Placed on {formatDate(order.createdAt)}
                  </p>
                </div>
                <UpdateOrderStatusDialog
                  orderId={order.id}
                  currentStatus={order.status}
                  fulfillmentMethod={(order.fulfillmentMethod || order.fulfillmentType) as "delivery" | "pickup" | null}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Customer Name
                  </p>
                  <p className="text-lg">{order.customerName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Customer Email
                  </p>
                  <p className="text-lg">{order.customerEmail}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Status
                  </p>
                  <div className="mt-1">
                    <OrderStatusBadge status={order.status} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Amount
                  </p>
                  <p className="text-lg font-semibold">
                    ${(order.totalAmount / 100).toFixed(2)}
                  </p>
                </div>
                {order.stripePaymentIntentId && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Payment Intent ID
                    </p>
                    <p className="text-sm font-mono">
                      {order.paymentIntentId}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Last Updated
                  </p>
                  <p className="text-sm">{formatDate(order.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 border rounded-lg"
                  >
                    {item.productImageUrl && (
                      <div className="relative h-20 w-20 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
                        <Image
                          src={item.productImageUrl}
                          alt={item.productName || "Product"}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold">{item.productName}</h3>
                      <p className="text-sm text-muted-foreground">
                        Quantity: {item.quantity}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Price: ${(item.priceAtPurchase / 100).toFixed(2)} each
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        $
                        {((item.priceAtPurchase * item.quantity) / 100).toFixed(
                          2
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t mt-4 pt-4">
                <div className="flex justify-between items-center">
                  <p className="text-lg font-semibold">Total</p>
                  <p className="text-2xl font-bold">
                    ${(order.totalAmount / 100).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Timeline - Placeholder for future enhancement */}
          <Card>
            <CardHeader>
              <CardTitle>Order Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Order timeline feature coming soon. This will show all status
                changes and when they occurred.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
