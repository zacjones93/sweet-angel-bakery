"use client";

import { useState } from "react";
import { useServerAction } from "zsa-react";
import {
  updateDeliveryStatusAction,
  updatePickupStatusAction,
} from "../../_actions/update-fulfillment-status.action";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface FulfillmentStatusSelectorProps {
  orderId: string;
  fulfillmentMethod: "delivery" | "pickup";
  currentStatus: string | null;
  onStatusChange?: () => void;
}

const deliveryStatuses = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
];

const pickupStatuses = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "ready_for_pickup", label: "Ready for Pickup" },
  { value: "picked_up", label: "Picked Up" },
];

export function FulfillmentStatusSelector({
  orderId,
  fulfillmentMethod,
  currentStatus,
  onStatusChange,
}: FulfillmentStatusSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { execute: updateDelivery, isPending: isUpdatingDelivery } =
    useServerAction(updateDeliveryStatusAction);
  const { execute: updatePickup, isPending: isUpdatingPickup } =
    useServerAction(updatePickupStatusAction);

  const isUpdating = isUpdatingDelivery || isUpdatingPickup;

  const statuses = fulfillmentMethod === "delivery" ? deliveryStatuses : pickupStatuses;

  const handleStatusChange = async (newStatus: string) => {
    try {
      if (fulfillmentMethod === "delivery") {
        const [, err] = await updateDelivery({
          orderId,
          deliveryStatus: newStatus as "pending" | "confirmed" | "preparing" | "out_for_delivery" | "delivered",
          notifyCustomer: true,
        });

        if (err) {
          throw new Error(err.message);
        }
      } else {
        const [, err] = await updatePickup({
          orderId,
          pickupStatus: newStatus as "pending" | "confirmed" | "preparing" | "ready_for_pickup" | "picked_up",
          notifyCustomer: true,
        });

        if (err) {
          throw new Error(err.message);
        }
      }

      toast.success(`Order status changed to ${statuses.find((s) => s.value === newStatus)?.label}`);

      setIsOpen(false);
      onStatusChange?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update status");
    }
  };

  const currentStatusLabel = statuses.find((s) => s.value === currentStatus)?.label || "Pending";

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isUpdating}>
          {isUpdating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              {currentStatusLabel}
              <ChevronDown className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Update Status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {statuses.map((status) => (
          <DropdownMenuItem
            key={status.value}
            onSelect={() => handleStatusChange(status.value)}
            disabled={status.value === currentStatus}
          >
            {status.label}
            {status.value === currentStatus && <span className="ml-2 text-muted-foreground">(current)</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
