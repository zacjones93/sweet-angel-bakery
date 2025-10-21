"use server"
import { createServerAction } from "zsa";
import { z } from "zod";
import { getDB } from "@/db";
import { productTable, categoryTable, PRODUCT_STATUS } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "@/utils/auth";
import { getStripe } from "@/lib/stripe";
import { productCustomizationsSchema } from "@/schemas/customizations.schema";

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

    // Parse customizations JSON
    return products.map(p => ({
      ...p,
      customizations: p.customizations ? JSON.parse(p.customizations) : null,
    }));
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

    // Create Stripe product
    const stripe = await getStripe();
    const stripeProduct = await stripe.products.create({
      name: input.name,
      description: input.description || undefined,
      images: imageUrl ? [imageUrl] : undefined,
      metadata: {
        categoryId: input.categoryId,
        hasCustomizations: input.customizations ? 'true' : 'false',
      },
    });

    // Create Stripe price (this will be base/default price)
    const stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: priceInCents,
      currency: 'usd',
    });

    // For size variants, create additional Stripe prices for each variant
    if (input.customizations?.type === 'size_variants') {
      for (const variant of input.customizations.variants) {
        const variantPrice = await stripe.prices.create({
          product: stripeProduct.id,
          unit_amount: variant.priceInCents,
          currency: 'usd',
          nickname: variant.name,
        });
        variant.stripePriceId = variantPrice.id;
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
        stripeProductId: stripeProduct.id,
        stripePriceId: stripePrice.id,
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

    // Get existing product to check if price changed
    const [existingProduct] = await db
      .select()
      .from(productTable)
      .where(eq(productTable.id, input.id))
      .limit(1);

    if (!existingProduct) {
      throw new Error("Product not found");
    }

    const stripe = await getStripe();

    // Update Stripe product if it exists
    if (existingProduct.stripeProductId) {
      await stripe.products.update(existingProduct.stripeProductId, {
        name: input.name,
        description: input.description || undefined,
        images: imageUrl ? [imageUrl] : undefined,
        metadata: {
          categoryId: input.categoryId,
          hasCustomizations: input.customizations ? 'true' : 'false',
        },
      });

      // If price changed, create a new price (Stripe prices are immutable)
      let stripePriceId = existingProduct.stripePriceId;
      if (existingProduct.price !== priceInCents) {
        const newPrice = await stripe.prices.create({
          product: existingProduct.stripeProductId,
          unit_amount: priceInCents,
          currency: 'usd',
        });
        stripePriceId = newPrice.id;

        // Archive old price
        if (existingProduct.stripePriceId) {
          await stripe.prices.update(existingProduct.stripePriceId, { active: false });
        }
      }

      // For size variants, create/update Stripe prices for each variant
      if (input.customizations?.type === 'size_variants') {
        for (const variant of input.customizations.variants) {
          if (!variant.stripePriceId) {
            const variantPrice = await stripe.prices.create({
              product: existingProduct.stripeProductId,
              unit_amount: variant.priceInCents,
              currency: 'usd',
              nickname: variant.name,
            });
            variant.stripePriceId = variantPrice.id;
          }
        }
      }

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
          stripePriceId,
          customizations: input.customizations ? JSON.stringify(input.customizations) : null,
          updatedAt: new Date(),
        })
        .where(eq(productTable.id, input.id))
        .returning();

      return {
        ...product,
        customizations: product.customizations ? JSON.parse(product.customizations) : null,
      };
    }

    // Fallback if no Stripe product exists
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
