# Product Customizations - Quick Start Guide

## What You Just Got

A complete, production-ready product customization system with:

✅ **Database schema** with JSON fields for flexible customizations
✅ **TypeScript types** with full type safety
✅ **Zod validation schemas** for data integrity
✅ **Helper functions** for price calculation and validation
✅ **React components** ready to use in your product pages
✅ **Stripe integration** for variant pricing
✅ **Comprehensive documentation** and examples

## Migration Applied

The database migration has been applied to your local database. The following fields were added:

- `product.customizations` - JSON field for product customization config
- `order_item.customizations` - JSON field for customer selections

## File Structure

```
src/
├── types/customizations.ts                    # Type definitions and helpers
├── schemas/customizations.schema.ts           # Zod validation schemas
├── utils/product-customizations.ts            # Server-side utilities
├── components/products/
│   ├── size-variant-selector.tsx              # Size selection UI
│   └── custom-cake-builder.tsx                # Custom builder UI
└── app/(admin)/admin/_actions/
    └── products.action.ts                     # Updated with customizations

docs/
├── product-customizations.md                  # Full documentation
├── customizations-usage-example.md            # Code examples
├── customizations-implementation-summary.md   # Implementation details
└── customizations-quick-start.md             # This file
```

## Quick Examples

### 1. Create a Cake with Size Options

```typescript
import { createProductAction } from "@/app/(admin)/admin/_actions/products.action";
import { createId } from "@paralleldrive/cuid2";

// Create a chocolate cake with 3 sizes
const result = await createProductAction({
  name: "Chocolate Celebration Cake",
  description: "Rich chocolate cake with chocolate frosting",
  categoryId: "cat_your_category_id",
  price: 45.0,
  imageUrl: "/assets/products/chocolate-cake.webp",
  status: "active",
  quantityAvailable: 10,
  customizations: {
    type: "size_variants",
    variants: [
      {
        id: createId(),
        name: "6 inch",
        description: "Serves 6-8 people",
        priceInCents: 4500,
        isDefault: true,
      },
      {
        id: createId(),
        name: "9 inch",
        description: "Serves 12-15 people",
        priceInCents: 7000,
      },
      {
        id: createId(),
        name: "12 inch",
        description: "Serves 20-25 people",
        priceInCents: 10000,
      },
    ],
  },
});
```

### 2. Create a Fully Custom Cake

```typescript
// Create a custom cake builder
const result = await createProductAction({
  name: "Custom Design Cake",
  description: "Build your perfect cake",
  categoryId: "cat_your_category_id",
  price: 50.0, // Base price
  imageUrl: "/assets/products/custom-cake.webp",
  status: "active",
  quantityAvailable: 0, // Made to order
  customizations: {
    type: "custom_builder",
    basePriceInCents: 5000, // $50 base
    options: [
      {
        id: createId(),
        name: "Cake Size",
        type: "single",
        required: true,
        displayOrder: 0,
        choices: [
          {
            id: createId(),
            name: "6 inch",
            description: "Serves 6-8",
            priceModifier: 0,
            isDefault: true,
          },
          {
            id: createId(),
            name: "9 inch",
            description: "Serves 12-15",
            priceModifier: 2500, // +$25
          },
        ],
      },
      {
        id: createId(),
        name: "Cake Flavor",
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
          { id: createId(), name: "Vanilla", priceModifier: 0 },
          { id: createId(), name: "Red Velvet", priceModifier: 500 },
        ],
      },
      {
        id: createId(),
        name: "Toppings",
        description: "Select up to 3 toppings",
        type: "multiple",
        required: false,
        maxSelections: 3,
        displayOrder: 2,
        choices: [
          { id: createId(), name: "Fresh Berries", priceModifier: 800 },
          { id: createId(), name: "Chocolate Shavings", priceModifier: 400 },
          { id: createId(), name: "Sprinkles", priceModifier: 200 },
        ],
      },
    ],
  },
});
```

### 3. Use in a Product Page

```tsx
// src/app/(storefront)/products/[slug]/page.tsx
"use client";

import { SizeVariantSelector } from "@/components/products/size-variant-selector";
import { CustomCakeBuilder } from "@/components/products/custom-cake-builder";
import {
  hasSizeVariants,
  hasCustomBuilder,
} from "@/utils/product-customizations";

export default function ProductPage({ product }) {
  const [customizations, setCustomizations] = useState(null);

  return (
    <div>
      <h1>{product.name}</h1>

      {/* For size variants */}
      {hasSizeVariants(product) && (
        <SizeVariantSelector
          config={product.customizations}
          onVariantChange={(variantId, price) => {
            setCustomizations({
              type: "size_variant",
              selectedVariantId: variantId,
              finalPriceInCents: price,
            });
          }}
        />
      )}

      {/* For custom builder */}
      {hasCustomBuilder(product) && (
        <CustomCakeBuilder
          config={product.customizations}
          onSelectionsChange={(selections) => {
            setCustomizations(selections);
          }}
        />
      )}

      <button onClick={() => addToCart(product, customizations)}>
        Add to Cart
      </button>
    </div>
  );
}
```

## Next Steps

### 1. Deploy the Migration

```bash
# Apply to production database
pnpm wrangler d1 migrations apply $(node scripts/get-db-name.mjs) --remote
```

### 2. Create Test Products

Use the examples above to create test products with customizations.

### 3. Update Your Product Pages

Integrate the `SizeVariantSelector` or `CustomCakeBuilder` components into your existing product pages.

### 4. Update Cart Logic

Ensure your cart stores and displays customizations:

```typescript
interface CartItem {
  productId: string;
  quantity: number;
  customizations: OrderItemCustomizations;
  // ... other fields
}
```

### 5. Update Checkout

When creating orders, store the customizations:

```typescript
await db.insert(orderItemTable).values({
  orderId: order.id,
  productId: item.productId,
  quantity: item.quantity,
  priceAtPurchase: item.finalPrice,
  customizations: JSON.stringify(item.customizations),
});
```

## Key Concepts

### Product Customizations (Config)

Stored in `product.customizations` as JSON. Defines WHAT options are available.

```typescript
{
  type: 'size_variants',
  variants: [...]
}
// or
{
  type: 'custom_builder',
  basePriceInCents: 5000,
  options: [...]
}
```

### Order Item Customizations (Selection)

Stored in `order_item.customizations` as JSON. Records WHAT the customer selected.

```typescript
{
  type: 'size_variant',
  selectedVariantId: 'variant_123',
  finalPriceInCents: 7000
}
// or
{
  type: 'custom_builder',
  selections: [...],
  finalPriceInCents: 8500
}
```

## Common Tasks

### Get Product Display Price

```typescript
import { getProductDisplayPrice } from "@/utils/product-customizations";

const price = getProductDisplayPrice(product.price, product.customizations);
```

### Calculate Final Price

```typescript
import { calculateOrderItemPrice } from "@/utils/product-customizations";

const finalPrice = calculateOrderItemPrice(product, customerCustomizations);
```

### Validate Selections

```typescript
import { validateCustomizations } from "@/utils/product-customizations";

const { valid, errors } = validateCustomizations(
  product.customizations,
  customerCustomizations
);

if (!valid) {
  alert(errors.join("\n"));
}
```

### Display Order Customizations

```typescript
import { getCustomizationsSummary } from "@/utils/product-customizations";

const summary = getCustomizationsSummary(orderItem.customizations);
console.log(summary);
// Output:
// Size: 9 inch
// Flavor: Chocolate
// Toppings: Fresh Berries, Sprinkles
```

## Testing Checklist

- [ ] Create a product with size variants
- [ ] View the product page and select different sizes
- [ ] Verify price updates correctly
- [ ] Add to cart with selected size
- [ ] Create a product with custom builder
- [ ] Build a custom cake with multiple options
- [ ] Verify real-time price calculation
- [ ] Try to submit without required fields (should error)
- [ ] Complete checkout with customized product
- [ ] Verify order stores customizations correctly
- [ ] View order in admin and see customizations displayed

## Need Help?

- **Full Documentation**: `docs/product-customizations.md`
- **Code Examples**: `docs/customizations-usage-example.md`
- **Implementation Details**: `docs/customizations-implementation-summary.md`
- **Type Definitions**: `src/types/customizations.ts`
- **Utility Functions**: `src/utils/product-customizations.ts`

## Tips

1. **Always use `createId()`** for generating IDs for variants, options, and choices
2. **Mark one variant/choice as default** for better UX
3. **Test price calculations** thoroughly with different combinations
4. **Display final price prominently** especially for custom builders
5. **Add images to choices** for visual selection when possible
6. **Consider mobile UX** - custom builder should work well on small screens
7. **Validate on both client and server** for security
8. **Store enriched customizations** in orders for complete records

## Example: Full Flow

```typescript
// 1. Admin creates product with customizations
await createProductAction({
  /* ... with customizations */
});

// 2. Customer views product
const product = await getProduct(id);

// 3. Customer makes selections
<CustomCakeBuilder
  config={product.customizations}
  onSelectionsChange={setCustomizations}
/>;

// 4. Validate selections
const { valid } = validateCustomizations(
  product.customizations,
  customizations
);

// 5. Add to cart
addToCart({
  productId: product.id,
  quantity: 1,
  customizations: customizations, // Includes finalPriceInCents
});

// 6. At checkout, create order
await db.insert(orderItemTable).values({
  orderId: order.id,
  productId: item.productId,
  quantity: item.quantity,
  priceAtPurchase: item.customizations.finalPriceInCents,
  customizations: JSON.stringify(item.customizations),
});
```

You're all set! The customization system is ready to use. Start by creating a test product with the examples above.
