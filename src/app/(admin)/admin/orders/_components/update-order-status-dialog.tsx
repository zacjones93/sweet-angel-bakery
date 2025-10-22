"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ORDER_STATUS, ORDER_STATUS_LABELS } from "@/db/schema";
import { updateOrderStatusAction } from "../../_actions/orders.action";
import { Loader2 } from "lucide-react";

interface UpdateOrderStatusDialogProps {
  orderId: string;
  currentStatus: string;
  trigger?: React.ReactNode;
}

export function UpdateOrderStatusDialog({
  orderId,
  currentStatus,
  trigger,
}: UpdateOrderStatusDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>(currentStatus);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleUpdateStatus() {
    if (selectedStatus === currentStatus) {
      toast.error("Please select a different status");
      return;
    }

    setIsLoading(true);
    try {
      const [, err] = await updateOrderStatusAction({
        orderId,
        status: selectedStatus as typeof ORDER_STATUS[keyof typeof ORDER_STATUS],
      });

      if (err) {
        toast.error(err.message || "Failed to update order status");
        return;
      }

      // Find the label for the new status
      const statusKey = Object.entries(ORDER_STATUS).find(
        ([, value]) => value === selectedStatus
      )?.[0] as keyof typeof ORDER_STATUS | undefined;

      const statusLabel = statusKey
        ? ORDER_STATUS_LABELS[statusKey]
        : selectedStatus;

      toast.success(`Order status updated to ${statusLabel}`);
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Update Status</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Order Status</DialogTitle>
          <DialogDescription>
            Change the status of this order to track its progress through the
            bakery workflow.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
                <SelectItem
                  key={key}
                  value={ORDER_STATUS[key as keyof typeof ORDER_STATUS]}
                >
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleUpdateStatus} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
