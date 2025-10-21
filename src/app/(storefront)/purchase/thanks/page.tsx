import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getDB } from "@/db";
import { orderTable, orderItemTable, productTable, loyaltyCustomerTable, ORDER_STATUS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, PAYMENT_STATUS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { getStripe } from "@/lib/stripe";
import Link from "next/link";
import { LoyaltySignupCTA } from "./_components/loyalty-signup-cta";

// Disable caching - always fetch fresh order data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Props = {
  searchParams: Promise<{ session_id?: string }>;
};

async function getOrderFromSession(sessionId: string) {
  const stripe = await getStripe();

  try {
    // Get session from Stripe - this is the authoritative source for payment status
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session.payment_intent) {
      return null;
    }

    // Find order by payment intent - may not exist yet if webhook hasn't processed
    const db = getDB();
    const [order] = await db
      .select()
      .from(orderTable)
      .where(eq(orderTable.stripePaymentIntentId, session.payment_intent as string))
      .limit(1);

    // Check if customer is already a loyalty member
    const customerEmail = order?.customerEmail || session.customer_details?.email || session.customer_email;
    let isLoyaltyMember = false;

    if (customerEmail) {
      const [existingLoyaltyCustomer] = await db
        .select()
        .from(loyaltyCustomerTable)
        .where(eq(loyaltyCustomerTable.email, customerEmail.toLowerCase()))
        .limit(1);

      isLoyaltyMember = !!existingLoyaltyCustomer;
    }

    if (!order) {
      // Order not created yet by webhook, but we can parse items from session metadata
      const itemsFromMetadata = session.metadata?.items
        ? JSON.parse(session.metadata.items)
        : [];

      return {
        session,
        order: null,
        items: itemsFromMetadata.map((item: any) => ({
          id: `temp-${item.productId}`,
          quantity: item.quantity,
          priceAtPurchase: item.price,
          productName: item.name,
          productImage: null,
        })),
        totalAmount: session.amount_total || 0,
        isLoyaltyMember,
      };
    }

    // Get order items with product details
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

    return {
      session,
      order,
      items,
      totalAmount: order.totalAmount,
      isLoyaltyMember,
    };
  } catch (error) {
    console.error("Error fetching order:", error);
    return null;
  }
}

async function OrderDetails({ sessionId }: { sessionId: string }) {
  const data = await getOrderFromSession(sessionId);

  if (!data) {
    notFound();
  }

  const { session, order, items, totalAmount, isLoyaltyMember } = data;

  // Get payment status from DB order if available, otherwise fall back to Stripe session
  // Find status key by comparing against raw status values (not labels)
  const paymentStatusKey = order
    ? Object.entries(PAYMENT_STATUS_LABELS).find(
        ([key, value]) => PAYMENT_STATUS[key as keyof typeof PAYMENT_STATUS] === order.paymentStatus
      )?.[0] as keyof typeof PAYMENT_STATUS_LABELS | undefined
    : (session.payment_status === 'paid' ? 'PAID' : 'PENDING') as const;

  // Get order status from DB order if available
  const statusKey = order
    ? Object.entries(ORDER_STATUS_LABELS).find(
        ([key, value]) => ORDER_STATUS[key as keyof typeof ORDER_STATUS] === order.status
      )?.[0] as keyof typeof ORDER_STATUS_LABELS | undefined
    : 'PENDING' as const;

  // Use session customer details as fallback
  const customerEmail = order?.customerEmail || session.customer_details?.email || session.customer_email || '';
  const customerName = order?.customerName || session.customer_details?.name || 'Guest';
  const orderId = order?.id || 'Processing...';

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
            {orderId === 'Processing...' ? orderId : `Order #${orderId.substring(4, 12).toUpperCase()}`}
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
                  className={PAYMENT_STATUS_COLORS[paymentStatusKey as keyof typeof PAYMENT_STATUS_COLORS]}
                >
                  {PAYMENT_STATUS_LABELS[paymentStatusKey as keyof typeof PAYMENT_STATUS_LABELS]}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-muted-foreground">Order Status:</span>
                <Badge
                  variant="secondary"
                  className={statusKey ? ORDER_STATUS_COLORS[statusKey] : ""}
                >
                  {ORDER_STATUS_LABELS[statusKey || 'PENDING']}
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
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          Quantity: {item.quantity}
                        </p>
                      </div>
                      <p className="font-medium">
                        ${((item.priceAtPurchase * item.quantity) / 100).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total</span>
                <span>${(totalAmount / 100).toFixed(2)}</span>
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

      {!isLoyaltyMember && customerEmail && (
        <div className="mt-6">
          <LoyaltySignupCTA
            customerEmail={customerEmail}
            customerName={customerName}
          />
        </div>
      )}

      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Your order will be ready for pickup soon. We&apos;ll notify you when it&apos;s ready.
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

  if (!sessionId) {
    notFound();
  }

  return (
    <Suspense fallback={<LoadingState />}>
      <OrderDetails sessionId={sessionId} />
    </Suspense>
  );
}
