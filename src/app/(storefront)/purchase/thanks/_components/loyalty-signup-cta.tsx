"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Phone, CheckCircle, Gift } from "lucide-react";
import { createLoyaltyCustomerAction } from "@/app/(storefront)/signup/_actions/create-loyalty-customer.action";
import { useServerAction } from "zsa-react";

type Props = {
  customerEmail: string;
  customerName: string;
};

export function LoyaltySignupCTA({ customerEmail, customerName }: Props) {
  const [phone, setPhone] = useState("");
  const [success, setSuccess] = useState(false);

  const { execute, isPending, error } = useServerAction(
    createLoyaltyCustomerAction
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Parse name (simple split)
    const nameParts = customerName.split(" ");
    const firstName = nameParts[0] || customerName;
    const lastName = nameParts.slice(1).join(" ") || "";

    const [, err] = await execute({
      email: customerEmail,
      firstName,
      lastName,
      phone: phone || undefined,
      notificationPreferences: {
        emailNewFlavors: true,
        emailDrops: true,
        smsDelivery: phone ? true : false,
        smsDrops: phone ? true : false,
      },
    });

    if (err) {
      console.error("Signup error:", err);
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-lg">You&apos;re All Set!</CardTitle>
          <CardDescription>
            Check your email for a login link to access your loyalty account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-white/50 dark:bg-black/20 p-3 text-xs space-y-1">
            <p className="font-medium">Your Benefits:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li className="flex items-start">
                <span className="mr-1.5">✓</span>
                <span>24h early access to product drops</span>
              </li>
              <li className="flex items-start">
                <span className="mr-1.5">✓</span>
                <span>Order history &amp; tracking</span>
              </li>
              <li className="flex items-start">
                <span className="mr-1.5">✓</span>
                <span>New product notifications</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Gift className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">
              Track Your Order &amp; Get Exclusive Access
            </CardTitle>
            <CardDescription className="mt-1">
              Join our loyalty program to track orders, get early drop access,
              and more
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm">
              Phone Number{" "}
              <span className="text-muted-foreground font-normal">
                (Optional)
              </span>
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                placeholder="(208) 555-0123"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Get SMS order updates and drop notifications
            </p>
          </div>

          {error && (
            <div className="p-2 text-xs text-destructive bg-destructive/10 rounded-md">
              {error.message}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            size="default"
            disabled={isPending}
          >
            {isPending ? "Creating Account..." : "Join Loyalty Program"}
          </Button>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="text-center">
              <p className="text-xs font-medium">Early Access</p>
              <p className="text-[10px] text-muted-foreground">
                24h before public
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium">Order Tracking</p>
              <p className="text-[10px] text-muted-foreground">View history</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium">Notifications</p>
              <p className="text-[10px] text-muted-foreground">New products</p>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
