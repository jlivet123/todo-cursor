"use client"

import { useState, useEffect, useCallback } from "react"
import { SimplifiedStickyNote } from "@/components/simplified-sticky-note"
import { AddStickyNote } from "@/components/add-sticky-note"
import { 
  getStickyNotes, 
  saveStickyNote, 
  deleteStickyNote, 
  getCurrentUserId,
  getStickyNoteCategories,
  StickyNote as StickyNoteType,
  StickyNoteBase,
  StickyNoteCategory,
  ensureUserHasCategories
} from "@/lib/storage"
import { PlusCircle, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NavigationSidebar } from '@/components/navigation-sidebar'
import { useAuthStatus } from "@/lib/auth-context"

export default function StickyNotesPage() {
  const [notes, setNotes] = useState<StickyNoteType[]>([]);
  const [categories, setCategories] = useState<StickyNoteCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userId, isAuthenticated } = useAuthStatus();

  // Load notes and ensure categories exist
  const loadData = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setError('You need to be logged in to view sticky notes');
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Ensure user has categories
      await ensureUserHasCategories(userId);
      
      // Load categories
      const fetchedCategories = await getStickyNoteCategories(userId);
      setCategories(fetchedCategories);
      
      // Set default selected category
      if (fetchedCategories.length > 0) {
        const allCategory = fetchedCategories.find(cat => cat.name === 'All');
        setSelectedCategory(allCategory ? allCategory.id : fetchedCategories[0].id);
      }
      
      // Load notes
      const fetchedNotes = await getStickyNotes(userId);
      setNotes(fetchedNotes);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load sticky notes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, userId]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddNoteClick = () => {
    setIsAddingNote(true);
  };

  const handleAddNote = async (content: string, color: string, categoryId: string) => {
    if (!isAuthenticated || !userId) {
      console.error('Cannot add note: User not authenticated');
      return;
    }
    
    // Find the category to get its name
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) {
      console.error('Selected category not found');
      return;
    }
    
    try {
      const now = new Date().toISOString()
      const newNote: Omit<StickyNoteBase, 'id'> = {
        user_id: userId,
        content,
        color,
        category_id: categoryId,
        position_x: 0,
        position_y: 0,
        width: 200,
        height: 200,
        z_index: 0,
        is_archived: false,
        created_at: now,
        updated_at: now
      }

      // Pass the userId explicitly
      const savedNote = await saveStickyNote(newNote, userId);
      if (savedNote) {
        setNotes(prevNotes => [...prevNotes, savedNote])
      }
      setIsAddingNote(false)
    } catch (error) {
      console.error('Error adding note:', error)
    }
  }

  const handleDeleteNote = async (id: string) => {
    if (!isAuthenticated || !userId) {
      console.error('Cannot delete note: User not authenticated');
      return false;
    }
    try {
      // Get the current user ID
      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        console.error('User not authenticated');
        return;
      }
      
      const success = await deleteStickyNote(id, currentUserId);
      if (success) {
        setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  }

  const handleUpdateNote = async (id: string, content: string, category?: string) => {
    if (!isAuthenticated || !userId) {
      console.error('Cannot update note: User not authenticated');
      return;
    }
    try {
      const noteToUpdate = notes.find(note => note.id === id);
      if (!noteToUpdate) return;
      
      const updates = {
        ...noteToUpdate,
        content,
        category: category || noteToUpdate.category,
        updated_at: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Pass the userId explicitly
      const updatedNote = await saveStickyNote(updates, userId);
      if (updatedNote) {
        setNotes(prevNotes => 
          prevNotes.map(note => note.id === id ? { ...note, ...updatedNote } : note)
        );
      }
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const handleCategoryChange = (id: string, newCategory: string) => {
    handleUpdateNote(id, notes.find(note => note.id === id)?.content || '', newCategory);
  };

  return (
    <div className="flex h-screen">
      <NavigationSidebar />
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Sticky Notes</h1>
          <Button 
            onClick={handleAddNoteClick} 
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Note</span>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={loadData} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                <span>Try Again</span>
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Category Tabs */}
            {categories.length > 0 && (
              <div className="mt-4 mb-6">
                <div className="flex space-x-2 overflow-x-auto pb-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        selectedCategory === category.id 
                          ? 'text-primary-foreground' 
                          : 'bg-secondary hover:bg-secondary/80'
                      }`}
                      style={{
                        backgroundColor: selectedCategory === category.id ? category.color : undefined,
                        color: selectedCategory === category.id ? '#000' : undefined
                      }}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {notes.length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <p className="mb-4">No notes found</p>
                  <Button onClick={() => setIsAddingNote(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create your first note
                  </Button>
                </div>
              ) : (
                notes
                  .filter(note => 
                    !selectedCategory || 
                    selectedCategory === 'All' || 
                    note.category_id === selectedCategory
                  )
                  .map((note) => (
                    <SimplifiedStickyNote
                      key={note.id}
                      note={note}
                      onDelete={handleDeleteNote}
                      onUpdate={handleUpdateNote}
                      onCategoryChange={(id, newCategory) => {
                        handleUpdateNote(id, note.content, newCategory);
                      }}
                    />
                  ))
              )}
            </div>
          </>
        )}
      </div>
      
      {/* Add Note Modal */}
      <AddStickyNote
        open={isAddingNote}
        onOpenChange={setIsAddingNote}
        onAddNote={handleAddNote}
        categories={categories}
        defaultCategoryId={selectedCategory || undefined}
      />
    </div>
  );
}
