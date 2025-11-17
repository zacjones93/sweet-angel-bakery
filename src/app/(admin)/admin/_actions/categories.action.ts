"use server"
import "server-only";
import { createServerAction } from "zsa";
import { getDB } from "@/db";
import { categoryTable, productTable } from "@/db/schema";
import { eq, and, ne, count } from "drizzle-orm";
import { requireAdmin } from "@/utils/auth";
import {
  createCategorySchema,
  updateCategorySchema,
  deleteCategorySchema,
  reorderCategoriesSchema,
  checkSlugSchema,
} from "@/schemas/category.schema";

// Hardcoded category slugs that should be excluded from dynamic management
const HARDCODED_CATEGORY_SLUGS = ['cakes', 'cookies', 'gift-boxes', 'custom-orders'];

// Get all dynamic categories (excludes hardcoded ones)
export const getDynamicCategoriesAction = createServerAction()
  .handler(async () => {
    await requireAdmin();

    const db = getDB();
    const categories = await db
      .select()
      .from(categoryTable)
      .where(eq(categoryTable.active, 1))
      .orderBy(categoryTable.displayOrder);

    // Filter out hardcoded categories
    return categories.filter(cat => !HARDCODED_CATEGORY_SLUGS.includes(cat.slug));
  });

// Get all categories including hardcoded ones (for product forms)
export const getAllCategoriesAction = createServerAction()
  .handler(async () => {
    await requireAdmin();

    const db = getDB();
    const categories = await db
      .select()
      .from(categoryTable)
      .where(eq(categoryTable.active, 1))
      .orderBy(categoryTable.displayOrder);

    return categories;
  });

// Get single category by ID
export const getCategoryAction = createServerAction()
  .input(checkSlugSchema.pick({ slug: true }).extend({ id: checkSlugSchema.shape.excludeId }))
  .handler(async ({ input }) => {
    await requireAdmin();

    const db = getDB();
    const [category] = await db
      .select()
      .from(categoryTable)
      .where(eq(categoryTable.id, input.id!))
      .limit(1);

    if (!category) {
      throw new Error("Category not found");
    }

    return category;
  });

// Check if slug is unique
export const checkSlugUniqueAction = createServerAction()
  .input(checkSlugSchema)
  .handler(async ({ input }) => {
    await requireAdmin();

    const db = getDB();
    const conditions = [eq(categoryTable.slug, input.slug)];

    // Exclude current category when updating
    if (input.excludeId) {
      conditions.push(ne(categoryTable.id, input.excludeId));
    }

    const [existing] = await db
      .select()
      .from(categoryTable)
      .where(and(...conditions))
      .limit(1);

    return { isUnique: !existing };
  });

// Create new category
export const createCategoryAction = createServerAction()
  .input(createCategorySchema)
  .handler(async ({ input }) => {
    await requireAdmin();

    const db = getDB();

    // Check if slug already exists
    const [existing] = await db
      .select()
      .from(categoryTable)
      .where(eq(categoryTable.slug, input.slug))
      .limit(1);

    if (existing) {
      throw new Error("A category with this slug already exists");
    }

    // Get highest display order and add 1
    const [maxOrder] = await db
      .select({ max: categoryTable.displayOrder })
      .from(categoryTable);

    const displayOrder = (maxOrder?.max ?? 0) + 1;

    // Insert new category
    await db.insert(categoryTable).values({
      name: input.name,
      slug: input.slug,
      description: input.description || null,
      imageUrl: input.imageUrl || null,
      displayOrder,
      active: input.active ? 1 : 0,
    });

    return { success: true };
  });

// Update existing category
export const updateCategoryAction = createServerAction()
  .input(updateCategorySchema)
  .handler(async ({ input }) => {
    await requireAdmin();

    const db = getDB();

    // Check if category exists
    const [existing] = await db
      .select()
      .from(categoryTable)
      .where(eq(categoryTable.id, input.id))
      .limit(1);

    if (!existing) {
      throw new Error("Category not found");
    }

    // Check if slug is taken by another category
    const [slugConflict] = await db
      .select()
      .from(categoryTable)
      .where(and(
        eq(categoryTable.slug, input.slug),
        ne(categoryTable.id, input.id)
      ))
      .limit(1);

    if (slugConflict) {
      throw new Error("A category with this slug already exists");
    }

    // Update category
    await db
      .update(categoryTable)
      .set({
        name: input.name,
        slug: input.slug,
        description: input.description || null,
        imageUrl: input.imageUrl || null,
        active: input.active ? 1 : 0,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(categoryTable.id, input.id));

    return { success: true };
  });

// Delete category
export const deleteCategoryAction = createServerAction()
  .input(deleteCategorySchema)
  .handler(async ({ input }) => {
    await requireAdmin();

    const db = getDB();

    // Check if category exists
    const [existing] = await db
      .select()
      .from(categoryTable)
      .where(eq(categoryTable.id, input.id))
      .limit(1);

    if (!existing) {
      throw new Error("Category not found");
    }

    // Prevent deleting hardcoded categories
    if (HARDCODED_CATEGORY_SLUGS.includes(existing.slug)) {
      throw new Error("Cannot delete system categories (cakes, cookies, etc.)");
    }

    // Check if any products are assigned to this category
    const [productCount] = await db
      .select({ count: count() })
      .from(productTable)
      .where(eq(productTable.categoryId, input.id));

    if (productCount.count > 0) {
      throw new Error(`Cannot delete category. ${productCount.count} product(s) are assigned to this category. Please reassign or delete those products first.`);
    }

    // Delete category
    await db
      .delete(categoryTable)
      .where(eq(categoryTable.id, input.id));

    return { success: true };
  });

// Reorder categories (bulk update display order)
export const reorderCategoriesAction = createServerAction()
  .input(reorderCategoriesSchema)
  .handler(async ({ input }) => {
    await requireAdmin();

    const db = getDB();

    // Update display order for each category
    // Note: D1 doesn't support transactions, so we do this sequentially
    for (const category of input.categories) {
      await db
        .update(categoryTable)
        .set({
          displayOrder: category.displayOrder,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(categoryTable.id, category.id));
    }

    return { success: true };
  });
