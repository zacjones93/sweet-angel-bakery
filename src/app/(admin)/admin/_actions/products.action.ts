"use server"
import { createServerAction } from "zsa";
import { z } from "zod";
import { getDB } from "@/db";
import { productTable, categoryTable, PRODUCT_STATUS } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "@/utils/auth";
import { getMerchantProvider } from "@/lib/merchant-provider/factory";
import { productCustomizationsSchema } from "@/schemas/customizations.schema";
import { SizeVariant } from "@/types/customizations";

// Get all products with category info
export const getProductsAction = createServerAction()
  .handler(async () => {
    await requireAdmin();

    const db = getDB()
    const products = await db
      .select({
        id: productTable.id,
        name: productTable.name,
        description: productTable.description,
        price: productTable.price,
        imageUrl: productTable.imageUrl,
        status: productTable.status,
        quantityAvailable: productTable.quantityAvailable,
        customizations: productTable.customizations,
        createdAt: productTable.createdAt,
        updatedAt: productTable.updatedAt,
        category: {
          id: categoryTable.id,
          name: categoryTable.name,
          slug: categoryTable.slug,
        },
      })
      .from(productTable)
      .leftJoin(categoryTable, eq(productTable.categoryId, categoryTable.id))
      .orderBy(desc(productTable.createdAt));

    // Parse customizations JSON and calculate total quantity from variations
    return products.map(p => {
      const customizations = p.customizations ? JSON.parse(p.customizations) : null;

      // If product has size variants, calculate total quantity from variants
      let totalQuantity = p.quantityAvailable;
      if (customizations?.type === 'size_variants' && customizations.variants) {
        totalQuantity = customizations.variants.reduce(
          (sum: number, variant: SizeVariant) => sum + (variant.quantityAvailable || 0),
          0
        );
      }

      return {
        ...p,
        customizations,
        quantityAvailable: totalQuantity,
      };
    });
  });

// Get single product
export const getProductAction = createServerAction()
  .input(z.object({ id: z.string() }))
  .handler(async ({ input }) => {
    await requireAdmin();

    const db = getDB()
    const product = await db
      .select()
      .from(productTable)
      .where(eq(productTable.id, input.id))
      .limit(1);

    if (!product[0]) {
      return null;
    }

    // Parse customizations JSON
    return {
      ...product[0],
      customizations: product[0].customizations ? JSON.parse(product[0].customizations) : null,
    };
  });

// Get all categories
export const getCategoriesAction = createServerAction()
  .handler(async () => {
    await requireAdmin();

    const db = getDB()
    const categories = await db
      .select()
      .from(categoryTable)
      .where(eq(categoryTable.active, 1))
      .orderBy(categoryTable.displayOrder);

    return categories;
  });

// Create product
export const createProductAction = createServerAction()
  .input(
    z.object({
      name: z.string().min(1, "Name is required"),
      description: z.string().optional(),
      categoryId: z.string().min(1, "Category is required"),
      price: z.number().min(0, "Price must be positive"),
      imageUrl: z.string().optional(),
      status: z.enum([PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.FEATURED, PRODUCT_STATUS.INACTIVE]),
      quantityAvailable: z.number().min(0, "Quantity must be positive").default(0),
      customizations: productCustomizationsSchema.optional(),
    })
  )
  .handler(async ({ input }) => {
    await requireAdmin();

    const priceInCents = Math.round(input.price * 100);

    // Normalize empty imageUrl to undefined
    const imageUrl = input.imageUrl && input.imageUrl.trim() !== "" ? input.imageUrl : undefined;

    // Create product in Square Catalog API
    const provider = await getMerchantProvider();

    // Prepare variants for Square if using size variants
    const variants = input.customizations?.type === 'size_variants'
      ? input.customizations.variants.map(v => ({
          id: v.id,
          name: v.name,
          price: v.priceInCents,
        }))
      : undefined;

    const catalogResult = await provider.createProduct({
      name: input.name,
      description: input.description,
      price: priceInCents,
      imageUrl,
      variants,
      metadata: {
        categoryId: input.categoryId,
        hasCustomizations: input.customizations ? 'true' : 'false',
      },
    });

    // Store Square variation IDs in customizations if using size variants
    if (input.customizations?.type === 'size_variants' && catalogResult.variantIds) {
      for (const variant of input.customizations.variants) {
        const squareVariantId = catalogResult.variantIds[variant.id];
        if (squareVariantId) {
          variant.squareVariationId = squareVariantId;
        }
      }
    }

    const db = getDB()
    const [product] = await db
      .insert(productTable)
      .values({
        name: input.name,
        description: input.description || null,
        categoryId: input.categoryId,
        price: priceInCents,
        imageUrl: imageUrl || null,
        status: input.status,
        quantityAvailable: input.quantityAvailable,
        merchantProvider: 'square',
        merchantProductId: catalogResult.productId,
        merchantPriceId: catalogResult.priceId || null,
        customizations: input.customizations ? JSON.stringify(input.customizations) : null,
      })
      .returning();

    return {
      ...product,
      customizations: product.customizations ? JSON.parse(product.customizations) : null,
    };
  });

// Update product
export const updateProductAction = createServerAction()
  .input(
    z.object({
      id: z.string(),
      name: z.string().min(1, "Name is required"),
      description: z.string().optional(),
      categoryId: z.string().min(1, "Category is required"),
      price: z.number().min(0, "Price must be positive"),
      imageUrl: z.string().optional(),
      status: z.enum([PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.FEATURED, PRODUCT_STATUS.INACTIVE]),
      quantityAvailable: z.number().min(0, "Quantity must be positive").default(0),
      customizations: productCustomizationsSchema.optional(),
    })
  )
  .handler(async ({ input }) => {
    await requireAdmin();

    const priceInCents = Math.round(input.price * 100);

    // Normalize empty imageUrl to undefined
    const imageUrl = input.imageUrl && input.imageUrl.trim() !== "" ? input.imageUrl : undefined;

    const db = getDB();

    const [product] = await db
      .update(productTable)
      .set({
        name: input.name,
        description: input.description || null,
        categoryId: input.categoryId,
        price: priceInCents,
        imageUrl: imageUrl || null,
        status: input.status,
        quantityAvailable: input.quantityAvailable,
        customizations: input.customizations ? JSON.stringify(input.customizations) : null,
        updatedAt: new Date(),
      })
      .where(eq(productTable.id, input.id))
      .returning();

    return {
      ...product,
      customizations: product.customizations ? JSON.parse(product.customizations) : null,
    };
  });

// Delete product
export const deleteProductAction = createServerAction()
  .input(z.object({ id: z.string() }))
  .handler(async ({ input }) => {
    await requireAdmin();

    const db = getDB()
    await db.delete(productTable).where(eq(productTable.id, input.id));

    return { success: true };
  });
