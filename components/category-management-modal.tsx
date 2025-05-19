"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Trash2, AlertCircle, GripVertical } from "lucide-react"

import { deleteAlterEgoCategory, updateAlterEgoCategoryPositions } from "@/lib/database/alterEgoCategories"
import type { AlterEgoCategory } from "@/lib/types"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface CategoryManagementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: AlterEgoCategory[]
  userId: string
  onCategoryDeleted: (categoryId: string) => void
  onCategoriesReordered: (categories: AlterEgoCategory[]) => void
}

interface SortableCategoryProps {
  category: AlterEgoCategory
  onDeleteClick: (category: AlterEgoCategory) => void
}

function SortableCategory({ category, onDeleteClick }: SortableCategoryProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
    disabled: category.id === "all", // "All" category can't be dragged
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 border rounded-md mb-2 ${
        isDragging ? "bg-accent" : "bg-background"
      }`}
    >
      <div className="flex items-center gap-3 flex-1">
        {category.id !== "all" && (
          <button
            className="cursor-grab touch-none"
            {...attributes}
            {...listeners}
            aria-label={`Drag to reorder ${category.name} category`}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
        <div>
          <h3 className="font-medium">{category.name}</h3>
          {category.description && <p className="text-sm text-muted-foreground">{category.description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {category.id !== "all" && (
          <Button variant="ghost" size="sm" onClick={() => onDeleteClick(category)}>
            <Trash2 className="h-4 w-4 text-destructive" />
            <span className="sr-only">Delete {category.name}</span>
          </Button>
        )}
      </div>
    </div>
  )
}

export function CategoryManagementModal({
  open,
  onOpenChange,
  categories,
  userId,
  onCategoryDeleted,
  onCategoriesReordered,
}: CategoryManagementModalProps) {
  const [deletingCategory, setDeletingCategory] = useState<AlterEgoCategory | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [items, setItems] = useState<AlterEgoCategory[]>(categories)

  // Update items when categories change
  if (JSON.stringify(categories) !== JSON.stringify(items)) {
    setItems(categories)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDeleteClick = (category: AlterEgoCategory) => {
    setDeletingCategory(category)
    setDeleteError(null)
  }

  const handleConfirmDelete = async () => {
    if (!deletingCategory) return

    // Don't allow deleting "All" category
    if (deletingCategory.id === "all") {
      setDeleteError("The 'All' category cannot be deleted.")
      return
    }

    try {
      // Delete category in Supabase
      const result = await deleteAlterEgoCategory(userId, deletingCategory.id)
      
      if (result.success) {
        // Update local state
        setItems(items.filter((item) => item.id !== deletingCategory.id))

        // Notify parent component
        onCategoryDeleted(deletingCategory.id)

        // Close the dialog
        setDeletingCategory(null)
      } else if (result.error) {
        // Improve error message for specific cases
        const errorMessage = result.error === "has_alter_egos" 
          ? "Cannot delete a category that contains alter egos. Please remove all alter egos from this category first."
          : result.error
        setDeleteError(errorMessage)
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      setDeleteError('An error occurred while deleting the category. Please try again later.')
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)

      // Create new array with the updated order
      const newItems = arrayMove(items, oldIndex, newIndex)

      // Update positions based on new order
      const updatedItems = newItems.map((item, index) => ({
        ...item,
        position: index,
      }))

      try {
        // Update local state immediately for responsiveness
        setItems(updatedItems)

        // Update positions in Supabase
        await updateAlterEgoCategoryPositions(userId, updatedItems.map((item) => item.id))

        // Notify parent component
        onCategoriesReordered(updatedItems)
      } catch (error) {
        console.error('Error updating category positions:', error)
        // TODO: Show error message to user
        // Revert local state on error
        setItems(items)
      }
    }
  }

  return (
    <>
      {/* Category Management Dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Categories</DialogTitle>
          </DialogHeader>

          <div className="my-4 max-h-[60vh] overflow-y-auto pr-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                {items.map((category) => (
                  <SortableCategory key={category.id} category={category} onDeleteClick={handleDeleteClick} />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          <p className="text-sm text-muted-foreground">
            Drag categories to reorder them. The "All" category will always remain at the top.
          </p>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingCategory} onOpenChange={(open) => !open && setDeletingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Are you sure you want to delete &quot;{deletingCategory?.name}&quot;? This action cannot be undone.
            </p>
            {deletingCategory?.id !== "all" && (
              <p className="text-sm text-muted-foreground">
                Note: You cannot delete a category that contains alter egos. Please remove all alter egos from this category first.
              </p>
            )}
            {deleteError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{deleteError}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeletingCategory(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
