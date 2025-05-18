"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { v4 as uuidv4 } from "uuid"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { saveAlterEgo, getCategories } from "@/lib/alter-ego-storage"
import type { AlterEgoWithCategories, AlterEgoCategory, AlterEgoFormData } from "@/lib/types"
import { Upload, X } from "lucide-react"

interface AlterEgoFormProps {
  onSave: (alterEgo: AlterEgoWithCategories) => void
  alterEgo?: AlterEgoWithCategories
  initialCategoryId?: string
}

// Mock user ID for local storage (will be replaced with actual user ID in production)
const MOCK_USER_ID = "local-user-id"

export function AlterEgoForm({ onSave, alterEgo, initialCategoryId }: AlterEgoFormProps) {
  const [formData, setFormData] = useState<AlterEgoFormData>({
    name: alterEgo?.name || "",
    description: alterEgo?.description || null,
    superpower: alterEgo?.superpower || null,
    bio: alterEgo?.bio || null,
    image_url: alterEgo?.image_url || null,
    quote: alterEgo?.quote || null,
    era: alterEgo?.era || null,
    achievements: alterEgo?.achievements || null,
    challenges_overcome: alterEgo?.challenges_overcome || null,
    values: alterEgo?.values || null,
    learning_resources: alterEgo?.learning_resources || null,
    voice_style: alterEgo?.voice_style || null,
    context_settings: alterEgo?.context_settings || null,
    category_ids: alterEgo?.categories.map((c) => c.id) || (initialCategoryId ? [initialCategoryId] : []),
  })

  const [categories, setCategories] = useState<AlterEgoCategory[]>([])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(alterEgo?.image_url || null)

  // Load categories
  useEffect(() => {
    const loadedCategories = getCategories()
    setCategories(loadedCategories.filter((cat) => cat.id !== "all"))
  }, [])

  const handleInputChange = (field: keyof AlterEgoFormData, value: string | null) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setImageFile(file)

      // Create a preview URL
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setImagePreview(event.target.result as string)
          handleInputChange("image_url", event.target.result as string)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCategoryToggle = (categoryId: string) => {
    setFormData((prev) => {
      const categoryIds = prev.category_ids || []
      return {
        ...prev,
        category_ids: categoryIds.includes(categoryId)
          ? categoryIds.filter((id) => id !== categoryId)
          : [...categoryIds, categoryId],
      }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // In a real app, you would upload the image to a storage service
    // and get back a URL. For now, we'll just use the preview URL.
    const finalImageUrl = imagePreview || formData.image_url

    const newAlterEgo: AlterEgoWithCategories = {
      id: alterEgo?.id || uuidv4(),
      name: formData.name,
      description: formData.description,
      superpower: formData.superpower,
      bio: formData.bio,
      image_url: finalImageUrl,
      quote: formData.quote,
      era: formData.era,
      achievements: formData.achievements,
      challenges_overcome: formData.challenges_overcome,
      values: formData.values,
      learning_resources: formData.learning_resources,
      voice_style: formData.voice_style,
      context_settings: formData.context_settings,
      created_at: alterEgo?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: alterEgo?.user_id || MOCK_USER_ID,
      categories: formData.category_ids.map((id) => {
        const category = categories.find((c) => c.id === id)
        return (
          category || {
            id,
            name: `Category ${id}`,
            description: null,
            position: 0, // Default position
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            user_id: alterEgo?.user_id || MOCK_USER_ID,
          }
        )
      }),
    }

    // Save to storage
    saveAlterEgo(newAlterEgo, formData.category_ids)

    // Call the onSave callback
    onSave(newAlterEgo)
  }

  const clearImagePreview = () => {
    setImagePreview(null)
    setImageFile(null)
    handleInputChange("image_url", null)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="e.g., Nelson Mandela"
              required
            />
          </div>

          <div>
            <Label htmlFor="superpower">Superpower</Label>
            <Input
              id="superpower"
              value={formData.superpower || ""}
              onChange={(e) => handleInputChange("superpower", e.target.value)}
              placeholder="e.g., Resilience and Forgiveness"
            />
          </div>

          <div>
            <Label htmlFor="era">Era</Label>
            <Input
              id="era"
              value={formData.era || ""}
              onChange={(e) => handleInputChange("era", e.target.value)}
              placeholder="e.g., 20th Century"
            />
          </div>

          <div>
            <Label htmlFor="description">Short Description</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Brief description of who they are"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="values">Core Values</Label>
            <Textarea
              id="values"
              value={formData.values || ""}
              onChange={(e) => handleInputChange("values", e.target.value)}
              placeholder="What principles guided their life?"
              rows={2}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Image</Label>
            <div className="mt-1 flex items-center space-x-4">
              <div className="relative h-32 w-32 border rounded-md overflow-hidden bg-muted flex items-center justify-center">
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview || "/placeholder.svg"}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={clearImagePreview}
                      className="absolute top-1 right-1 bg-black/50 rounded-full p-1 text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <Label htmlFor="image-upload" className="cursor-pointer">
                  <div className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium">
                    Upload Image
                  </div>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </Label>
                <p className="text-xs text-muted-foreground mt-1">Upload a photo of this alter ego</p>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="bio">Biography</Label>
            <Textarea
              id="bio"
              value={formData.bio || ""}
              onChange={(e) => handleInputChange("bio", e.target.value)}
              placeholder="Detailed biography"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="achievements">Key Achievements</Label>
            <Textarea
              id="achievements"
              value={formData.achievements || ""}
              onChange={(e) => handleInputChange("achievements", e.target.value)}
              placeholder="Major accomplishments in their life"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="challenges_overcome">Challenges Overcome</Label>
            <Textarea
              id="challenges_overcome"
              value={formData.challenges_overcome || ""}
              onChange={(e) => handleInputChange("challenges_overcome", e.target.value)}
              placeholder="Major obstacles they faced and overcame"
              rows={2}
            />
          </div>
        </div>
      </div>

      <div>
        <Label>Categories</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center space-x-2">
              <Checkbox
                id={`category-${category.id}`}
                checked={formData.category_ids.includes(category.id)}
                onCheckedChange={() => handleCategoryToggle(category.id)}
              />
              <Label htmlFor={`category-${category.id}`} className="cursor-pointer">
                {category.name}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="submit">{alterEgo ? "Update" : "Create"} Alter Ego</Button>
      </div>
    </form>
  )
}
