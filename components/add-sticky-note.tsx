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

  // Load categories when the modal opens or when the default category changes
  useEffect(() => {
    const loadCategories = async () => {
      if (!open) return;
      
      // Reset form when opening
      setContent('');
      setSelectedColor(COLORS[2]);
      setIsLoading(true);
      
      try {
        let categoriesToUse: StickyNoteCategory[] = [];
        
        // Use provided categories if available, otherwise fetch them
        if (propCategories && propCategories.length > 0) {
          categoriesToUse = [...propCategories];
          setCategories(categoriesToUse);
        } else if (isAuthenticated && userId) {
          categoriesToUse = await getStickyNoteCategories(userId);
          setCategories(categoriesToUse);
        } else {
          // Fallback to default categories if not authenticated
          const defaultCategory = {
            id: 'default',
            user_id: 'local-user',
            name: 'Uncategorized',
            color: '#6b7280',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          categoriesToUse = [defaultCategory];
          setCategories(categoriesToUse);
        }
        
        // Select the default category if provided, otherwise select the first category
        if (categoriesToUse.length > 0) {
          let categoryToSelect = categoriesToUse[0];
          
          if (defaultCategoryId) {
            const foundCategory = findCategoryById(categoriesToUse, defaultCategoryId);
            if (foundCategory) {
              categoryToSelect = foundCategory;
            }
          }
          
          console.log('Setting selected category:', categoryToSelect);
          setSelectedCategory(categoryToSelect);
        } else {
          setSelectedCategory(null);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
        // Fallback to a default category
        const fallbackCategory: StickyNoteCategory = {
          id: 'default',
          user_id: 'local-user',
          name: 'Uncategorized',
          color: '#6b7280',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setCategories([fallbackCategory]);
        setSelectedCategory(fallbackCategory);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCategories();
    // Remove propCategories from the dependency array to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultCategoryId, isAuthenticated, userId]);

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
        className="flex flex-col p-4 rounded-md shadow-lg min-h-[200px] w-full max-w-md text-white"
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
          <div className="flex-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : selectedCategory ? (
                    <div className="flex items-center gap-2 w-full">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: selectedCategory.color }}
                      />
                      <span className="truncate">{selectedCategory.name}</span>
                      <ChevronDown className="ml-auto h-4 w-4" />
                    </div>
                  ) : (
                    'Select category'
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="start">
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
                            backgroundColor: 'rgba(255, 255, 255, 0.25)',
                            color: 'white',
                            textShadow: '0px 0px 2px rgba(0,0,0,0.3)'
                          }}
                        >
                          {noteCounts && noteCounts[cat.id] !== undefined ? noteCounts[cat.id] : 0}
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
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleAddNote} className="bg-white/20 hover:bg-white/30 text-white">
            <Check className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </div>
      </div>
    </div>
  )
}
