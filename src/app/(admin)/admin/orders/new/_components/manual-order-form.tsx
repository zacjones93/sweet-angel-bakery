"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useServerAction } from "zsa-react";
import { toast } from "sonner";
import { Loader2, DollarSign, Truck, MapPin } from "lucide-react";
import { manualOrderFormSchema, type ManualOrderItem, type ManualOrderFormValues } from "@/schemas/manual-order.schema";
import { PAYMENT_METHOD, PAYMENT_METHOD_LABELS } from "@/db/schema";
import { createManualOrderAction } from "../../../_actions/create-manual-order.action";
import { ProductSelector } from "./product-selector";
import { calculateTax } from "@/utils/tax";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  status: string;
  quantityAvailable: number;
  customizations: string | null;
};

type PickupLocation = {
  id: string;
  name: string;
  address: string;
  pickupDays: string;
  pickupTimeWindows: string;
  isActive: number;
};

type DeliveryZone = {
  id: string;
  name: string;
  zipCodes: string[];
  feeAmount: number;
  isActive: number;
};

type ManualOrderFormProps = {
  products: Product[];
  pickupLocations: PickupLocation[];
  deliveryZones: DeliveryZone[];
};

export function ManualOrderForm({
  products,
  pickupLocations,
  deliveryZones,
}: ManualOrderFormProps) {
  const router = useRouter();
  const { execute: createOrder, isPending } = useServerAction(createManualOrderAction);
  const [items, setItems] = useState<ManualOrderItem[]>([]);

  const form = useForm<ManualOrderFormValues>({
    resolver: zodResolver(manualOrderFormSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      paymentMethod: "cash",
      paymentStatus: "paid",
      adminNotes: "",
      fulfillmentMethod: "pickup",
      deliveryDate: "",
      deliveryTimeWindow: "",
      deliveryZoneId: "",
      deliveryFee: 0,
      deliveryInstructions: "",
      streetAddress1: "",
      streetAddress2: "",
      city: "",
      state: "ID",
      zipCode: "",
      pickupLocationId: "",
      pickupDate: "",
      pickupTimeWindow: "",
      pickupInstructions: "",
      sendConfirmationEmail: true,
    },
  });

  const fulfillmentMethod = form.watch("fulfillmentMethod");

  // Calculate totals
  const subtotal = items.reduce(
    (sum, item) => sum + item.priceInCents * item.quantity,
    0
  );
  const deliveryFee = form.watch("deliveryFee") || 0;
  const subtotalWithDelivery = subtotal + deliveryFee;
  const tax = calculateTax(subtotalWithDelivery);
  const total = subtotalWithDelivery + tax;

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  // Update delivery fee when zone changes
  const handleZoneChange = (zoneId: string) => {
    form.setValue("deliveryZoneId", zoneId);
    const zone = deliveryZones.find((z) => z.id === zoneId);
    if (zone) {
      form.setValue("deliveryFee", zone.feeAmount);
    }
  };

  const onSubmit = async (values: ManualOrderFormValues) => {
    if (items.length === 0) {
      toast.error("Please add at least one item to the order");
      return;
    }

    const [result, error] = await createOrder({
      ...values,
      items,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`Order ${result.orderNumber} created successfully`);
    router.push(`/admin/orders/${result.orderId}`);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="customerPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="(208) 555-0123"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductSelector
              products={products}
              selectedItems={items}
              onItemsChange={setItems}
            />
          </CardContent>
        </Card>

        {/* Fulfillment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fulfillment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="fulfillmentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div>
                        <RadioGroupItem
                          value="pickup"
                          id="pickup"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="pickup"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          <MapPin className="mb-3 h-6 w-6" />
                          Pickup
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem
                          value="delivery"
                          id="delivery"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="delivery"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          <Truck className="mb-3 h-6 w-6" />
                          Delivery
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {fulfillmentMethod === "pickup" && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="pickupLocationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pickup Location *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select pickup location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {pickupLocations.map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              {location.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="pickupDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pickup Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pickupTimeWindow"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time Window</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., 10:00 AM - 2:00 PM"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="pickupInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pickup Instructions</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Special instructions for pickup..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {fulfillmentMethod === "delivery" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="deliveryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deliveryTimeWindow"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time Window</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., 9:00 AM - 5:00 PM"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />
                <p className="text-sm font-medium">Delivery Address</p>

                <FormField
                  control={form.control}
                  name="streetAddress1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="streetAddress2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apt/Suite/Unit</FormLabel>
                      <FormControl>
                        <Input placeholder="Apt 4B" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>City *</FormLabel>
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
                        <FormLabel>State *</FormLabel>
                        <FormControl>
                          <Input placeholder="ID" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP *</FormLabel>
                        <FormControl>
                          <Input placeholder="83702" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                <FormField
                  control={form.control}
                  name="deliveryZoneId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Zone</FormLabel>
                      <Select
                        onValueChange={handleZoneChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select delivery zone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {deliveryZones.map((zone) => (
                            <SelectItem key={zone.id} value={zone.id}>
                              {zone.name} - {formatPrice(zone.feeAmount)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select to auto-fill delivery fee
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deliveryFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Fee</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="pl-10"
                            value={(field.value || 0) / 100}
                            onChange={(e) =>
                              field.onChange(
                                Math.round(parseFloat(e.target.value || "0") * 100)
                              )
                            }
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Override delivery fee if needed (0 for free delivery)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deliveryInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Instructions</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Gate code, special instructions..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(PAYMENT_METHOD).map(([key, value]) => (
                        <SelectItem key={value} value={value}>
                          {PAYMENT_METHOD_LABELS[key as keyof typeof PAYMENT_METHOD_LABELS]}
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
              name="paymentStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Status *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Mark as &quot;Pending&quot; if payment will be collected later
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Admin Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Internal Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="adminNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Admin Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Internal notes about this order (not visible to customer)..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    These notes are only visible to admins
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sendConfirmationEmail"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Send confirmation email to customer</FormLabel>
                    <FormDescription>
                      Customer will receive an order confirmation at their email
                      address
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span>{formatPrice(deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax (6%)</span>
                <span>{formatPrice(tax)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button type="submit" disabled={isPending || items.length === 0}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Order
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
