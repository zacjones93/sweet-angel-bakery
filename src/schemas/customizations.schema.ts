import { z } from "zod";

// Zod schema for Size Variant
export const sizeVariantSchema = z.object({
  id: z.string().min(1, "Variant ID is required"),
  name: z.string().min(1, "Variant name is required"),
  description: z.string().optional(),
  priceInCents: z.number().int().min(0, "Price must be non-negative"),
  stripePriceId: z.string().optional(),
  isDefault: z.boolean().optional(),
  quantityAvailable: z.number().int().min(0, "Quantity must be non-negative"),
});

// Zod schema for Size Variants Configuration
export const sizeVariantsConfigSchema = z.object({
  type: z.literal('size_variants'),
  variants: z.array(sizeVariantSchema).min(1, "At least one size variant is required"),
}).refine(
  (data) => {
    // Ensure at most one variant is marked as default
    const defaultCount = data.variants.filter(v => v.isDefault).length;
    return defaultCount <= 1;
  },
  {
    message: "Only one variant can be marked as default",
  }
);

// Zod schema for Customization Choice
export const customizationChoiceSchema = z.object({
  id: z.string().min(1, "Choice ID is required"),
  name: z.string().min(1, "Choice name is required"),
  description: z.string().optional(),
  priceModifier: z.number().int(), // Can be negative for discounts
  isDefault: z.boolean().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
});

// Zod schema for Customization Option
export const customizationOptionSchema = z.object({
  id: z.string().min(1, "Option ID is required"),
  name: z.string().min(1, "Option name is required"),
  description: z.string().optional(),
  type: z.enum(['single', 'multiple']),
  required: z.boolean(),
  minSelections: z.number().int().min(0).optional(),
  maxSelections: z.number().int().min(1).optional(),
  displayOrder: z.number().int().min(0),
  choices: z.array(customizationChoiceSchema).min(1, "At least one choice is required"),
}).refine(
  (data) => {
    // For single type, only one default allowed
    if (data.type === 'single') {
      const defaultCount = data.choices.filter(c => c.isDefault).length;
      return defaultCount <= 1;
    }
    return true;
  },
  {
    message: "Single-choice options can only have one default",
  }
).refine(
  (data) => {
    // Validate minSelections <= maxSelections
    if (data.minSelections !== undefined && data.maxSelections !== undefined) {
      return data.minSelections <= data.maxSelections;
    }
    return true;
  },
  {
    message: "Min selections must be less than or equal to max selections",
  }
).refine(
  (data) => {
    // For single type, max selections should be 1
    if (data.type === 'single' && data.maxSelections !== undefined) {
      return data.maxSelections === 1;
    }
    return true;
  },
  {
    message: "Single-choice options must have maxSelections of 1 or undefined",
  }
);

// Zod schema for Custom Builder Configuration
export const customBuilderConfigSchema = z.object({
  type: z.literal('custom_builder'),
  basePriceInCents: z.number().int().min(0, "Base price must be non-negative"),
  options: z.array(customizationOptionSchema).min(1, "At least one customization option is required"),
}).refine(
  (data) => {
    // Ensure display orders are unique
    const displayOrders = data.options.map(o => o.displayOrder);
    const uniqueOrders = new Set(displayOrders);
    return displayOrders.length === uniqueOrders.size;
  },
  {
    message: "Display orders must be unique",
  }
);

// Zod schema for Product Customizations (union type)
export const productCustomizationsSchema = z.union([
  sizeVariantsConfigSchema,
  customBuilderConfigSchema,
  z.null(),
]);

// Zod schema for Selected Size Variant
export const selectedSizeVariantSchema = z.object({
  type: z.literal('size_variant'),
  selectedVariantId: z.string().min(1, "Variant ID is required"),
  finalPriceInCents: z.number().int().min(0),
});

// Zod schema for Selected Custom Builder
export const selectedCustomBuilderSchema = z.object({
  type: z.literal('custom_builder'),
  selections: z.array(z.object({
    optionId: z.string().min(1),
    optionName: z.string().min(1),
    choiceIds: z.array(z.string().min(1)),
    choiceNames: z.array(z.string().min(1)),
  })),
  finalPriceInCents: z.number().int().min(0),
});

// Zod schema for Order Item Customizations
export const orderItemCustomizationsSchema = z.union([
  selectedSizeVariantSchema,
  selectedCustomBuilderSchema,
  z.null(),
]);

// Helper schemas for admin forms

// Schema for creating/editing a size variant product
export const sizeVariantFormSchema = z.object({
  variants: z.array(z.object({
    name: z.string().min(1, "Size name is required"),
    description: z.string().optional(),
    price: z.number().min(0, "Price must be non-negative"),
    isDefault: z.boolean().optional(),
  })).min(1, "At least one size variant is required"),
});

// Schema for creating/editing a custom builder product
export const customBuilderFormSchema = z.object({
  basePrice: z.number().min(0, "Base price must be non-negative"),
  options: z.array(z.object({
    name: z.string().min(1, "Option name is required"),
    description: z.string().optional(),
    type: z.enum(['single', 'multiple']),
    required: z.boolean(),
    minSelections: z.number().int().min(0).optional(),
    maxSelections: z.number().int().min(1).optional(),
    choices: z.array(z.object({
      name: z.string().min(1, "Choice name is required"),
      description: z.string().optional(),
      priceModifier: z.number(),
      isDefault: z.boolean().optional(),
      imageUrl: z.string().url().optional().or(z.literal('')),
    })).min(1, "At least one choice is required"),
  })).min(1, "At least one customization option is required"),
});

// Schema for customer selecting a size variant
export const selectSizeVariantSchema = z.object({
  variantId: z.string().min(1, "Please select a size"),
});

// Schema for customer building a custom product
export const buildCustomProductSchema = z.object({
  selections: z.array(z.object({
    optionId: z.string().min(1),
    choiceIds: z.array(z.string().min(1)).min(1, "At least one choice is required"),
  })),
});

