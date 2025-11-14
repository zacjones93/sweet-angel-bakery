import { getStorefrontProductsAction } from "../../_actions/storefront.action";
import { ProductCard } from "../../_components/product-card";

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const categorySlug = slug?.[0];
  const [products] = await getStorefrontProductsAction({ categorySlug });

  const title = categorySlug
    ? `${categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1)}`
    : "All Products";

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-b from-primary/5 to-background py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">{title}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Browse our selection of freshly baked goods made with love
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {products && products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {products.map((product) => {
              // Check if product is out of stock (considering variants)
              const hasVariants = product.customizations?.type === "size_variants";
              const isOutOfStock = hasVariants
                ? product.customizations.variants.every((v: { quantityAvailable: number }) => v.quantityAvailable <= 0)
                : product.quantityAvailable <= 0;

              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  compact={isOutOfStock}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-lg text-muted-foreground">
              No products available at the moment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
