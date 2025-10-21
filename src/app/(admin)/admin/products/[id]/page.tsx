import {
  getProductAction,
  getCategoriesAction,
} from "../../_actions/products.action";
import { ArrowLeft, Edit, Package } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product] = await getProductAction({ id });
  const [categories] = await getCategoriesAction();

  if (!product) {
    notFound();
  }

  const category = categories?.find((c) => c.id === product.categoryId);

  function formatPrice(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "featured":
        return <Badge variant="default">Featured</Badge>;
      case "active":
        return <Badge variant="secondary">Active</Badge>;
      case "inactive":
        return <Badge variant="outline">Inactive</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  }

  const isOutOfStock = product.quantityAvailable === 0;

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/admin/products">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <p className="text-muted-foreground mt-1">Product Details</p>
          </div>
          <Button asChild>
            <Link href={`/admin/products/${product.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Product
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Product Image */}
        <Card>
          <CardHeader>
            <CardTitle>Product Image</CardTitle>
          </CardHeader>
          <CardContent>
            {product.imageUrl ? (
              <div className="relative aspect-square w-full overflow-hidden rounded-lg border">
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="aspect-square w-full flex items-center justify-center bg-muted rounded-lg border">
                <Package className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Information */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Name
                </label>
                <p className="text-lg font-semibold">{product.name}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Category
                </label>
                <p className="text-lg">{category?.name || "N/A"}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Description
                </label>
                <p className="text-base">
                  {product.description || "No description provided"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing & Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Price
                </label>
                <p className="text-2xl font-bold text-primary">
                  {formatPrice(product.price)}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Quantity Available
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <p
                    className={`text-xl font-semibold ${
                      isOutOfStock ? "text-destructive" : ""
                    }`}
                  >
                    {product.quantityAvailable}
                  </p>
                  {isOutOfStock && (
                    <Badge variant="destructive">Out of Stock</Badge>
                  )}
                  {!isOutOfStock && product.quantityAvailable <= 5 && (
                    <Badge
                      variant="secondary"
                      className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100"
                    >
                      Low Stock
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Status
                </label>
                <div className="mt-1">{getStatusBadge(product.status)}</div>
              </div>
            </CardContent>
          </Card>

          {(product.stripeProductId || product.stripePriceId) && (
            <Card>
              <CardHeader>
                <CardTitle>Stripe Information</CardTitle>
                <CardDescription>Payment integration details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {product.stripeProductId && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Product ID
                    </label>
                    <p className="text-sm font-mono bg-muted px-2 py-1 rounded mt-1">
                      {product.stripeProductId}
                    </p>
                  </div>
                )}
                {product.stripePriceId && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Price ID
                    </label>
                    <p className="text-sm font-mono bg-muted px-2 py-1 rounded mt-1">
                      {product.stripePriceId}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
