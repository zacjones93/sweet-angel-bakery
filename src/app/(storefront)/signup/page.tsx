"use client";

import { useState } from "react";
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
import { Mail, CheckCircle, User, Phone } from "lucide-react";
import { createLoyaltyCustomerAction } from "./_actions/create-loyalty-customer.action";
import { useServerAction } from "zsa-react";
import Link from "next/link";

export default function SignupPage() {
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    emailNewFlavors: true,
    emailDrops: true,
    smsDelivery: false,
    smsDrops: false,
  });
  const [submitted, setSubmitted] = useState(false);

  const { execute, isPending, error } = useServerAction(
    createLoyaltyCustomerAction
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const [, err] = await execute({
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone || undefined,
      notificationPreferences: {
        emailNewFlavors: formData.emailNewFlavors,
        emailDrops: formData.emailDrops,
        smsDelivery: formData.smsDelivery,
        smsDrops: formData.smsDrops,
      },
    });

    if (err) {
      console.error("Signup error:", err);
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>Welcome to the Loyalty Program!</CardTitle>
              <CardDescription>
                Check your email at <strong>{formData.email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                We&apos;ve sent you a login link. Click it to access your loyalty
                account and start enjoying exclusive perks!
              </p>
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <p className="text-sm font-semibold">Your Benefits:</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>Early access to product drops</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>Order history tracking</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>New product notifications</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-24">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-display">
              Join Our Loyalty Program
            </CardTitle>
            <CardDescription>
              Get exclusive early access to drops, order tracking, and more
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="Jane"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                      required
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(208) 555-0123"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  For SMS order updates and drop notifications
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <Label className="text-sm font-medium">
                  Notification Preferences
                </Label>

                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="emailNewFlavors"
                      checked={formData.emailNewFlavors}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          emailNewFlavors: checked === true,
                        })
                      }
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="emailNewFlavors"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Email me about new treats
                      </label>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="emailDrops"
                      checked={formData.emailDrops}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          emailDrops: checked === true,
                        })
                      }
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="emailDrops"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Email me about product drops
                      </label>
                    </div>
                  </div>

                  {formData.phone && (
                    <>
                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id="smsDelivery"
                          checked={formData.smsDelivery}
                          onCheckedChange={(checked) =>
                            setFormData({
                              ...formData,
                              smsDelivery: checked === true,
                            })
                          }
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor="smsDelivery"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            SMS me delivery updates
                          </label>
                        </div>
                      </div>

                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id="smsDrops"
                          checked={formData.smsDrops}
                          onCheckedChange={(checked) =>
                            setFormData({
                              ...formData,
                              smsDrops: checked === true,
                            })
                          }
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor="smsDrops"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            SMS me about product drops
                          </label>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                  {error.message}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isPending}
              >
                {isPending ? "Creating Account..." : "Join Loyalty Program"}
              </Button>

              <div className="pt-4 text-center text-sm text-muted-foreground">
                <p>
                  Already a member?{" "}
                  <Link
                    href="/login"
                    className="text-primary underline underline-offset-4 hover:no-underline"
                  >
                    Login here
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 rounded-lg border bg-muted/50 p-6">
          <h3 className="font-semibold mb-2">What You&apos;ll Get</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start">
              <span className="mr-2">⚡</span>
              <span>
                24 hours early access to product drops before the public
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">📱</span>
              <span>Complete order history and tracking</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">🔔</span>
              <span>Notifications about new treats and special releases</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">💬</span>
              <span>Optional SMS updates for orders and drops</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
