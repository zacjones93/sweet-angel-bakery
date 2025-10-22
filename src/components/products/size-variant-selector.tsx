"use client";

import { useState } from "react";
import { type SizeVariantsConfig } from "@/types/customizations";
import { calculateSizeVariantPrice } from "@/types/customizations";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface SizeVariantSelectorProps {
  config: SizeVariantsConfig;
  selectedVariantId?: string;
  onVariantChange: (variantId: string, priceInCents: number) => void;
  className?: string;
}

export function SizeVariantSelector({
  config,
  selectedVariantId,
  onVariantChange,
  className,
}: SizeVariantSelectorProps) {
  const [selected, setSelected] = useState<string>(
    selectedVariantId ||
      config.variants.find((v) => v.isDefault)?.id ||
      config.variants[0]?.id ||
      ""
  );

  const handleChange = (variantId: string) => {
    setSelected(variantId);
    const price = calculateSizeVariantPrice(config, variantId);
    onVariantChange(variantId, price);
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h3 className="text-lg font-semibold mb-2">Select Size</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Choose your preferred cake size
        </p>
      </div>

      <RadioGroup value={selected} onValueChange={handleChange}>
        <div className="grid gap-3">
          {config.variants.map((variant) => (
            <div key={variant.id} className="relative">
              <RadioGroupItem
                value={variant.id}
                id={variant.id}
                className="peer sr-only"
              />
              <Label
                htmlFor={variant.id}
                className={cn(
                  "flex flex-col gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all",
                  "hover:bg-accent hover:border-primary/50",
                  "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{variant.name}</span>
                  <span className="font-bold text-primary">
                    {formatPrice(variant.priceInCents)}
                  </span>
                </div>
                {variant.description && (
                  <span className="text-sm text-muted-foreground">
                    {variant.description}
                  </span>
                )}
              </Label>
            </div>
          ))}
        </div>
      </RadioGroup>

      <div className="pt-4 border-t">
        <div className="flex items-center justify-between text-lg font-semibold">
          <span>Selected Price:</span>
          <span className="text-primary">
            {formatPrice(calculateSizeVariantPrice(config, selected))}
          </span>
        </div>
      </div>
    </div>
  );
}
