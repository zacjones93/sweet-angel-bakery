import { getCurrentLoyaltyCustomer } from "./_lib/get-loyalty-customer";
import { getDB } from "@/db";
import { orderTable, orderItemTable, productTable, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export default async function OrdersPage() {
  const customer = await getCurrentLoyaltyCustomer();

  if (!customer) {
    return null; // Layout will redirect
  }

  const { env } = await getCloudflareContext();
  const db = getDB(env.NEXT_TAG_CACHE_D1);

  // Fetch orders for this customer
  const orders = await db
    .select()
    .from(orderTable)
    .where(eq(orderTable.loyaltyCustomerId, customer.id))
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
          const statusKey = Object.keys(ORDER_STATUS_LABELS).find(
            (key) => ORDER_STATUS_LABELS[key as keyof typeof ORDER_STATUS_LABELS] === order.status
          ) as keyof typeof ORDER_STATUS_LABELS | undefined;

          return (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      Order #{order.id.substring(4, 12).toUpperCase()}
                    </CardTitle>
                    <CardDescription>
                      Placed {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                    </CardDescription>
                  </div>
                  <Badge
                    variant="secondary"
                    className={statusKey ? ORDER_STATUS_COLORS[statusKey] : ""}
                  >
                    {order.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <div className="flex-1">
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-muted-foreground">Qty: {item.order_item.quantity}</p>
                      </div>
                      <p className="font-medium">
                        {formatPrice(item.order_item.priceAtPurchase * item.order_item.quantity)}
                      </p>
                    </div>
                  ))}

                  <div className="border-t pt-3 flex justify-between font-bold">
                    <span>Total</span>
                    <span>{formatPrice(order.totalAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
