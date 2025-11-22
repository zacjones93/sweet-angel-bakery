"use client";

import { useState } from "react";
import { useServerAction } from "zsa-react";
import { updateAdminNotificationPreferencesAction } from "../_actions/admin-settings.action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface AdminNotificationSettingsProps {
  initialPreferences: {
    emailNewOrders: boolean;
    newOrderEmailAddress: string | null;
  };
}

export function AdminNotificationSettings({
  initialPreferences,
}: AdminNotificationSettingsProps) {
  const [emailNewOrders, setEmailNewOrders] = useState(initialPreferences.emailNewOrders);
  const [newOrderEmailAddress, setNewOrderEmailAddress] = useState(
    initialPreferences.newOrderEmailAddress || ""
  );

  const { execute, isPending } = useServerAction(
    updateAdminNotificationPreferencesAction
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const [data, err] = await execute({
      emailNewOrders,
      newOrderEmailAddress: newOrderEmailAddress.trim() || null,
    });

    if (err) {
      toast.error("Failed to save settings", {
        description: err.message,
      });
      return;
    }

    toast.success("Settings saved successfully");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Notifications</CardTitle>
        <CardDescription>
          Configure email notifications for new orders
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-new-orders">Email me when new orders come in</Label>
              <p className="text-sm text-muted-foreground">
                Receive an email notification whenever a customer places an order
              </p>
            </div>
            <Switch
              id="email-new-orders"
              checked={emailNewOrders}
              onCheckedChange={setEmailNewOrders}
            />
          </div>

          {emailNewOrders && (
            <div className="space-y-2">
              <Label htmlFor="custom-email">
                Custom notification email (optional)
              </Label>
              <Input
                id="custom-email"
                type="email"
                placeholder="orders@sweetangelbakery.com"
                value={newOrderEmailAddress}
                onChange={(e) => setNewOrderEmailAddress(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Leave blank to use your account email
              </p>
            </div>
          )}

          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
