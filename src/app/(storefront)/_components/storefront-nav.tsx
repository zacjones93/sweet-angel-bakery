"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/state/cart-context";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useServerAction } from "zsa-react";
import { getCurrentLoyaltyCustomerAction } from "../_actions/get-current-loyalty-customer.action";

export function StorefrontNav() {
  const { items } = useCart();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const [isOpen, setIsOpen] = useState(false);
  const [loyaltyCustomer, setLoyaltyCustomer] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  } | null>(null);
  const [isLoadingLoyalty, setIsLoadingLoyalty] = useState(true);

  const { execute: getLoyaltyCustomer } = useServerAction(
    getCurrentLoyaltyCustomerAction
  );

  useEffect(() => {
    async function loadLoyaltyCustomer() {
      setIsLoadingLoyalty(true);
      const [data] = await getLoyaltyCustomer({});
      if (data) {
        setLoyaltyCustomer(data);
      }
      setIsLoadingLoyalty(false);
    }
    loadLoyaltyCustomer();
  }, [getLoyaltyCustomer]);

  return (
    <nav className="border-b bg-background sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-20 items-center justify-between">
          <div className="flex items-center gap-12">
            <Link href="/" className="relative h-12 w-48 flex-shrink-0 flex flex-col items-center justify-center gap-1">
              <span className="font-script text-bakery-pink">Sweet Angel</span>
              <span className="font-display text-bakery-blue uppercase">Bakery</span>
            </Link>

            <div className="hidden lg:flex gap-8">
              <Link
                href="/products"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                All Products
              </Link>
              <Link
                href="/products/cakes"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Cakes
              </Link>
              <Link
                href="/products/cookies"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Cookies
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isLoadingLoyalty ? (
              <Skeleton className="h-10 w-10 rounded-full" />
            ) : loyaltyCustomer ? (
              <Button variant="ghost" size="icon" asChild>
                <Link href="/profile">
                  <User className="h-5 w-5" />
                  <span className="sr-only">Profile</span>
                </Link>
              </Button>
            ) : (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            )}

            <Button variant="ghost" asChild className="relative">
              <Link href="/cart">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs bg-primary">
                    {itemCount}
                  </Badge>
                )}
              </Link>
            </Button>

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="mt-8 flex flex-col gap-4">
                  <Link
                    href="/products"
                    className="text-lg font-medium hover:text-primary transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    All Products
                  </Link>
                  <Link
                    href="/products/cakes"
                    className="text-lg font-medium hover:text-primary transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Cakes
                  </Link>
                  <Link
                    href="/products/cookies"
                    className="text-lg font-medium hover:text-primary transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Cookies
                  </Link>
                  {loyaltyCustomer && (
                    <>
                      <div className="border-t my-2" />
                      <Link
                        href="/profile"
                        className="text-lg font-medium hover:text-primary transition-colors"
                        onClick={() => setIsOpen(false)}
                      >
                        Profile
                      </Link>
                    </>
                  )}
                  {!loyaltyCustomer && (
                    <>
                      <div className="border-t my-2" />
                      <Link
                        href="/login"
                        className="text-lg font-medium hover:text-primary transition-colors"
                        onClick={() => setIsOpen(false)}
                      >
                        Sign In
                      </Link>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
