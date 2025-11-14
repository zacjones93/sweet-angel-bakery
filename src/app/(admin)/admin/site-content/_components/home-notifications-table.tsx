"use client";

import { useState } from "react";
import { PlusCircle, Trash, Pencil, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useServerAction } from "zsa-react";
import {
  deleteHomeNotificationAction,
  toggleHomeNotificationActiveAction,
} from "../_actions/home-notifications.action";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { HomeNotification } from "@/db/schema";
import { format } from "date-fns";
import { NotificationFormDialog } from "./notification-form-dialog";

export function HomeNotificationsTable({ notifications }: { notifications: HomeNotification[] }) {
  const router = useRouter();
  const { execute: deleteNotification } = useServerAction(deleteHomeNotificationAction);
  const { execute: toggleActive } = useServerAction(toggleHomeNotificationActiveAction);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState<HomeNotification | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this notification?")) return;
    setDeletingId(id);
    const [, error] = await deleteNotification({ id });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Notification deleted");
      router.refresh();
    }
    setDeletingId(null);
  }

  async function handleToggleActive(id: string, currentActive: number) {
    const [, error] = await toggleActive({ id, isActive: currentActive === 0 });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(currentActive === 0 ? "Notification activated" : "Notification deactivated");
      router.refresh();
    }
  }

  function handleEdit(notification: HomeNotification) {
    setEditingNotification(notification);
    setDialogOpen(true);
  }

  function handleDialogClose() {
    setDialogOpen(false);
    setEditingNotification(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Home Notifications</h2>
          <p className="text-sm text-muted-foreground">
            Manage notifications displayed on the homepage between the hero and featured products sections.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Notification
        </Button>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground">No notifications configured</p>
          <Button
            onClick={() => setDialogOpen(true)}
            variant="outline"
            className="mt-4"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add First Notification
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.map((notification) => (
                <TableRow key={notification.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {notification.title}
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate text-muted-foreground">
                    {notification.message}
                  </TableCell>
                  <TableCell>
                    {notification.startDate || notification.endDate ? (
                      <div className="text-sm">
                        {notification.startDate && (
                          <div>From: {format(new Date(notification.startDate), "MMM d, yyyy")}</div>
                        )}
                        {notification.endDate && (
                          <div>To: {format(new Date(notification.endDate), "MMM d, yyyy")}</div>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline">Always</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={notification.isActive === 1}
                      onCheckedChange={() => handleToggleActive(notification.id, notification.isActive)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(notification)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(notification.id)}
                        disabled={deletingId === notification.id}
                      >
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <NotificationFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        notification={editingNotification}
      />
    </div>
  );
}
