import { getCurrentLoyaltyCustomer } from "../../_lib/get-loyalty-customer";
import { getDB } from "@/db";
import {
  orderTable,
  orderItemTable,
  productTable,
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, format } from "date-fns";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import {
  CalendarIcon,
  MapPinIcon,
  PackageIcon,
  TruckIcon,
  CheckCircle2Icon,
} from "lucide-react";

// Disable caching - always fetch fresh order data
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Props {
  params: Promise<{ orderId: string }>;
}

export default async function OrderDetailsPage({ params }: Props) {
  const { orderId } = await params;
  const customer = await getCurrentLoyaltyCustomer();

  if (!customer) {
    redirect("/login");
  }

  const db = getDB();

  // Fetch the order
  const order = await db
    .select()
    .from(orderTable)
    .where(eq(orderTable.id, orderId))
    .get();

  if (!order) {
    notFound();
  }

  // Verify the order belongs to this customer
  if (order.userId !== customer.id) {
    notFound();
  }

  // Fetch order items with product details
  const items = await db
    .select()
    .from(orderItemTable)
    .innerJoin(productTable, eq(orderItemTable.productId, productTable.id))
    .where(eq(orderItemTable.orderId, orderId))
    .all();

  function formatPrice(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  // Find status key by comparing against raw status values (not labels)
  const statusKey = Object.entries(ORDER_STATUS_LABELS).find(
    ([key]) =>
      ORDER_STATUS[key as keyof typeof ORDER_STATUS] === order.status
  )?.[0] as keyof typeof ORDER_STATUS_LABELS | undefined;

  const paymentStatusKey = Object.entries(PAYMENT_STATUS_LABELS).find(
    ([key]) =>
      PAYMENT_STATUS[key as keyof typeof PAYMENT_STATUS] === order.paymentStatus
  )?.[0] as keyof typeof PAYMENT_STATUS_LABELS | undefined;

  // Status timeline - showing progression through order workflow
  const statusSteps = [
    { key: "PENDING", label: "Processing", icon: PackageIcon },
    { key: "CONFIRMED", label: "Confirmed", icon: CheckCircle2Icon },
    { key: "IN_PRODUCTION", label: "In Production", icon: PackageIcon },
    {
      key:
        order.fulfillmentType === "delivery"
          ? "OUT_FOR_DELIVERY"
          : "READY_FOR_PICKUP",
      label:
        order.fulfillmentType === "delivery"
          ? "Out for Delivery"
          : "Ready for Pickup",
      icon: order.fulfillmentType === "delivery" ? TruckIcon : MapPinIcon,
    },
    { key: "COMPLETED", label: "Completed", icon: CheckCircle2Icon },
  ];

  const currentStatusIndex = statusSteps.findIndex(
    (step) => step.key === statusKey
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-3xl font-display font-bold">
              Order #{order.id.substring(4, 12).toUpperCase()}
            </h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <CalendarIcon className="h-4 w-4" />
              Placed{" "}
              {formatDistanceToNow(new Date(order.createdAt), {
                addSuffix: true,
              })}{" "}
              on {format(new Date(order.createdAt), "MMMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge
              variant="secondary"
              className={
                paymentStatusKey ? PAYMENT_STATUS_COLORS[paymentStatusKey] : ""
              }
            >
              {PAYMENT_STATUS_LABELS[paymentStatusKey || "PENDING"]}
            </Badge>
            <Badge
              variant="secondary"
              className={statusKey ? ORDER_STATUS_COLORS[statusKey] : ""}
            >
              {ORDER_STATUS_LABELS[statusKey || "PENDING"]}
            </Badge>
          </div>
        </div>
      </div>

      {/* Status Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Order Status</CardTitle>
          <CardDescription>Track your order progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {statusSteps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index <= currentStatusIndex;
              const isCurrent = index === currentStatusIndex;

              return (
                <div
                  key={step.key}
                  className="flex flex-col items-center flex-1"
                >
                  <div className="relative flex items-center w-full">
                    {index > 0 && (
                      <div
                        className={`flex-1 h-1 ${
                          isActive
                            ? "bg-primary"
                            : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      />
                    )}
                    <div
                      className={`
                        rounded-full p-3 z-10
                        ${
                          isCurrent
                            ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                            : isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                        }
                      `}
                    >
                      <StepIcon className="h-5 w-5" />
                    </div>
                    {index < statusSteps.length - 1 && (
                      <div
                        className={`flex-1 h-1 ${
                          isActive && index < currentStatusIndex
                            ? "bg-primary"
                            : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      />
                    )}
                  </div>
                  <p
                    className={`text-xs mt-2 text-center ${
                      isCurrent
                        ? "font-semibold"
                        : isActive
                        ? "font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
          <CardDescription>
            {items.length} {items.length === 1 ? "item" : "items"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item) => {
              const customizations: { size?: string; options?: Array<{ name: string }> } | null = item.order_item.customizations
                ? JSON.parse(item.order_item.customizations)
                : null;

              return (
                <div
                  key={item.order_item.id}
                  className="flex gap-4 p-4 border rounded-lg"
                >
                  {/* Product Image */}
                  <div className="relative w-24 h-24 flex-shrink-0 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
                    {item.product.imageUrl ? (
                      <Image
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <PackageIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">
                      {item.product.name}
                    </h3>
                    {item.product.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.product.description}
                      </p>
                    )}

                    {/* Customizations */}
                    {customizations && (
                      <div className="mt-2 space-y-1">
                        {customizations.size && (
                          <p className="text-sm">
                            <span className="font-medium">Size:</span>{" "}
                            {customizations.size}
                          </p>
                        )}
                        {customizations.options &&
                          customizations.options.length > 0 && (
                            <div className="text-sm">
                              <span className="font-medium">Options:</span>
                              <ul className="list-disc list-inside ml-2">
                                {customizations.options.map(
                                  (opt, idx) => (
                                    <li key={idx}>{opt.name}</li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3">
                      <p className="text-sm text-muted-foreground">
                        Qty: {item.order_item.quantity}
                      </p>
                      <p className="font-semibold">
                        {formatPrice(
                          item.order_item.priceAtPurchase *
                            item.order_item.quantity
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Order Summary & Fulfillment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatPrice(order.tax)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatPrice(order.totalAmount)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Fulfillment Details */}
        <Card>
          <CardHeader>
            <CardTitle>
              {order.fulfillmentType === "delivery" ? "Delivery" : "Pickup"}{" "}
              Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.fulfillmentType === "delivery" && order.deliveryAddress ? (
              <div>
                <p className="text-sm font-medium mb-1">Delivery Address</p>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {order.deliveryAddress}
                </p>
              </div>
            ) : order.fulfillmentType === "pickup" && order.pickupTime ? (
              <div>
                <p className="text-sm font-medium mb-1">Pickup Time</p>
                <p className="text-sm text-muted-foreground">
                  {format(
                    new Date(order.pickupTime),
                    "MMMM d, yyyy 'at' h:mm a"
                  )}
                </p>
              </div>
            ) : null}

            {order.notes && (
              <div>
                <p className="text-sm font-medium mb-1">Order Notes</p>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium mb-1">Contact</p>
              <p className="text-sm text-muted-foreground">
                {order.customerEmail}
              </p>
              {order.customerPhone && (
                <p className="text-sm text-muted-foreground">
                  {order.customerPhone}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Back Link */}
      <div>
        <a href="/profile" className="text-sm text-primary hover:underline">
          &larr; Back to all orders
        </a>
      </div>
    </div>
  );
}
