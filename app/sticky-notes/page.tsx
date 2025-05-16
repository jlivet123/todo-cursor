"use client"

import { useState, useEffect, useRef } from "react"
import { v4 as uuidv4 } from "uuid"
import { StickyNote, STICKY_NOTE_TYPE } from "@/components/sticky-note"
import { AddStickyNote } from "@/components/add-sticky-note"
import { getStickyNotes, saveStickyNotes, type StickyNote as StickyNoteType } from "@/lib/storage"
import { PlusCircle, GripHorizontal, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DndProvider, useDrop, useDrag } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { cn } from "@/lib/utils"
import { NavigationSidebar } from '@/components/navigation-sidebar'

// Define the drag item type for categories
const CATEGORY_TYPE = "category-tab"

// Category Tab Component with Drag and Drop
function CategoryTab({
  category,
  isActive,
  onClick,
  onDrop,
  index,
  moveCategory,
  onRename,
}: {
  category: string
  isActive: boolean
  onClick: () => void
  onDrop: (noteId: string, category: string) => void
  index: number
  moveCategory: (dragIndex: number, hoverIndex: number) => void
  onRename: (oldName: string, newName: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  // For sticky note drops
  const [{ isOver }, noteDrop] = useDrop({
    accept: STICKY_NOTE_TYPE,
    drop: (item: { id: string }) => {
      onDrop(item.id, category)
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  })

  // For category drag
  const [{ isDragging }, categoryDrag] = useDrag({
    type: CATEGORY_TYPE,
    item: { index, category },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    canDrag: category !== "All", // Prevent "All" from being dragged
  })

  // For category drops
  const [, categoryDrop] = useDrop({
    accept: CATEGORY_TYPE,
    hover: (item: { index: number; category: string }) => {
      if (!ref.current) return

      const dragIndex = item.index
      const hoverIndex = index

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) return

      // Don't allow moving the "All" category
      if (item.category === "All" || category === "All") return

      // Call the move function
      moveCategory(dragIndex, hoverIndex)

      // Update the index for the dragged item
      item.index = hoverIndex
    },
    canDrop: () => category !== "All", // Prevent dropping on "All" category
  })

  // Apply refs after render
  useEffect(() => {
    if (!ref.current) return

    // Apply the note drop ref
    noteDrop(ref.current)

    // Only apply category drag and drop for non-"All" categories
    if (category !== "All") {
      categoryDrag(ref.current)
      categoryDrop(ref.current)
    }
  }, [category, noteDrop, categoryDrag, categoryDrop])

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(category);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (category !== "All") {
      e.stopPropagation();
      setIsEditing(true);
      setEditedName(category);
    }
  };

  const handleRename = () => {
    if (editedName.trim() && editedName !== category) {
      onRename(category, editedName.trim());
    }
    setIsEditing(false);
  };

  // Focus the input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <div
      ref={ref}
      onDoubleClick={handleDoubleClick}
      onClick={isEditing ? undefined : onClick}
      className={cn(
        "px-4 py-2 rounded-md transition-colors relative flex items-center gap-2",
        isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted",
        isOver && "ring-2 ring-blue-500",
        isDragging && "opacity-50",
        category !== "All" ? "cursor-move" : "cursor-pointer",
        isEditing && "cursor-text"
      )}
    >
      {category !== "All" && !isEditing && <GripHorizontal className="h-4 w-4 text-muted-foreground" />}
      {isEditing ? (
        <div className="flex items-center w-full">
          <input
            ref={inputRef}
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") setIsEditing(false);
            }}
            className="bg-transparent border-none focus:outline-none focus:ring-0 p-0 w-full"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : (
        <span className="flex-1">{category}</span>
      )}
      {!isEditing && category !== "All" && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="h-4 w-4 text-muted-foreground hover:text-foreground"
          >
            <Edit className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}

export default function NotepadPage() {
  const [notes, setNotes] = useState<StickyNoteType[]>([])
  const [categories, setCategories] = useState<string[]>(["All", "Work", "Personal", "Ideas"])
  const [activeCategory, setActiveCategory] = useState("All")
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isAddingNote, setIsAddingNote] = useState(false)

  // Load notes and categories from localStorage
  useEffect(() => {
    const savedNotes = getStickyNotes()

    // If notes don't have categories yet, add default category
    const updatedNotes = savedNotes.map((note) => ({
      ...note,
      category: note.category || "All",
    }))

    setNotes(updatedNotes)
    saveStickyNotes(updatedNotes)

    // Extract unique categories from notes
    const noteCategories = [...new Set(updatedNotes.map((note) => note.category))]

    // Load saved category order if available
    const savedCategories = localStorage.getItem("notepad_categories")
    if (savedCategories) {
      try {
        const parsedCategories = JSON.parse(savedCategories)
        // Make sure "All" is always first
        if (parsedCategories[0] !== "All") {
          parsedCategories.sort((a: string, b: string) => {
            if (a === "All") return -1
            if (b === "All") return 1
            return 0
          })
        }
        setCategories(parsedCategories)
      } catch (e) {
        // If there's an error parsing, use default with extracted categories
        const allCategories = ["All", ...noteCategories.filter((cat) => cat !== "All")]
        setCategories(allCategories)
      }
    } else if (noteCategories.length > 0) {
      // If no saved order but we have categories from notes
      const allCategories = ["All", ...noteCategories.filter((cat) => cat !== "All")]
      setCategories(allCategories)
    }
  }, [])

  // Save category order when it changes
  useEffect(() => {
    localStorage.setItem("notepad_categories", JSON.stringify(categories))
  }, [categories])

  const addNote = (content: string, color: string, category: string) => {
    const newNote: StickyNoteType = {
      id: uuidv4(),
      content,
      color,
      createdAt: new Date().toISOString(),
      category: category || activeCategory,
    }

    // Update state with the new note
    const updatedNotes = [...notes, newNote]
    setNotes(updatedNotes)

    // Save to localStorage
    saveStickyNotes(updatedNotes)

    // Close the add note form
    setIsAddingNote(false)
  }

  const updateNote = (id: string, content: string, category?: string) => {
    // Find the note to update
    const noteIndex = notes.findIndex((note) => note.id === id)

    if (noteIndex === -1) {
      console.error(`Note with ID ${id} not found`)
      return
    }

    // Create a copy of the notes array
    const updatedNotes = [...notes]

    // Get the current note
    const currentNote = updatedNotes[noteIndex]

    // Update the specific note - IMPORTANT: preserve the existing category if not explicitly changed
    updatedNotes[noteIndex] = {
      ...currentNote,
      content,
      // Only update category if explicitly provided, otherwise keep the existing one
      category: category || currentNote.category,
    }

    // Update state
    setNotes(updatedNotes)

    // Save to localStorage
    saveStickyNotes(updatedNotes)

    console.log(`Updated note ${id}:`, updatedNotes[noteIndex])
  }

  const deleteNote = (id: string) => {
    // Filter out the note to delete
    const updatedNotes = notes.filter((note) => note.id !== id)

    // Update state
    setNotes(updatedNotes)

    // Save to localStorage
    saveStickyNotes(updatedNotes)
  }

  const addCategory = () => {
    if (newCategoryName.trim() && !categories.includes(newCategoryName.trim())) {
      const updatedCategories = [...categories, newCategoryName.trim()]
      setCategories(updatedCategories)
      setNewCategoryName("")
      setIsAddingCategory(false)
      setActiveCategory(newCategoryName.trim())
    }
  }

  // Handle dropping a note into a category
  const handleCategoryChange = (noteId: string, newCategory: string) => {
    // Find the note to update
    const noteIndex = notes.findIndex((note) => note.id === noteId)

    if (noteIndex === -1) {
      console.error(`Note with ID ${noteId} not found`)
      return
    }

    // Don't do anything if dropping into the same category
    if (notes[noteIndex].category === newCategory) {
      return
    }

    // Create a copy of the notes array
    const updatedNotes = [...notes]

    // Update the category of the specific note
    updatedNotes[noteIndex] = {
      ...updatedNotes[noteIndex],
      category: newCategory,
    }

    // Update state
    setNotes(updatedNotes)

    // Save to localStorage
    saveStickyNotes(updatedNotes)

    // Switch to the target category to see the moved note
    setActiveCategory(newCategory)
  }

  // Rename category function
  const renameCategory = (oldName: string, newName: string) => {
    // Don't allow renaming the "All" category
    if (oldName === "All" || newName === "All") {
      return
    }

    // Don't rename if the new name already exists or is empty
    if (newName.trim() === "" || categories.includes(newName)) {
      return
    }

    // Update category name in the categories array
    const updatedCategories = categories.map(cat => 
      cat === oldName ? newName : cat
    );
    
    // Update all notes that use this category
    const updatedNotes = notes.map(note => 
      note.category === oldName ? { ...note, category: newName } : note
    );

    // Update state
    setCategories(updatedCategories);
    setNotes(updatedNotes);
    
    // If the active category was renamed, update it too
    if (activeCategory === oldName) {
      setActiveCategory(newName);
    }

    // Save to localStorage
    saveStickyNotes(updatedNotes);
  };

  // Move category function for drag and drop reordering
  const moveCategory = (dragIndex: number, hoverIndex: number) => {
    // Don't allow moving the "All" category (which should always be at index 0)
    if (dragIndex === 0 || hoverIndex === 0) {
      return
    }

    // Create a new array with the updated order
    const updatedCategories = [...categories]
    const draggedCategory = updatedCategories[dragIndex]

    // Remove the dragged category
    updatedCategories.splice(dragIndex, 1)

    // Insert it at the new position
    updatedCategories.splice(hoverIndex, 0, draggedCategory)

    // Update state
    setCategories(updatedCategories)
  }

  // Filter notes based on active category
  const filteredNotes = activeCategory === "All" ? notes : notes.filter((note) => note.category === activeCategory)

  return (
    <div className="flex">
      <NavigationSidebar />
      <div className="flex-1">
        <DndProvider backend={HTML5Backend}>
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="container mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Sticky Notes</h1>
                <Button onClick={() => setIsAddingNote(true)} className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Add Note
                </Button>
              </div>

              <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                {categories.map((category, index) => (
                  <CategoryTab
                    key={category}
                    category={category}
                    isActive={activeCategory === category}
                    onClick={() => setActiveCategory(category)}
                    onDrop={handleCategoryChange}
                    index={index}
                    moveCategory={moveCategory}
                    onRename={renameCategory}
                  />
                ))}
                <Button variant="outline" size="sm" onClick={() => setIsAddingCategory(true)}>
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Add Category
                </Button>
              </div>

              {/* Add Note Dialog */}
              {isAddingNote && (
                <div className="mb-6">
                  <AddStickyNote
                    onAdd={addNote}
                    categories={categories}
                    currentCategory={activeCategory}
                    onCancel={() => setIsAddingNote(false)}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredNotes.map((note) => (
                  <StickyNote
                    key={note.id}
                    note={note}
                    onDelete={deleteNote}
                    onUpdate={updateNote}
                    onCategoryChange={handleCategoryChange}
                  />
                ))}
                {filteredNotes.length === 0 && (
                  <div className="col-span-full text-center py-10 text-muted-foreground">
                    No notes in this category. Add a note or drag one here.
                  </div>
                )}
              </div>
            </div>

            {/* Dialog for adding new category */}
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
                  <Button onClick={addCategory}>Add Category</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </DndProvider>
      </div>
    </div>
  )
} 