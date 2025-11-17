import "server-only";
import { CategoryForm } from "../_components/category-form";
import { getProductsForCategoryAction } from "../../_actions/categories.action";

export default async function NewCategoryPage() {
  const [products] = await getProductsForCategoryAction();

  return (
    <div className="space-y-6 mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Category</h1>
        <p className="text-muted-foreground mt-2">
          Add a new dynamic category that will appear in the navigation
        </p>
      </div>

      <CategoryForm products={products || []} selectedProductIds={[]} />
    </div>
  );
}
