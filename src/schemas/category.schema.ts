import { z } from "zod";

// Helper function to generate slug from name
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen
}

// Schema for creating a new category
export const createCategorySchema = z.object({
  name: z.string()
    .min(1, "Category name is required")
    .max(255, "Category name must be less than 255 characters"),
  slug: z.string()
    .min(1, "Slug is required")
    .max(255, "Slug must be less than 255 characters")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens")
    .refine((slug) => !slug.startsWith('-') && !slug.endsWith('-'), {
      message: "Slug cannot start or end with a hyphen",
    }),
  description: z.string()
    .max(1000, "Description must be less than 1000 characters")
    .optional()
    .or(z.literal('')),
  imageUrl: z.string()
    .url("Must be a valid URL")
    .max(500, "Image URL must be less than 500 characters")
    .optional()
    .or(z.literal('')),
  active: z.boolean().default(true),
});

// Schema for updating an existing category
export const updateCategorySchema = z.object({
  id: z.string().min(1, "Category ID is required"),
  name: z.string()
    .min(1, "Category name is required")
    .max(255, "Category name must be less than 255 characters"),
  slug: z.string()
    .min(1, "Slug is required")
    .max(255, "Slug must be less than 255 characters")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens")
    .refine((slug) => !slug.startsWith('-') && !slug.endsWith('-'), {
      message: "Slug cannot start or end with a hyphen",
    }),
  description: z.string()
    .max(1000, "Description must be less than 1000 characters")
    .optional()
    .or(z.literal('')),
  imageUrl: z.string()
    .url("Must be a valid URL")
    .max(500, "Image URL must be less than 500 characters")
    .optional()
    .or(z.literal('')),
  active: z.boolean(),
});

// Schema for deleting a category
export const deleteCategorySchema = z.object({
  id: z.string().min(1, "Category ID is required"),
});

// Schema for reordering categories
export const reorderCategoriesSchema = z.object({
  categories: z.array(z.object({
    id: z.string().min(1),
    displayOrder: z.number().int().min(0),
  })).min(1, "At least one category is required"),
});

// Schema for checking slug uniqueness (used internally)
export const checkSlugSchema = z.object({
  slug: z.string().min(1),
  excludeId: z.string().optional(), // Exclude current category when updating
});

// Type exports
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type DeleteCategoryInput = z.infer<typeof deleteCategorySchema>;
export type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>;
export type CheckSlugInput = z.infer<typeof checkSlugSchema>;
