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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useServerAction } from "zsa-react";
import {
  createPickupLocationAction,
  updatePickupLocationAction,
} from "../../_actions/pickup-location.action";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  street: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip: z.string().min(1, "ZIP code is required"),
  pickupTimeWindows: z.string().min(1, "Pickup hours are required"),
  instructions: z.string().optional(),
  leadTimeDays: z.string().min(1, "Lead time is required"),
  pickupDays: z.object({
    sunday: z.boolean(),
    monday: z.boolean(),
    tuesday: z.boolean(),
    wednesday: z.boolean(),
    thursday: z.boolean(),
    friday: z.boolean(),
    saturday: z.boolean(),
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface PickupLocationWithParsed {
  id: string;
  name: string;
  address: { street: string; city: string; state: string; zip: string };
  pickupDays: number[];
  pickupTimeWindows: string;
  instructions: string | null;
  leadTimeDays: number;
}

interface PickupLocationDialogProps {
  location?: PickupLocationWithParsed;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PickupLocationDialog({
  location,
  open,
  onOpenChange,
}: PickupLocationDialogProps) {
  const router = useRouter();
  const { execute: createLocation, isPending: isCreating } =
    useServerAction(createPickupLocationAction);
  const { execute: updateLocation, isPending: isUpdating } =
    useServerAction(updatePickupLocationAction);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: location?.name || "",
      street: location?.address?.street || "",
      city: location?.address?.city || "",
      state: location?.address?.state || "",
      zip: location?.address?.zip || "",
      pickupTimeWindows: location?.pickupTimeWindows || "",
      instructions: location?.instructions || "",
      leadTimeDays: location?.leadTimeDays?.toString() || "2",
      pickupDays: {
        sunday: location?.pickupDays?.includes(0) || false,
        monday: location?.pickupDays?.includes(1) || false,
        tuesday: location?.pickupDays?.includes(2) || false,
        wednesday: location?.pickupDays?.includes(3) || false,
        thursday: location?.pickupDays?.includes(4) || false,
        friday: location?.pickupDays?.includes(5) || false,
        saturday: location?.pickupDays?.includes(6) || false,
      },
    },
  });

  useEffect(() => {
    if (location) {
      form.reset({
        name: location.name,
        street: location.address.street,
        city: location.address.city,
        state: location.address.state,
        zip: location.address.zip,
        pickupTimeWindows: location.pickupTimeWindows,
        instructions: location.instructions || "",
        leadTimeDays: location.leadTimeDays.toString(),
        pickupDays: {
          sunday: location.pickupDays.includes(0),
          monday: location.pickupDays.includes(1),
          tuesday: location.pickupDays.includes(2),
          wednesday: location.pickupDays.includes(3),
          thursday: location.pickupDays.includes(4),
          friday: location.pickupDays.includes(5),
          saturday: location.pickupDays.includes(6),
        },
      });
    } else {
      form.reset({
        name: "",
        street: "",
        city: "",
        state: "",
        zip: "",
        pickupTimeWindows: "",
        instructions: "",
        leadTimeDays: "2",
        pickupDays: {
          sunday: false,
          monday: false,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
        },
      });
    }
  }, [location, form]);

  async function onSubmit(values: FormValues) {
    // Convert pickupDays object to array of day numbers
    const pickupDaysArray: number[] = [];
    if (values.pickupDays.sunday) pickupDaysArray.push(0);
    if (values.pickupDays.monday) pickupDaysArray.push(1);
    if (values.pickupDays.tuesday) pickupDaysArray.push(2);
    if (values.pickupDays.wednesday) pickupDaysArray.push(3);
    if (values.pickupDays.thursday) pickupDaysArray.push(4);
    if (values.pickupDays.friday) pickupDaysArray.push(5);
    if (values.pickupDays.saturday) pickupDaysArray.push(6);

    if (pickupDaysArray.length === 0) {
      toast.error("Select at least one pickup day");
      return;
    }

    const data = {
      name: values.name,
      address: {
        street: values.street,
        city: values.city,
        state: values.state,
        zip: values.zip,
      },
      pickupDays: pickupDaysArray,
      pickupTimeWindows: values.pickupTimeWindows,
      instructions: values.instructions,
      leadTimeDays: parseInt(values.leadTimeDays),
      isActive: true,
      requiresPreorder: false,
    };

    if (location) {
      const [, error] = await updateLocation({ id: location.id, ...data });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Location updated");
        onOpenChange(false);
        router.refresh();
      }
    } else {
      const [, error] = await createLocation(data);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Location created");
        onOpenChange(false);
        router.refresh();
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {location ? "Edit Pickup Location" : "Add Pickup Location"}
          </DialogTitle>
          <DialogDescription>
            Configure a pickup location (always FREE for customers)
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Sweet Angel Bakery - Main Store" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main St" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="Boise" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="ID" maxLength={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="zip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP Code</FormLabel>
                    <FormControl>
                      <Input placeholder="83702" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <FormLabel>Pickup Days</FormLabel>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map(
                  (day) => (
                    <FormField
                      key={day}
                      control={form.control}
                      name={`pickupDays.${day}` as any}
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal capitalize">
                            {day.slice(0, 3)}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  )
                )}
              </div>
            </div>

            <FormField
              control={form.control}
              name="pickupTimeWindows"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pickup Hours</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 9:00 AM - 6:00 PM MT" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="leadTimeDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lead Time (Days)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" placeholder="2" {...field} />
                  </FormControl>
                  <FormDescription>
                    Minimum days between order and pickup
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pickup Instructions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Ring bell at entrance"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Shown to customers when they select this location
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
