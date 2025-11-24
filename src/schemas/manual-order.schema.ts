import { z } from "zod";
import { orderItemCustomizationsSchema } from "./customizations.schema";

// Payment method options for manual orders
export const paymentMethodSchema = z.enum(["card", "cash", "check", "external"]);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

// Order item schema for manual orders
export const manualOrderItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().int().positive("Quantity must be at least 1"),
  customizations: orderItemCustomizationsSchema.optional(),
  name: z.string().min(1, "Product name is required"),
  priceInCents: z.number().int().nonnegative("Price must be non-negative"),
});

export type ManualOrderItem = z.infer<typeof manualOrderItemSchema>;

// Base form schema without items (for react-hook-form)
export const manualOrderFormSchema = z.object({
  // Customer info
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Valid email is required"),
  customerPhone: z.string().optional(),

  // Payment info
  paymentMethod: paymentMethodSchema,
  paymentStatus: z.enum(["pending", "paid"]).default("paid"),

  // Admin notes
  adminNotes: z.string().max(2000).optional(),

  // Fulfillment method
  fulfillmentMethod: z.enum(["delivery", "pickup"]),

  // Delivery fields
  deliveryDate: z.string().optional(),
  deliveryTimeWindow: z.string().optional(),
  deliveryZoneId: z.string().optional(),
  deliveryFee: z.number().int().nonnegative().optional(),
  deliveryInstructions: z.string().max(1000).optional(),
  streetAddress1: z.string().optional(),
  streetAddress2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),

  // Pickup fields
  pickupLocationId: z.string().optional(),
  pickupDate: z.string().optional(),
  pickupTimeWindow: z.string().optional(),
  pickupInstructions: z.string().max(1000).optional(),

  // Whether to send confirmation email to customer
  sendConfirmationEmail: z.boolean().default(true),
});

export type ManualOrderFormValues = z.infer<typeof manualOrderFormSchema>;

// Full manual order schema
export const manualOrderSchema = z.object({
  // Customer info
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Valid email is required"),
  customerPhone: z.string().optional(),

  // Order items
  items: z.array(manualOrderItemSchema).min(1, "At least one item is required"),

  // Payment info
  paymentMethod: paymentMethodSchema,
  paymentStatus: z.enum(["pending", "paid"]).default("paid"),

  // Admin notes
  adminNotes: z.string().max(2000).optional(),

  // Fulfillment method
  fulfillmentMethod: z.enum(["delivery", "pickup"]),

  // Delivery fields (conditional on fulfillmentMethod === "delivery")
  deliveryDate: z.string().optional(),
  deliveryTimeWindow: z.string().optional(),
  deliveryZoneId: z.string().optional(),
  deliveryFee: z.number().int().nonnegative().optional(),
  deliveryInstructions: z.string().max(1000).optional(),
  streetAddress1: z.string().optional(),
  streetAddress2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),

  // Pickup fields (conditional on fulfillmentMethod === "pickup")
  pickupLocationId: z.string().optional(),
  pickupDate: z.string().optional(),
  pickupTimeWindow: z.string().optional(),
  pickupInstructions: z.string().max(1000).optional(),

  // Whether to send confirmation email to customer
  sendConfirmationEmail: z.boolean().default(true),
}).superRefine((data, ctx) => {
  // Validate delivery fields if fulfillmentMethod is "delivery"
  if (data.fulfillmentMethod === "delivery") {
    if (!data.deliveryDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Delivery date is required for delivery orders",
        path: ["deliveryDate"],
      });
    }
    if (!data.streetAddress1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Street address is required for delivery orders",
        path: ["streetAddress1"],
      });
    }
    if (!data.city) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "City is required for delivery orders",
        path: ["city"],
      });
    }
    if (!data.state) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "State is required for delivery orders",
        path: ["state"],
      });
    }
    if (!data.zipCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ZIP code is required for delivery orders",
        path: ["zipCode"],
      });
    }
  }

  // Validate pickup fields if fulfillmentMethod is "pickup"
  if (data.fulfillmentMethod === "pickup") {
    if (!data.pickupLocationId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pickup location is required for pickup orders",
        path: ["pickupLocationId"],
      });
    }
    if (!data.pickupDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pickup date is required for pickup orders",
        path: ["pickupDate"],
      });
    }
  }
});

export type ManualOrderInput = z.infer<typeof manualOrderSchema>;
