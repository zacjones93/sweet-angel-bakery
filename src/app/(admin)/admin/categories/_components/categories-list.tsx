"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Pencil, Trash2, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useServerAction } from "zsa-react";
import {
  deleteCategoryAction,
  reorderCategoriesAction,
} from "../../_actions/categories.action";
import { toast } from "sonner";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  displayOrder: number;
  active: number;
  products: {
    id: string;
    name: string;
  }[];
};

type CategoriesListProps = {
  initialCategories: Category[];
};

function SortableRow({ category }: { category: Category }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? "z-50" : ""}>
      <TableCell className="w-[40px]">
        <button
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>
      </TableCell>
      <TableCell className="w-[80px]">
        {category.imageUrl ? (
          <div className="relative w-16 h-16 rounded overflow-hidden">
            <Image
              src={category.imageUrl}
              alt={category.name}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="w-16 h-16 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
            No image
          </div>
        )}
      </TableCell>
      <TableCell>
        <div className="font-medium">{category.name}</div>
        <div className="text-sm text-muted-foreground">/{category.slug}</div>
      </TableCell>
      <TableCell className="max-w-md">
        <div className="line-clamp-2 text-sm text-muted-foreground">
          {category.description || "—"}
        </div>
      </TableCell>
      <TableCell className="max-w-xs">
        {category.products.length > 0 ? (
          <div className="space-y-1">
            <div className="text-sm font-medium">{category.products.length} product{category.products.length !== 1 ? 's' : ''}</div>
            <div className="text-xs text-muted-foreground line-clamp-2">
              {category.products.map(p => p.name).join(', ')}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No products</div>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={category.active === 1 ? "default" : "secondary"}>
          {category.active === 1 ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex gap-2 justify-end">
          <Button
            asChild
            variant="ghost"
            size="icon"
          >
            <Link href={`/admin/categories/${category.id}/edit`}>
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
          <DeleteCategoryButton categoryId={category.id} categoryName={category.name} />
        </div>
      </TableCell>
    </TableRow>
  );
}

function DeleteCategoryButton({ categoryId, categoryName }: { categoryId: string; categoryName: string }) {
  const [showDialog, setShowDialog] = useState(false);
  const router = useRouter();
  const { execute: deleteCategory, isPending } = useServerAction(deleteCategoryAction);

  const handleDelete = async () => {
    const [result, err] = await deleteCategory({ id: categoryId });

    if (err) {
      toast.error(err.message || "Failed to delete category");
      return;
    }

    toast.success("Category deleted successfully");
    setShowDialog(false);
    router.refresh();
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowDialog(true)}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{categoryName}"? This action cannot be undone.
              You cannot delete categories that have products assigned to them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function CategoriesList({ initialCategories }: CategoriesListProps) {
  const [categories, setCategories] = useState(initialCategories);
  const router = useRouter();
  const { execute: reorderCategories, isPending } = useServerAction(reorderCategoriesAction);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = categories.findIndex((cat) => cat.id === active.id);
    const newIndex = categories.findIndex((cat) => cat.id === over.id);

    const reordered = arrayMove(categories, oldIndex, newIndex);

    // Update local state immediately for better UX
    setCategories(reordered);

    // Update display order based on new positions
    const updates = reordered.map((cat, index) => ({
      id: cat.id,
      displayOrder: index,
    }));

    const [result, err] = await reorderCategories({ categories: updates });

    if (err) {
      toast.error("Failed to save new order");
      // Revert to original order
      setCategories(initialCategories);
      return;
    }

    toast.success("Category order updated");
    router.refresh();
  };

  if (categories.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <p className="text-muted-foreground mb-4">
          No dynamic categories yet. Create your first one!
        </p>
        <Button asChild>
          <Link href="/admin/categories/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Category
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Drag and drop to reorder categories
        </p>
        <Button asChild>
          <Link href="/admin/categories/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Category
          </Link>
        </Button>
      </div>

      <div className="border rounded-lg">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="w-[80px]">Image</TableHead>
                <TableHead>Name / Slug</TableHead>
                <TableHead className="max-w-md">Description</TableHead>
                <TableHead className="max-w-xs">Products</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <SortableContext
                items={categories.map((cat) => cat.id)}
                strategy={verticalListSortingStrategy}
              >
                {categories.map((category) => (
                  <SortableRow key={category.id} category={category} />
                ))}
              </SortableContext>
            </TableBody>
          </Table>
        </DndContext>
      </div>

      {isPending && (
        <div className="text-sm text-muted-foreground text-center">
          Saving new order...
        </div>
      )}
    </div>
  );
}
