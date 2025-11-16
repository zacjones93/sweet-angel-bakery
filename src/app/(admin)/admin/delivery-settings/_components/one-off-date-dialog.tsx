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
import { useServerAction } from "zsa-react";
import { addOneOffDateAction } from "../_actions/one-off-dates.action";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { getMountainISODate } from "@/utils/timezone";

interface OneOffDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OneOffDateDialog({
  open,
  onOpenChange,
}: OneOffDateDialogProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState("");
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
    setSelectedDate("");
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
      date: selectedDate,
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
            Add a custom delivery or pickup date outside the regular schedule
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Date Picker */}
          <div className="space-y-2">
            <Label htmlFor="date" className="text-base">Select Date *</Label>
            <Input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={getMountainISODate(new Date())}
              disabled={isPending}
              required
              className="text-base"
            />
          </div>

          {/* Type Selection */}
          <div className="space-y-3">
            <Label className="text-base">Type *</Label>
            <RadioGroup value={type} onValueChange={(v) => setType(v as "delivery" | "pickup")} className="grid grid-cols-2 gap-4">
              <label htmlFor="delivery" className="flex items-center space-x-3 border rounded-md p-4 cursor-pointer hover:bg-accent transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <RadioGroupItem value="delivery" id="delivery" />
                <div className="flex-1">
                  <div className="font-medium">Delivery</div>
                  <div className="text-xs text-muted-foreground">Extra delivery date</div>
                </div>
              </label>
              <label htmlFor="pickup" className="flex items-center space-x-3 border rounded-md p-4 cursor-pointer hover:bg-accent transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <RadioGroupItem value="pickup" id="pickup" />
                <div className="flex-1">
                  <div className="font-medium">Pickup</div>
                  <div className="text-xs text-muted-foreground">Extra pickup date</div>
                </div>
              </label>
            </RadioGroup>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-base">Reason (Optional)</Label>
            <Input
              id="reason"
              placeholder="e.g., Holiday special, Extra weekend"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isPending}
              maxLength={500}
            />
          </div>

          {/* Advanced Settings */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="border rounded-md p-4 bg-muted/10">
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start text-base font-medium hover:bg-transparent"
              >
                <ChevronDown className={`h-5 w-5 mr-2 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
                Advanced Settings
                <span className="ml-2 text-xs text-muted-foreground font-normal">(uses defaults if not set)</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2 mt-2 border-t">

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

          <div className="flex gap-3 pt-6 border-t">
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
              {isPending ? "Adding..." : "Add Date"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
