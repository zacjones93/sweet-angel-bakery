import "server-only";
import { getDynamicCategoriesAction } from "../_actions/categories.action";
import { CategoriesList } from "./_components/categories-list";

export default async function CategoriesPage() {
  const [categories] = await getDynamicCategoriesAction();

  return (
    <div className="space-y-6 mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
        <p className="text-muted-foreground mt-2">
          Manage dynamic product categories. Note: "Cakes" and "Cookies" are hardcoded in the navigation.
        </p>
      </div>

      <CategoriesList initialCategories={categories || []} />
    </div>
  );
}
