"use client";

import { useState } from "react";
import { type SizeVariantsConfig } from "@/types/customizations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface ProductVariantSelectorProps {
  config: SizeVariantsConfig;
  onVariantChange: (variantId: string, priceInCents: number) => void;
  className?: string;
}

export function ProductVariantSelector({
  config,
  onVariantChange,
  className,
}: ProductVariantSelectorProps) {
  const defaultVariant =
    config.variants.find((v) => v.isDefault) || config.variants[0];
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    defaultVariant?.id || ""
  );

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const handleChange = (variantId: string) => {
    setSelectedVariantId(variantId);
    const variant = config.variants.find((v) => v.id === variantId);
    if (variant) {
      onVariantChange(variantId, variant.priceInCents);
    }
  };

  const selectedVariant = config.variants.find(
    (v) => v.id === selectedVariantId
  );

  return (
    <div className={className}>
      <Label
        htmlFor="variant-select"
        className="text-sm font-medium mb-2 block"
      >
        Select Size
      </Label>
      <Select value={selectedVariantId} onValueChange={handleChange}>
        <SelectTrigger id="variant-select">
          <SelectValue placeholder="Choose a size" />
        </SelectTrigger>
        <SelectContent>
          {config.variants.map((variant) => (
            <SelectItem key={variant.id} value={variant.id}>
              <div className="flex items-center justify-between w-full gap-4">
                <span>{variant.name}</span>
                <span className="font-semibold text-primary">
                  {formatPrice(variant.priceInCents)}
                </span>
              </div>
              {variant.description && (
                <span className="text-xs text-muted-foreground block mt-1">
                  {variant.description}
                </span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedVariant?.description && (
        <p className="text-xs text-muted-foreground mt-1">
          {selectedVariant.description}
        </p>
      )}
    </div>
  );
}
