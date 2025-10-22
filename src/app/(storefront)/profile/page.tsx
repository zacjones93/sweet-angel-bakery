import { getCurrentLoyaltyCustomer } from "./_lib/get-loyalty-customer";
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
import { eq, desc, inArray } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

// Disable caching - always fetch fresh order data
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OrdersPage() {
  const customer = await getCurrentLoyaltyCustomer();

  if (!customer) {
    return null; // Layout will redirect
  }

  const db = getDB();

  // Fetch orders for this customer
  const orders = await db
    .select()
    .from(orderTable)
    .where(eq(orderTable.userId, customer.id))
    .orderBy(desc(orderTable.createdAt))
    .all();

  // Fetch order items for all orders
  const orderIds = orders.map((o) => o.id);
  let orderItems: any[] = [];
  let products: any[] = [];

  if (orderIds.length > 0) {
    orderItems = await db
      .select()
      .from(orderItemTable)
      .innerJoin(productTable, eq(orderItemTable.productId, productTable.id))
      .where(inArray(orderItemTable.orderId, orderIds))
      .all();
  }

  // Group items by order
  const orderItemsMap = new Map<string, any[]>();
  orderItems.forEach((item) => {
    const orderId = item.order_item.orderId;
    if (!orderItemsMap.has(orderId)) {
      orderItemsMap.set(orderId, []);
    }
    orderItemsMap.get(orderId)!.push(item);
  });

  function formatPrice(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-display font-bold mb-2">No Orders Yet</h2>
        <p className="text-muted-foreground mb-6">
          Start shopping to see your orders here!
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Browse Products
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold mb-2">Your Orders</h2>
        <p className="text-muted-foreground">
          View and track all your Sweet Angel Bakery orders
        </p>
      </div>

      <div className="space-y-4">
        {orders.map((order) => {
          const items = orderItemsMap.get(order.id) || [];

          // Find status key by comparing against raw status values (not labels)
          const statusKey = Object.entries(ORDER_STATUS_LABELS).find(
            ([key, value]) =>
              ORDER_STATUS[key as keyof typeof ORDER_STATUS] === order.status
          )?.[0] as keyof typeof ORDER_STATUS_LABELS | undefined;

          const paymentStatusKey = Object.entries(PAYMENT_STATUS_LABELS).find(
            ([key, value]) =>
              PAYMENT_STATUS[key as keyof typeof PAYMENT_STATUS] ===
              order.paymentStatus
          )?.[0] as keyof typeof PAYMENT_STATUS_LABELS | undefined;

          return (
            <Link key={order.id} href={`/profile/orders/${order.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        Order #{order.id.substring(4, 12).toUpperCase()}
                      </CardTitle>
                      <CardDescription>
                        Placed{" "}
                        {formatDistanceToNow(new Date(order.createdAt), {
                          addSuffix: true,
                        })}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge
                        variant="secondary"
                        className={
                          paymentStatusKey
                            ? PAYMENT_STATUS_COLORS[paymentStatusKey]
                            : ""
                        }
                      >
                        {PAYMENT_STATUS_LABELS[paymentStatusKey || "PENDING"]}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={
                          statusKey ? ORDER_STATUS_COLORS[statusKey] : ""
                        }
                      >
                        {ORDER_STATUS_LABELS[statusKey || "PENDING"]}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <div className="flex-1">
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-muted-foreground">
                            Qty: {item.order_item.quantity}
                          </p>
                        </div>
                        <p className="font-medium">
                          {formatPrice(
                            item.order_item.priceAtPurchase *
                              item.order_item.quantity
                          )}
                        </p>
                      </div>
                    ))}

                    <div className="border-t pt-3 flex justify-between font-bold">
                      <span>Total</span>
                      <span>{formatPrice(order.totalAmount)}</span>
                    </div>

                    <div className="text-sm text-primary hover:underline pt-2">
                      View Details →
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
