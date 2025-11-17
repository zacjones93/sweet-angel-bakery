"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServerAction } from "zsa-react";
import {
  createProductAction,
  updateProductAction,
} from "../../_actions/products.action";
import { toast } from "sonner";
import { PRODUCT_STATUS } from "@/db/schema";
import { Upload, X } from "lucide-react";
import Image from "next/image";
import { type ProductCustomizations } from "@/types/customizations";
import { CustomizationsForm } from "./customizations-form";

const productFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.string().optional(),
  imageUrl: z.string().optional(),
  status: z.enum([
    PRODUCT_STATUS.ACTIVE,
    PRODUCT_STATUS.FEATURED,
    PRODUCT_STATUS.INACTIVE,
  ]),
  quantityAvailable: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  price: number;
  imageUrl: string | null;
  status: string;
  quantityAvailable: number;
  customizations: ProductCustomizations;
};

type ProductFormProps = {
  product?: Product;
  categories: Category[];
  initialCategoryIds: string[];
};

export function ProductForm({ product, categories, initialCategoryIds }: ProductFormProps) {
  const router = useRouter();
  const { execute: createProduct, isPending: isCreating } =
    useServerAction(createProductAction);
  const { execute: updateProduct, isPending: isUpdating } =
    useServerAction(updateProductAction);
  const [imagePreview, setImagePreview] = useState<string | null>(
    product?.imageUrl || null
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customizations, setCustomizations] = useState<ProductCustomizations>(
    product?.customizations || null
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(initialCategoryIds);
  const [categoryToAdd, setCategoryToAdd] = useState<string>("");

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name || "",
      description: product?.description || "",
      price: product ? (product.price / 100).toString() : "",
      imageUrl: product?.imageUrl || "",
      status: (product?.status as typeof PRODUCT_STATUS[keyof typeof PRODUCT_STATUS]) || PRODUCT_STATUS.ACTIVE,
      quantityAvailable: product?.quantityAvailable?.toString() || "0",
    },
  });

  const isSubmitting = isCreating || isUpdating;
  const hasSizeVariants = customizations?.type === "size_variants";

  const handleImageUpload = async (file: File) => {
    setIsUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json() as { message?: string };
        throw new Error(error.message || "Failed to upload image");
      }

      const { url } = await response.json() as { url: string };

      form.setValue("imageUrl", url);
      setImagePreview(url);
      toast.success("Image uploaded successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload image"
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  const validateAndUploadFile = (file: File) => {
    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size too large. Maximum size is 5MB.");
      return;
    }

    handleImageUpload(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    validateAndUploadFile(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    validateAndUploadFile(file);
  };

  const removeImage = () => {
    form.setValue("imageUrl", "");
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const addCategory = () => {
    if (categoryToAdd && !selectedCategoryIds.includes(categoryToAdd)) {
      setSelectedCategoryIds([...selectedCategoryIds, categoryToAdd]);
      setCategoryToAdd("");
    }
  };

  const removeCategory = (categoryId: string) => {
    setSelectedCategoryIds(selectedCategoryIds.filter(id => id !== categoryId));
  };

  async function onSubmit(values: ProductFormValues) {
    // Validate categories
    if (selectedCategoryIds.length === 0) {
      toast.error("Please select at least one category");
      return;
    }
    // Validate customizations if present
    if (customizations) {
      if (customizations.type === "size_variants") {
        if (customizations.variants.length === 0) {
          toast.error("Please add at least one size variant");
          return;
        }
        if (customizations.variants.some((v) => !v.name)) {
          toast.error("All size variants must have a name");
          return;
        }
      } else if (customizations.type === "custom_builder") {
        if (customizations.options.length === 0) {
          toast.error("Please add at least one customization option");
          return;
        }
        for (const option of customizations.options) {
          if (!option.name) {
            toast.error("All customization options must have a name");
            return;
          }
          if (option.choices.length === 0) {
            toast.error(
              `Option "${option.name}" must have at least one choice`
            );
            return;
          }
          if (option.choices.some((c) => !c.name)) {
            toast.error(`All choices in "${option.name}" must have a name`);
            return;
          }
        }
      }
    }

    // Price and quantity validation - not needed when using size variants
    if (!hasSizeVariants) {
      if (!values.price || values.price === "") {
        toast.error("Price is required");
        return;
      }
      if (!values.quantityAvailable || values.quantityAvailable === "") {
        toast.error("Quantity is required");
        return;
      }
    }

    const price = hasSizeVariants ? 0 : parseFloat(values.price!);
    const quantityAvailable = hasSizeVariants ? 0 : parseInt(values.quantityAvailable!, 10);

    if (product) {
      const [, error] = await updateProduct({
        id: product.id,
        name: values.name,
        description: values.description,
        categoryIds: selectedCategoryIds,
        price,
        imageUrl: values.imageUrl,
        status: values.status,
        quantityAvailable,
        customizations,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Product updated successfully");
        router.push("/admin/products");
        router.refresh();
      }
    } else {
      const [, error] = await createProduct({
        name: values.name,
        description: values.description,
        categoryIds: selectedCategoryIds,
        price,
        imageUrl: values.imageUrl,
        status: values.status,
        quantityAvailable,
        customizations,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Product created successfully");
        router.push("/admin/products");
        router.refresh();
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Chocolate Chip Cookies" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Delicious homemade cookies with chocolate chips"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Categories Selection */}
        <div className="space-y-4 rounded-md border p-4">
          <div>
            <h3 className="font-medium mb-2">Categories</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select categories for this product. Products can belong to multiple categories.
            </p>
          </div>

          {/* Selected Categories */}
          {selectedCategoryIds.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedCategoryIds.map((catId) => {
                const category = categories.find((c) => c.id === catId);
                return category ? (
                  <Badge key={catId} variant="secondary" className="flex items-center gap-2">
                    {category.name}
                    <button
                      type="button"
                      onClick={() => removeCategory(catId)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ) : null;
              })}
            </div>
          )}

          {/* Add Category Dropdown */}
          <div className="flex gap-2">
            <Select value={categoryToAdd} onValueChange={setCategoryToAdd}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a category to add" />
              </SelectTrigger>
              <SelectContent>
                {categories
                  .filter((cat) => !selectedCategoryIds.includes(cat.id))
                  .map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              onClick={addCategory}
              disabled={!categoryToAdd}
            >
              Add
            </Button>
          </div>
          {selectedCategoryIds.length === 0 && (
            <p className="text-sm text-destructive">At least one category is required</p>
          )}
        </div>

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="12.99"
                  {...field}
                  disabled={hasSizeVariants}
                />
              </FormControl>
              <FormDescription>
                {hasSizeVariants
                  ? "Price is managed by size variants below"
                  : "Price in dollars"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Image</FormLabel>
              <FormControl>
                <div className="space-y-4">
                  {imagePreview ? (
                    <div className="relative w-full max-w-md">
                      <div className="relative aspect-square w-full overflow-hidden rounded-lg border">
                        <Image
                          src={imagePreview}
                          alt="Product preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={removeImage}
                        disabled={isUploadingImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-full max-w-md">
                      <label
                        htmlFor="image-upload"
                        className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted transition-colors"
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {isUploadingImage ? (
                            <>
                              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-3" />
                              <p className="text-sm text-muted-foreground">
                                Uploading...
                              </p>
                            </>
                          ) : (
                            <>
                              <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
                              <p className="mb-2 text-sm text-muted-foreground">
                                <span className="font-semibold">
                                  Click to upload
                                </span>{" "}
                                or drag and drop
                              </p>
                              <p className="text-xs text-muted-foreground">
                                PNG, JPG, or WebP (MAX. 5MB)
                              </p>
                            </>
                          )}
                        </div>
                        <input
                          ref={fileInputRef}
                          id="image-upload"
                          type="file"
                          className="hidden"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleFileChange}
                          disabled={isUploadingImage}
                        />
                      </label>
                    </div>
                  )}
                  <input type="hidden" {...field} />
                </div>
              </FormControl>
              <FormDescription>
                Upload a product image. Supported formats: JPEG, PNG, WebP. Max
                size: 5MB.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={PRODUCT_STATUS.ACTIVE}>Active</SelectItem>
                  <SelectItem value={PRODUCT_STATUS.FEATURED}>
                    Featured
                  </SelectItem>
                  <SelectItem value={PRODUCT_STATUS.INACTIVE}>
                    Inactive
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="quantityAvailable"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity Available</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  {...field}
                  disabled={hasSizeVariants}
                />
              </FormControl>
              <FormDescription>
                {hasSizeVariants
                  ? "Quantity is managed by size variants below"
                  : "Current inventory count. Orders will be prevented when stock reaches 0."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <CustomizationsForm
          value={customizations}
          onChange={setCustomizations}
        />

        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : product
              ? "Update Product"
              : "Create Product"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
