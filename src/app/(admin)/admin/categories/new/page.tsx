import "server-only";
import { CategoryForm } from "../_components/category-form";

export default function NewCategoryPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Category</h1>
        <p className="text-muted-foreground mt-2">
          Add a new dynamic category that will appear in the navigation
        </p>
      </div>

      <CategoryForm />
    </div>
  );
}
