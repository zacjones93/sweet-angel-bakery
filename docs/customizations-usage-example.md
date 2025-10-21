# Product Customizations - Usage Example

This document shows how to use the product customizations system in your product pages.

## Example Product Page

Here's a complete example of a product page that handles both size variants and custom builders:

```typescript
// src/app/(storefront)/products/[slug]/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SizeVariantSelector } from "@/components/products/size-variant-selector";
import { CustomCakeBuilder } from "@/components/products/custom-cake-builder";
import { useCartStore } from "@/state/cart-context";
import {
  type ProductCustomizations,
  type OrderItemCustomizations,
  type SelectedCustomBuilder,
} from "@/types/customizations";
import {
  hasCustomizations,
  hasSizeVariants,
  hasCustomBuilder,
  validateCustomizations,
} from "@/utils/product-customizations";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  customizations: ProductCustomizations;
}

interface ProductPageProps {
  product: Product;
}

export default function ProductPage({ product }: ProductPageProps) {
  const router = useRouter();
  const { addItem } = useCartStore();

  const [quantity, setQuantity] = useState(1);
  const [selectedCustomizations, setSelectedCustomizations] =
    useState<OrderItemCustomizations>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // Handle size variant selection
  const handleVariantChange = (variantId: string, priceInCents: number) => {
    setSelectedCustomizations({
      type: "size_variant",
      selectedVariantId: variantId,
      finalPriceInCents: priceInCents,
    });
  };

  // Handle custom builder selections
  const handleCustomBuilderChange = (selections: SelectedCustomBuilder) => {
    setSelectedCustomizations(selections);
  };

  // Add to cart
  const handleAddToCart = async () => {
    setIsAddingToCart(true);

    try {
      // Validate customizations if product has them
      if (hasCustomizations(product)) {
        const { valid, errors } = validateCustomizations(
          product.customizations,
          selectedCustomizations
        );

        if (!valid) {
          alert(`Please complete your selections:\n${errors.join("\n")}`);
          setIsAddingToCart(false);
          return;
        }
      }

      // Add to cart
      await addItem({
        productId: product.id,
        quantity,
        customizations: selectedCustomizations,
      });

      // Show success message or redirect to cart
      router.push("/cart");
    } catch (error) {
      console.error("Failed to add to cart:", error);
      alert("Failed to add to cart. Please try again.");
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Get the final price to display
  const displayPrice =
    selectedCustomizations?.finalPriceInCents || product.price;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Product Image */}
        <div>
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-auto rounded-lg shadow-lg"
          />
        </div>

        {/* Product Details */}
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">{product.name}</h1>
            <p className="text-muted-foreground text-lg">
              {product.description}
            </p>
          </div>

          {/* Price Display */}
          <div className="text-3xl font-bold text-primary">
            ${(displayPrice / 100).toFixed(2)}
          </div>

          {/* Customization Options */}
          <div className="space-y-6">
            {/* Size Variants */}
            {hasSizeVariants(product) && (
              <SizeVariantSelector
                config={product.customizations}
                onVariantChange={handleVariantChange}
              />
            )}

            {/* Custom Builder */}
            {hasCustomBuilder(product) && (
              <CustomCakeBuilder
                config={product.customizations}
                onSelectionsChange={handleCustomBuilderChange}
              />
            )}
          </div>

          {/* Quantity Selector */}
          <div className="flex items-center gap-4">
            <label htmlFor="quantity" className="font-semibold">
              Quantity:
            </label>
            <div className="flex items-center border rounded-lg">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-4 py-2 hover:bg-accent"
              >
                -
              </button>
              <input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-16 text-center border-x py-2"
              />
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="px-4 py-2 hover:bg-accent"
              >
                +
              </button>
            </div>
          </div>

          {/* Add to Cart Button */}
          <Button
            onClick={handleAddToCart}
            disabled={isAddingToCart}
            size="lg"
            className="w-full"
          >
            {isAddingToCart ? "Adding to Cart..." : "Add to Cart"}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

## Cart Integration

Update your cart to handle customizations:

```typescript
// src/state/cart-context.tsx (or wherever your cart is)

import { type OrderItemCustomizations } from "@/types/customizations";
import { calculateOrderItemPrice } from "@/utils/product-customizations";

interface CartItem {
  productId: string;
  quantity: number;
  customizations: OrderItemCustomizations;
  // ... other fields
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: async (item: {
    productId: string;
    quantity: number;
    customizations: OrderItemCustomizations;
  }) => {
    // Fetch product details
    const product = await getProduct(item.productId);

    // Calculate final price
    const finalPrice = calculateOrderItemPrice(product, item.customizations);

    // Add to cart
    set((state) => ({
      items: [
        ...state.items,
        {
          ...item,
          price: finalPrice,
        },
      ],
    }));
  },

  // ... other cart methods
}));
```

## Display Cart Items with Customizations

```typescript
// src/components/cart/cart-item.tsx

import { type OrderItemCustomizations } from "@/types/customizations";
import { getCustomizationsSummary } from "@/utils/product-customizations";

interface CartItemProps {
  item: {
    product: Product;
    quantity: number;
    customizations: OrderItemCustomizations;
    price: number;
  };
}

export function CartItem({ item }: CartItemProps) {
  const customizationsSummary = getCustomizationsSummary(item.customizations);

  return (
    <div className="flex gap-4 p-4 border rounded-lg">
      <img
        src={item.product.imageUrl}
        alt={item.product.name}
        className="w-24 h-24 object-cover rounded"
      />

      <div className="flex-1">
        <h3 className="font-semibold">{item.product.name}</h3>

        {customizationsSummary && (
          <div className="mt-2 text-sm text-muted-foreground whitespace-pre-line">
            {customizationsSummary}
          </div>
        )}

        <div className="mt-2 flex items-center justify-between">
          <span>Quantity: {item.quantity}</span>
          <span className="font-bold">${(item.price / 100).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
```

## Checkout Integration

When creating the order:

```typescript
// src/app/(storefront)/checkout/actions.ts

import { enrichOrderItemCustomizations } from "@/utils/product-customizations";

export async function createOrder(cartItems: CartItem[]) {
  const db = getDB();

  // Create order
  const [order] = await db
    .insert(orderTable)
    .values({
      // ... order fields
    })
    .returning();

  // Create order items
  for (const item of cartItems) {
    // Enrich and validate customizations
    const enrichedCustomizations = item.customizations
      ? enrichOrderItemCustomizations(
          item.product.customizations,
          item.customizations
        )
      : null;

    await db.insert(orderItemTable).values({
      orderId: order.id,
      productId: item.productId,
      quantity: item.quantity,
      priceAtPurchase: item.price,
      customizations: enrichedCustomizations
        ? JSON.stringify(enrichedCustomizations)
        : null,
    });
  }

  return order;
}
```

## Admin Order View

Display order items with customizations:

```typescript
// src/app/(admin)/admin/orders/[orderId]/page.tsx

import {
  parseOrderItemCustomizations,
  getCustomizationsSummary,
} from "@/utils/product-customizations";

export default async function OrderDetailsPage({
  params,
}: {
  params: { orderId: string };
}) {
  const order = await getOrder(params.orderId);
  const items = await getOrderItems(params.orderId);

  return (
    <div>
      <h1>Order #{order.id}</h1>

      <div className="space-y-4">
        {items.map((item) => {
          const customizations = parseOrderItemCustomizations(
            item.customizations
          );
          const summary = getCustomizationsSummary(customizations);

          return (
            <div key={item.id} className="border rounded-lg p-4">
              <h3 className="font-semibold">{item.product.name}</h3>
              <p>Quantity: {item.quantity}</p>
              <p>Price: ${(item.priceAtPurchase / 100).toFixed(2)}</p>

              {summary && (
                <div className="mt-2 p-3 bg-muted rounded">
                  <p className="font-medium mb-1">Customizations:</p>
                  <pre className="text-sm whitespace-pre-line">{summary}</pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

## Testing the System

### Test Size Variants

1. Create a cake with 3 size options (6", 9", 12")
2. View the product page and select different sizes
3. Verify the price updates correctly
4. Add to cart and verify the correct size and price are saved
5. Complete checkout and verify the order stores the customizations

### Test Custom Builder

1. Create a custom cake with multiple options:
   - Size (single, required)
   - Flavor (single, required)
   - Frosting (single, required)
   - Toppings (multiple, optional, max 3)
2. View the product page and build a cake
3. Verify the price updates in real-time
4. Try to add without completing required fields - should show errors
5. Complete all selections and add to cart
6. Verify cart shows all customizations
7. Complete checkout and verify order stores everything

## Tips

1. **Price Display**: Always show the final price prominently, especially for custom builders
2. **Validation**: Validate on both client and server side
3. **Mobile**: Test the builder interface on mobile - consider a stepped wizard for complex builders
4. **Images**: Add images to choices for visual selection (especially for colors, decorations)
5. **Preview**: Consider adding a visual preview of the cake as they build it
6. **Save Configuration**: Allow users to save their custom configurations for reuse
7. **Defaults**: Always provide sensible defaults to make the process easier
8. **Help Text**: Add tooltips or help text for complex options
9. **Allergens**: Display allergen information where relevant
10. **Availability**: Some options might be seasonal - handle availability gracefully
