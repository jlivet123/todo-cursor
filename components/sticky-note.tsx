"use client"

import { useState, useRef } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { X, Edit, Check, Tag, GripVertical } from "lucide-react"
import type { StickyNote as StickyNoteType } from "@/lib/storage"
import { cn } from "@/lib/utils"
import { useDrag } from "react-dnd"

interface StickyNoteProps {
  note: StickyNoteType
  onDelete: (id: string) => void
  onUpdate: (id: string, content: string, category?: string) => void
  onCategoryChange: (id: string, newCategory: string) => void
}

// Define the drag item type
export const STICKY_NOTE_TYPE = "sticky-note"

export function StickyNote({ note, onDelete, onUpdate, onCategoryChange }: StickyNoteProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(note.content)
  const noteRef = useRef<HTMLDivElement>(null)

  const handleEdit = () => {
    // Set the current content as the edited content
    setEditedContent(note.content)
    setIsEditing(true)
  }

  const handleSave = () => {
    if (editedContent.trim() !== "") {
      // Call the parent's update function with the new content
      // IMPORTANT: Pass the current category to ensure it's preserved
      onUpdate(note.id, editedContent, note.category)
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    // Reset to original content and exit edit mode
    setEditedContent(note.content)
    setIsEditing(false)
  }

  const getRandomRotation = () => {
    // Use the note id to generate a consistent rotation
    const seed = note.id.charCodeAt(0) + note.id.charCodeAt(note.id.length - 1)
    return (seed % 6) - 3 // Between -3 and 3 degrees for subtler rotation
  }

  // Set up drag functionality
  const [{ isDragging }, drag] = useDrag({
    type: STICKY_NOTE_TYPE,
    item: { id: note.id, category: note.category },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  })

  // Apply the drag ref to the note element
  drag(noteRef)

  return (
    <div
      ref={noteRef}
      className={cn(
        "group relative flex flex-col p-3 rounded-md shadow-md min-h-[160px] transition-all duration-200 hover:shadow-lg",
        "text-white",
        isDragging && "opacity-50",
        isEditing ? "cursor-default" : "cursor-move",
      )}
      style={{
        backgroundColor: note.color,
        transform: isDragging ? "rotate(0deg)" : `rotate(${getRandomRotation()}deg)`,
      }}
    >
      {/* Drag handle */}
      {!isEditing && (
        <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4 text-white/70" />
        </div>
      )}

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
        <div className="opacity-70">{new Date(note.createdAt).toLocaleDateString()}</div>
        {/* Category indicator */}
        {note.category && note.category !== "All" && (
          <div className="flex items-center bg-white/20 rounded px-1.5 py-0.5">
            <Tag className="h-3 w-3 mr-1" />
            <span>{note.category}</span>
          </div>
        )}
      </div>
    </div>
  )
}
