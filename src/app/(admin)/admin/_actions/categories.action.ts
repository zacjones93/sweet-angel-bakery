"use server"
import "server-only";
import { createServerAction } from "zsa";
import { z } from "zod";
import { getDB } from "@/db";
import { categoryTable, productTable, productCategoryTable } from "@/db/schema";
import { eq, and, ne, count, inArray } from "drizzle-orm";
import { requireAdmin } from "@/utils/auth";
import {
  createCategorySchema,
  updateCategorySchema,
  deleteCategorySchema,
  reorderCategoriesSchema,
  checkSlugSchema,
} from "@/schemas/category.schema";
import { PRODUCT_STATUS } from "@/db/schema";

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
    const dynamicCategories = categories.filter(cat => !HARDCODED_CATEGORY_SLUGS.includes(cat.slug));

    // Fetch products for each category via junction table
    const categoriesWithProducts = await Promise.all(
      dynamicCategories.map(async (category) => {
        const productAssociations = await db
          .select({
            productId: productCategoryTable.productId,
          })
          .from(productCategoryTable)
          .where(eq(productCategoryTable.categoryId, category.id))
          .limit(5);

        if (productAssociations.length === 0) {
          return {
            ...category,
            products: [],
          };
        }

        const products = await db
          .select({
            id: productTable.id,
            name: productTable.name,
          })
          .from(productTable)
          .where(inArray(productTable.id, productAssociations.map(pa => pa.productId)))
          .orderBy(productTable.name);

        return {
          ...category,
          products,
        };
      })
    );

    return categoriesWithProducts;
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
        updatedAt: new Date(),
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
          updatedAt: new Date(),
        })
        .where(eq(categoryTable.id, category.id));
    }

    return { success: true };
  });

// Get active/featured products for category form dropdown
export const getProductsForCategoryAction = createServerAction()
  .handler(async () => {
    await requireAdmin();

    const db = getDB();
    const products = await db
      .select({
        id: productTable.id,
        name: productTable.name,
        categoryId: productTable.categoryId,
        status: productTable.status,
      })
      .from(productTable)
      .where(ne(productTable.status, PRODUCT_STATUS.INACTIVE))
      .orderBy(productTable.name);

    return products;
  });

// Get products currently in a category
export const getProductsByCategoryAction = createServerAction()
  .input(z.object({ id: z.string().min(1) }))
  .handler(async ({ input }) => {
    await requireAdmin();

    const db = getDB();

    // Get products in this category via junction table
    const associations = await db
      .select({
        productId: productCategoryTable.productId,
      })
      .from(productCategoryTable)
      .where(eq(productCategoryTable.categoryId, input.id));

    return associations.map(a => a.productId);
  });

// Update product associations for a category
export const updateCategoryProductsAction = createServerAction()
  .input(z.object({
    categoryId: z.string().min(1),
    productIds: z.array(z.string()),
  }))
  .handler(async ({ input }) => {
    await requireAdmin();

    const db = getDB();

    // Get all products currently in this category via junction table
    const currentAssociations = await db
      .select({ productId: productCategoryTable.productId })
      .from(productCategoryTable)
      .where(eq(productCategoryTable.categoryId, input.categoryId));

    const currentProductIds = currentAssociations.map(a => a.productId);

    // Products to add to category (in new list but not in current)
    const toAdd = input.productIds.filter(id => !currentProductIds.includes(id));

    // Products to remove from category (in current but not in new list)
    const toRemove = currentProductIds.filter(id => !input.productIds.includes(id));

    // Add new product associations
    for (const productId of toAdd) {
      await db.insert(productCategoryTable).values({
        productId,
        categoryId: input.categoryId,
      });
    }

    // Remove product associations
    for (const productId of toRemove) {
      await db.delete(productCategoryTable).where(
        and(
          eq(productCategoryTable.productId, productId),
          eq(productCategoryTable.categoryId, input.categoryId)
        )
      );
    }

    return {
      success: true,
      added: toAdd.length,
      removed: toRemove.length,
    };
  });
