"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import { getDB } from "@/db";
import { productTable, categoryTable, PRODUCT_STATUS } from "@/db/schema";
import { eq, and, desc, ne, sql } from "drizzle-orm";

// Get products for storefront (only active/featured)
export const getStorefrontProductsAction = createServerAction()
  .input(
    z
      .object({
        categorySlug: z.string().optional(),
        featured: z.boolean().optional(),
      })
      .optional()
  )
  .handler(async ({ input }) => {
    const conditions = [];

    // Only show active or featured products
    conditions.push(
      ne(productTable.status, PRODUCT_STATUS.INACTIVE)
    );

    if (input?.featured) {
      conditions.push(eq(productTable.status, PRODUCT_STATUS.FEATURED));
    }

    if (input?.categorySlug) {
      const db = getDB();
      const [category] = await db
        .select()
        .from(categoryTable)
        .where(eq(categoryTable.slug, input.categorySlug))
        .limit(1);

      if (category) {
        conditions.push(eq(productTable.categoryId, category.id));
      }
    }

    const db = getDB();
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
        category: {
          id: categoryTable.id,
          name: categoryTable.name,
          slug: categoryTable.slug,
        },
      })
      .from(productTable)
      .leftJoin(categoryTable, eq(productTable.categoryId, categoryTable.id))
      .where(and(...conditions))
      .orderBy(
        // Sort in-stock items first (quantityAvailable > 0), out-of-stock last
        desc(sql`CASE WHEN ${productTable.quantityAvailable} > 0 THEN 1 ELSE 0 END`),
        desc(productTable.createdAt)
      );

    // Parse customizations JSON and calculate effective stock
    const parsedProducts = products.map((p) => {
      const customizations = p.customizations ? JSON.parse(p.customizations) : null;

      // For products with size variants, calculate total stock across all variants
      let effectiveStock = p.quantityAvailable;
      if (customizations?.type === "size_variants" && customizations.variants) {
        effectiveStock = customizations.variants.reduce(
          (sum: number, variant: { quantityAvailable: number }) => sum + variant.quantityAvailable,
          0
        );
      }

      return {
        ...p,
        customizations,
        effectiveStock,
      };
    });

    // Re-sort by effective stock (in-stock first, out-of-stock last)
    return parsedProducts.sort((a, b) => {
      // Primary sort: in-stock vs out-of-stock
      const aInStock = a.effectiveStock > 0 ? 1 : 0;
      const bInStock = b.effectiveStock > 0 ? 1 : 0;
      if (aInStock !== bInStock) return bInStock - aInStock;

      // Secondary sort: by creation date (newer first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  });

// Get single product for storefront
export const getStorefrontProductAction = createServerAction()
  .input(z.object({ id: z.string() }))
  .handler(async ({ input }) => {
    const db = getDB();
    const [product] = await db
      .select({
        id: productTable.id,
        name: productTable.name,
        description: productTable.description,
        price: productTable.price,
        imageUrl: productTable.imageUrl,
        status: productTable.status,
        quantityAvailable: productTable.quantityAvailable,
        customizations: productTable.customizations,
        category: {
          id: categoryTable.id,
          name: categoryTable.name,
          slug: categoryTable.slug,
        },
      })
      .from(productTable)
      .leftJoin(categoryTable, eq(productTable.categoryId, categoryTable.id))
      .where(
        and(
          eq(productTable.id, input.id),
          ne(productTable.status, PRODUCT_STATUS.INACTIVE)
        )
      )
      .limit(1);

    if (!product) {
      return null;
    }

    // Parse customizations JSON
    return {
      ...product,
      customizations: product.customizations ? JSON.parse(product.customizations) : null,
    };
  });
