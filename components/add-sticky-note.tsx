"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { X, Check, ChevronDown, Loader2 } from "lucide-react"
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem 
} from "@/components/ui/dropdown-menu"
import { 
  getStickyNoteCategories,
  type StickyNoteCategory 
} from "@/lib/storage"
import { useAuthStatus } from "@/lib/auth-context"

interface AddStickyNoteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddNote: (content: string, color: string, category: string) => void;
  categories?: StickyNoteCategory[]; // Make optional for backward compatibility
  defaultCategoryId?: string; // ID of the category to select by default
  noteCounts?: Record<string, number>; // Map of category IDs to note counts
}

// Darker color palette for better contrast with white text
const COLORS = [
  "#5c4d10", // Dark Yellow
  "#6b3030", // Dark Red
  "#2c4c7c", // Dark Blue
  "#2d5d3a", // Dark Green
  "#4a3670", // Dark Purple
]

export function AddStickyNote({ 
  open,
  onOpenChange,
  onAddNote,
  categories: propCategories = [],
  defaultCategoryId,
  noteCounts = {}
}: AddStickyNoteProps) {
  const [content, setContent] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[2]); // Default to blue
  const [categories, setCategories] = useState<StickyNoteCategory[]>(propCategories);
  const [selectedCategory, setSelectedCategory] = useState<StickyNoteCategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { userId, isAuthenticated } = useAuthStatus();

  // Helper function to get contrast color for badges
  const getContrastColor = (bgColor: string) => {
    // Simple contrast function - white for dark colors, black for light colors
    return bgColor && bgColor.toLowerCase() !== '#ffffff' 
      ? 'rgba(255, 255, 255, 0.9)' 
      : 'rgba(0, 0, 0, 0.7)';
  };

  // Helper function to find a category by ID
  const findCategoryById = (categoryList: StickyNoteCategory[], id: string): StickyNoteCategory | undefined => {
    return categoryList.find(cat => cat.id === id);
  };

  // Update local categories and handle default category selection
  useEffect(() => {
    console.log('Categories prop changed:', { propCategories, defaultCategoryId });
    
    const updateCategories = async () => {
      // If we have categories from props, use them
      if (propCategories && propCategories.length > 0) {
        console.log('Using prop categories:', propCategories);
        setCategories(propCategories);
        
        // Find the category to select
        let categoryToSelect = propCategories[0];
        
        if (defaultCategoryId) {
          console.log('Looking for default category ID:', defaultCategoryId);
          const foundCategory = findCategoryById(propCategories, defaultCategoryId);
          if (foundCategory) {
            console.log('Found default category:', foundCategory);
            categoryToSelect = foundCategory;
          } else {
            console.warn('Default category not found in categories:', defaultCategoryId);
          }
        }
        
        console.log('Setting selected category:', categoryToSelect);
        setSelectedCategory(categoryToSelect);
        setIsLoading(false);
        return;
      }
      
      // If no categories from props, try to fetch them
      if (open && isAuthenticated && userId) {
        console.log('Fetching categories for user:', userId);
        setIsLoading(true);
        try {
          const fetchedCategories = await getStickyNoteCategories(userId);
          console.log('Fetched categories:', fetchedCategories);
          
          if (fetchedCategories.length > 0) {
            let categoryToSelect = fetchedCategories[0];
            
            if (defaultCategoryId) {
              const foundCategory = findCategoryById(fetchedCategories, defaultCategoryId);
              if (foundCategory) {
                console.log('Using default category from ID:', foundCategory);
                categoryToSelect = foundCategory;
              }
            }
            
            console.log('Setting categories and selected category:', {
              categories: fetchedCategories,
              selected: categoryToSelect
            });
            
            setCategories(fetchedCategories);
            setSelectedCategory(categoryToSelect);
          } else {
            console.log('No categories found, initializing defaults');
            const defaultCategories = await initializeDefaultCategories(userId);
            console.log('Initialized default categories:', defaultCategories);
            setCategories(defaultCategories);
            setSelectedCategory(defaultCategories[0]);
          }
        } catch (error) {
          console.error('Error fetching categories:', error);
          // Fallback to a default category
          const fallbackCategory: StickyNoteCategory = {
            id: 'default',
            user_id: userId || 'local-user',
            name: 'Uncategorized',
            color: '#6b7280',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          console.log('Using fallback category:', fallbackCategory);
          setCategories([fallbackCategory]);
          setSelectedCategory(fallbackCategory);
        } finally {
          setIsLoading(false);
        }
      } else if (open) {
        // Not authenticated, use local category
        console.log('User not authenticated, using local category');
        const localCategory: StickyNoteCategory = {
          id: 'default',
          user_id: 'local-user',
          name: 'Uncategorized',
          color: '#6b7280',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        console.log('Using local category:', localCategory);
        setCategories([localCategory]);
        setSelectedCategory(localCategory);
        setIsLoading(false);
      }
    };
    
    updateCategories();
  }, [propCategories, defaultCategoryId, open, isAuthenticated, userId]);
  
  // Log when selected category changes
  useEffect(() => {
    console.log('Selected category changed:', selectedCategory);
  }, [selectedCategory]);
  
  // Reset form when opening/closing the modal
  useEffect(() => {
    if (open) {
      console.log('Modal opened, resetting form');
      setContent('');
      setSelectedColor(COLORS[2]);
    }
  }, [open]);

  const handleAddNote = () => {
    if (!content.trim() || !selectedCategory) return;
    onAddNote(content, selectedColor, selectedCategory.id);
    setContent("");
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        className="flex flex-col p-6 rounded-lg shadow-lg min-h-[220px] w-full max-w-md text-white"
        style={{ backgroundColor: selectedColor }}
      >
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 resize-none border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 min-h-[100px] text-sm placeholder-white/70"
          placeholder="Write your note here..."
          autoFocus
        />

        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <div className="flex space-x-2">
            {COLORS.map((color) => (
              <button
                key={color}
                className={`w-6 h-6 rounded-full border-2 transition-all flex-shrink-0 ${selectedColor === color ? 'ring-2 ring-offset-1 ring-white/50' : ''}`}
                style={{
                  backgroundColor: color,
                  borderColor: selectedColor === color ? 'white' : 'transparent',
                }}
                onClick={() => setSelectedColor(color)}
                aria-label={`Select ${color} color`}
              />
            ))}
          </div>

          <div className="flex-1 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-end">
            <div className="w-full sm:w-auto sm:flex-1 sm:max-w-[180px]">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between bg-white/10 border-white/20 hover:bg-white/20 h-9"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : selectedCategory ? (
                      <div className="flex items-center gap-2 w-full">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: selectedCategory.color }}
                        />
                        <span className="truncate text-white">{selectedCategory.name}</span>
                        <ChevronDown className="ml-auto h-4 w-4 text-white/70 shrink-0" />
                      </div>
                    ) : (
                      <span className="text-white/80">Select category</span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  {categories.length > 0 ? (
                    categories.map((cat) => (
                      <DropdownMenuItem
                        key={cat.id}
                        onSelect={() => setSelectedCategory(cat)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2 w-full">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="truncate flex-1">{cat.name}</span>
                          <span 
                            className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium min-w-[24px] text-center"
                            style={{ 
                              backgroundColor: 'rgba(0, 0, 0, 0.15)',
                              color: 'inherit',
                            }}
                          >
                            {noteCounts[cat.id] ?? 0}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem disabled>No categories found</DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="text-white/90 hover:text-white hover:bg-white/10 px-3 h-9 flex-1 sm:flex-initial"
              >
                <X className="h-4 w-4 mr-1.5" />
                <span>Cancel</span>
              </Button>
              <Button 
                size="sm" 
                onClick={handleAddNote} 
                className="bg-white/20 hover:bg-white/30 text-white px-4 h-9 flex-1 sm:flex-initial"
                disabled={!content.trim()}
              >
                <Check className="h-4 w-4 mr-1.5" />
                <span>Add</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
