"use client";

import { useState, useRef, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useServerAction } from "zsa-react";
import {
  createCategoryAction,
  updateCategoryAction,
  updateCategoryProductsAction,
} from "../../_actions/categories.action";
import { toast } from "sonner";
import { Upload, X, Package } from "lucide-react";
import Image from "next/image";
import { generateSlug } from "@/schemas/category.schema";

const categoryFormSchema = z.object({
  name: z.string().min(1, "Category name is required").max(255),
  slug: z.string().min(1, "Slug is required").max(255)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  description: z.string().max(1000).optional(),
  imageUrl: z.string().url().max(500).optional().or(z.literal('')),
  active: z.boolean().default(true),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  active: number;
};

type Product = {
  id: string;
  name: string;
  categoryId: string;
  status: string;
};

type CategoryFormProps = {
  category?: Category;
  products: Product[];
  selectedProductIds: string[];
};

export function CategoryForm({ category, products, selectedProductIds }: CategoryFormProps) {
  const router = useRouter();
  const { execute: createCategory, isPending: isCreating } =
    useServerAction(createCategoryAction);
  const { execute: updateCategory, isPending: isUpdating } =
    useServerAction(updateCategoryAction);
  const [imagePreview, setImagePreview] = useState<string | null>(
    category?.imageUrl || null
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [autoSlug, setAutoSlug] = useState(!category); // Auto-generate slug only for new categories
  const [selectedProducts, setSelectedProducts] = useState<string[]>(selectedProductIds);
  const { execute: updateProducts, isPending: isUpdatingProducts } =
    useServerAction(updateCategoryProductsAction);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: category?.name || "",
      slug: category?.slug || "",
      description: category?.description || "",
      imageUrl: category?.imageUrl || "",
      active: category ? category.active === 1 : true,
    },
  });

  const isSubmitting = isCreating || isUpdating;

  // Auto-generate slug from name
  useEffect(() => {
    if (autoSlug) {
      const subscription = form.watch((value, { name: fieldName }) => {
        if (fieldName === 'name' && value.name) {
          const slug = generateSlug(value.name);
          form.setValue('slug', slug);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [autoSlug, form]);

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

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

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

  async function onSubmit(values: CategoryFormValues) {
    const data = {
      name: values.name,
      slug: values.slug,
      description: values.description || "",
      imageUrl: values.imageUrl || "",
      active: values.active,
    };

    if (category) {
      // Update existing category
      const [result, err] = await updateCategory({
        id: category.id,
        ...data,
      });

      if (err) {
        toast.error(err.message || "Failed to update category");
        return;
      }

      // Update product associations
      const [prodResult, prodErr] = await updateProducts({
        categoryId: category.id,
        productIds: selectedProducts,
      });

      if (prodErr) {
        toast.error("Category updated but failed to update products");
        return;
      }

      toast.success("Category and products updated successfully");
      router.push("/admin/categories");
      router.refresh();
    } else {
      // Create new category
      const [result, err] = await createCategory(data);

      if (err) {
        toast.error(err.message || "Failed to create category");
        return;
      }

      toast.success("Category created successfully");
      router.push("/admin/categories");
      router.refresh();
    }
  }

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Category Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Thanksgiving Specials"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                The display name for this category
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Slug */}
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug (URL)</FormLabel>
              <FormControl>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., thanksgiving-specials"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      setAutoSlug(false); // Disable auto-generation once user manually edits
                    }}
                  />
                  {!autoSlug && !category && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const name = form.getValues('name');
                        if (name) {
                          form.setValue('slug', generateSlug(name));
                          setAutoSlug(true);
                        }
                      }}
                    >
                      Auto
                    </Button>
                  )}
                </div>
              </FormControl>
              <FormDescription>
                URL-friendly identifier (lowercase, hyphens only)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe this category..."
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                A brief description shown on the category page
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Image Upload */}
        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category Image (Optional)</FormLabel>
              <FormControl>
                <div className="space-y-4">
                  {imagePreview ? (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                      <Image
                        src={imagePreview}
                        alt="Category preview"
                        fill
                        className="object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={removeImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg transition-colors ${
                        isDragging
                          ? "border-primary bg-primary/10"
                          : "border-input hover:bg-muted/50"
                      }`}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                    >
                      <label
                        htmlFor="category-image"
                        className="flex flex-col items-center justify-center w-full h-full cursor-pointer"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="h-10 w-10 mb-3 text-muted-foreground" />
                          <p className="mb-2 text-sm text-muted-foreground">
                            <span className="font-semibold">Click to upload</span> or drag
                            and drop
                          </p>
                          <p className="text-xs text-muted-foreground">
                            PNG, JPG, WebP (max 5MB)
                          </p>
                        </div>
                        <input
                          id="category-image"
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleFileChange}
                          disabled={isUploadingImage}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormDescription>
                Optional image for navigation or category page
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Active Checkbox */}
        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Active</FormLabel>
                <FormDescription>
                  Show this category in the navigation and on the storefront
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {/* Product Association (Edit Only) */}
        {category && (
          <div className="space-y-4 rounded-md border p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-medium">Products in this Category</h3>
                <p className="text-sm text-muted-foreground">
                  Select which products belong to this category ({selectedProducts.length} selected)
                </p>
              </div>
            </div>

            <div className="h-[300px] w-full rounded border p-4 overflow-y-auto">
              <div className="space-y-2">
                {products.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No active or featured products available
                  </p>
                ) : (
                  products.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-start space-x-3 rounded-md p-2 hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={`product-${product.id}`}
                        checked={selectedProducts.includes(product.id)}
                        onCheckedChange={() => toggleProduct(product.id)}
                      />
                      <label
                        htmlFor={`product-${product.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {product.categoryId === category.id
                            ? "Currently in this category"
                            : `Currently in another category`}
                        </div>
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Note: Selecting a product will move it from its current category to this one.
              Deselecting will leave it in its current category.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting || isUploadingImage}>
            {isSubmitting
              ? category
                ? "Updating..."
                : "Creating..."
              : category
              ? "Update Category"
              : "Create Category"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
