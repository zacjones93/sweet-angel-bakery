import "server-only";
import { notFound } from "next/navigation";
import { getDB } from "@/db";
import { categoryTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CategoryForm } from "../../_components/category-form";
import {
  getProductsForCategoryAction,
  getProductsByCategoryAction,
} from "../../../_actions/categories.action";

type EditCategoryPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
  const { id } = await params;

  const db = getDB();
  const [category] = await db
    .select()
    .from(categoryTable)
    .where(eq(categoryTable.id, id))
    .limit(1);

  if (!category) {
    notFound();
  }

  // Fetch all products and current category's products
  const [products] = await getProductsForCategoryAction();
  const [selectedProductIds] = await getProductsByCategoryAction({ id });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Category</h1>
        <p className="text-muted-foreground mt-2">
          Update the category details and manage products
        </p>
      </div>

      <CategoryForm
        category={category}
        products={products || []}
        selectedProductIds={selectedProductIds || []}
      />
    </div>
  );
}
