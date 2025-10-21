// Product Customization Types
// This file defines the flexible customization system for products

/**
 * Size Variant - For products with predefined size options (e.g., 6" cake vs 9" cake)
 */
export interface SizeVariant {
  id: string;
  name: string; // e.g., "6 inch", "9 inch", "12 inch"
  description?: string; // e.g., "Serves 6-8 people"
  priceInCents: number;
  stripePriceId?: string; // Stripe price ID for this variant
  isDefault?: boolean; // Mark one variant as default
  quantityAvailable: number; // Inventory for this specific variant
}

/**
 * Size Variants Configuration - For products with multiple size options
 */
export interface SizeVariantsConfig {
  type: 'size_variants';
  variants: SizeVariant[];
}

/**
 * Customization Choice - An individual choice within a customization option
 */
export interface CustomizationChoice {
  id: string;
  name: string; // e.g., "Chocolate", "Vanilla", "Strawberry"
  description?: string;
  priceModifier: number; // cents to add (positive) or subtract (negative)
  isDefault?: boolean; // Mark one choice as default
  imageUrl?: string; // Optional image for visual selection
}

/**
 * Customization Option - A customization category (e.g., "Flavor", "Frosting", "Toppings")
 */
export interface CustomizationOption {
  id: string;
  name: string; // e.g., "Cake Flavor", "Frosting Type", "Toppings"
  description?: string;
  type: 'single' | 'multiple'; // single choice (radio) or multiple choices (checkboxes)
  required: boolean; // Must the customer make a selection?
  minSelections?: number; // For multiple type, minimum selections required
  maxSelections?: number; // For multiple type, maximum selections allowed
  displayOrder: number; // Order to display options
  choices: CustomizationChoice[];
}

/**
 * Custom Builder Configuration - For fully customizable products
 */
export interface CustomBuilderConfig {
  type: 'custom_builder';
  basePriceInCents: number; // Starting price before customizations
  options: CustomizationOption[];
}

/**
 * Product Customizations - Union type for all customization configurations
 */
export type ProductCustomizations = SizeVariantsConfig | CustomBuilderConfig | null;

/**
 * Selected Size Variant - Customer's selection for size variant products
 */
export interface SelectedSizeVariant {
  type: 'size_variant';
  selectedVariantId: string;
  finalPriceInCents: number;
}

/**
 * Selected Custom Builder Options - Customer's selections for custom builder products
 */
export interface SelectedCustomBuilder {
  type: 'custom_builder';
  selections: Array<{
    optionId: string;
    optionName: string;
    choiceIds: string[];
    choiceNames: string[];
  }>;
  finalPriceInCents: number;
}

/**
 * Order Item Customizations - What the customer actually selected
 */
export type OrderItemCustomizations = SelectedSizeVariant | SelectedCustomBuilder | null;

/**
 * Helper function to calculate price for size variant selection
 */
export function calculateSizeVariantPrice(
  config: SizeVariantsConfig,
  selectedVariantId: string
): number {
  const variant = config.variants.find(v => v.id === selectedVariantId);
  if (!variant) {
    throw new Error(`Size variant not found: ${selectedVariantId}`);
  }
  return variant.priceInCents;
}

/**
 * Helper function to calculate price for custom builder selections
 */
export function calculateCustomBuilderPrice(
  config: CustomBuilderConfig,
  selections: Array<{ optionId: string; choiceIds: string[] }>
): number {
  let totalPrice = config.basePriceInCents;

  for (const selection of selections) {
    const option = config.options.find(o => o.id === selection.optionId);
    if (!option) {
      throw new Error(`Customization option not found: ${selection.optionId}`);
    }

    // Validate selection based on option type
    if (option.type === 'single' && selection.choiceIds.length > 1) {
      throw new Error(`Option "${option.name}" only allows single selection`);
    }

    if (option.required && selection.choiceIds.length === 0) {
      throw new Error(`Option "${option.name}" is required`);
    }

    if (option.minSelections && selection.choiceIds.length < option.minSelections) {
      throw new Error(`Option "${option.name}" requires at least ${option.minSelections} selections`);
    }

    if (option.maxSelections && selection.choiceIds.length > option.maxSelections) {
      throw new Error(`Option "${option.name}" allows maximum ${option.maxSelections} selections`);
    }

    // Add price modifiers for each selected choice
    for (const choiceId of selection.choiceIds) {
      const choice = option.choices.find(c => c.id === choiceId);
      if (!choice) {
        throw new Error(`Choice not found: ${choiceId} in option ${option.name}`);
      }
      totalPrice += choice.priceModifier;
    }
  }

  return totalPrice;
}

/**
 * Helper function to get default selections for a custom builder product
 */
export function getDefaultCustomBuilderSelections(config: CustomBuilderConfig): Array<{
  optionId: string;
  choiceIds: string[];
}> {
  return config.options
    .filter(option => option.required || option.choices.some(c => c.isDefault))
    .map(option => ({
      optionId: option.id,
      choiceIds: option.choices
        .filter(c => c.isDefault)
        .map(c => c.id)
    }))
    .filter(selection => selection.choiceIds.length > 0);
}

/**
 * Helper function to get default variant ID for size variants
 */
export function getDefaultSizeVariantId(config: SizeVariantsConfig): string | undefined {
  const defaultVariant = config.variants.find(v => v.isDefault);
  return defaultVariant?.id || config.variants[0]?.id;
}

/**
 * Helper to validate and enrich order item customizations
 */
export function validateAndEnrichOrderItemCustomizations(
  productCustomizations: ProductCustomizations,
  orderItemCustomizations: OrderItemCustomizations
): OrderItemCustomizations {
  if (!productCustomizations || !orderItemCustomizations) {
    return null;
  }

  if (productCustomizations.type === 'size_variants' && orderItemCustomizations.type === 'size_variant') {
    const price = calculateSizeVariantPrice(productCustomizations, orderItemCustomizations.selectedVariantId);
    return {
      ...orderItemCustomizations,
      finalPriceInCents: price,
    };
  }

  if (productCustomizations.type === 'custom_builder' && orderItemCustomizations.type === 'custom_builder') {
    const price = calculateCustomBuilderPrice(
      productCustomizations,
      orderItemCustomizations.selections.map(s => ({
        optionId: s.optionId,
        choiceIds: s.choiceIds,
      }))
    );
    return {
      ...orderItemCustomizations,
      finalPriceInCents: price,
    };
  }

  throw new Error('Customization type mismatch');
}

