"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { ShoppingCart, Plus, Minus } from "lucide-react";
import { useCart } from "@/state/cart-context";
import { toast } from "sonner";
import { ProductVariantSelector } from "./product-variant-selector";
import type {
  ProductCustomizations,
  SizeVariant,
  SizeVariantsConfig,
} from "@/types/customizations";
import { createId } from "@paralleldrive/cuid2";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  quantityAvailable: number;
  customizations?: ProductCustomizations;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

export function ProductCard({ product }: { product: Product }) {
  const { addItem, items, updateQuantity, removeItem } = useCart();

  // For size variants, track selected variant
  const hasVariants = product.customizations?.type === "size_variants";
  const variants: SizeVariant[] =
    hasVariants && product?.customizations?.type === "size_variants"
      ? product.customizations.variants
      : [];
  const defaultVariant = hasVariants
    ? variants.find((v) => v.isDefault) || variants[0]
    : null;

  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    defaultVariant?.id || ""
  );
  const [selectedPrice, setSelectedPrice] = useState<number>(
    defaultVariant?.priceInCents || product.price
  );

  // Get selected variant and its quantity
  const selectedVariant = hasVariants
    ? variants.find((v) => v.id === selectedVariantId)
    : null;

  // Use variant quantity if available, otherwise use product quantity
  const availableQuantity =
    selectedVariant?.quantityAvailable ?? product.quantityAvailable;

  // Generate cart item ID based on product and selected variant
  const cartItemId = hasVariants
    ? `${product.id}_${selectedVariantId}`
    : product.id;

  const cartItem = items.find((item) => item.cartItemId === cartItemId);
  const cartQuantity = cartItem?.quantity || 0;
  const isOutOfStock = availableQuantity <= 0;
  const isMaxedOut = cartQuantity >= availableQuantity;
  const isInCart = cartQuantity > 0;

  const handleVariantChange = (variantId: string, priceInCents: number) => {
    setSelectedVariantId(variantId);
    setSelectedPrice(priceInCents);
  };

  function handleAddToCart() {
    if (isOutOfStock) {
      toast.error("This item is out of stock");
      return;
    }

    if (isMaxedOut) {
      toast.error("Cannot add more - maximum quantity in cart");
      return;
    }

    // Build customizations if product has variants
    const customizations = hasVariants
      ? {
          type: "size_variant" as const,
          selectedVariantId,
          finalPriceInCents: selectedPrice,
        }
      : undefined;

    // Get variant name for display
    const variantName = hasVariants
      ? variants.find((v) => v.id === selectedVariantId)?.name
      : null;

    const displayName = variantName
      ? `${product.name} (${variantName})`
      : product.name;

    addItem({
      cartItemId,
      productId: product.id,
      name: displayName,
      price: selectedPrice,
      imageUrl: product.imageUrl,
      categoryName: product.category?.name || "Unknown",
      quantityAvailable: availableQuantity,
      customizations,
    });
    toast.success(`Added ${displayName} to cart`);
  }

  function handleIncrement() {
    if (isMaxedOut) {
      toast.error("Cannot add more - maximum quantity in cart");
      return;
    }
    updateQuantity(cartItemId, cartQuantity + 1);
  }

  function handleDecrement() {
    if (cartQuantity > 1) {
      updateQuantity(cartItemId, cartQuantity - 1);
    } else {
      removeItem(cartItemId);
      const variantName = hasVariants
        ? variants.find((v) => v.id === selectedVariantId)?.name
        : null;
      const displayName = variantName
        ? `${product.name} (${variantName})`
        : product.name;
      toast.success(`Removed ${displayName} from cart`);
    }
  }

  function formatPrice(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20 group flex flex-col h-full">
      <CardHeader className="p-0">
        {product.imageUrl ? (
          <div className="relative aspect-square overflow-hidden">
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        ) : (
          <div className="aspect-square bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center">
            <span className="text-muted-foreground">No image</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-6 flex-1 flex flex-col">
        <div className="space-y-3 flex-1">
          <div>
            <h3 className="font-display font-bold text-xl mb-1">
              {product.name}
            </h3>
            {product.category && (
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {product.category.name}
              </p>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.625rem]">
            {product.description || " "}
          </p>
          {!hasVariants && (
            <p className="text-2xl font-bold text-primary">
              {formatPrice(product.price)}
            </p>
          )}
          {hasVariants && (
            <p className="text-2xl font-bold text-primary">
              {formatPrice(selectedPrice)}
            </p>
          )}
          {isOutOfStock ? (
            <p className="text-sm font-semibold text-destructive">
              Out of Stock
            </p>
          ) : availableQuantity <= 5 ? (
            <p className="text-sm font-semibold text-orange-600">
              Only {availableQuantity} left!
            </p>
          ) : null}
        </div>
        {hasVariants && product.customizations && (
          <ProductVariantSelector
            config={product.customizations as SizeVariantsConfig}
            onVariantChange={handleVariantChange}
            className="mt-4"
          />
        )}
      </CardContent>
      <CardFooter className="p-6 pt-0">
        {isInCart ? (
          <div className="w-full space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Button variant="outline" size="icon" onClick={handleDecrement}>
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-lg font-semibold min-w-[3rem] text-center">
                {cartQuantity}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={handleIncrement}
                disabled={isMaxedOut}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {isMaxedOut && (
              <p className="text-xs text-center text-orange-600">
                Max quantity in cart
              </p>
            )}
          </div>
        ) : (
          <Button
            onClick={handleAddToCart}
            className="w-full"
            size="lg"
            disabled={isOutOfStock}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            {isOutOfStock ? "Out of Stock" : "Add to Cart"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
