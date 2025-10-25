"use client";

import Link from "next/link";
import type { Route } from "next";
import { ShoppingCart, Menu, User, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/state/cart-context";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useServerAction } from "zsa-react";
import { getCurrentLoyaltyCustomerAction } from "../_actions/get-current-loyalty-customer.action";
import ThemeSwitch from "@/components/theme-switch";

export function StorefrontNav() {
  const { items } = useCart();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    role: "admin" | "user";
  } | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const { execute: getCurrentUser } = useServerAction(
    getCurrentLoyaltyCustomerAction
  );

  useEffect(() => {
    async function loadCurrentUser() {
      setIsLoadingUser(true);
      const [data] = await getCurrentUser({});
      if (data) {
        const { ...userData } = data;
        setCurrentUser(userData as typeof currentUser);
      }
      setIsLoadingUser(false);
    }
    loadCurrentUser();
  }, [getCurrentUser]);

  return (
    <nav className="border-b bg-background sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-20 items-center justify-between">
          <div className="flex items-center gap-12">
            <Link
              href="/"
              className="relative h-12 w-48 flex-shrink-0 flex flex-col items-center justify-center gap-1"
            >
              <span className="font-script text-bakery-pink">Sweet Angel</span>
              <span className="font-display text-bakery-blue uppercase">
                Bakery
              </span>
            </Link>

            <div className="hidden lg:flex gap-8">
              <Link
                href={"/products" as Route}
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                All Products
              </Link>
              <Link
                href={"/products/cakes" as Route}
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Cakes
              </Link>
              <Link
                href={"/products/cookies" as Route}
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Cookies
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Desktop only: Sign In, Admin, Profile, Theme */}
            <div className="hidden md:flex items-center gap-4">
              {isLoadingUser ? (
                <Skeleton className="h-10 w-10 rounded-full" />
              ) : (
                <>
                  {currentUser?.role === "admin" && (
                    <Button variant="ghost" size="icon" asChild>
                      <Link href="/admin">
                        <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <span className="sr-only">Admin</span>
                      </Link>
                    </Button>
                  )}
                  {currentUser ? (
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
                </>
              )}

              <ThemeSwitch className="border-none" />
            </div>

            {/* Mobile & Desktop: Cart */}
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
              <SheetContent side="right" className="w-[280px] sm:w-[320px] px-6">
                <VisuallyHidden>
                  <SheetTitle>Navigation Menu</SheetTitle>
                </VisuallyHidden>
                <div className="mt-10 flex flex-col gap-1">
                  <Link
                    href={"/products" as Route}
                    className="text-lg font-medium hover:text-primary hover:bg-muted/50 transition-colors px-4 py-3 rounded-md"
                    onClick={() => setIsOpen(false)}
                  >
                    All Products
                  </Link>
                  <Link
                    href={"/products/cakes" as Route}
                    className="text-lg font-medium hover:text-primary hover:bg-muted/50 transition-colors px-4 py-3 rounded-md"
                    onClick={() => setIsOpen(false)}
                  >
                    Cakes
                  </Link>
                  <Link
                    href={"/products/cookies" as Route}
                    className="text-lg font-medium hover:text-primary hover:bg-muted/50 transition-colors px-4 py-3 rounded-md"
                    onClick={() => setIsOpen(false)}
                  >
                    Cookies
                  </Link>
                  {currentUser && (
                    <>
                      <div className="border-t my-3" />
                      <Link
                        href="/profile"
                        className="text-lg font-medium hover:text-primary hover:bg-muted/50 transition-colors px-4 py-3 rounded-md"
                        onClick={() => setIsOpen(false)}
                      >
                        Profile
                      </Link>
                      {currentUser.role === "admin" && (
                        <Link
                          href="/admin"
                          className="text-lg font-medium hover:text-primary hover:bg-muted/50 transition-colors text-red-600 dark:text-red-400 px-4 py-3 rounded-md"
                          onClick={() => setIsOpen(false)}
                        >
                          Admin
                        </Link>
                      )}
                    </>
                  )}
                  {!currentUser && (
                    <>
                      <div className="border-t my-3" />
                      <Link
                        href="/login"
                        className="text-lg font-medium hover:text-primary hover:bg-muted/50 transition-colors px-4 py-3 rounded-md"
                        onClick={() => setIsOpen(false)}
                      >
                        Sign In
                      </Link>
                    </>
                  )}
                  <div className="border-t my-3" />
                  <ThemeSwitch className="border-none w-full px-4 py-3">
                    Theme
                  </ThemeSwitch>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
