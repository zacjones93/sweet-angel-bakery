"use client";

import { useState } from "react";
import { createId } from "@paralleldrive/cuid2";
import {
  type ProductCustomizations,
  type SizeVariantsConfig,
  type CustomBuilderConfig,
} from "@/types/customizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Plus, X, Trash2 } from "lucide-react";

interface CustomizationsFormProps {
  value: ProductCustomizations;
  onChange: (customizations: ProductCustomizations) => void;
}

export function CustomizationsForm({
  value,
  onChange,
}: CustomizationsFormProps) {
  const [customizationType, setCustomizationType] = useState<
    "none" | "size_variants" | "custom_builder"
  >(
    value === null
      ? "none"
      : value.type === "size_variants"
      ? "size_variants"
      : "custom_builder"
  );

  const handleTypeChange = (
    type: "none" | "size_variants" | "custom_builder"
  ) => {
    setCustomizationType(type);

    if (type === "none") {
      onChange(null);
    } else if (type === "size_variants") {
      onChange({
        type: "size_variants",
        variants: [
          {
            id: createId(),
            name: "",
            priceInCents: 0,
            isDefault: true,
            quantityAvailable: 0,
          },
        ],
      });
    } else if (type === "custom_builder") {
      onChange({
        type: "custom_builder",
        basePriceInCents: 0,
        options: [],
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Customizations</CardTitle>
        <CardDescription>
          Configure size variants or a custom cake builder for this product
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Customization Type</Label>
          <Select
            value={customizationType}
            onValueChange={(value) => handleTypeChange(value as "none" | "size_variants" | "custom_builder")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Customizations</SelectItem>
              <SelectItem value="size_variants">Size Variants</SelectItem>
              <SelectItem value="custom_builder">
                Custom Cake Builder
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {customizationType === "size_variants" &&
          value?.type === "size_variants" && (
            <SizeVariantsEditor
              config={value}
              onChange={(config) => onChange(config)}
            />
          )}

        {customizationType === "custom_builder" &&
          value?.type === "custom_builder" && (
            <CustomBuilderEditor
              config={value}
              onChange={(config) => onChange(config)}
            />
          )}
      </CardContent>
    </Card>
  );
}

function SizeVariantsEditor({
  config,
  onChange,
}: {
  config: SizeVariantsConfig;
  onChange: (config: SizeVariantsConfig) => void;
}) {
  const addVariant = () => {
    onChange({
      ...config,
      variants: [
        ...config.variants,
        {
          id: createId(),
          name: "",
          priceInCents: 0,
          quantityAvailable: 0,
        },
      ],
    });
  };

  const removeVariant = (id: string) => {
    onChange({
      ...config,
      variants: config.variants.filter((v) => v.id !== id),
    });
  };

  const updateVariant = (
    id: string,
    updates: Partial<(typeof config.variants)[0]>
  ) => {
    onChange({
      ...config,
      variants: config.variants.map((v) =>
        v.id === id ? { ...v, ...updates } : v
      ),
    });
  };

  const setDefault = (id: string) => {
    onChange({
      ...config,
      variants: config.variants.map((v) => ({
        ...v,
        isDefault: v.id === id,
      })),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Size Variants</Label>
        <Button type="button" size="sm" variant="outline" onClick={addVariant}>
          <Plus className="h-4 w-4 mr-1" />
          Add Variant
        </Button>
      </div>

      <div className="space-y-3">
        {config.variants.map((variant, index) => (
          <Card key={variant.id}>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={variant.isDefault ? "default" : "outline"}>
                    {variant.isDefault ? "Default" : `Variant ${index + 1}`}
                  </Badge>
                  {!variant.isDefault && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setDefault(variant.id)}
                    >
                      Set as Default
                    </Button>
                  )}
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeVariant(variant.id)}
                  disabled={config.variants.length === 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Size Name</Label>
                  <Input
                    placeholder="6 inch"
                    value={variant.name}
                    onChange={(e) =>
                      updateVariant(variant.id, { name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="45.00"
                    value={(variant.priceInCents / 100).toFixed(2)}
                    onChange={(e) =>
                      updateVariant(variant.id, {
                        priceInCents: Math.round(
                          parseFloat(e.target.value || "0") * 100
                        ),
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Quantity Available</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="5"
                    value={variant.quantityAvailable ?? 0}
                    onChange={(e) =>
                      updateVariant(variant.id, {
                        quantityAvailable: parseInt(e.target.value || "0"),
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Input
                  placeholder="Serves 6-8 people"
                  value={variant.description || ""}
                  onChange={(e) =>
                    updateVariant(variant.id, { description: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CustomBuilderEditor({
  config,
  onChange,
}: {
  config: CustomBuilderConfig;
  onChange: (config: CustomBuilderConfig) => void;
}) {
  const addOption = () => {
    onChange({
      ...config,
      options: [
        ...config.options,
        {
          id: createId(),
          name: "",
          type: "single",
          required: true,
          displayOrder: config.options.length,
          choices: [],
        },
      ],
    });
  };

  const removeOption = (id: string) => {
    onChange({
      ...config,
      options: config.options.filter((o) => o.id !== id),
    });
  };

  const updateOption = (
    id: string,
    updates: Partial<(typeof config.options)[0]>
  ) => {
    onChange({
      ...config,
      options: config.options.map((o) =>
        o.id === id ? { ...o, ...updates } : o
      ),
    });
  };

  const addChoice = (optionId: string) => {
    onChange({
      ...config,
      options: config.options.map((o) =>
        o.id === optionId
          ? {
              ...o,
              choices: [
                ...o.choices,
                {
                  id: createId(),
                  name: "",
                  priceModifier: 0,
                },
              ],
            }
          : o
      ),
    });
  };

  const removeChoice = (optionId: string, choiceId: string) => {
    onChange({
      ...config,
      options: config.options.map((o) =>
        o.id === optionId
          ? {
              ...o,
              choices: o.choices.filter((c) => c.id !== choiceId),
            }
          : o
      ),
    });
  };

  const updateChoice = (
    optionId: string,
    choiceId: string,
    updates: Partial<(typeof config.options)[0]["choices"][0]>
  ) => {
    onChange({
      ...config,
      options: config.options.map((o) =>
        o.id === optionId
          ? {
              ...o,
              choices: o.choices.map((c) =>
                c.id === choiceId ? { ...c, ...updates } : c
              ),
            }
          : o
      ),
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Base Price ($)</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder="50.00"
          value={(config.basePriceInCents / 100).toFixed(2)}
          onChange={(e) =>
            onChange({
              ...config,
              basePriceInCents: Math.round(
                parseFloat(e.target.value || "0") * 100
              ),
            })
          }
        />
        <p className="text-sm text-muted-foreground">
          Starting price before any customizations
        </p>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Customization Options</Label>
          <Button type="button" size="sm" variant="outline" onClick={addOption}>
            <Plus className="h-4 w-4 mr-1" />
            Add Option
          </Button>
        </div>

        {config.options.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No customization options yet. Click &quot;Add Option&quot; to get started.
          </div>
        )}

        {config.options.map((option, index) => (
          <Card key={option.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">
                    Option {index + 1}
                    {option.required && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Required
                      </Badge>
                    )}
                  </CardTitle>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeOption(option.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Option Name</Label>
                  <Input
                    placeholder="Cake Size"
                    value={option.name}
                    onChange={(e) =>
                      updateOption(option.id, { name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Selection Type</Label>
                  <Select
                    value={option.type}
                    onValueChange={(value: "single" | "multiple") =>
                      updateOption(option.id, { type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single Choice</SelectItem>
                      <SelectItem value="multiple">Multiple Choices</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Input
                  placeholder="Select your cake size"
                  value={option.description || ""}
                  onChange={(e) =>
                    updateOption(option.id, { description: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`required-${option.id}`}
                    checked={option.required}
                    onCheckedChange={(checked) =>
                      updateOption(option.id, { required: checked as boolean })
                    }
                  />
                  <Label htmlFor={`required-${option.id}`}>Required</Label>
                </div>

                {option.type === "multiple" && (
                  <>
                    <div className="space-y-2">
                      <Label>Min Selections</Label>
                      <Input
                        type="number"
                        min="0"
                        value={option.minSelections || ""}
                        onChange={(e) =>
                          updateOption(option.id, {
                            minSelections:
                              parseInt(e.target.value) || undefined,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Max Selections</Label>
                      <Input
                        type="number"
                        min="1"
                        value={option.maxSelections || ""}
                        onChange={(e) =>
                          updateOption(option.id, {
                            maxSelections:
                              parseInt(e.target.value) || undefined,
                          })
                        }
                      />
                    </div>
                  </>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Choices</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addChoice(option.id)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Choice
                  </Button>
                </div>

                {option.choices.map((choice) => (
                  <div
                    key={choice.id}
                    className="flex items-start gap-2 p-3 rounded-lg border"
                  >
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Choice Name</Label>
                        <Input
                          placeholder="Chocolate"
                          value={choice.name}
                          onChange={(e) =>
                            updateChoice(option.id, choice.id, {
                              name: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Price Modifier ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={(choice.priceModifier / 100).toFixed(2)}
                          onChange={(e) =>
                            updateChoice(option.id, choice.id, {
                              priceModifier: Math.round(
                                parseFloat(e.target.value || "0") * 100
                              ),
                            })
                          }
                        />
                      </div>

                      <div className="col-span-2 space-y-2">
                        <Label className="text-xs">
                          Description (Optional)
                        </Label>
                        <Input
                          placeholder="Rich chocolate flavor"
                          value={choice.description || ""}
                          onChange={(e) =>
                            updateChoice(option.id, choice.id, {
                              description: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="col-span-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`default-${choice.id}`}
                            checked={choice.isDefault || false}
                            onCheckedChange={(checked) => {
                              // If setting as default, unset all others
                              if (checked) {
                                onChange({
                                  ...config,
                                  options: config.options.map((o) =>
                                    o.id === option.id
                                      ? {
                                          ...o,
                                          choices: o.choices.map((c) => ({
                                            ...c,
                                            isDefault: c.id === choice.id,
                                          })),
                                        }
                                      : o
                                  ),
                                });
                              } else {
                                updateChoice(option.id, choice.id, {
                                  isDefault: false,
                                });
                              }
                            }}
                          />
                          <Label
                            htmlFor={`default-${choice.id}`}
                            className="text-xs"
                          >
                            Set as default
                          </Label>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeChoice(option.id, choice.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {option.choices.length === 0 && (
                  <div className="text-center py-4 text-sm text-muted-foreground border rounded-lg">
                    No choices yet. Add choices for customers to select from.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
