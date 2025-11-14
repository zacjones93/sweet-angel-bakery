"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useServerAction } from "zsa-react";
import {
  createHomeNotificationAction,
  updateHomeNotificationAction,
} from "../_actions/home-notifications.action";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { HomeNotification } from "@/db/schema";
import Image from "next/image";
import { Upload, X } from "lucide-react";

interface NotificationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification?: HomeNotification | null;
}

export function NotificationFormDialog({
  open,
  onOpenChange,
  notification,
}: NotificationFormDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (notification) {
      setTitle(notification.title);
      setMessage(notification.message);
      setImageUrl(notification.imageUrl || "");
      setImagePreview(notification.imageUrl || "");
      setIsActive(notification.isActive === 1);
      setDisplayOrder(notification.displayOrder);
      setStartDate(
        notification.startDate
          ? new Date(notification.startDate).toISOString().split("T")[0]
          : ""
      );
      setEndDate(
        notification.endDate
          ? new Date(notification.endDate).toISOString().split("T")[0]
          : ""
      );
    } else {
      resetForm();
    }
  }, [notification]);

  const { execute: createNotification, isPending: isCreating } = useServerAction(
    createHomeNotificationAction,
    {
      onSuccess: () => {
        toast.success("Notification created successfully");
        resetForm();
        onOpenChange(false);
        router.refresh();
      },
      onError: ({ err }) => {
        toast.error(err.message);
      },
    }
  );

  const { execute: updateNotification, isPending: isUpdating } = useServerAction(
    updateHomeNotificationAction,
    {
      onSuccess: () => {
        toast.success("Notification updated successfully");
        resetForm();
        onOpenChange(false);
        router.refresh();
      },
      onError: ({ err }) => {
        toast.error(err.message);
      },
    }
  );

  const isPending = isCreating || isUpdating;

  function resetForm() {
    setTitle("");
    setMessage("");
    setImageUrl("");
    setImagePreview("");
    setIsActive(true);
    setDisplayOrder(0);
    setStartDate("");
    setEndDate("");
  }

  const handleImageUpload = async (file: File) => {
    setIsUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json() as { message?: string };
        throw new Error(error.message || "Failed to upload image");
      }

      const { url } = await response.json() as { url: string };

      setImageUrl(url);
      setImagePreview(url);
      toast.success("Image uploaded successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload image"
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size too large. Maximum size is 5MB.");
      return;
    }

    handleImageUpload(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !message) {
      toast.error("Please fill in all required fields");
      return;
    }

    const data = {
      title,
      message,
      imageUrl: imageUrl || undefined,
      isActive,
      displayOrder,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    if (notification) {
      updateNotification({
        id: notification.id,
        ...data,
      });
    } else {
      createNotification(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {notification ? "Edit Notification" : "Add Notification"}
          </DialogTitle>
          <DialogDescription>
            Create a notification to display on the homepage between the hero and featured products sections.
            All dates are in Mountain Time (America/Boise).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Special Announcement"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isPending}
              maxLength={255}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              placeholder="Enter the notification message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isPending}
              maxLength={2000}
              rows={4}
              required
            />
            <p className="text-xs text-muted-foreground">
              {message.length} / 2000 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Image (Optional)</Label>
            <div className="flex flex-col gap-3">
              {imagePreview && (
                <div className="relative w-full h-48 border rounded-lg overflow-hidden">
                  <Image
                    src={imagePreview}
                    alt="Notification preview"
                    fill
                    className="object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setImageUrl("");
                      setImagePreview("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  id="image"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileChange}
                  disabled={isPending || isUploadingImage}
                  className="flex-1"
                />
                {isUploadingImage && (
                  <span className="text-sm text-muted-foreground">Uploading...</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Max 5MB. Accepted formats: JPEG, PNG, WebP
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date (Optional, MT)</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                Show notification starting at midnight Mountain Time
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date (Optional, MT)</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                Hide notification after midnight Mountain Time
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayOrder">Display Order</Label>
            <Input
              id="displayOrder"
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(Number(e.target.value))}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Higher numbers appear first (for future multi-notification support)
            </p>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="isActive" className="cursor-pointer">
                Active
              </Label>
              <p className="text-sm text-muted-foreground">
                Show this notification on the homepage
              </p>
            </div>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={isPending}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              disabled={isPending}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !title || !message || isUploadingImage}
              className="flex-1"
            >
              {isPending
                ? notification
                  ? "Updating..."
                  : "Creating..."
                : notification
                ? "Update Notification"
                : "Create Notification"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
