"use client";

import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useServerAction } from "zsa-react";
import { addCalendarClosureAction } from "../_actions/calendar-closures.action";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface CalendarClosureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CalendarClosureDialog({
  open,
  onOpenChange,
}: CalendarClosureDialogProps) {
  const router = useRouter();
  const [closureDate, setClosureDate] = useState("");
  const [reason, setReason] = useState("");
  const [affectsDelivery, setAffectsDelivery] = useState(true);
  const [affectsPickup, setAffectsPickup] = useState(true);

  const { execute: addClosure, isPending } = useServerAction(
    addCalendarClosureAction,
    {
      onSuccess: () => {
        toast.success("Closure added successfully");
        setClosureDate("");
        setReason("");
        setAffectsDelivery(true);
        setAffectsPickup(true);
        onOpenChange(false);
        router.refresh();
      },
      onError: ({ err }) => {
        toast.error(err.message);
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!closureDate || !reason) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!affectsDelivery && !affectsPickup) {
      toast.error("Closure must affect at least delivery or pickup");
      return;
    }

    addClosure({
      closureDate,
      reason,
      affectsDelivery,
      affectsPickup,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Calendar Closure</DialogTitle>
          <DialogDescription>
            Block specific dates from delivery or pickup schedules. All dates are in Mountain Time (America/Boise).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="closureDate">Date *</Label>
            <Input
              id="closureDate"
              type="date"
              value={closureDate}
              onChange={(e) => setClosureDate(e.target.value)}
              disabled={isPending}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Input
              id="reason"
              placeholder="e.g., Christmas, Vacation, Emergency"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isPending}
              maxLength={500}
              required
            />
            <p className="text-xs text-muted-foreground">
              Briefly describe why this date is closed
            </p>
          </div>

          <div className="space-y-3">
            <Label>Affects *</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="affectsDelivery"
                  checked={affectsDelivery}
                  onCheckedChange={(checked) => setAffectsDelivery(checked === true)}
                  disabled={isPending}
                />
                <Label htmlFor="affectsDelivery" className="cursor-pointer font-normal">
                  Block deliveries on this date
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="affectsPickup"
                  checked={affectsPickup}
                  onCheckedChange={(checked) => setAffectsPickup(checked === true)}
                  disabled={isPending}
                />
                <Label htmlFor="affectsPickup" className="cursor-pointer font-normal">
                  Block pickups on this date
                </Label>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !closureDate || !reason}
              className="flex-1"
            >
              {isPending ? "Adding..." : "Add Closure"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
