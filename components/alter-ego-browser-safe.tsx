'use client'

import { useEffect, useState } from 'react'
import { AlterEgoCard } from '@/components/alter-ego-card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlterEgoForm } from '@/components/alter-ego-form'
import { PlusCircle } from 'lucide-react'
import { CategoryTabs } from '@/components/category-tabs'
import { MOCK_USER_ID } from '@/lib/alter-ego-storage'
import { getFromLocalStorage, setToLocalStorage } from '@/lib/hooks/use-local-storage'
import type { AlterEgoCategory, AlterEgoWithCategories } from '@/lib/types'
import { HelperText } from '@/components/helper-text'
import { 
  getAlterEgos, 
  getCategories, 
  saveAlterEgo, 
  deleteAlterEgo,
  saveCategory,
  deleteCategory
} from '@/lib/alter-ego-storage'

export function AlterEgoBrowserSafe() {
  const [alterEgos, setAlterEgos] = useState<AlterEgoWithCategories[]>([])
  const [categories, setCategories] = useState<AlterEgoCategory[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [isAddingAlterEgo, setIsAddingAlterEgo] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load alter egos and categories from storage
    loadData()
  }, [])

  const loadData = () => {
    setIsLoading(true)
    try {
      const loadedAlterEgos = getAlterEgos()
      const loadedCategories = getCategories()

      setAlterEgos(loadedAlterEgos)
      setCategories(loadedCategories)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddAlterEgo = (newAlterEgo: AlterEgoWithCategories) => {
    setAlterEgos([...alterEgos, newAlterEgo])
    setIsAddingAlterEgo(false)
  }

  const handleDeleteAlterEgo = (id: string) => {
    deleteAlterEgo(id)
    setAlterEgos(alterEgos.filter((ego) => ego.id !== id))
  }

  const handleUpdateAlterEgo = (updatedAlterEgo: AlterEgoWithCategories) => {
    // Update in storage
    saveAlterEgo(
      {
        id: updatedAlterEgo.id,
        name: updatedAlterEgo.name,
        description: updatedAlterEgo.description,
        image_url: updatedAlterEgo.image_url,
        created_at: updatedAlterEgo.created_at,
        user_id: updatedAlterEgo.user_id,
        superpower: updatedAlterEgo.superpower || null,
        bio: updatedAlterEgo.bio || null,
        quote: updatedAlterEgo.quote || null,
        era: updatedAlterEgo.era || null,
        personality: updatedAlterEgo.personality || null,
        expertise: updatedAlterEgo.expertise || null,
        speaking_style: updatedAlterEgo.speaking_style || null,
        avatar_style: updatedAlterEgo.avatar_style || null,
        background: updatedAlterEgo.background || null,
        is_favorite: updatedAlterEgo.is_favorite || false
      },
      updatedAlterEgo.categories.map(c => c.id)
    )
    
    // Update in state
    setAlterEgos(
      alterEgos.map((ego) => 
        ego.id === updatedAlterEgo.id ? updatedAlterEgo : ego
      )
    )
  }

  const handleAddCategory = (newCategory: AlterEgoCategory) => {
    saveCategory(newCategory)
    setCategories([...categories, newCategory])
  }

  const handleDeleteCategory = (categoryId: string) => {
    deleteCategory(categoryId)
    setCategories(categories.filter((category) => category.id !== categoryId))
  }

  const handleCategoriesReordered = (reorderedCategories: AlterEgoCategory[]) => {
    // Update in state
    setCategories(reorderedCategories)
    
    // Update in storage
    reorderedCategories.forEach((category, index) => {
      if (category.position !== index) {
        const updatedCategory = { ...category, position: index }
        saveCategory(updatedCategory)
      }
    })
  }

  const filteredAlterEgos = activeCategory === 'all'
    ? alterEgos
    : alterEgos.filter((ego) => 
        ego.categories.some((category) => category.id === activeCategory)
      )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alter Egos</h1>
          <p className="text-muted-foreground">
            Customize and chat with different personalities
          </p>
        </div>
        <Button 
          onClick={() => setIsAddingAlterEgo(true)} 
          className="flex items-center gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Add Alter Ego</span>
        </Button>
      </div>

      {categories.length > 0 && (
        <div className="mb-8">
          <CategoryTabs
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            onCategoryAdded={handleAddCategory}
            onCategoryDeleted={handleDeleteCategory}
            onCategoriesReordered={handleCategoriesReordered}
          />
        </div>
      )}

      {filteredAlterEgos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAlterEgos.map((alterEgo) => (
            <AlterEgoCard
              key={alterEgo.id}
              alterEgo={alterEgo}
              onDelete={handleDeleteAlterEgo}
              onUpdate={handleUpdateAlterEgo}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <HelperText
            title="No alter egos yet"
            content={
              activeCategory === 'all'
                ? "Create your first alter ego to start chatting!"
                : "No alter egos in this category yet."
            }
          />
        </div>
      )}

      <Dialog open={isAddingAlterEgo} onOpenChange={setIsAddingAlterEgo}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Alter Ego</DialogTitle>
          </DialogHeader>
          <AlterEgoForm 
            onSave={handleAddAlterEgo} 
            initialCategoryId={activeCategory !== 'all' ? activeCategory : undefined}
            onCancel={() => setIsAddingAlterEgo(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
