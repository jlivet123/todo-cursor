"use client"

import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { X, Edit, Check, Tag } from "lucide-react"
import type { StickyNote as StickyNoteType } from "@/lib/storage"
import { cn } from "@/lib/utils"

interface StickyNoteProps {
  note: StickyNoteType
  onDelete: (id: string) => void
  onUpdate: (id: string, content: string, category?: string) => void
  onCategoryChange: (id: string, newCategory: string) => void
}

export function SimplifiedStickyNote({ note, onDelete, onUpdate, onCategoryChange }: StickyNoteProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(note.content)

  const handleEdit = () => {
    setEditedContent(note.content)
    setIsEditing(true)
  }

  const handleSave = () => {
    if (editedContent.trim() !== "") {
      onUpdate(note.id, editedContent, note.category)
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setEditedContent(note.content)
    setIsEditing(false)
  }

  const getRandomRotation = () => {
    const seed = note.id.charCodeAt(0) + note.id.charCodeAt(note.id.length - 1)
    return (seed % 6) - 3
  }

  return (
    <div
      className={cn(
        "group relative flex flex-col p-3 rounded-md shadow-md min-h-[160px] transition-all duration-200 hover:shadow-lg",
        "text-white"
      )}
      style={{
        backgroundColor: note.color,
        transform: `rotate(${getRandomRotation()}deg)`,
      }}
    >
      <div className="absolute top-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isEditing ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 rounded-full bg-white/20 hover:bg-white/40"
            onClick={(e) => {
              e.stopPropagation()
              handleEdit()
            }}
          >
            <Edit className="h-3 w-3" />
            <span className="sr-only">Edit</span>
          </Button>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 rounded-full bg-white/20 hover:bg-white/40"
              onClick={(e) => {
                e.stopPropagation()
                handleSave()
              }}
            >
              <Check className="h-3 w-3" />
              <span className="sr-only">Save</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 rounded-full bg-white/20 hover:bg-white/40"
              onClick={(e) => {
                e.stopPropagation()
                handleCancel()
              }}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Cancel</span>
            </Button>
          </>
        )}
        {!isEditing && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 rounded-full bg-white/20 hover:bg-white/40"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(note.id)
            }}
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Delete</span>
          </Button>
        )}
      </div>

      {isEditing ? (
        <Textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className="flex-1 resize-none border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-sm mt-4"
          placeholder="Write your note here..."
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="flex-1 whitespace-pre-wrap break-words text-sm mt-4">{note.content}</div>
      )}

      <div className="flex justify-between items-end mt-2 text-xs">
        <div className="opacity-70">
          {note.createdAt ? new Date(note.createdAt).toLocaleDateString() : 'No date'}
        </div>
        {note.category && note.category !== "All" && (
          <div className="flex items-center bg-white/20 rounded px-1.5 py-0.5">
            <Tag className="h-3 w-3 mr-1" />
            <span>{typeof note.category === 'string' ? note.category : 'Uncategorized'}</span>
          </div>
        )}
      </div>
    </div>
  )
}
