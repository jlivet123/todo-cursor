"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { PlusCircle, Settings } from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import { saveCategory } from "@/lib/alter-ego-storage"
import { CategoryManagementModal } from "./category-management-modal"
import type { AlterEgoCategory } from "@/lib/types"
import { MOCK_USER_ID } from "@/lib/alter-ego-storage"

interface CategoryTabsProps {
  categories: AlterEgoCategory[]
  activeCategory: string
  onCategoryChange: (categoryId: string) => void
  onCategoryAdded?: (category: AlterEgoCategory) => void
  onCategoryDeleted?: (categoryId: string) => void
  onCategoriesReordered?: (categories: AlterEgoCategory[]) => void
}

export function CategoryTabs({
  categories,
  activeCategory,
  onCategoryChange,
  onCategoryAdded,
  onCategoryDeleted,
  onCategoriesReordered,
}: CategoryTabsProps) {
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [isManagingCategories, setIsManagingCategories] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [sortedCategories, setSortedCategories] = useState<AlterEgoCategory[]>([])

  // Sort categories by position
  useEffect(() => {
    setSortedCategories([...categories].sort((a, b) => a.position - b.position))
  }, [categories])

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      const newCategory: AlterEgoCategory = {
        id: uuidv4(),
        name: newCategoryName.trim(),
        description: null,
        position: categories.length, // Add to the end
        created_at: new Date().toISOString(),
        user_id: MOCK_USER_ID,
      }

      saveCategory(newCategory)
      setNewCategoryName("")
      setIsAddingCategory(false)

      // Update the local state through the parent component
      if (onCategoryAdded) {
        onCategoryAdded(newCategory)
      }
    }
  }

  const handleCategoryDeleted = (categoryId: string) => {
    // If the deleted category was active, switch to "All"
    if (activeCategory === categoryId && onCategoryChange) {
      onCategoryChange("all")
    }

    // Notify parent component
    if (onCategoryDeleted) {
      onCategoryDeleted(categoryId)
    }
  }

  const handleCategoriesReordered = (reorderedCategories: AlterEgoCategory[]) => {
    if (onCategoriesReordered) {
      onCategoriesReordered(reorderedCategories)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-grow">
          {sortedCategories.map((category) => (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? "default" : "outline"}
              onClick={() => onCategoryChange(category.id)}
              className="whitespace-nowrap"
            >
              {category.name}
            </Button>
          ))}
          <Button variant="ghost" size="sm" onClick={() => setIsAddingCategory(true)}>
            <PlusCircle className="h-4 w-4 mr-1" />
            Add Category
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsManagingCategories(true)}>
          <Settings className="h-4 w-4 mr-1" />
          Manage
        </Button>
      </div>

      {/* Add Category Dialog */}
      <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          <Input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Category name"
            className="mt-2"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingCategory(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCategory}>Add Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Management Modal */}
      <CategoryManagementModal
        open={isManagingCategories}
        onOpenChange={setIsManagingCategories}
        categories={sortedCategories}
        onCategoryDeleted={handleCategoryDeleted}
        onCategoriesReordered={handleCategoriesReordered}
      />
    </>
  )
}
