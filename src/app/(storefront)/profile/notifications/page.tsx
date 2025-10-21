"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { getNotificationPreferencesAction, updateNotificationPreferencesAction } from "../_actions/notification-preferences.action";
import { useServerAction } from "zsa-react";

interface NotificationPreferences {
  emailNewFlavors: boolean;
  emailDrops: boolean;
  smsDelivery: boolean;
  smsDrops: boolean;
}

export default function NotificationsPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNewFlavors: true,
    emailDrops: true,
    smsDelivery: false,
    smsDrops: false,
  });

  const { execute: getPreferences, isPending: isLoading } = useServerAction(getNotificationPreferencesAction);
  const { execute: updatePreferences, isPending: isUpdating, error } = useServerAction(updateNotificationPreferencesAction);

  useEffect(() => {
    async function loadPreferences() {
      const [data, err] = await getPreferences({});
      if (data?.preferences) {
        setPreferences(data.preferences);
      }
    }
    loadPreferences();
  }, [getPreferences]);

  async function handleSave() {
    const [data, err] = await updatePreferences({ preferences });
    if (!err) {
      // Show success message
      alert("Preferences saved successfully!");
    }
  }

  function updatePreference(key: keyof NotificationPreferences, value: boolean) {
    setPreferences((prev) => ({ ...prev, [key]: value }));
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
        <h2 className="text-2xl font-display font-bold mb-2">Notification Preferences</h2>
        <p className="text-muted-foreground">
          Manage how you receive updates from Sweet Angel Bakery
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>
            Stay informed about new products and exclusive drops
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="emailNewFlavors" className="text-base">
                New Flavor Alerts
              </Label>
              <p className="text-sm text-muted-foreground">
                Get notified when we release new cookie and cake flavors
              </p>
            </div>
            <Switch
              id="emailNewFlavors"
              checked={preferences.emailNewFlavors}
              onCheckedChange={(checked) => updatePreference("emailNewFlavors", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="emailDrops" className="text-base">
                Product Drop Announcements
              </Label>
              <p className="text-sm text-muted-foreground">
                Get early access notifications for limited product releases
              </p>
            </div>
            <Switch
              id="emailDrops"
              checked={preferences.emailDrops}
              onCheckedChange={(checked) => updatePreference("emailDrops", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SMS Notifications</CardTitle>
          <CardDescription>
            Receive text messages for order updates and time-sensitive alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="smsDelivery" className="text-base">
                Order Updates
              </Label>
              <p className="text-sm text-muted-foreground">
                Get SMS updates when your order is ready or out for delivery
              </p>
            </div>
            <Switch
              id="smsDelivery"
              checked={preferences.smsDelivery}
              onCheckedChange={(checked) => updatePreference("smsDelivery", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="smsDrops" className="text-base">
                Product Drop Alerts
              </Label>
              <p className="text-sm text-muted-foreground">
                Get text alerts for time-sensitive product drops
              </p>
            </div>
            <Switch
              id="smsDrops"
              checked={preferences.smsDrops}
              onCheckedChange={(checked) => updatePreference("smsDrops", checked)}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Note: SMS notifications require a phone number. Update your phone number in Settings.
          </p>
        </CardContent>
      </Card>

      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {error.message}
        </div>
      )}

      <Button onClick={handleSave} disabled={isUpdating} size="lg">
        {isUpdating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Preferences"
        )}
      </Button>
    </div>
  );
}
