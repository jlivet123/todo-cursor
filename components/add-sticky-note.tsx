"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { X, Check, ChevronDown, Loader2, AlertCircle } from "lucide-react"
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

// Focus styles for better keyboard navigation
const focusRing = 'focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 focus-visible:outline'

export function AddStickyNote({ 
  open,
  onOpenChange,
  onAddNote,
  categories: propCategories = [],
  defaultCategoryId,
  noteCounts = {}
}: AddStickyNoteProps) {
  const [content, setContent] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[2]);
  const [categories, setCategories] = useState<StickyNoteCategory[]>(propCategories);
  const [selectedCategory, setSelectedCategory] = useState<StickyNoteCategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId, isAuthenticated } = useAuthStatus();

  // Keep all your existing effects and logic...

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
    setError(null);
    
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
            console.log('No categories found, creating default category');
            const defaultCategory: StickyNoteCategory = {
              id: 'default',
              user_id: userId || 'local-user',
              name: 'General',
              color: '#5c4d10',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            console.log('Created default category:', defaultCategory);
            setCategories([defaultCategory]);
            setSelectedCategory(defaultCategory);
          }
        } catch (error) {
          console.error('Error fetching categories:', error);
          setError('Failed to load categories. Using default category.');
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
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
      <div 
        className="flex flex-col p-4 rounded-lg shadow-lg w-full max-w-[95%] sm:max-w-md max-h-[90vh] text-white"
        style={{ backgroundColor: selectedColor }}
      >
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-white/70" />
          </div>
        ) : (
          <>
            {/* Note content */}
            <div className="flex-1 min-h-[120px] mb-4 overflow-auto">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className={`w-full h-full min-h-[120px] resize-none border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-sm placeholder-white/80 ${focusRing} rounded`}
                placeholder="Write your note here..."
                autoFocus
                aria-label="Note content"
              />
            </div>

            {/* Controls section */}
            <div className="flex flex-col space-y-3">
              {/* Color picker */}
              <div className="flex justify-center space-x-3">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-6 h-6 rounded-full border-2 transition-all duration-200 ease-in-out ${
                      selectedColor === color ? 'ring-2 ring-white ring-opacity-60' : ''
                    } ${focusRing}`}
                    style={{
                      backgroundColor: color,
                      borderColor: selectedColor === color ? "white" : "transparent",
                    }}
                    onClick={() => setSelectedColor(color)}
                    aria-label={`Select ${color} color`}
                  />
                ))}
              </div>
              
              {/* Category dropdown and action buttons */}
              <div className="flex flex-col space-y-2 sm:space-y-3">
                {/* Category dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      className={`w-full justify-between bg-white/10 border-white/20 hover:bg-white/20 h-9 ${focusRing}`}
                      aria-label="Select category"
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
                  <DropdownMenuContent className="w-56" align="center">
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
                
                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="ghost"
                    onClick={handleCancel}
                    className={`text-white/80 hover:text-white hover:bg-white/10 h-9 ${focusRing}`}
                    aria-label="Cancel and close"
                  >
                    <X className="h-4 w-4 mr-1.5" />
                    <span>Cancel</span>
                  </Button>
                  <Button 
                    onClick={handleAddNote}
                    disabled={!content.trim()} 
                    className={`bg-white/20 hover:bg-white/30 text-white h-9 ${focusRing} disabled:opacity-50 disabled:pointer-events-none`}
                    aria-label="Add note"
                  >
                    <Check className="h-4 w-4 mr-1.5" />
                    <span>Add</span>
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
        
        {/* Error message */}
        {error && (
          <div className="bg-red-500/20 p-2 rounded-md text-white text-sm mb-3 mt-2 flex items-center">
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
