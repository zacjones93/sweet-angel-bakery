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
import { useServerAction } from "zsa-react";
import {
  createDeliveryZoneAction,
  updateDeliveryZoneAction,
} from "../../_actions/delivery-zone.action";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  zipCodes: z.string().min(1, "ZIP codes are required"),
  feeAmount: z.string().min(1, "Fee amount is required"),
  priority: z.string().min(1, "Priority is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface DeliveryZoneWithParsed {
  id: string;
  name: string;
  zipCodes: string[];
  feeAmount: number;
  priority: number;
}

interface DeliveryZoneDialogProps {
  zone?: DeliveryZoneWithParsed;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeliveryZoneDialog({
  zone,
  open,
  onOpenChange,
}: DeliveryZoneDialogProps) {
  const router = useRouter();
  const { execute: createZone, isPending: isCreating } =
    useServerAction(createDeliveryZoneAction);
  const { execute: updateZone, isPending: isUpdating } =
    useServerAction(updateDeliveryZoneAction);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: zone?.name || "",
      zipCodes: zone?.zipCodes?.join(", ") || "",
      feeAmount: zone?.feeAmount ? (zone.feeAmount / 100).toString() : "",
      priority: zone?.priority?.toString() || "0",
    },
  });

  useEffect(() => {
    if (zone) {
      form.reset({
        name: zone.name,
        zipCodes: zone.zipCodes.join(", "),
        feeAmount: (zone.feeAmount / 100).toString(),
        priority: zone.priority.toString(),
      });
    } else {
      form.reset({
        name: "",
        zipCodes: "",
        feeAmount: "",
        priority: "0",
      });
    }
  }, [zone, form]);

  async function onSubmit(values: FormValues) {
    // Parse ZIP codes from comma-separated string
    const zipCodesArray = values.zipCodes
      .split(',')
      .map(zip => zip.trim())
      .filter(zip => zip.length > 0);

    if (zipCodesArray.length === 0) {
      toast.error("Enter at least one ZIP code");
      return;
    }

    // Validate fee amount is a valid number
    const feeInDollars = parseFloat(values.feeAmount);
    if (isNaN(feeInDollars) || feeInDollars < 0) {
      toast.error("Invalid fee amount");
      return;
    }

    const data = {
      name: values.name,
      zipCodes: zipCodesArray,
      feeAmount: Math.round(feeInDollars * 100), // Convert dollars to cents
      priority: parseInt(values.priority),
      isActive: true,
    };

    if (zone) {
      const [, error] = await updateZone({ id: zone.id, ...data });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Zone updated");
        onOpenChange(false);
        router.refresh();
      }
    } else {
      const [, error] = await createZone(data);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Zone created");
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
            {zone ? "Edit Delivery Zone" : "Add Delivery Zone"}
          </DialogTitle>
          <DialogDescription>
            Configure a delivery zone with ZIP codes and fee (Pickup is always FREE)
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zone Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Local Boise" {...field} />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for this delivery zone
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="zipCodes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ZIP Codes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="83702, 83703, 83704, 83705, 83706"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Comma-separated list of ZIP codes for this zone
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="feeAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Fee</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="5.00"
                          className="pl-6"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs">
                      Amount in USD
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Higher = takes precedence
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="bg-muted p-3 rounded-md text-sm">
              <p className="font-medium mb-1">Examples:</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• Local Boise - $5.00 (Priority: 10)</li>
                <li>• Extended Treasure Valley - $10.00 (Priority: 5)</li>
                <li>• Pickup - $0.00 (always FREE)</li>
              </ul>
            </div>

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
