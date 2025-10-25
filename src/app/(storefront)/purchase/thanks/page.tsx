import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getDB } from "@/db";
import {
  orderTable,
  orderItemTable,
  productTable,
  userTable,
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { OrderTrackingCTA } from "./_components/order-tracking-cta";
import { getSessionFromCookie } from "@/utils/auth";

// Disable caching - always fetch fresh order data
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  searchParams: Promise<{
    session_id?: string;
    provider?: string;
    order?: string; // Square direct payment order number
  }>;
};

async function getOrderFromSession(
  sessionId: string,
  provider?: string,
  orderNumber?: string
) {
  const db = getDB();

  // For Square direct payment with order number
  if (orderNumber) {
    // Find order by order number (last 8 chars of order ID)
    const [order] = await db
      .select()
      .from(orderTable)
      .where(
        sql`UPPER(SUBSTR(${
          orderTable.id
        }, 5, 8)) = ${orderNumber.toUpperCase()}`
      )
      .limit(1);

    if (!order) {
      return null;
    }

    // Get order items
    const items = await db
      .select({
        id: orderItemTable.id,
        quantity: orderItemTable.quantity,
        priceAtPurchase: orderItemTable.priceAtPurchase,
        productName: productTable.name,
        productImage: productTable.imageUrl,
      })
      .from(orderItemTable)
      .innerJoin(productTable, eq(orderItemTable.productId, productTable.id))
      .where(eq(orderItemTable.orderId, order.id));

    // Check if customer is a loyalty member
    let isLoyaltyMember = false;
    if (order.customerEmail) {
      const [existingUser] = await db
        .select()
        .from(userTable)
        .where(eq(userTable.email, order.customerEmail.toLowerCase()))
        .limit(1);
      isLoyaltyMember = !!existingUser;
    }

    return {
      order,
      items,
      totalAmount: order.totalAmount,
      isLoyaltyMember,
    };
  }

  // For Square webhook-based flow, fetch the most recent order
  // Try to find order by looking for recent Square orders
  // Since Square webhooks are async, we might need to wait a bit
  const [order] = await db
    .select()
    .from(orderTable)
    .where(eq(orderTable.merchantProvider, "square"))
    .orderBy(sql`${orderTable.createdAt} DESC`)
    .limit(1);

  if (!order) {
    // Order hasn't been created by webhook yet
    return {
      order: null,
      items: [],
      totalAmount: 0,
      isLoyaltyMember: false,
    };
  }

  // Get order items
  const items = await db
    .select({
      id: orderItemTable.id,
      quantity: orderItemTable.quantity,
      priceAtPurchase: orderItemTable.priceAtPurchase,
      productName: productTable.name,
      productImage: productTable.imageUrl,
    })
    .from(orderItemTable)
    .innerJoin(productTable, eq(orderItemTable.productId, productTable.id))
    .where(eq(orderItemTable.orderId, order.id));

  // Check if customer is a loyalty member
  let isLoyaltyMember = false;
  if (order.customerEmail) {
    const [existingUser] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, order.customerEmail.toLowerCase()))
      .limit(1);
    isLoyaltyMember = !!existingUser;
  }

  return {
    order,
    items,
    totalAmount: order.totalAmount,
    isLoyaltyMember,
  };
}

async function OrderDetails({
  sessionId,
  provider,
  orderNumber,
}: {
  sessionId: string;
  provider?: string;
  orderNumber?: string;
}) {
  const data = await getOrderFromSession(sessionId, provider, orderNumber);

  if (!data) {
    notFound();
  }

  const { order, items, totalAmount, isLoyaltyMember } = data;

  // Check if user is currently logged in
  const currentSession = await getSessionFromCookie();
  const isLoggedIn = !!currentSession;

  // If user is logged in and order exists and order has no userId, link it automatically
  if (
    isLoggedIn &&
    order &&
    !order.userId &&
    currentSession.user.email?.toLowerCase() ===
      order.customerEmail.toLowerCase()
  ) {
    const db = getDB();
    await db
      .update(orderTable)
      .set({ userId: currentSession.user.id })
      .where(eq(orderTable.id, order.id));
  }

  // If order not created yet, show loading/generic message
  if (!order) {
    return (
      <div className="container mx-auto max-w-2xl py-12 px-4">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="w-16 h-16 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Thank You for Your Order!</h1>
          <p className="text-muted-foreground">
            Your payment was successful. We&apos;re processing your order now.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Order Confirmation</CardTitle>
            <CardDescription>Your order is being processed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8 text-muted-foreground">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-lg mb-2">Processing your order...</p>
              <p>This usually takes just a few seconds.</p>
              <p className="mt-4 text-sm">
                The page will automatically refresh to show your order details.
              </p>
            </div>
            <script
              dangerouslySetInnerHTML={{
                __html: `setTimeout(() => window.location.reload(), 3000);`,
              }}
            />
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-sm font-medium text-primary hover:underline"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  // Get payment status from DB order
  // Find status key by comparing against raw status values (not labels)
  const paymentStatusKey = order
    ? (Object.entries(PAYMENT_STATUS_LABELS).find(
        ([key]) =>
          PAYMENT_STATUS[key as keyof typeof PAYMENT_STATUS] ===
          order.paymentStatus
      )?.[0] as keyof typeof PAYMENT_STATUS_LABELS | undefined)
    : "PENDING";

  // Get order status from DB order
  const statusKey = order
    ? (Object.entries(ORDER_STATUS_LABELS).find(
        ([key]) =>
          ORDER_STATUS[key as keyof typeof ORDER_STATUS] === order.status
      )?.[0] as keyof typeof ORDER_STATUS_LABELS | undefined)
    : "PENDING";

  // Get customer details from order
  const customerEmail = order?.customerEmail || "";
  const customerName = order?.customerName || "Guest";
  const orderId = order?.id || "Processing...";

  return (
    <div className="container mx-auto max-w-2xl py-12 px-4">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <CheckCircle2 className="w-16 h-16 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Thank You for Your Order!</h1>
        <p className="text-muted-foreground">
          Your order has been confirmed. We&apos;ll send a confirmation email to{" "}
          <span className="font-medium">{customerEmail}</span>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
          <CardDescription>
            {orderId === "Processing..."
              ? orderId
              : `Order #${orderId.substring(4, 12).toUpperCase()}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Customer Information</h3>
            <div className="text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Name:</span>{" "}
                <span className="font-medium">{customerName}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Email:</span>{" "}
                <span className="font-medium">{customerEmail}</span>
              </p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-muted-foreground">Payment:</span>
                <Badge
                  variant="secondary"
                  className={
                    PAYMENT_STATUS_COLORS[
                      paymentStatusKey as keyof typeof PAYMENT_STATUS_COLORS
                    ]
                  }
                >
                  {
                    PAYMENT_STATUS_LABELS[
                      paymentStatusKey as keyof typeof PAYMENT_STATUS_LABELS
                    ]
                  }
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-muted-foreground">Order Status:</span>
                <Badge
                  variant="secondary"
                  className={statusKey ? ORDER_STATUS_COLORS[statusKey] : ""}
                >
                  {ORDER_STATUS_LABELS[statusKey || "PENDING"]}
                </Badge>
              </div>
            </div>
          </div>

          {items.length > 0 && (
            <>
              <Separator />

              <div>
                <h3 className="font-semibold mb-3">Items</h3>
                <div className="space-y-3">
                  {items.map(
                    (item: {
                      id: string;
                      productName: string;
                      quantity: number;
                      priceAtPurchase: number;
                    }) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-start"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-sm text-muted-foreground">
                            Quantity: {item.quantity}
                          </p>
                        </div>
                        <p className="font-medium">
                          $
                          {(
                            (item.priceAtPurchase * item.quantity) /
                            100
                          ).toFixed(2)}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${((order?.subtotal || 0) / 100).toFixed(2)}</span>
                </div>
                {order?.deliveryFee !== null &&
                  order?.deliveryFee !== undefined &&
                  order.deliveryFee > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        Delivery Fee
                      </span>
                      <span>${(order.deliveryFee / 100).toFixed(2)}</span>
                    </div>
                  )}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tax (6%)</span>
                  <span>${((order?.tax || 0) / 100).toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total</span>
                  <span>${(totalAmount / 100).toFixed(2)}</span>
                </div>
              </div>
            </>
          )}

          {items.length === 0 && (
            <>
              <Separator />
              <div className="text-center py-4 text-muted-foreground text-sm">
                <p>Your order is being processed.</p>
                <p className="mt-1">Order details will appear here shortly.</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {!isLoggedIn && customerEmail && order && (
        <div className="mt-6">
          <OrderTrackingCTA
            orderId={order.id}
            customerEmail={customerEmail}
            emailExistsInDatabase={isLoyaltyMember}
          />
        </div>
      )}

      {isLoggedIn && order && (
        <div className="mt-6">
          <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  ✓ This order is now linked to your account
                </p>
                <Link
                  href={`/profile/orders/${order.id}`}
                  className="text-sm text-green-700 dark:text-green-300 hover:underline mt-2 inline-block"
                >
                  View in Order History →
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Your order will be ready for pickup soon. We&apos;ll notify you when
          it&apos;s ready.
        </p>
        <Link
          href="/"
          className="text-sm font-medium text-primary hover:underline"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="container mx-auto max-w-2xl py-12 px-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading your order details...</p>
      </div>
    </div>
  );
}

export default async function PurchaseThanksPage({ searchParams }: Props) {
  const params = await searchParams;
  const sessionId = params.session_id;
  const provider = params.provider;
  const orderNumber = params.order;

  // For Square direct payment with order number
  if (orderNumber) {
    return (
      <Suspense fallback={<LoadingState />}>
        <OrderDetails
          sessionId=""
          provider="square"
          orderNumber={orderNumber}
        />
      </Suspense>
    );
  }

  // For Square webhook-based flow
  if (provider === "square") {
    return (
      <Suspense fallback={<LoadingState />}>
        <OrderDetails sessionId="" provider="square" />
      </Suspense>
    );
  }

  if (!sessionId) {
    notFound();
  }

  return (
    <Suspense fallback={<LoadingState />}>
      <OrderDetails sessionId={sessionId} provider={provider} />
    </Suspense>
  );
}
