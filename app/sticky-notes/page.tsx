"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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
  
  // Calculate note counts per category
  const noteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    // Initialize all categories with 0
    categories.forEach(cat => {
      if (cat?.id) {
        counts[cat.id] = 0;
      }
    });
    
    // Count notes in each category
    notes.forEach(note => {
      if (note?.category_id && counts[note.category_id] !== undefined) {
        counts[note.category_id]++;
      }
    });
    
    console.log('Calculated note counts:', counts);
    return counts;
  }, [categories, notes]);

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
      
      // Load notes and include category names
      const fetchedNotes = await getStickyNotes(userId);
      
      // Map notes to include category names
      const notesWithCategoryNames = fetchedNotes.map(note => ({
        ...note,
        // Find the category and include its name, or use 'Uncategorized' as fallback
        category: categories.find(cat => cat.id === note.category_id)?.name || 'Uncategorized'
      }));
      
      setNotes(notesWithCategoryNames);
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
        // Include the category name in the saved note
        const savedNoteWithCategory = {
          ...savedNote,
          category: category?.name || 'Uncategorized'
        };
        setNotes(prevNotes => [...prevNotes, savedNoteWithCategory]);
      }
      setIsAddingNote(false);
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
      const success = await deleteStickyNote(id, userId);
      if (success) {
        setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
      }
      return success;
    } catch (error) {
      console.error('Error deleting note:', error);
      return false;
    }
  }

  const handleUpdateNote = async (id: string, content: string, categoryId?: string) => {
    if (!isAuthenticated || !userId) {
      console.error('Cannot update note: User not authenticated');
      return;
    }
    
    try {
      console.log(`[handleUpdateNote] Starting update for note ${id}`);
      
      const noteToUpdate = notes.find(note => note.id === id);
      if (!noteToUpdate) {
        console.error(`[handleUpdateNote] Note with id ${id} not found`);
        return;
      }
      
      // If category is being updated, find its name
      let categoryName = noteToUpdate.category;
      let categoryIdToUse = noteToUpdate.category_id;
      
      if (categoryId) {
        const category = categories.find(cat => cat.id === categoryId);
        if (category) {
          categoryName = category.name;
          categoryIdToUse = categoryId;
        } else {
          console.warn(`[handleUpdateNote] Category with id ${categoryId} not found`);
        }
      }
      
      // Create a complete note object with all required fields
      const updates: Partial<StickyNoteType> = {
        id,
        user_id: userId,
        content: content || noteToUpdate.content,
        color: noteToUpdate.color || '#fff9c4',
        position_x: typeof noteToUpdate.position_x === 'number' ? noteToUpdate.position_x : 0,
        position_y: typeof noteToUpdate.position_y === 'number' ? noteToUpdate.position_y : 0,
        width: typeof noteToUpdate.width === 'number' ? noteToUpdate.width : 200,
        height: typeof noteToUpdate.height === 'number' ? noteToUpdate.height : 200,
        z_index: typeof noteToUpdate.z_index === 'number' ? noteToUpdate.z_index : 0,
        is_archived: Boolean(noteToUpdate.is_archived),
        category_id: categoryIdToUse || null,
        created_at: noteToUpdate.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        category: categoryName || 'Uncategorized',
        // Ensure we have the original createdAt if it exists
        ...(noteToUpdate.createdAt ? { createdAt: noteToUpdate.createdAt } : {})
      };
      
      console.log('[handleUpdateNote] Updating note with data:', updates);
      
      // Pass the userId explicitly
      const updatedNote = await saveStickyNote(updates, userId);
      
      if (updatedNote) {
        console.log('[handleUpdateNote] Successfully updated note:', updatedNote);
        
        // Include the category name in the updated note
        const updatedNoteWithCategory = {
          ...updatedNote,
          category: categoryName || 'Uncategorized',
          category_id: categoryIdToUse || null
        };
        
        setNotes(prevNotes => 
          prevNotes.map(note => note.id === id ? updatedNoteWithCategory : note)
        );
        
        return true;
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
        noteCounts={noteCounts}
      />
    </div>
  );
}
