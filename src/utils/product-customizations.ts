import "server-only";

import {
  type ProductCustomizations,
  type OrderItemCustomizations,
  type SizeVariantsConfig,
  type CustomBuilderConfig,
  calculateSizeVariantPrice,
  calculateCustomBuilderPrice,
  getDefaultSizeVariantId,
  getDefaultCustomBuilderSelections,
} from "@/types/customizations";

/**
 * Get the display price for a product
 * Returns the base/default price to show on product listings
 */
export function getProductDisplayPrice(
  basePrice: number,
  customizations: ProductCustomizations
): number {
  if (!customizations) {
    return basePrice;
  }

  if (customizations.type === 'size_variants') {
    // Return the default variant price, or first variant price
    const defaultVariantId = getDefaultSizeVariantId(customizations);
    if (defaultVariantId) {
      return calculateSizeVariantPrice(customizations, defaultVariantId);
    }
  }

  if (customizations.type === 'custom_builder') {
    // Return the base price for custom builder products
    return customizations.basePriceInCents;
  }

  return basePrice;
}

/**
 * Get the Stripe price ID to use for a product with customizations
 */
export function getStripePriceId(
  product: {
    stripePriceId: string | null;
    customizations: ProductCustomizations;
  },
  orderItemCustomizations?: OrderItemCustomizations
): string | null {
  if (!product.stripePriceId) {
    return null;
  }

  // For size variants, use the variant's Stripe price ID
  if (
    product.customizations?.type === 'size_variants' &&
    orderItemCustomizations?.type === 'size_variant'
  ) {
    const variant = product.customizations.variants.find(
      v => v.id === orderItemCustomizations.selectedVariantId
    );
    return variant?.stripePriceId || product.stripePriceId;
  }

  // For custom builder and standard products, use the base price
  return product.stripePriceId;
}

/**
 * Calculate the final price for an order item with customizations
 */
export function calculateOrderItemPrice(
  product: {
    price: number;
    customizations: ProductCustomizations;
  },
  orderItemCustomizations?: OrderItemCustomizations
): number {
  // If no customizations on the product, return base price
  if (!product.customizations) {
    return product.price;
  }

  // If no customizations selected, return default price
  if (!orderItemCustomizations) {
    return getProductDisplayPrice(product.price, product.customizations);
  }

  // Validate that customization types match
  if (product.customizations.type !== orderItemCustomizations.type) {
    throw new Error('Customization type mismatch');
  }

  // Calculate based on selection
  if (
    product.customizations.type === 'size_variants' &&
    orderItemCustomizations.type === 'size_variant'
  ) {
    return calculateSizeVariantPrice(
      product.customizations,
      orderItemCustomizations.selectedVariantId
    );
  }

  if (
    product.customizations.type === 'custom_builder' &&
    orderItemCustomizations.type === 'custom_builder'
  ) {
    return calculateCustomBuilderPrice(
      product.customizations,
      orderItemCustomizations.selections.map(s => ({
        optionId: s.optionId,
        choiceIds: s.choiceIds,
      }))
    );
  }

  return product.price;
}

/**
 * Validate and enrich order item customizations with full details
 * This ensures the stored customizations include both IDs and human-readable names
 */
export function enrichOrderItemCustomizations(
  productCustomizations: ProductCustomizations,
  orderItemCustomizations: OrderItemCustomizations
): OrderItemCustomizations {
  if (!productCustomizations || !orderItemCustomizations) {
    return null;
  }

  if (
    productCustomizations.type === 'size_variants' &&
    orderItemCustomizations.type === 'size_variant'
  ) {
    const variant = productCustomizations.variants.find(
      v => v.id === orderItemCustomizations.selectedVariantId
    );

    if (!variant) {
      throw new Error(`Invalid size variant: ${orderItemCustomizations.selectedVariantId}`);
    }

    return {
      type: 'size_variant',
      selectedVariantId: variant.id,
      finalPriceInCents: variant.priceInCents,
    };
  }

  if (
    productCustomizations.type === 'custom_builder' &&
    orderItemCustomizations.type === 'custom_builder'
  ) {
    const enrichedSelections = orderItemCustomizations.selections.map(selection => {
      const option = productCustomizations.options.find(o => o.id === selection.optionId);
      if (!option) {
        throw new Error(`Invalid customization option: ${selection.optionId}`);
      }

      const selectedChoices = selection.choiceIds.map(choiceId => {
        const choice = option.choices.find(c => c.id === choiceId);
        if (!choice) {
          throw new Error(`Invalid choice: ${choiceId} for option ${option.name}`);
        }
        return choice;
      });

      return {
        optionId: option.id,
        optionName: option.name,
        choiceIds: selectedChoices.map(c => c.id),
        choiceNames: selectedChoices.map(c => c.name),
      };
    });

    const finalPrice = calculateCustomBuilderPrice(
      productCustomizations,
      enrichedSelections.map(s => ({
        optionId: s.optionId,
        choiceIds: s.choiceIds,
      }))
    );

    return {
      type: 'custom_builder',
      selections: enrichedSelections,
      finalPriceInCents: finalPrice,
    };
  }

  throw new Error('Customization type mismatch');
}

/**
 * Get a human-readable summary of customizations for display
 */
export function getCustomizationsSummary(
  orderItemCustomizations: OrderItemCustomizations
): string {
  if (!orderItemCustomizations) {
    return '';
  }

  if (orderItemCustomizations.type === 'size_variant') {
    // For size variants, we only have the ID stored
    // In a real application, you'd want to look up the variant name
    return `Size: ${orderItemCustomizations.selectedVariantId}`;
  }

  if (orderItemCustomizations.type === 'custom_builder') {
    const lines = orderItemCustomizations.selections.map(selection => {
      const choices = selection.choiceNames.join(', ');
      return `${selection.optionName}: ${choices}`;
    });
    return lines.join('\n');
  }

  return '';
}

/**
 * Parse product customizations from JSON string
 */
export function parseProductCustomizations(
  customizationsJson: string | null
): ProductCustomizations {
  if (!customizationsJson) {
    return null;
  }

  try {
    return JSON.parse(customizationsJson) as ProductCustomizations;
  } catch (error) {
    console.error('Failed to parse product customizations:', error);
    return null;
  }
}

/**
 * Parse order item customizations from JSON string
 */
export function parseOrderItemCustomizations(
  customizationsJson: string | null
): OrderItemCustomizations {
  if (!customizationsJson) {
    return null;
  }

  try {
    return JSON.parse(customizationsJson) as OrderItemCustomizations;
  } catch (error) {
    console.error('Failed to parse order item customizations:', error);
    return null;
  }
}

/**
 * Check if a product has customizations
 */
export function hasCustomizations(product: {
  customizations: ProductCustomizations;
}): boolean {
  return !!product.customizations;
}

/**
 * Check if a product has size variants
 */
export function hasSizeVariants(product: {
  customizations: ProductCustomizations;
}): product is { customizations: SizeVariantsConfig } {
  return product.customizations?.type === 'size_variants';
}

/**
 * Check if a product has custom builder
 */
export function hasCustomBuilder(product: {
  customizations: ProductCustomizations;
}): product is { customizations: CustomBuilderConfig } {
  return product.customizations?.type === 'custom_builder';
}

/**
 * Validate that all required customizations are selected
 */
export function validateCustomizations(
  productCustomizations: ProductCustomizations,
  orderItemCustomizations: OrderItemCustomizations | undefined
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // If product has no customizations, none are required
  if (!productCustomizations) {
    return { valid: true, errors: [] };
  }

  // If product has customizations but none are selected
  if (!orderItemCustomizations) {
    errors.push('Please select your customization options');
    return { valid: false, errors };
  }

  // Validate size variants
  if (productCustomizations.type === 'size_variants') {
    if (orderItemCustomizations.type !== 'size_variant') {
      errors.push('Invalid customization type');
      return { valid: false, errors };
    }

    const variant = productCustomizations.variants.find(
      v => v.id === orderItemCustomizations.selectedVariantId
    );
    if (!variant) {
      errors.push('Please select a valid size');
    }
  }

  // Validate custom builder
  if (productCustomizations.type === 'custom_builder') {
    if (orderItemCustomizations.type !== 'custom_builder') {
      errors.push('Invalid customization type');
      return { valid: false, errors };
    }

    // Check each option
    for (const option of productCustomizations.options) {
      const selection = orderItemCustomizations.selections.find(
        s => s.optionId === option.id
      );

      if (option.required && (!selection || selection.choiceIds.length === 0)) {
        errors.push(`${option.name} is required`);
        continue;
      }

      if (selection) {
        if (option.type === 'single' && selection.choiceIds.length > 1) {
          errors.push(`${option.name} only allows one selection`);
        }

        if (option.minSelections && selection.choiceIds.length < option.minSelections) {
          errors.push(`${option.name} requires at least ${option.minSelections} selections`);
        }

        if (option.maxSelections && selection.choiceIds.length > option.maxSelections) {
          errors.push(`${option.name} allows maximum ${option.maxSelections} selections`);
        }

        // Validate that all selected choices exist
        for (const choiceId of selection.choiceIds) {
          const choice = option.choices.find(c => c.id === choiceId);
          if (!choice) {
            errors.push(`Invalid choice in ${option.name}`);
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

