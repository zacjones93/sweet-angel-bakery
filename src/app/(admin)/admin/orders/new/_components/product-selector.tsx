"use client";

import { useState, useMemo } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Search, X, Package } from "lucide-react";
import Image from "next/image";
import type { ManualOrderItem } from "@/schemas/manual-order.schema";
import type { ProductCustomizations } from "@/types/customizations";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  status: string;
  quantityAvailable: number;
  customizations: string | null;
};

type ProductSelectorProps = {
  products: Product[];
  selectedItems: ManualOrderItem[];
  onItemsChange: (items: ManualOrderItem[]) => void;
};

export function ProductSelector({
  products,
  selectedItems,
  onItemsChange,
}: ProductSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [customSelections, setCustomSelections] = useState<
    Array<{ optionId: string; choiceIds: string[] }>
  >([]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const getProductCustomizations = (product: Product): ProductCustomizations => {
    if (!product.customizations) return null;
    try {
      return JSON.parse(product.customizations) as ProductCustomizations;
    } catch {
      return null;
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);

    const customizations = getProductCustomizations(product);

    if (customizations?.type === "size_variants") {
      const defaultVariant =
        customizations.variants.find((v) => v.isDefault) ||
        customizations.variants[0];
      setSelectedVariantId(defaultVariant?.id || "");
      setCustomSelections([]);
    } else if (customizations?.type === "custom_builder") {
      // Set default selections
      const defaults = customizations.options
        .filter((opt) => opt.choices.some((c) => c.isDefault))
        .map((opt) => ({
          optionId: opt.id,
          choiceIds: opt.choices.filter((c) => c.isDefault).map((c) => c.id),
        }));
      setCustomSelections(defaults);
      setSelectedVariantId("");
    } else {
      setSelectedVariantId("");
      setCustomSelections([]);
    }
  };

  const calculateItemPrice = (): number => {
    if (!selectedProduct) return 0;

    const customizations = getProductCustomizations(selectedProduct);

    if (customizations?.type === "size_variants" && selectedVariantId) {
      const variant = customizations.variants.find(
        (v) => v.id === selectedVariantId
      );
      return variant?.priceInCents || 0;
    }

    if (customizations?.type === "custom_builder") {
      let price = customizations.basePriceInCents;
      for (const selection of customSelections) {
        const option = customizations.options.find(
          (o) => o.id === selection.optionId
        );
        if (option) {
          for (const choiceId of selection.choiceIds) {
            const choice = option.choices.find((c) => c.id === choiceId);
            if (choice) {
              price += choice.priceModifier;
            }
          }
        }
      }
      return price;
    }

    return selectedProduct.price;
  };

  const getAvailableQuantity = (): number => {
    if (!selectedProduct) return 0;

    const customizations = getProductCustomizations(selectedProduct);

    if (customizations?.type === "size_variants" && selectedVariantId) {
      const variant = customizations.variants.find(
        (v) => v.id === selectedVariantId
      );
      return variant?.quantityAvailable || 0;
    }

    return selectedProduct.quantityAvailable;
  };

  const handleAddItem = () => {
    if (!selectedProduct) return;

    const customizations = getProductCustomizations(selectedProduct);
    const priceInCents = calculateItemPrice();

    let itemCustomizations: ManualOrderItem["customizations"] = undefined;
    let itemName = selectedProduct.name;

    if (customizations?.type === "size_variants" && selectedVariantId) {
      const variant = customizations.variants.find(
        (v) => v.id === selectedVariantId
      );
      if (variant) {
        itemName = `${selectedProduct.name} - ${variant.name}`;
        itemCustomizations = {
          type: "size_variant",
          selectedVariantId,
          finalPriceInCents: priceInCents,
        };
      }
    } else if (
      customizations?.type === "custom_builder" &&
      customSelections.length > 0
    ) {
      const selectionsWithNames = customSelections.map((sel) => {
        const option = customizations.options.find(
          (o) => o.id === sel.optionId
        );
        return {
          optionId: sel.optionId,
          optionName: option?.name || "",
          choiceIds: sel.choiceIds,
          choiceNames: sel.choiceIds.map((cId) => {
            const choice = option?.choices.find((c) => c.id === cId);
            return choice?.name || "";
          }),
        };
      });

      itemCustomizations = {
        type: "custom_builder",
        selections: selectionsWithNames,
        finalPriceInCents: priceInCents,
      };
    }

    const newItem: ManualOrderItem = {
      productId: selectedProduct.id,
      quantity,
      customizations: itemCustomizations,
      name: itemName,
      priceInCents,
    };

    onItemsChange([...selectedItems, newItem]);
    setIsDialogOpen(false);
    setSelectedProduct(null);
    setQuantity(1);
    setSelectedVariantId("");
    setCustomSelections([]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...selectedItems];
    newItems.splice(index, 1);
    onItemsChange(newItems);
  };

  const handleUpdateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    const newItems = [...selectedItems];
    newItems[index] = { ...newItems[index], quantity: newQuantity };
    onItemsChange(newItems);
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const renderCustomizationOptions = () => {
    if (!selectedProduct) return null;

    const customizations = getProductCustomizations(selectedProduct);

    if (customizations?.type === "size_variants") {
      return (
        <div className="space-y-2">
          <Label>Size</Label>
          <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
            <SelectTrigger>
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              {customizations.variants.map((variant) => (
                <SelectItem
                  key={variant.id}
                  value={variant.id}
                  disabled={variant.quantityAvailable < 1}
                >
                  {variant.name} - {formatPrice(variant.priceInCents)}
                  {variant.quantityAvailable < 1 && " (Out of stock)"}
                  {variant.quantityAvailable > 0 &&
                    variant.quantityAvailable < 5 &&
                    ` (${variant.quantityAvailable} left)`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (customizations?.type === "custom_builder") {
      return (
        <div className="space-y-4">
          {customizations.options
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((option) => {
              const currentSelection = customSelections.find(
                (s) => s.optionId === option.id
              );

              return (
                <div key={option.id} className="space-y-2">
                  <Label>
                    {option.name}
                    {option.required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </Label>
                  {option.type === "single" ? (
                    <Select
                      value={currentSelection?.choiceIds[0] || ""}
                      onValueChange={(value) => {
                        const newSelections = customSelections.filter(
                          (s) => s.optionId !== option.id
                        );
                        if (value) {
                          newSelections.push({
                            optionId: option.id,
                            choiceIds: [value],
                          });
                        }
                        setCustomSelections(newSelections);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${option.name}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {option.choices.map((choice) => (
                          <SelectItem key={choice.id} value={choice.id}>
                            {choice.name}
                            {choice.priceModifier !== 0 &&
                              ` (${choice.priceModifier > 0 ? "+" : ""}${formatPrice(choice.priceModifier)})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {option.choices.map((choice) => {
                        const isSelected =
                          currentSelection?.choiceIds.includes(choice.id) ||
                          false;

                        return (
                          <Badge
                            key={choice.id}
                            variant={isSelected ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => {
                              const newSelections = customSelections.filter(
                                (s) => s.optionId !== option.id
                              );
                              const currentChoices =
                                currentSelection?.choiceIds || [];

                              if (isSelected) {
                                const newChoices = currentChoices.filter(
                                  (c) => c !== choice.id
                                );
                                if (newChoices.length > 0) {
                                  newSelections.push({
                                    optionId: option.id,
                                    choiceIds: newChoices,
                                  });
                                }
                              } else {
                                newSelections.push({
                                  optionId: option.id,
                                  choiceIds: [...currentChoices, choice.id],
                                });
                              }
                              setCustomSelections(newSelections);
                            }}
                          >
                            {choice.name}
                            {choice.priceModifier !== 0 &&
                              ` (${choice.priceModifier > 0 ? "+" : ""}${formatPrice(choice.priceModifier)})`}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Order Items</Label>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Product</DialogTitle>
            </DialogHeader>

            {!selectedProduct ? (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="grid gap-2 max-h-96 overflow-y-auto">
                  {filteredProducts.map((product) => {
                    const customizations = getProductCustomizations(product);
                    const hasVariants =
                      customizations?.type === "size_variants";
                    const isOutOfStock =
                      !hasVariants && product.quantityAvailable < 1;

                    return (
                      <button
                        type="button"
                        key={product.id}
                        onClick={() =>
                          !isOutOfStock && handleSelectProduct(product)
                        }
                        disabled={isOutOfStock}
                        className={`flex items-center gap-4 p-3 rounded-lg border text-left transition-colors ${
                          isOutOfStock
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-accent cursor-pointer"
                        }`}
                      >
                        <div className="relative w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                          {product.imageUrl ? (
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {hasVariants
                              ? "Multiple sizes available"
                              : formatPrice(product.price)}
                            {!hasVariants &&
                              ` • ${product.quantityAvailable} in stock`}
                          </p>
                        </div>
                        {isOutOfStock && (
                          <Badge variant="secondary">Out of stock</Badge>
                        )}
                      </button>
                    );
                  })}

                  {filteredProducts.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No products found
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedProduct(null)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Back to products
                </Button>

                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    {selectedProduct.imageUrl ? (
                      <Image
                        src={selectedProduct.imageUrl}
                        alt={selectedProduct.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{selectedProduct.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedProduct.description}
                    </p>
                  </div>
                </div>

                {renderCustomizationOptions()}

                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      max={getAvailableQuantity()}
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                      }
                      className="w-20 text-center"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setQuantity(
                          Math.min(getAvailableQuantity(), quantity + 1)
                        )
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      ({getAvailableQuantity()} available)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Subtotal</p>
                    <p className="text-lg font-semibold">
                      {formatPrice(calculateItemPrice() * quantity)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddItem}
                    disabled={
                      quantity < 1 ||
                      quantity > getAvailableQuantity() ||
                      (getProductCustomizations(selectedProduct)?.type ===
                        "size_variants" &&
                        !selectedVariantId)
                    }
                  >
                    Add to Order
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {selectedItems.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No items added yet</p>
          <p className="text-sm">Click &quot;Add Product&quot; to add items to this order</p>
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {selectedItems.map((item, index) => (
            <div key={index} className="flex items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatPrice(item.priceInCents)} each
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleUpdateQuantity(index, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center">{item.quantity}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleUpdateQuantity(index, item.quantity + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <p className="font-medium w-20 text-right">
                {formatPrice(item.priceInCents * item.quantity)}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => handleRemoveItem(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
