'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { AlterEgoCard } from "@/components/alter-ego-card"
import { CategoryTabs } from "@/components/category-tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlterEgoForm } from "@/components/alter-ego-form"
import { getAlterEgos } from "@/lib/alter-ego-storage"
import type { AlterEgo, AlterEgoCategory, AlterEgoWithCategories } from "@/lib/types"
import { HelperText } from "@/components/helper-text"
import { getSupabaseClient } from "@/lib/supabase"
import { 
  ensureDefaultAlterEgoCategories,
  fetchAlterEgoCategories,
  createAlterEgoCategory,
  updateAlterEgoCategoryPositions,
  deleteAlterEgoCategory
} from "@/lib/database/alterEgoCategories"

export default function AlterEgosClient() {
  const [alterEgos, setAlterEgos] = useState<AlterEgoWithCategories[]>([])
  const [categories, setCategories] = useState<AlterEgoCategory[]>([])
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [isAddingAlterEgo, setIsAddingAlterEgo] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabaseClient()
      if (!supabase) {
        console.error('Supabase client not initialized')
        setIsLoading(false)
        return
      }

      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) throw error
        if (!user) throw new Error('No authenticated user found')
        
        setUserId(user.id)
        await loadData(user.id)
      } catch (error) {
        console.error('Error initializing:', error)
        setUserId(null)
      } finally {
        setIsLoading(false)
      }
    }

    init()
  }, [])

  const loadData = async (userId: string) => {
    try {
      // 1. Ensure default categories exist in DB
      await ensureDefaultAlterEgoCategories(userId)
      
      // 2. Fetch categories from DB
      const categories = await fetchAlterEgoCategories(userId)
      setCategories(categories)
      
      // 3. Fetch alter egos from local storage
      const alterEgos = getAlterEgos(userId)
      setAlterEgos(alterEgos)
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleAddAlterEgo = (newAlterEgo: AlterEgo) => {
    setAlterEgos([...alterEgos, { ...newAlterEgo, categories: [] }])
  }

  const handleUpdateAlterEgo = (updatedAlterEgo: AlterEgo) => {
    setAlterEgos(alterEgos.map(ego => 
      ego.id === updatedAlterEgo.id ? { ...updatedAlterEgo, categories: ego.categories } : ego
    ))
  }

  const handleDeleteAlterEgo = (id: string) => {
    setAlterEgos(alterEgos.filter(ego => ego.id !== id))
  }

  const handleCategoryAdded = async (newCategory: AlterEgoCategory) => {
    if (!userId) return
    try {
      const savedCategory = await createAlterEgoCategory(userId, newCategory.name)
      if (savedCategory) {
        setCategories([...categories, savedCategory])
      }
    } catch (error) {
      console.error('Error adding category:', error)
    }
  }

  const handleCategoryDeleted = (categoryId: string) => {
    setCategories(categories.filter(cat => cat.id !== categoryId))
    if (activeCategory === categoryId) {
      setActiveCategory("all")
    }
  }

  const handleCategoriesReordered = async (reorderedCategories: AlterEgoCategory[]) => {
    if (!userId) return
    setCategories(reorderedCategories)
    
    try {
      await updateAlterEgoCategoryPositions(
        userId,
        reorderedCategories.map((cat, index) => ({
          id: cat.id,
          position: index
        }))
      )
    } catch (error) {
      console.error('Error updating category positions:', error)
    }
  }

  const filteredAlterEgos = alterEgos.filter(ego => 
    activeCategory === "all" || 
    ego.categories.some(category => category.id === activeCategory)
  )

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="h-12 w-full bg-gray-200 rounded mb-8 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-10 text-muted-foreground">
          Please sign in to manage your alter egos.
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">Alter Egos</h1>
          <HelperText title="Meet Your Alter Egos" content="Create and manage different alter egos to organize your tasks and goals." />
        </div>
        <Button onClick={() => setIsAddingAlterEgo(true)} className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4" />
          Add Alter Ego
        </Button>
      </div>

      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        userId={userId}
        onCategoryChange={setActiveCategory}
        onCategoryAdded={handleCategoryAdded}
        onCategoryDeleted={handleCategoryDeleted}
        onCategoriesReordered={handleCategoriesReordered}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {filteredAlterEgos.map((alterEgo) => (
          <AlterEgoCard
            key={alterEgo.id}
            alterEgo={alterEgo}
            onDelete={handleDeleteAlterEgo}
            onUpdate={handleUpdateAlterEgo}
          />
        ))}
        {filteredAlterEgos.length === 0 && (
          <div className="col-span-full text-center py-10 text-muted-foreground">
            No alter egos in this category. Add one to get started.
          </div>
        )}
      </div>

      <Dialog open={isAddingAlterEgo} onOpenChange={setIsAddingAlterEgo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Alter Ego</DialogTitle>
          </DialogHeader>
          <AlterEgoForm
            onSubmit={(newAlterEgo) => {
              handleAddAlterEgo(newAlterEgo)
              setIsAddingAlterEgo(false)
            }}
            categories={categories}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
