import { getCategoriesAction } from "../../_actions/products.action";
import { ProductForm } from "../_components/product-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function NewProductPage() {
  const [categories] = await getCategoriesAction();

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/admin/products">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Create New Product</h1>
        <p className="text-muted-foreground mt-1">
          Add a new product to your bakery
        </p>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <ProductForm categories={categories || []} />
      </div>
    </div>
  );
}
