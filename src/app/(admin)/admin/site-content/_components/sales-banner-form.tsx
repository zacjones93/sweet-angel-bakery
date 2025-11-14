"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useServerAction } from "zsa-react";
import { upsertSalesBannerAction, deleteSalesBannerAction } from "../_actions/sales-banner.action";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { SalesBanner } from "@/db/schema";
import { Trash } from "lucide-react";

interface SalesBannerFormProps {
  initialBanner: SalesBanner | null;
}

export function SalesBannerForm({ initialBanner }: SalesBannerFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("#FCACC5"); // bakery-pink
  const [textColor, setTextColor] = useState("#000000"); // black for pink bg
  const [endDateTime, setEndDateTime] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isDismissible, setIsDismissible] = useState(true);
  const [ctaText, setCtaText] = useState("");
  const [ctaLink, setCtaLink] = useState("");

  // Populate form with initial banner data
  useEffect(() => {
    if (initialBanner) {
      setMessage(initialBanner.message);
      setBackgroundColor(initialBanner.backgroundColor);
      setTextColor(initialBanner.textColor);
      setEndDateTime(
        new Date(initialBanner.endDateTime).toISOString().slice(0, 16)
      );
      setIsActive(initialBanner.isActive === 1);
      setIsDismissible(initialBanner.isDismissible === 1);
      setCtaText(initialBanner.ctaText || "");
      setCtaLink(initialBanner.ctaLink || "");
    }
  }, [initialBanner]);

  const { execute: upsertBanner, isPending } = useServerAction(
    upsertSalesBannerAction,
    {
      onSuccess: () => {
        toast.success("Banner saved successfully");
        router.refresh();
      },
      onError: ({ err }) => {
        toast.error(err.message);
      },
    }
  );

  const { execute: deleteBanner, isPending: isDeleting } = useServerAction(
    deleteSalesBannerAction,
    {
      onSuccess: () => {
        toast.success("Banner deleted successfully");
        resetForm();
        router.refresh();
      },
      onError: ({ err }) => {
        toast.error(err.message);
      },
    }
  );

  function resetForm() {
    setMessage("");
    setBackgroundColor("#FCACC5"); // bakery-pink
    setTextColor("#000000"); // black for pink bg
    setEndDateTime("");
    setIsActive(true);
    setIsDismissible(true);
    setCtaText("");
    setCtaLink("");
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!message || !endDateTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    upsertBanner({
      id: initialBanner?.id,
      message,
      backgroundColor,
      textColor,
      endDateTime: new Date(endDateTime),
      isActive,
      isDismissible,
      ctaText: ctaText || undefined,
      ctaLink: ctaLink || undefined,
    });
  };

  const handleDelete = () => {
    if (!initialBanner) return;
    if (!confirm("Delete this banner? This action cannot be undone.")) return;
    deleteBanner({ id: initialBanner.id });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sales Banner</h2>
          <p className="text-sm text-muted-foreground">
            Configure the sticky top banner with countdown timer and scrolling message.
            All dates/times are in Mountain Time (America/Boise).
          </p>
        </div>
        {initialBanner && (
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash className="h-4 w-4 mr-2" />
            Delete Banner
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{initialBanner ? "Edit Banner" : "Create Banner"}</CardTitle>
          <CardDescription>
            The banner will appear at the top of all pages when active and before the countdown expires.
            All dates/times are in Mountain Time (America/Boise).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                placeholder="e.g., Holiday Sale! Get 20% off all orders until..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isPending}
                maxLength={500}
                rows={3}
                required
              />
              <p className="text-xs text-muted-foreground">
                {message.length} / 500 characters • This message will scroll horizontally
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDateTime">Countdown End Date & Time (MT) *</Label>
              <Input
                id="endDateTime"
                type="datetime-local"
                value={endDateTime}
                onChange={(e) => setEndDateTime(e.target.value)}
                disabled={isPending}
                required
              />
              <p className="text-xs text-muted-foreground">
                Banner will hide automatically after this Mountain Time. Countdown updates in real-time for all visitors.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="backgroundColor">Background Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="backgroundColor"
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    disabled={isPending}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    disabled={isPending}
                    placeholder="#ef4444"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="textColor">Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="textColor"
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    disabled={isPending}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    disabled={isPending}
                    placeholder="#ffffff"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <h3 className="font-medium">Call-to-Action Button (Optional)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ctaText">Button Text</Label>
                  <Input
                    id="ctaText"
                    placeholder="e.g., Shop Now"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    disabled={isPending}
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ctaLink">Button Link</Label>
                  <Input
                    id="ctaLink"
                    placeholder="e.g., /products"
                    value={ctaLink}
                    onChange={(e) => setCtaLink(e.target.value)}
                    disabled={isPending}
                    maxLength={500}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="isActive" className="cursor-pointer">
                  Active
                </Label>
                <p className="text-sm text-muted-foreground">
                  Show this banner on the site
                </p>
              </div>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
                disabled={isPending}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="isDismissible" className="cursor-pointer">
                  Dismissible
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow users to close the banner (remembered via localStorage)
                </p>
              </div>
              <Switch
                id="isDismissible"
                checked={isDismissible}
                onCheckedChange={setIsDismissible}
                disabled={isPending}
              />
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div
                className="p-4 rounded-lg text-center"
                style={{
                  backgroundColor,
                  color: textColor,
                }}
              >
                <p className="font-medium">{message || "Your message will appear here..."}</p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={isPending}
                className="flex-1"
              >
                Reset
              </Button>
              <Button
                type="submit"
                disabled={isPending || !message || !endDateTime}
                className="flex-1"
              >
                {isPending
                  ? "Saving..."
                  : initialBanner
                  ? "Update Banner"
                  : "Create Banner"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
