"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { SimplifiedStickyNote } from "@/components/simplified-sticky-note";
import { AddStickyNote } from "@/components/add-sticky-note";
import { 
  getStickyNotes, 
  saveStickyNote, 
  deleteStickyNote, 
  getStickyNoteCategories,
  StickyNote as StickyNoteType,
  StickyNoteBase,
  StickyNoteCategory,
  ensureUserHasCategories
} from "@/lib/storage";
import { PlusCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStatus } from "@/lib/auth-context";
import { PageLayout } from "@/components/page-layout";

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
      
      // Load notes
      const fetchedNotes = await getStickyNotes(userId);
      
      // Map notes to include category names
      const notesWithCategoryNames = fetchedNotes.map(note => {
        const matchingCategory = fetchedCategories.find(cat => cat.id === note.category_id);
        return {
          ...note,
          category: matchingCategory ? matchingCategory.name : 'Uncategorized'
        };
      });
      
      setNotes(notesWithCategoryNames);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load sticky notes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, userId]);
  
  // Handle adding a new note
  const handleAddNote = async (content: string, color: string, categoryId: string) => {
    if (!isAuthenticated || !userId) {
      console.error('Cannot add note: User not authenticated');
      return;
    }
    
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) {
      console.error('Selected category not found');
      return;
    }
    
    try {
      const now = new Date().toISOString();
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
      };

      const savedNote = await saveStickyNote(newNote, userId);
      if (savedNote) {
        const savedNoteWithCategory = {
          ...savedNote,
          category: category?.name || 'Uncategorized'
        };
        setNotes(prevNotes => [...prevNotes, savedNoteWithCategory]);
      }
      setIsAddingNote(false);
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  // Handle updating a note
  const handleUpdateNote = useCallback(async (id: string, content: string, categoryId?: string) => {
    if (!isAuthenticated || !userId) {
      console.error('Cannot update note: User not authenticated');
      return false;
    }
    
    try {
      const noteToUpdate = notes.find(note => note.id === id);
      if (!noteToUpdate) {
        console.error(`Note with id ${id} not found`);
        return false;
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
          console.warn(`Category with id ${categoryId} not found`);
        }
      }
      
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
        category: categoryName || 'Uncategorized'
      };
      
      const updatedNote = await saveStickyNote(updates, userId);
      
      if (updatedNote) {
        const updatedNoteWithCategory = {
          ...updatedNote,
          category: categoryName || 'Uncategorized'
        };
        
        setNotes(prevNotes => 
          prevNotes.map(note => note.id === id ? updatedNoteWithCategory : note)
        );
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating note:', error);
      return false;
    }
  }, [isAuthenticated, userId, notes, categories]);

  // Handle deleting a note
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
  };

  // Handle category change for a note
  const handleCategoryChange = useCallback(async (id: string, newCategory: string) => {
    try {
      const noteToUpdate = notes.find(note => note.id === id);
      if (noteToUpdate) {
        await handleUpdateNote(id, noteToUpdate.content, newCategory);
      }
    } catch (error) {
      console.error('Error updating note category:', error);
    }
  }, [notes, handleUpdateNote]);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter notes by selected category
  const filteredNotes = useMemo(() => {
    if (!selectedCategory) return notes;
    return notes.filter(note => note.category_id === selectedCategory);
  }, [notes, selectedCategory]);

  return (
    <PageLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Sticky Notes</h1>
            <Button 
              onClick={() => setIsAddingNote(true)}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Add Note</span>
            </Button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              {/* Category Filter */}
              <div className="flex flex-wrap gap-2 mb-6">
                {categories.map(category => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory(category.id)}
                    className="flex items-center gap-2"
                  >
                    <span>{category.name}</span>
                    <span className="bg-primary/20 text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                      {noteCounts[category.id] || 0}
                    </span>
                  </Button>
                ))}
              </div>

              {/* Notes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredNotes.map(note => (
                  <SimplifiedStickyNote
                    key={note.id}
                    note={{
                      ...note,
                      color: note.color || '#fff9c4',
                      category: note.category || 'Uncategorized'
                    }}
                    onDelete={() => handleDeleteNote(note.id)}
                    onUpdate={(id, content, categoryId) => handleUpdateNote(id, content, categoryId)}
                    onCategoryChange={(id, categoryId) => handleCategoryChange(id, categoryId)}
                  />
                ))}
              </div>
            </>
          )}

          {/* Add Note Dialog */}
          <AddStickyNote
            open={isAddingNote}
            onOpenChange={setIsAddingNote}
            onAddNote={handleAddNote}
            categories={categories}
            defaultCategoryId={selectedCategory || undefined}
            noteCounts={noteCounts}
          />
        </div>
      </div>
    </PageLayout>
  );
}
