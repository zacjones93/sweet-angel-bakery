"use client";

import { useCart } from "@/state/cart-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSearchParams } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { createCheckoutSessionAction } from "../_actions/create-checkout-session.action";
import { useServerAction } from "zsa-react";
import { Loader2, Pencil } from "lucide-react";
import Link from "next/link";
import { calculateOrderTotals, formatCents } from "@/utils/tax";
import { getCurrentLoyaltyCustomerAction } from "../_actions/get-current-loyalty-customer.action";

export default function CheckoutPage() {
  const { items, totalAmount, clearCart } = useCart();
  const searchParams = useSearchParams();
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [joinLoyalty, setJoinLoyalty] = useState(true);
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [streetAddress1, setStreetAddress1] = useState("");
  const [streetAddress2, setStreetAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    streetAddress1: string | null;
    streetAddress2: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
  } | null>(null);
  const [isLoadingLoyalty, setIsLoadingLoyalty] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const { execute: getLoyaltyCustomer } = useServerAction(
    getCurrentLoyaltyCustomerAction
  );

  // Load current user on mount and when returning from profile edit
  useEffect(() => {
    async function loadCurrentUser() {
      setIsLoadingLoyalty(true);
      const [data] = await getLoyaltyCustomer({});
      if (data) {
        setCurrentUser(data);
        setCustomerName(`${data.firstName || ""} ${data.lastName || ""}`);
        setCustomerEmail(data.email || "");
        setCustomerPhone(data.phone || "");
        setStreetAddress1(data.streetAddress1 || "");
        setStreetAddress2(data.streetAddress2 || "");
        setCity(data.city || "");
        setState(data.state || "");
        setZipCode(data.zipCode || "");
        // Already a loyalty member, no need to join again
        setJoinLoyalty(false);
      }
      setIsLoadingLoyalty(false);
    }
    loadCurrentUser();
  }, [getLoyaltyCustomer, searchParams]); // Re-load when returning from edit

  const { execute, isPending, error } = useServerAction(
    createCheckoutSessionAction
  );

  // Calculate tax and totals
  const orderTotals = useMemo(() => {
    return calculateOrderTotals(totalAmount);
  }, [totalAmount]);

  function formatPrice(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();

    if (items.length === 0) {
      return;
    }

    const [data, err] = await execute({
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        customizations: item.customizations,
        name: item.name,
        price: item.price,
      })),
      customerEmail,
      customerName,
      customerPhone: customerPhone || undefined,
      joinLoyalty,
      smsOptIn,
      userId: currentUser?.id, // Pass user ID if logged in
      streetAddress1: streetAddress1 || undefined,
      streetAddress2: streetAddress2 || undefined,
      city: city || undefined,
      state: state || undefined,
      zipCode: zipCode || undefined,
    });

    if (err) {
      console.error("Checkout error:", err);
      return;
    }

    if (data?.url) {
      // Set redirecting state before clearing cart to prevent empty state flash
      setIsRedirecting(true);
      // Clear cart before redirecting
      clearCart();
      // Redirect to payment provider checkout (Stripe or Square)
      window.location.href = data.url;
    }
  }

  if (items.length === 0) {
    if (isRedirecting) {
      return (
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <h1 className="text-2xl font-display font-bold mb-2">
              Redirecting to checkout...
            </h1>
            <p className="text-muted-foreground">
              Please wait while we prepare your order
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-display font-bold mb-4">
            Your Cart is Empty
          </h1>
          <p className="text-muted-foreground mb-8">
            Add some items to your cart before checking out.
          </p>
          <Button asChild>
            <Link href="/">Browse Products</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-display font-bold mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
              <CardDescription>
                {currentUser
                  ? "We'll use your loyalty member information for this order"
                  : "Enter your details to complete your order"}
              </CardDescription>
              {!currentUser && !isLoadingLoyalty && (
                <p className="text-sm text-muted-foreground pt-2">
                  Already a loyalty member?{" "}
                  <Link
                    href={`/login?callback=${encodeURIComponent("/checkout")}`}
                    className="text-primary underline underline-offset-4 hover:no-underline font-medium"
                  >
                    Log in here
                  </Link>
                </p>
              )}
            </CardHeader>
            <CardContent>
              {isLoadingLoyalty ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <form onSubmit={handleCheckout} className="space-y-4">
                  {currentUser && (
                    <div className="rounded-lg bg-bakery-pink/10 border border-bakery-pink/20 p-4 space-y-3 mb-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-bakery-pink uppercase">
                              Loyalty Member
                            </span>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">
                              {customerName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {customerEmail}
                            </p>
                            {customerPhone && (
                              <p className="text-sm text-muted-foreground">
                                {customerPhone}
                              </p>
                            )}
                            {streetAddress1 && (
                              <div className="text-sm text-muted-foreground mt-2 pt-2 border-t">
                                <p>{streetAddress1}</p>
                                {streetAddress2 && <p>{streetAddress2}</p>}
                                <p>{city}, {state} {zipCode}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <Link
                            href={`/profile/settings?callback=${encodeURIComponent(
                              "/checkout"
                            )}`}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Need to update your information? Click Edit to go to
                        your profile settings.
                      </p>
                    </div>
                  )}

                  {!currentUser && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          type="text"
                          placeholder="John Doe"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@example.com"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          required
                        />
                      </div>

                      <div className="rounded-lg bg-bakery-pink/10 border border-bakery-pink/20 p-4 space-y-3">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id="joinLoyalty"
                            checked={joinLoyalty}
                            onCheckedChange={(checked: boolean) =>
                              setJoinLoyalty(checked === true)
                            }
                          />
                          <div className="grid gap-2 leading-none flex-1">
                            <label
                              htmlFor="joinLoyalty"
                              className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              Join our loyalty program (recommended)
                            </label>
                            <p className="text-xs text-muted-foreground">
                              Get early access to product drops (24h before
                              public), view your order history, and receive
                              notifications about new treats and special
                              releases.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number (Optional)</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="(555) 123-4567"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Get SMS updates on your order and exclusive early
                          access to product drops
                        </p>
                      </div>

                      {customerPhone && (
                        <div className="flex items-start space-x-2">
                          <Checkbox
                            id="smsOptIn"
                            checked={smsOptIn}
                            onCheckedChange={(checked: boolean) =>
                              setSmsOptIn(checked === true)
                            }
                          />
                          <div className="grid gap-1.5 leading-none">
                            <label
                              htmlFor="smsOptIn"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              Yes, send me SMS notifications about my order and
                              special drops
                            </label>
                            <p className="text-xs text-muted-foreground">
                              You can unsubscribe at any time by replying STOP
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="pt-4 border-t">
                        <h3 className="text-sm font-semibold mb-3">Delivery Address</h3>
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor="streetAddress1">Street Address</Label>
                            <Input
                              id="streetAddress1"
                              type="text"
                              placeholder="123 Main St"
                              value={streetAddress1}
                              onChange={(e) => setStreetAddress1(e.target.value)}
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="streetAddress2">Apt, Suite, etc. (Optional)</Label>
                            <Input
                              id="streetAddress2"
                              type="text"
                              placeholder="Apt 4B"
                              value={streetAddress2}
                              onChange={(e) => setStreetAddress2(e.target.value)}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor="city">City</Label>
                              <Input
                                id="city"
                                type="text"
                                placeholder="Austin"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="state">State</Label>
                              <Input
                                id="state"
                                type="text"
                                placeholder="TX"
                                value={state}
                                onChange={(e) => setState(e.target.value)}
                                required
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="zipCode">ZIP Code</Label>
                            <Input
                              id="zipCode"
                              type="text"
                              placeholder="78701"
                              value={zipCode}
                              onChange={(e) => setZipCode(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {error && (
                    <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                      {error.message}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isPending || items.length === 0}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Continue to Payment"
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-20">
            <h2 className="text-xl font-display font-bold mb-4">
              Order Summary
            </h2>

            <div className="space-y-3 mb-6">
              {items.map((item) => (
                <div
                  key={item.cartItemId}
                  className="flex justify-between text-sm"
                >
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-muted-foreground">
                      Qty: {item.quantity}
                    </p>
                  </div>
                  <p className="font-medium">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatCents(orderTotals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Tax (6%)</span>
                <span>{formatCents(orderTotals.tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total</span>
                <span>{formatCents(orderTotals.total)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
