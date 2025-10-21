# Product Customizations System

This document describes the flexible product customization system that supports size variants and custom cake builders.

## Overview

The customization system supports two types of product customizations:

1. **Size Variants**: For products with predefined sizes and prices (e.g., 6" cake for $45, 9" cake for $70)
2. **Custom Builder**: For fully customizable products where customers build their own cake with multiple options

## Database Schema

### Product Table

- `customizations` (TEXT): JSON field storing the customization configuration
  - Can be `null` for standard products with no customizations
  - Can be a `SizeVariantsConfig` object
  - Can be a `CustomBuilderConfig` object

### Order Item Table

- `customizations` (TEXT): JSON field storing the customer's selections
  - Stores what the customer actually selected
  - Includes the final calculated price

## Type Definitions

### Size Variants

```typescript
interface SizeVariant {
  id: string;
  name: string; // "6 inch", "9 inch", "12 inch"
  description?: string; // "Serves 6-8 people"
  priceInCents: number;
  stripePriceId?: string; // Stripe price ID for this variant
  isDefault?: boolean; // Mark one variant as default
}

interface SizeVariantsConfig {
  type: "size_variants";
  variants: SizeVariant[];
}
```

### Custom Builder

```typescript
interface CustomizationChoice {
  id: string;
  name: string; // "Chocolate", "Vanilla", "Strawberry"
  description?: string;
  priceModifier: number; // cents to add (positive) or subtract (negative)
  isDefault?: boolean;
  imageUrl?: string;
}

interface CustomizationOption {
  id: string;
  name: string; // "Cake Flavor", "Frosting Type"
  description?: string;
  type: "single" | "multiple"; // single choice (radio) or multiple (checkboxes)
  required: boolean;
  minSelections?: number; // For multiple type
  maxSelections?: number; // For multiple type
  displayOrder: number;
  choices: CustomizationChoice[];
}

interface CustomBuilderConfig {
  type: "custom_builder";
  basePriceInCents: number; // Starting price before customizations
  options: CustomizationOption[];
}
```

## Example Usage

### Creating a Cake with Size Variants

```typescript
import { createProductAction } from "@/app/(admin)/admin/_actions/products.action";
import { createId } from "@paralleldrive/cuid2";

// Create a chocolate cake with 3 size options
const result = await createProductAction({
  name: "Chocolate Celebration Cake",
  description: "Rich chocolate cake with chocolate frosting",
  categoryId: "cat_cakes123",
  price: 45.0, // Base price (will be overridden by variant prices)
  imageUrl: "https://example.com/chocolate-cake.jpg",
  status: "active",
  quantityAvailable: 10,
  customizations: {
    type: "size_variants",
    variants: [
      {
        id: createId(),
        name: "6 inch",
        description: "Serves 6-8 people",
        priceInCents: 4500, // $45.00
        isDefault: true,
      },
      {
        id: createId(),
        name: "9 inch",
        description: "Serves 12-15 people",
        priceInCents: 7000, // $70.00
      },
      {
        id: createId(),
        name: "12 inch",
        description: "Serves 20-25 people",
        priceInCents: 10000, // $100.00
      },
    ],
  },
});
```

### Creating a Custom Cake Builder

```typescript
import { createProductAction } from "@/app/(admin)/admin/_actions/products.action";
import { createId } from "@paralleldrive/cuid2";

// Create a fully customizable cake
const result = await createProductAction({
  name: "Custom Design Cake",
  description: "Build your perfect cake with our custom options",
  categoryId: "cat_custom123",
  price: 50.0, // Base price
  imageUrl: "https://example.com/custom-cake.jpg",
  status: "active",
  quantityAvailable: 0, // Made to order
  customizations: {
    type: "custom_builder",
    basePriceInCents: 5000, // $50.00 starting price
    options: [
      {
        id: createId(),
        name: "Cake Size",
        description: "Select your cake size",
        type: "single",
        required: true,
        displayOrder: 0,
        choices: [
          {
            id: createId(),
            name: "6 inch",
            description: "Serves 6-8",
            priceModifier: 0, // No additional charge
            isDefault: true,
          },
          {
            id: createId(),
            name: "9 inch",
            description: "Serves 12-15",
            priceModifier: 2500, // +$25.00
          },
          {
            id: createId(),
            name: "12 inch",
            description: "Serves 20-25",
            priceModifier: 5000, // +$50.00
          },
        ],
      },
      {
        id: createId(),
        name: "Cake Flavor",
        description: "Choose your cake flavor",
        type: "single",
        required: true,
        displayOrder: 1,
        choices: [
          {
            id: createId(),
            name: "Chocolate",
            priceModifier: 0,
            isDefault: true,
          },
          {
            id: createId(),
            name: "Vanilla",
            priceModifier: 0,
          },
          {
            id: createId(),
            name: "Red Velvet",
            priceModifier: 500, // +$5.00
          },
          {
            id: createId(),
            name: "Lemon",
            priceModifier: 300, // +$3.00
          },
        ],
      },
      {
        id: createId(),
        name: "Frosting Type",
        description: "Select your frosting",
        type: "single",
        required: true,
        displayOrder: 2,
        choices: [
          {
            id: createId(),
            name: "Buttercream",
            priceModifier: 0,
            isDefault: true,
          },
          {
            id: createId(),
            name: "Cream Cheese",
            priceModifier: 300, // +$3.00
          },
          {
            id: createId(),
            name: "Whipped Cream",
            priceModifier: 200, // +$2.00
          },
        ],
      },
      {
        id: createId(),
        name: "Toppings",
        description: "Add toppings (choose up to 3)",
        type: "multiple",
        required: false,
        maxSelections: 3,
        displayOrder: 3,
        choices: [
          {
            id: createId(),
            name: "Fresh Berries",
            priceModifier: 800, // +$8.00
          },
          {
            id: createId(),
            name: "Chocolate Shavings",
            priceModifier: 400, // +$4.00
          },
          {
            id: createId(),
            name: "Sprinkles",
            priceModifier: 200, // +$2.00
          },
          {
            id: createId(),
            name: "Edible Flowers",
            priceModifier: 1000, // +$10.00
          },
          {
            id: createId(),
            name: "Gold Leaf",
            priceModifier: 1500, // +$15.00
          },
        ],
      },
      {
        id: createId(),
        name: "Custom Message",
        description: "Add a custom message",
        type: "single",
        required: false,
        displayOrder: 4,
        choices: [
          {
            id: createId(),
            name: "No message",
            priceModifier: 0,
            isDefault: true,
          },
          {
            id: createId(),
            name: "Custom message",
            description: "We'll contact you for the text",
            priceModifier: 500, // +$5.00
          },
        ],
      },
    ],
  },
});
```

## Customer Selection

### Selecting a Size Variant

When a customer adds a size variant product to their cart:

```typescript
import { calculateSizeVariantPrice } from "@/types/customizations";

const product = {
  // ... product data with customizations
};

const customerSelection = {
  type: "size_variant" as const,
  selectedVariantId: "variant_9inch_id",
  finalPriceInCents: 7000,
};

// Add to cart with customizations
const cartItem = {
  productId: product.id,
  quantity: 1,
  customizations: customerSelection,
};
```

### Building a Custom Cake

When a customer builds a custom cake:

```typescript
import {
  calculateCustomBuilderPrice,
  enrichOrderItemCustomizations,
} from "@/utils/product-customizations";

const product = {
  // ... product data with custom_builder customizations
};

// Customer's selections
const customerSelection = {
  type: "custom_builder" as const,
  selections: [
    {
      optionId: "size_option_id",
      optionName: "Cake Size",
      choiceIds: ["9inch_choice_id"],
      choiceNames: ["9 inch"],
    },
    {
      optionId: "flavor_option_id",
      optionName: "Cake Flavor",
      choiceIds: ["chocolate_choice_id"],
      choiceNames: ["Chocolate"],
    },
    {
      optionId: "frosting_option_id",
      optionName: "Frosting Type",
      choiceIds: ["buttercream_choice_id"],
      choiceNames: ["Buttercream"],
    },
    {
      optionId: "toppings_option_id",
      optionName: "Toppings",
      choiceIds: ["berries_choice_id", "sprinkles_choice_id"],
      choiceNames: ["Fresh Berries", "Sprinkles"],
    },
  ],
  finalPriceInCents: 8500, // $85.00 ($50 base + $25 size + $8 berries + $2 sprinkles)
};

// Validate and enrich before adding to cart
const enriched = enrichOrderItemCustomizations(
  product.customizations,
  customerSelection
);
```

## Utility Functions

### Calculate Price

```typescript
import { calculateOrderItemPrice } from "@/utils/product-customizations";

const finalPrice = calculateOrderItemPrice(product, customerSelection);
```

### Validate Selections

```typescript
import { validateCustomizations } from "@/utils/product-customizations";

const { valid, errors } = validateCustomizations(
  product.customizations,
  customerSelection
);

if (!valid) {
  console.error("Invalid selections:", errors);
}
```

### Get Display Price

```typescript
import { getProductDisplayPrice } from "@/utils/product-customizations";

// Get the price to show on product cards (default/base price)
const displayPrice = getProductDisplayPrice(
  product.price,
  product.customizations
);
```

## Storing Orders

When creating an order item, store the customizations:

```typescript
await db.insert(orderItemTable).values({
  orderId: "ord_123",
  productId: "prod_456",
  quantity: 1,
  priceAtPurchase: 7000, // Final calculated price
  customizations: JSON.stringify(customerSelection),
});
```

## Displaying Orders

When showing order details:

```typescript
import {
  parseOrderItemCustomizations,
  getCustomizationsSummary
} from '@/utils/product-customizations';

const orderItem = await db.select().from(orderItemTable).where(...);

const customizations = parseOrderItemCustomizations(orderItem.customizations);
const summary = getCustomizationsSummary(customizations);

console.log(summary);
// Output:
// Cake Size: 9 inch
// Cake Flavor: Chocolate
// Frosting Type: Buttercream
// Toppings: Fresh Berries, Sprinkles
```

## Admin UI Considerations

### Size Variants Admin Form

- Allow adding/removing variants
- Each variant has: name, description, price
- Mark one as default
- Show price comparison between variants
- Preview how it will look to customers

### Custom Builder Admin Form

- Drag-and-drop reordering of options (displayOrder)
- Add/edit/remove options
- For each option:
  - Set name, description, type (single/multiple)
  - Set required/optional
  - Set min/max selections for multiple type
  - Add/edit/remove choices
  - For each choice: name, description, price modifier, optional image
- Live price calculator showing how customizations affect final price
- Preview of the builder interface

## Storefront UI Considerations

### Size Variant Product Page

- Show all available sizes in a radio group or button group
- Display price for each size
- Show description (serves X people) under each size
- Highlight the default/selected size
- Update displayed price when size changes
- Clear "Add to Cart" button with final price

### Custom Builder Interface

- Step-by-step builder or single page with sections
- For single-choice options: Radio buttons or button group
- For multiple-choice options: Checkboxes with visual indicators for min/max
- Real-time price calculator showing:
  - Base price
  - Each customization and its price modifier
  - Running total
  - Final price
- Validation messages for required options
- Visual feedback for selections
- Summary of selections before adding to cart
- Option to save custom designs (future feature)

## Stripe Integration

### Size Variants

- Each size variant gets its own Stripe Price ID
- When checking out, use the appropriate Price ID for the selected variant
- Store the variant's Stripe Price ID in the customizations config

### Custom Builder

- Use the base Stripe Price ID
- The total price is calculated dynamically
- Stripe checkout uses the calculated total
- Store the detailed breakdown in order metadata

## Migration Path

### Existing Products

Existing products without customizations will have `customizations: null` and continue to work as before.

### Adding Customizations to Existing Products

1. Update the product with customizations config
2. The existing base price becomes either:
   - The default variant price (for size variants)
   - The base price (for custom builder)
3. Create Stripe prices for new variants/options as needed

## Future Enhancements

- **Image Upload**: Allow customers to upload reference images for custom designs
- **Allergen Warnings**: Add allergen information to choices
- **Saved Templates**: Let customers save and reuse custom configurations
- **Seasonal Options**: Enable/disable certain choices based on season or availability
- **Quantity Discounts**: Apply discounts for bulk orders of custom cakes
- **Complex Pricing Rules**: More sophisticated pricing logic (e.g., "First 3 toppings free")
- **3D Preview**: Visual preview of the custom cake as they build it
