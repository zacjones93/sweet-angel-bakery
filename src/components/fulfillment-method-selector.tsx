"use client";

import { useState, useEffect } from "react";
import { useServerAction } from "zsa-react";
import {
  getCartDeliveryOptionsAction,
  getCartPickupOptionsAction,
} from "@/app/(storefront)/_actions/get-fulfillment-options.action";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, Package, Truck } from "lucide-react";
import { formatCents } from "@/utils/tax";
import { format } from "date-fns";

export interface FulfillmentSelection {
  method: "delivery" | "pickup";
  deliveryZipCode?: string;
  deliveryFee?: number;
  deliveryDate?: string;
  pickupLocationId?: string;
  pickupDate?: string;
  pickupLocationName?: string;
}

interface FulfillmentMethodSelectorProps {
  cartItems: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  initialZipCode?: string;
  onSelectionChange: (selection: FulfillmentSelection | null) => void;
}

export function FulfillmentMethodSelector({
  cartItems,
  initialZipCode,
  onSelectionChange,
}: FulfillmentMethodSelectorProps) {
  const [method, setMethod] = useState<"delivery" | "pickup">("delivery");
  const [zipCode, setZipCode] = useState(initialZipCode || "");
  const [selectedPickupLocationId, setSelectedPickupLocationId] = useState<string>("");
  const [deliveryOptions, setDeliveryOptions] = useState<{
    available: boolean;
    deliveryDate: string | null;
    cutoffDate: string | null;
    timeWindow: string | null;
    feeAmount: number;
    zoneName: string | null;
  } | null>(null);
  const [pickupOptions, setPickupOptions] = useState<{
    available: boolean;
    locations: Array<{
      id: string;
      name: string;
      address: { street: string; city: string; state: string; zip: string };
      pickupDate: string;
      pickupTimeWindow: string;
      instructions: string | null;
    }>;
  } | null>(null);

  const { execute: getDeliveryOptions, isPending: isLoadingDelivery } = useServerAction(
    getCartDeliveryOptionsAction
  );

  const { execute: getPickupOptions, isPending: isLoadingPickup } = useServerAction(
    getCartPickupOptionsAction
  );

  // Load pickup options on mount
  useEffect(() => {
    async function loadPickupOptions() {
      const [data] = await getPickupOptions({ items: cartItems });
      if (data) {
        setPickupOptions(data);
        if (data.locations?.length > 0) {
          setSelectedPickupLocationId(data.locations[0].id);
        }
      }
    }
    loadPickupOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load delivery options when ZIP code changes
  useEffect(() => {
    async function loadDeliveryOptions() {
      if (zipCode.length >= 5) {
        const [data] = await getDeliveryOptions({
          items: cartItems,
          deliveryZipCode: zipCode,
        });
        if (data) {
          setDeliveryOptions(data);
        }
      }
    }

    if (method === "delivery") {
      loadDeliveryOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zipCode, method]);

  // Notify parent of selection changes
  useEffect(() => {
    if (method === "delivery" && zipCode.length >= 5 && deliveryOptions?.available) {
      onSelectionChange({
        method: "delivery",
        deliveryZipCode: zipCode,
        deliveryFee: deliveryOptions.feeAmount,
        deliveryDate: deliveryOptions.deliveryDate,
      });
    } else if (method === "pickup" && selectedPickupLocationId && pickupOptions?.available) {
      const selectedLocation = pickupOptions.locations.find(
        (loc) => loc.id === selectedPickupLocationId
      );
      onSelectionChange({
        method: "pickup",
        pickupLocationId: selectedPickupLocationId,
        pickupDate: selectedLocation?.pickupDate,
        pickupLocationName: selectedLocation?.name,
        deliveryFee: 0, // Pickup is always free
      });
    } else {
      onSelectionChange(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, zipCode, selectedPickupLocationId, deliveryOptions, pickupOptions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fulfillment Method</CardTitle>
        <CardDescription>
          Choose how you'd like to receive your order
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup
          value={method}
          onValueChange={(value) => setMethod(value as "delivery" | "pickup")}
        >
          {/* Delivery Option */}
          <div
            className={`relative flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors ${
              method === "delivery"
                ? "border-primary bg-primary/5"
                : "border-muted hover:border-primary/50"
            }`}
            onClick={() => setMethod("delivery")}
          >
            <RadioGroupItem value="delivery" id="delivery" className="mt-1" />
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                <Label
                  htmlFor="delivery"
                  className="text-base font-semibold cursor-pointer"
                >
                  Delivery
                </Label>
              </div>

              {method === "delivery" && (
                <div className="space-y-3 pl-0">
                  <div className="space-y-2">
                    <Label htmlFor="zipCode" className="text-sm">
                      ZIP Code
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="zipCode"
                        type="text"
                        placeholder="Enter ZIP"
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        maxLength={5}
                        className="max-w-[140px]"
                      />
                      {isLoadingDelivery && (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground self-center" />
                      )}
                    </div>
                  </div>

                  {zipCode.length >= 5 && deliveryOptions && (
                    <>
                      {deliveryOptions.available ? (
                        <div className="rounded-md bg-muted/50 p-3 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Delivery Date:</span>
                            <span className="font-medium">
                              {format(new Date(deliveryOptions.deliveryDate), "EEE, MMM d")}
                            </span>
                          </div>
                          {deliveryOptions.timeWindow && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Time Window:</span>
                              <span className="font-medium">{deliveryOptions.timeWindow}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Delivery Fee:</span>
                            <span className="font-semibold text-primary">
                              {deliveryOptions.feeAmount > 0
                                ? formatCents(deliveryOptions.feeAmount)
                                : "FREE"}
                            </span>
                          </div>
                          {deliveryOptions.zoneName && (
                            <div className="text-xs text-muted-foreground pt-1 border-t">
                              {deliveryOptions.zoneName}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground pt-1 border-t">
                            Order by{" "}
                            {format(new Date(deliveryOptions.cutoffDate), "EEE, MMM d 'at' h:mm a")}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                          Delivery not available to this ZIP code. Please try pickup or contact us.
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Pickup Option */}
          <div
            className={`relative flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors ${
              method === "pickup"
                ? "border-primary bg-primary/5"
                : "border-muted hover:border-primary/50"
            }`}
            onClick={() => setMethod("pickup")}
          >
            <RadioGroupItem value="pickup" id="pickup" className="mt-1" />
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <Label htmlFor="pickup" className="text-base font-semibold cursor-pointer">
                  Pickup
                </Label>
                <span className="ml-auto text-sm font-semibold text-green-600">FREE</span>
              </div>

              {method === "pickup" && (
                <div className="space-y-3 pl-0">
                  {isLoadingPickup ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : pickupOptions?.available ? (
                    <RadioGroup
                      value={selectedPickupLocationId}
                      onValueChange={setSelectedPickupLocationId}
                      className="space-y-2"
                    >
                      {pickupOptions.locations.map((location) => (
                        <div
                          key={location.id}
                          className={`rounded-md border p-3 cursor-pointer transition-colors ${
                            selectedPickupLocationId === location.id
                              ? "border-primary bg-primary/5"
                              : "border-muted hover:border-primary/50"
                          }`}
                          onClick={() => setSelectedPickupLocationId(location.id)}
                        >
                          <div className="flex items-start gap-2">
                            <RadioGroupItem value={location.id} id={location.id} className="mt-1" />
                            <div className="flex-1 space-y-1">
                              <Label
                                htmlFor={location.id}
                                className="text-sm font-semibold cursor-pointer"
                              >
                                {location.name}
                              </Label>
                              <div className="flex items-start gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>
                                  {location.address.street}, {location.address.city},{" "}
                                  {location.address.state} {location.address.zip}
                                </span>
                              </div>
                              <div className="text-xs space-y-0.5">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Pickup Date:</span>
                                  <span className="font-medium">
                                    {format(new Date(location.pickupDate), "EEE, MMM d")}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Hours:</span>
                                  <span className="font-medium">{location.pickupTimeWindow}</span>
                                </div>
                              </div>
                              {location.instructions && (
                                <div className="text-xs text-muted-foreground pt-1 border-t mt-2">
                                  {location.instructions}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      No pickup locations available. Please contact us for assistance.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
