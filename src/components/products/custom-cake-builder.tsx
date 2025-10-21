"use client";

import { useState, useEffect } from "react";
import {
  type CustomBuilderConfig,
  type SelectedCustomBuilder,
} from "@/types/customizations";
import { calculateCustomBuilderPrice } from "@/types/customizations";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CustomCakeBuilderProps {
  config: CustomBuilderConfig;
  onSelectionsChange: (selections: SelectedCustomBuilder) => void;
  className?: string;
}

export function CustomCakeBuilder({
  config,
  onSelectionsChange,
  className,
}: CustomCakeBuilderProps) {
  // Initialize selections with defaults
  const [selections, setSelections] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    config.options.forEach((option) => {
      const defaultChoices = option.choices
        .filter((c) => c.isDefault)
        .map((c) => c.id);
      if (defaultChoices.length > 0) {
        initial[option.id] = defaultChoices;
      } else if (option.required && option.type === "single") {
        initial[option.id] = [];
      }
    });
    return initial;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate total price
  const totalPrice = calculateCustomBuilderPrice(
    config,
    Object.entries(selections).map(([optionId, choiceIds]) => ({
      optionId,
      choiceIds,
    }))
  );

  // Validate selections and notify parent
  useEffect(() => {
    const newErrors: Record<string, string> = {};

    config.options.forEach((option) => {
      const selected = selections[option.id] || [];

      if (option.required && selected.length === 0) {
        newErrors[option.id] = `${option.name} is required`;
      } else if (
        option.minSelections &&
        selected.length < option.minSelections
      ) {
        newErrors[option.id] = `Please select at least ${
          option.minSelections
        } ${option.minSelections === 1 ? "option" : "options"}`;
      } else if (
        option.maxSelections &&
        selected.length > option.maxSelections
      ) {
        newErrors[option.id] = `Please select no more than ${
          option.maxSelections
        } ${option.maxSelections === 1 ? "option" : "options"}`;
      }
    });

    setErrors(newErrors);

    // Only notify parent if there are no errors
    if (Object.keys(newErrors).length === 0) {
      const enrichedSelections: SelectedCustomBuilder = {
        type: "custom_builder",
        selections: Object.entries(selections)
          .filter(([_, choiceIds]) => choiceIds.length > 0)
          .map(([optionId, choiceIds]) => {
            const option = config.options.find((o) => o.id === optionId)!;
            const choiceNames = choiceIds
              .map((id) => option.choices.find((c) => c.id === id)?.name)
              .filter(Boolean) as string[];

            return {
              optionId,
              optionName: option.name,
              choiceIds,
              choiceNames,
            };
          }),
        finalPriceInCents: totalPrice,
      };

      onSelectionsChange(enrichedSelections);
    }
  }, [selections, config, totalPrice, onSelectionsChange]);

  const handleSingleChoice = (optionId: string, choiceId: string) => {
    setSelections((prev) => ({
      ...prev,
      [optionId]: [choiceId],
    }));
  };

  const handleMultipleChoice = (
    optionId: string,
    choiceId: string,
    checked: boolean
  ) => {
    setSelections((prev) => {
      const current = prev[optionId] || [];
      const option = config.options.find((o) => o.id === optionId)!;

      let updated: string[];
      if (checked) {
        // Check if we're at max selections
        if (option.maxSelections && current.length >= option.maxSelections) {
          return prev; // Don't allow more selections
        }
        updated = [...current, choiceId];
      } else {
        updated = current.filter((id) => id !== choiceId);
      }

      return {
        ...prev,
        [optionId]: updated,
      };
    });
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatPriceModifier = (cents: number) => {
    if (cents === 0) return "";
    const sign = cents > 0 ? "+" : "";
    return ` (${sign}${formatPrice(cents)})`;
  };

  const getChoicePrice = (optionId: string, choiceId: string) => {
    const option = config.options.find((o) => o.id === optionId);
    const choice = option?.choices.find((c) => c.id === choiceId);
    return choice?.priceModifier || 0;
  };

  // Sort options by display order
  const sortedOptions = [...config.options].sort(
    (a, b) => a.displayOrder - b.displayOrder
  );

  return (
    <div className={cn("space-y-6", className)}>
      <div>
        <h3 className="text-2xl font-bold mb-2">Build Your Custom Cake</h3>
        <p className="text-muted-foreground">
          Customize every detail of your perfect cake
        </p>
      </div>

      {sortedOptions.map((option) => (
        <Card key={option.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {option.name}
                  {option.required && (
                    <Badge variant="secondary" className="text-xs">
                      Required
                    </Badge>
                  )}
                </CardTitle>
                {option.description && (
                  <CardDescription className="mt-1">
                    {option.description}
                  </CardDescription>
                )}
                {option.maxSelections && option.type === "multiple" && (
                  <CardDescription className="mt-1">
                    Select up to {option.maxSelections}{" "}
                    {option.maxSelections === 1 ? "option" : "options"}
                  </CardDescription>
                )}
              </div>
            </div>
            {errors[option.id] && (
              <p className="text-sm text-destructive mt-2">
                {errors[option.id]}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {option.type === "single" ? (
              <RadioGroup
                value={selections[option.id]?.[0] || ""}
                onValueChange={(value) => handleSingleChoice(option.id, value)}
              >
                <div className="grid gap-3">
                  {option.choices.map((choice) => (
                    <div key={choice.id} className="relative">
                      <RadioGroupItem
                        value={choice.id}
                        id={choice.id}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={choice.id}
                        className={cn(
                          "flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                          "hover:bg-accent hover:border-primary/50",
                          "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                        )}
                      >
                        {choice.imageUrl && (
                          <img
                            src={choice.imageUrl}
                            alt={choice.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{choice.name}</span>
                            <span className="text-sm font-semibold text-primary">
                              {formatPriceModifier(choice.priceModifier)}
                            </span>
                          </div>
                          {choice.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {choice.description}
                            </p>
                          )}
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            ) : (
              <div className="grid gap-3">
                {option.choices.map((choice) => (
                  <div key={choice.id} className="relative">
                    <div
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-lg border-2 transition-all",
                        "hover:bg-accent",
                        selections[option.id]?.includes(choice.id)
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      )}
                    >
                      <Checkbox
                        id={choice.id}
                        checked={
                          selections[option.id]?.includes(choice.id) || false
                        }
                        onCheckedChange={(checked) =>
                          handleMultipleChoice(
                            option.id,
                            choice.id,
                            checked as boolean
                          )
                        }
                        disabled={
                          option.maxSelections !== undefined &&
                          selections[option.id]?.length >=
                            option.maxSelections &&
                          !selections[option.id]?.includes(choice.id)
                        }
                      />
                      <Label
                        htmlFor={choice.id}
                        className="flex-1 cursor-pointer"
                      >
                        {choice.imageUrl && (
                          <img
                            src={choice.imageUrl}
                            alt={choice.name}
                            className="w-16 h-16 object-cover rounded mb-2"
                          />
                        )}
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{choice.name}</span>
                          <span className="text-sm font-semibold text-primary">
                            {formatPriceModifier(choice.priceModifier)}
                          </span>
                        </div>
                        {choice.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {choice.description}
                          </p>
                        )}
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Card className="sticky bottom-4 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Base Price</span>
              <span>{formatPrice(config.basePriceInCents)}</span>
            </div>

            {Object.entries(selections)
              .filter(([_, choiceIds]) => choiceIds.length > 0)
              .map(([optionId, choiceIds]) => {
                const option = config.options.find((o) => o.id === optionId);
                if (!option) return null;

                return choiceIds.map((choiceId) => {
                  const choice = option.choices.find((c) => c.id === choiceId);
                  if (!choice || choice.priceModifier === 0) return null;

                  return (
                    <div
                      key={choiceId}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">
                        {choice.name}
                      </span>
                      <span>{formatPriceModifier(choice.priceModifier)}</span>
                    </div>
                  );
                });
              })}

            <div className="pt-3 border-t">
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total Price</span>
                <span className="text-primary text-2xl">
                  {formatPrice(totalPrice)}
                </span>
              </div>
            </div>

            {Object.keys(errors).length > 0 && (
              <p className="text-sm text-destructive text-center">
                Please complete all required selections
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
