"use client";

import { PaymentForm, CreditCard } from "react-square-web-payments-sdk";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useServerAction } from "zsa-react";
import { createSquarePaymentAction } from "@/app/(storefront)/_actions/create-square-payment.action";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { OrderItemCustomizations } from "@/types/customizations";

interface SquarePaymentFormProps {
  items: Array<{
    productId: string;
    quantity: number;
    customizations?: OrderItemCustomizations;
    name: string;
    price: number;
  }>;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  joinLoyalty?: boolean;
  smsOptIn?: boolean;
  userId?: string;
  streetAddress1?: string;
  streetAddress2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  // Fulfillment data
  fulfillmentMethod?: "delivery" | "pickup";
  deliveryFee?: number;
  deliveryDate?: string;
  deliveryZoneId?: string;
  deliveryTimeWindow?: string;
  pickupLocationId?: string;
  pickupDate?: string;
  pickupTimeWindow?: string;
  onSuccess: () => void;
}

export function SquarePaymentForm({
  items,
  customerEmail,
  customerName,
  customerPhone,
  joinLoyalty,
  smsOptIn,
  userId,
  streetAddress1,
  streetAddress2,
  city,
  state,
  zipCode,
  fulfillmentMethod,
  deliveryFee,
  deliveryDate,
  deliveryZoneId,
  deliveryTimeWindow,
  pickupLocationId,
  pickupDate,
  pickupTimeWindow,
  onSuccess,
}: SquarePaymentFormProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const { execute } = useServerAction(createSquarePaymentAction);

  const applicationId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;

  // Validate required customer information
  if (!customerEmail || !customerName) {
    return (
      <div className="p-4 bg-amber-50 text-amber-900 rounded-md border border-amber-200">
        <p className="font-semibold">Please complete customer information</p>
        <p className="text-sm">Fill in your name and email above to continue</p>
      </div>
    );
  }

  if (!applicationId) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-md">
        <p className="font-semibold">Configuration Error</p>
        <p className="text-sm">Square Application ID not configured</p>
      </div>
    );
  }

  if (!locationId) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-md">
        <p className="font-semibold">Configuration Error</p>
        <p className="text-sm">Square Location ID not configured</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PaymentForm
        applicationId={applicationId}
        locationId={locationId}
        cardTokenizeResponseReceived={async (token) => {
          setIsProcessing(true);

          if (!token.token) {
            toast.error("Failed to tokenize card");
            setIsProcessing(false);
            return;
          }

          try {
            const [data, err] = await execute({
              sourceId: token.token,
              items,
              customerEmail,
              customerName,
              customerPhone,
              joinLoyalty,
              smsOptIn,
              userId,
              streetAddress1,
              streetAddress2,
              city,
              state,
              zipCode,
              fulfillmentMethod,
              deliveryFee,
              deliveryDate,
              deliveryZoneId,
              deliveryTimeWindow,
              pickupLocationId,
              pickupDate,
              pickupTimeWindow,
            });

            if (err) {
              console.error("Payment error:", err);
              toast.error(err.message || "Payment failed. Please try again.");
              setIsProcessing(false);
              return;
            }

            if (data) {
              toast.success("Payment successful!");
              onSuccess();
              // Redirect to thank you page
              router.push(`/purchase/thanks?order=${data.orderNumber}`);
            }
          } catch (error) {
            console.error("Payment error:", error);
            toast.error("Payment failed. Please try again.");
            setIsProcessing(false);
          }
        }}
        createPaymentRequest={() => {
          const itemsTotal = items.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          );
          const totalWithDelivery = itemsTotal + (deliveryFee || 0);
          return {
            countryCode: "US",
            currencyCode: "USD",
            total: {
              amount: String(totalWithDelivery / 100),
              label: "Total",
            },
          };
        }}
      >
        <CreditCard
          buttonProps={{
            css: {
              backgroundColor: "#FCACC5",
              fontSize: "16px",
              color: "#000",
              fontWeight: "600",
              padding: "16px 32px",
              borderRadius: "0.625rem",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
              "&:hover": {
                backgroundColor: "#fbb7cf",
                transform: "translateY(-1px)",
                boxShadow: "0 4px 6px rgba(252, 172, 197, 0.3)",
              },
              "&:active": {
                transform: "translateY(0)",
              },
            },
          }}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing Payment...
            </span>
          ) : (
            "Pay Now"
          )}
        </CreditCard>
      </PaymentForm>

      <p className="text-xs text-muted-foreground text-center">
        Payments are securely processed by Square
      </p>
    </div>
  );
}
