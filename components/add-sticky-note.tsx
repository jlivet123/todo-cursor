"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { X, Check, ChevronDown } from "lucide-react"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"

interface AddStickyNoteProps {
  onAdd: (content: string, color: string, category: string) => void
  categories: string[]
  currentCategory: string
  onCancel?: () => void
}

// Darker color palette for better contrast with white text
const COLORS = [
  "#5c4d10", // Dark Yellow
  "#6b3030", // Dark Red
  "#2c4c7c", // Dark Blue
  "#2d5d3a", // Dark Green
  "#4a3670", // Dark Purple
]

export function AddStickyNote({ onAdd, categories, currentCategory, onCancel }: AddStickyNoteProps) {
  const [content, setContent] = useState("")
  const [selectedColor, setSelectedColor] = useState(COLORS[2]) // Default to blue
  const [category, setCategory] = useState(currentCategory)

  const handleAdd = () => {
    if (content.trim()) {
      onAdd(content, selectedColor, category)
      setContent("")
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
  }

  return (
    <div
      className="flex flex-col p-3 rounded-md shadow-md min-h-[160px] border border-dashed text-white w-full"
      style={{ backgroundColor: selectedColor }}
    >
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex-1 resize-none border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 min-h-[80px] text-sm"
        placeholder="Write your note here..."
        autoFocus
      />

      <div className="mt-3 flex justify-between items-center">
        <div className="flex space-x-2">
          {COLORS.map((color) => (
            <button
              key={color}
              className="w-5 h-5 rounded-full border-2 transition-all"
              style={{
                backgroundColor: color,
                borderColor: selectedColor === color ? "white" : "transparent",
              }}
              onClick={() => setSelectedColor(color)}
              aria-label={`Select ${color} color`}
            />
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-1"
              >
                {category}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {categories.map((cat) => (
                <DropdownMenuItem
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={cat === category ? "bg-muted" : ""}
                >
                  {cat}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleAdd} className="bg-white/20 hover:bg-white/30 text-white">
            <Check className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </div>
    </div>
  )
}
