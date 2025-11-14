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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { useServerAction } from "zsa-react";
import { addOneOffDateAction } from "../_actions/one-off-dates.action";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface OneOffDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OneOffDateDialog({
  open,
  onOpenChange,
}: OneOffDateDialogProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [type, setType] = useState<"delivery" | "pickup">("delivery");
  const [reason, setReason] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Advanced settings
  const [timeWindowStart, setTimeWindowStart] = useState("");
  const [timeWindowEnd, setTimeWindowEnd] = useState("");
  const [cutoffDay, setCutoffDay] = useState("");
  const [cutoffTime, setCutoffTime] = useState("");
  const [leadTimeDays, setLeadTimeDays] = useState("");

  const { execute: addOneOffDate, isPending } = useServerAction(
    addOneOffDateAction,
    {
      onSuccess: () => {
        toast.success("One-off date added successfully");
        resetForm();
        onOpenChange(false);
        router.refresh();
      },
      onError: ({ err }) => {
        toast.error(err.message);
      },
    }
  );

  const resetForm = () => {
    setSelectedDate(undefined);
    setType("delivery");
    setReason("");
    setAdvancedOpen(false);
    setTimeWindowStart("");
    setTimeWindowEnd("");
    setCutoffDay("");
    setCutoffTime("");
    setLeadTimeDays("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }

    // Format date as YYYY-MM-DD in local time
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    // Build input object with only provided optional fields
    const input: {
      date: string;
      type: "delivery" | "pickup";
      reason?: string;
      timeWindowStart?: string;
      timeWindowEnd?: string;
      cutoffDay?: number;
      cutoffTime?: string;
      leadTimeDays?: number;
    } = {
      date: dateStr,
      type,
    };

    if (reason) input.reason = reason;
    if (timeWindowStart) input.timeWindowStart = timeWindowStart;
    if (timeWindowEnd) input.timeWindowEnd = timeWindowEnd;
    if (cutoffDay !== "") input.cutoffDay = parseInt(cutoffDay);
    if (cutoffTime) input.cutoffTime = cutoffTime;
    if (leadTimeDays !== "") input.leadTimeDays = parseInt(leadTimeDays);

    addOneOffDate(input);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add One-Off Date</DialogTitle>
          <DialogDescription>
            Add a custom delivery or pickup date outside the regular schedule. All dates are in Mountain Time (America/Boise).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Calendar Date Picker */}
          <div className="space-y-2">
            <Label>Select Date *</Label>
            <div className="flex justify-center border rounded-lg p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date()}
                className="rounded-md border-0"
              />
            </div>
            {selectedDate && (
              <p className="text-sm text-muted-foreground text-center">
                Selected: {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </p>
            )}
          </div>

          {/* Type Selection */}
          <div className="space-y-2">
            <Label>Type *</Label>
            <RadioGroup value={type} onValueChange={(v) => setType(v as "delivery" | "pickup")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="delivery" id="delivery" />
                <Label htmlFor="delivery" className="cursor-pointer font-normal">
                  Delivery - Add extra delivery date
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pickup" id="pickup" />
                <Label htmlFor="pickup" className="cursor-pointer font-normal">
                  Pickup - Add extra pickup date
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Input
              id="reason"
              placeholder="e.g., Holiday special, Extra weekend availability"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isPending}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              Briefly describe why this date is being added
            </p>
          </div>

          {/* Advanced Settings */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full"
              >
                <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
                Advanced Settings (Optional)
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                If not provided, default schedule settings will be used for cutoff times and time windows.
              </p>

              {/* Time Window */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeWindowStart">Time Window Start</Label>
                  <Input
                    id="timeWindowStart"
                    type="time"
                    value={timeWindowStart}
                    onChange={(e) => setTimeWindowStart(e.target.value)}
                    disabled={isPending}
                    placeholder="HH:MM"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeWindowEnd">Time Window End</Label>
                  <Input
                    id="timeWindowEnd"
                    type="time"
                    value={timeWindowEnd}
                    onChange={(e) => setTimeWindowEnd(e.target.value)}
                    disabled={isPending}
                    placeholder="HH:MM"
                  />
                </div>
              </div>

              {/* Cutoff Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cutoffDay">Cutoff Day of Week</Label>
                  <select
                    id="cutoffDay"
                    value={cutoffDay}
                    onChange={(e) => setCutoffDay(e.target.value)}
                    disabled={isPending}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Use default</option>
                    <option value="0">Sunday</option>
                    <option value="1">Monday</option>
                    <option value="2">Tuesday</option>
                    <option value="3">Wednesday</option>
                    <option value="4">Thursday</option>
                    <option value="5">Friday</option>
                    <option value="6">Saturday</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cutoffTime">Cutoff Time</Label>
                  <Input
                    id="cutoffTime"
                    type="time"
                    value={cutoffTime}
                    onChange={(e) => setCutoffTime(e.target.value)}
                    disabled={isPending}
                    placeholder="HH:MM"
                  />
                </div>
              </div>

              {/* Lead Time */}
              <div className="space-y-2">
                <Label htmlFor="leadTimeDays">Lead Time (Days)</Label>
                <Input
                  id="leadTimeDays"
                  type="number"
                  min="0"
                  value={leadTimeDays}
                  onChange={(e) => setLeadTimeDays(e.target.value)}
                  disabled={isPending}
                  placeholder="Minimum days before delivery/pickup"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

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
              disabled={isPending || !selectedDate}
              className="flex-1"
            >
              {isPending ? "Adding..." : "Add One-Off Date"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
