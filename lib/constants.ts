// Default categories for sticky notes
export interface StickyNoteCategory {
  name: string;
  color: string;
}

export const DEFAULT_STICKY_NOTE_CATEGORIES: StickyNoteCategory[] = [
  { name: 'All', color: '#fff9c4' },
  { name: 'Work', color: '#bbdefb' },
  { name: 'Personal', color: '#c8e6c9' },
  { name: 'Ideas', color: '#ffccbc' }
];
