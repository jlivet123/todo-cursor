"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { AlterEgoCard } from "@/components/alter-ego-card"
import { CategoryTabs } from "@/components/category-tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlterEgoForm } from "@/components/alter-ego-form"
import { getAlterEgos } from "@/lib/alter-ego-storage"
import type { AlterEgo, AlterEgoCategory, AlterEgoWithCategories } from "@/lib/types"
import { HelperText } from "@/components/helper-text"
import { MOCK_USER } from "@/lib/storage"
import { 
  ensureDefaultAlterEgoCategories,
  fetchAlterEgoCategories,
  createAlterEgoCategory,
  updateAlterEgoCategoryPositions,
  deleteAlterEgoCategory
} from "@/lib/database/alterEgoCategories"

export default function AlterEgosPage() {
  const [alterEgos, setAlterEgos] = useState<AlterEgoWithCategories[]>([])
  const [categories, setCategories] = useState<AlterEgoCategory[]>([])
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [isAddingAlterEgo, setIsAddingAlterEgo] = useState(false)

  // Get the current user ID (using mock user for now)
  const userId = MOCK_USER.id

  useEffect(() => {
    if (!userId) return

    const loadData = async () => {
      try {
        // 1. Ensure default categories exist in DB
        await ensureDefaultAlterEgoCategories(userId)
        // 2. Fetch categories from Supabase
        const categoriesFromDB = await fetchAlterEgoCategories(userId)
        setCategories(categoriesFromDB)
        // 3. Load alter egos from local storage for now
        const loadedAlterEgos = getAlterEgos()
        setAlterEgos(loadedAlterEgos)
      } catch (error) {
        console.error('Error loading alter ego data:', error)
      }
    }

    loadData()
  }, [userId])

  const handleAddAlterEgo = (newAlterEgo: AlterEgoWithCategories) => {
    setAlterEgos([...alterEgos, newAlterEgo])
    setIsAddingAlterEgo(false)
  }

  const handleDeleteAlterEgo = (id: string) => {
    setAlterEgos(alterEgos.filter((ego) => ego.id !== id))
  }

  const handleUpdateAlterEgo = (updatedAlterEgo: AlterEgoWithCategories) => {
    setAlterEgos(alterEgos.map((ego) => (ego.id === updatedAlterEgo.id ? updatedAlterEgo : ego)))
  }

  const handleAddCategory = async (newCategory: AlterEgoCategory) => {
    try {
      const savedCategory = await createAlterEgoCategory(userId, newCategory.name)
      if (savedCategory) {
        setCategories([...categories, savedCategory])
      }
    } catch (error) {
      console.error('Error adding category:', error)
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const result = await deleteAlterEgoCategory(userId, categoryId)
      if (result.success) {
        setCategories(categories.filter((category) => category.id !== categoryId))
      } else if (result.error) {
        // TODO: Show error message to user
        console.error('Cannot delete category:', result.error)
      }
    } catch (error) {
      console.error('Error deleting category:', error)
    }
  }

  const handleCategoriesReordered = async (reorderedCategories: AlterEgoCategory[]) => {
    try {
      // Update UI immediately for responsiveness
      setCategories(reorderedCategories)
      // Then update in database
      await updateAlterEgoCategoryPositions(userId, reorderedCategories.map(c => c.id))
    } catch (error) {
      console.error('Error reordering categories:', error)
      // TODO: Revert UI state on error
    }
  }

  // Filter alter egos based on active category
  const filteredAlterEgos = alterEgos.filter((ego) => {
    if (activeCategory === "all") return true
    return ego.categories.some((category) => category.id === activeCategory)
  })

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">Alter Egos</h1>
            <HelperText title="Meet Your Alter Egos" content={<AlterEgosIntroduction />} />
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
          onCategoryAdded={handleAddCategory}
          onCategoryDeleted={handleDeleteCategory}
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
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Add New Alter Ego</DialogTitle>
            </DialogHeader>
            <AlterEgoForm
              onSave={(newAlterEgo) => {
                // Convert AlterEgo to AlterEgoWithCategories
                const selectedCategory = activeCategory !== "all" ? categories.find(c => c.id === activeCategory) : undefined
                handleAddAlterEgo({
                  ...newAlterEgo,
                  categories: selectedCategory ? [selectedCategory] : []
                })
              }}
              initialCategoryId={activeCategory !== "all" ? activeCategory : undefined}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}

function AlterEgosIntroduction() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Talk to Your Heroes & Mentors</h3>
        <p>
          Alter Egos lets you have meaningful conversations with the inspiring figures who have shaped our world.
          Whether it's Nelson Mandela's wisdom on courage, Einstein's thoughts on creativity, or Maya Angelou's
          perspective on resilience – connect with the minds that inspire you most.
        </p>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">How It Works</h3>
        <h4 className="font-medium mb-1">Create Your Personal Council of Wisdom</h4>
        <ul className="list-disc pl-5 space-y-1 mb-3">
          <li>Add Alter Egos – Choose from history's greatest leaders, thinkers, artists, and visionaries</li>
          <li>Personalize – Add details about why they inspire you and what wisdom you seek</li>
          <li>Organize – Group your alter egos into categories like Leadership, Creativity, or Resilience</li>
        </ul>

        <h4 className="font-medium mb-1">Have Real Conversations</h4>
        <p className="mb-3">
          Start meaningful dialogues with your alter egos. They'll respond with the distinctive voice, wisdom, and
          perspective of the actual historical figure:
        </p>
        <div className="bg-muted p-3 rounded-md mb-3 italic">
          <p className="mb-2">"Nelson, I'm struggling with fear. I have a hard time breaking through it."</p>
          <p>
            "My dear friend, fear is not something we escape—it is something we walk through with dignity. When I was in
            prison for 27 years, fear visited me often. But I learned that courage is not the absence of fear, but the
            triumph over it."
          </p>
        </div>

        <h4 className="font-medium mb-1">Your Personal Growth Journey</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Save conversations to revisit wisdom when you need it</li>
          <li>Build your collection of mentors for different areas of your life</li>
          <li>Access timeless guidance whenever you face challenges or need inspiration</li>
        </ul>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">Why Alter Egos?</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <span className="font-medium">Learn from the best</span> – Access centuries of human wisdom and experience
          </li>
          <li>
            <span className="font-medium">Personal development</span> – Gain new perspectives on your challenges
          </li>
          <li>
            <span className="font-medium">Inspiration on demand</span> – Connect with mentors who can guide you through
            difficult times
          </li>
          <li>
            <span className="font-medium">Fascinating conversations</span> – Explore ideas with history's greatest minds
          </li>
        </ul>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">Get Started</h3>
        <p>
          Add your first alter ego today and begin conversations that could change how you see the world. Who will you
          talk to first?
        </p>
        <p className="mt-2 font-medium">Alter Egos – Wisdom from history's greatest minds, just a conversation away.</p>
      </div>
    </div>
  )
}
