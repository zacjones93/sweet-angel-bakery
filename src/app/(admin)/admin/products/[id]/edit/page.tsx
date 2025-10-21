import {
  getProductAction,
  getCategoriesAction,
} from "../../../_actions/products.action";
import { ProductForm } from "../../_components/product-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";

export default async function EditProductPage({
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

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/admin/products">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Edit Product</h1>
        <p className="text-muted-foreground mt-1">Update product details</p>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <ProductForm product={product} categories={categories || []} />
      </div>
    </div>
  );
}
