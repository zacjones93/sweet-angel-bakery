"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  getProfileSettingsAction,
  updateProfileSettingsAction,
} from "../_actions/profile-settings.action";
import { useServerAction } from "zsa-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { toast } from "sonner";

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callback");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [streetAddress1, setStreetAddress1] = useState("");
  const [streetAddress2, setStreetAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");

  const { execute: getSettings, isPending: isLoading } = useServerAction(
    getProfileSettingsAction
  );
  const {
    execute: updateSettings,
    isPending: isUpdating,
    error,
  } = useServerAction(updateProfileSettingsAction);

  useEffect(() => {
    async function loadSettings() {
      const [data] = await getSettings({});
      if (data) {
        setFirstName(data.firstName || "");
        setLastName(data.lastName || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setStreetAddress1(data.streetAddress1 || "");
        setStreetAddress2(data.streetAddress2 || "");
        setCity(data.city || "");
        setState(data.state || "");
        setZipCode(data.zipCode || "");
      }
    }
    loadSettings();
  }, [getSettings]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    const [, err] = await updateSettings({
      firstName,
      lastName,
      phone: phone || null,
      streetAddress1: streetAddress1 || null,
      streetAddress2: streetAddress2 || null,
      city: city || null,
      state: state || null,
      zipCode: zipCode || null,
    });

    if (!err) {
      toast.success("Settings saved successfully!");
      if (callbackUrl) {
        // Redirect back to callback URL with a timestamp to trigger refresh
        const separator = callbackUrl.includes("?") ? "&" : "?";
        router.push(`${callbackUrl}${separator}updated=${Date.now()}` as Route);
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold mb-2">
          Account Settings
        </h2>
        <p className="text-muted-foreground">
          {callbackUrl
            ? "Update your information and we'll return you to checkout"
            : "Update your personal information"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Keep your contact information up to date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed. Contact support if you need to update
                your email.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Used for SMS notifications. You can manage SMS preferences in
                the Notifications tab.
              </p>
            </div>

            <div className="pt-4 border-t">
              <h3 className="text-sm font-semibold mb-1">Delivery Address</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Required for delivery orders. We'll use this address to deliver
                your treats.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="streetAddress1">Street Address</Label>
              <Input
                id="streetAddress1"
                type="text"
                placeholder="123 Main St"
                value={streetAddress1}
                onChange={(e) => setStreetAddress1(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="streetAddress2">
                Apt, Suite, etc. (Optional)
              </Label>
              <Input
                id="streetAddress2"
                type="text"
                placeholder="Apt 4B"
                value={streetAddress2}
                onChange={(e) => setStreetAddress2(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  type="text"
                  placeholder="Austin"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  type="text"
                  placeholder="78701"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error.message}
              </div>
            )}

            <Button type="submit" disabled={isUpdating} size="lg">
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : callbackUrl ? (
                "Save & Return to Checkout"
              ) : (
                "Save Changes"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Loyalty Program Membership</CardTitle>
          <CardDescription>You&apos;re a valued loyalty member</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Member Email:</span>
              <span className="font-medium">{email}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-medium text-green-600">Active</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">Your Benefits:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Early access to product drops (24h before public)</li>
              <li>• Email notifications for new products</li>
              <li>• Order history and tracking</li>
              <li>• Optional SMS updates</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
