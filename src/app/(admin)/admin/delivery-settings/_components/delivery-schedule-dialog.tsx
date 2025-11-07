"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServerAction } from "zsa-react";
import {
  createDeliveryScheduleAction,
  updateDeliveryScheduleAction,
} from "../../_actions/delivery-schedule.action";
import { toast } from "sonner";
import type { DeliverySchedule } from "@/db/schema";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  dayOfWeek: z.string().min(1, "Delivery day is required"),
  cutoffDay: z.string().min(1, "Cutoff day is required"),
  cutoffTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)"),
  deliveryTimeWindow: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const DAYS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

interface DeliveryScheduleDialogProps {
  schedule?: DeliverySchedule;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeliveryScheduleDialog({
  schedule,
  open,
  onOpenChange,
}: DeliveryScheduleDialogProps) {
  const router = useRouter();
  const { execute: createSchedule, isPending: isCreating } =
    useServerAction(createDeliveryScheduleAction);
  const { execute: updateSchedule, isPending: isUpdating } =
    useServerAction(updateDeliveryScheduleAction);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: schedule?.name || "",
      dayOfWeek: schedule?.dayOfWeek?.toString() || "",
      cutoffDay: schedule?.cutoffDay?.toString() || "",
      cutoffTime: schedule?.cutoffTime || "",
      deliveryTimeWindow: schedule?.deliveryTimeWindow || "",
    },
  });

  // Reset form when schedule changes
  useEffect(() => {
    if (schedule) {
      form.reset({
        name: schedule.name,
        dayOfWeek: schedule.dayOfWeek.toString(),
        cutoffDay: schedule.cutoffDay.toString(),
        cutoffTime: schedule.cutoffTime,
        deliveryTimeWindow: schedule.deliveryTimeWindow || "",
      });
    } else {
      form.reset({
        name: "",
        dayOfWeek: "",
        cutoffDay: "",
        cutoffTime: "",
        deliveryTimeWindow: "",
      });
    }
  }, [schedule, form]);

  async function onSubmit(values: FormValues) {
    const data = {
      name: values.name,
      dayOfWeek: parseInt(values.dayOfWeek),
      cutoffDay: parseInt(values.cutoffDay),
      cutoffTime: values.cutoffTime,
      leadTimeDays: 0, // Not used - controlled by cutoff time only
      deliveryTimeWindow: values.deliveryTimeWindow,
      isActive: true,
    };

    if (schedule) {
      const [, error] = await updateSchedule({ id: schedule.id, ...data });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Schedule updated");
        onOpenChange(false);
        router.refresh();
      }
    } else {
      const [, error] = await createSchedule(data);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Schedule created");
        onOpenChange(false);
        router.refresh();
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {schedule ? "Edit Delivery Schedule" : "Add Delivery Schedule"}
          </DialogTitle>
          <DialogDescription>
            Configure a delivery day with cutoff time and lead time requirements
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Schedule Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Thursday Delivery" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dayOfWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Day</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select delivery day" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DAYS.map((day) => (
                        <SelectItem key={day.value} value={day.value}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cutoffDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cutoff Day</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Day" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DAYS.map((day) => (
                          <SelectItem key={day.value} value={day.value}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cutoffTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cutoff Time</FormLabel>
                    <FormControl>
                      <Input placeholder="23:59" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Mountain Time (24h)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="deliveryTimeWindow"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Time Window</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 10:00 AM - 4:00 PM MT" {...field} />
                  </FormControl>
                  <FormDescription>
                    When customers can expect delivery
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {isCreating || isUpdating ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
