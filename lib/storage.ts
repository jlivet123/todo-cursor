import { getSupabaseClient, isSupabaseConfigured } from "./supabase"
import { sampleTasks } from "./sample-data"
import { v4 as uuidv4 } from 'uuid'
import { format } from "date-fns"

// Define default categories directly in storage.ts
const DEFAULT_STICKY_NOTE_CATEGORIES = [
  { name: 'All', color: '#fff9c4' },
  { name: 'Work', color: '#bbdefb' },
  { name: 'Personal', color: '#c8e6c9' },
  { name: 'Ideas', color: '#ffccbc' }
];

export interface Subtask {
  id: string
  text: string
  completed: boolean
}

export interface Task {
  id: string
  text: string
  completed: boolean
  time?: string
  category: "work" | "personal"
  subtasks: Subtask[]
  timeDisplay?: string
  description?: string
  // Date fields in ISO format (YYYY-MM-DD)
  startDate: string
  dueDate: string
  position?: number
  // Completion tracking
  completionDate?: string           // ISO format (YYYY-MM-DD)
  completionDateMMMD?: string      // Legacy format (MMM d)
  completionDateObj?: Date | null  // Date object for calculations
  // Day field for filtering
  day?: string                     // ISO format (YYYY-MM-DD)
  startDateObj?: Date | null
  dueDateObj?: Date | null
}

// Base interface for database operations
export interface StickyNoteBase {
  id: string;
  user_id: string;
  content: string;
  color: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  z_index: number;
  is_archived: boolean;
  category_id: string | null;
  created_at: string;
  updated_at: string;
}



// Type for creating/updating notes
export type StickyNoteInput = Omit<Partial<StickyNoteBase>, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;               // Optional for creating new notes
  category?: string;         // Optional category name 
  userId?: string;           // Alternative to user_id
  createdAt?: string;        // Alternative to created_at
  updatedAt?: string;        // Alternative to updated_at
};

// Category definition
export interface StickyNoteCategory {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface DecisionMatrixEntry {
  id: string
  limitingBelief: string
  empoweredDecision: string
  evidence: string
  createdAt: string
}

// Mock user for local storage
export const MOCK_USER = {
  id: "local-user",
  name: "Local User",
  email: "user@example.com",
}

// Local storage keys
const TASKS_STORAGE_KEY = "taskmaster_tasks"
const USER_STORAGE_KEY = "taskmaster_user"
const INITIALIZED_KEY = "taskmaster_initialized"
const DECISION_MATRIX_STORAGE_KEY = "taskmaster_decision_matrix"

// Generate a unique ID
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Helper function to check if we're in a browser environment
const isBrowser = () => typeof window !== "undefined"

// Fallback to localStorage if Supabase is not configured
function getTasksFromLocalStorage(): Task[] {
  if (!isBrowser()) return []

  console.log('Starting saveStickyNote with note:', JSON.stringify(note, null, 2));
  console.log('User ID:', userId);
  
  try {
    // Check if we've initialized with sample data
    const initialized = localStorage.getItem(INITIALIZED_KEY)

    // If not initialized, set up sample data
    if (!initialized) {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(sampleTasks))
      localStorage.setItem(INITIALIZED_KEY, "true")
      return sampleTasks
    }

    const tasksJson = localStorage.getItem(TASKS_STORAGE_KEY)
    return tasksJson ? JSON.parse(tasksJson) : []
  } catch (error) {
    console.error("Error getting tasks from localStorage:", error)
    return []
  }
}

function saveTasksToLocalStorage(tasks: Task[]): void {
  if (!isBrowser()) return

  console.log('Starting saveStickyNote with note:', JSON.stringify(note, null, 2));
  console.log('User ID:', userId);
  
  try {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks))
  } catch (error) {
    console.error("Error saving tasks to localStorage:", error)
  }
}

// Get tasks from Supabase or localStorage
export async function getTasks(): Promise<Task[]> {
  // If Supabase is not configured, use localStorage
  if (!isSupabaseConfigured()) {
    return getTasksFromLocalStorage()
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return getTasksFromLocalStorage()
  }

  console.log('Starting saveStickyNote with note:', JSON.stringify(note, null, 2));
  console.log('User ID:', userId);
  
  try {
    // Get tasks
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .order("position", { ascending: true })

    if (tasksError) throw tasksError

    // Get subtasks for all tasks
    const { data: subtasks, error: subtasksError } = await supabase
      .from("subtasks")
      .select("*")
      .order("position", { ascending: true })

    if (subtasksError) throw subtasksError

    // Map subtasks to their parent tasks
    const tasksWithSubtasks = tasks.map((task) => {
      const completionDateObj = task.completion_date ? new Date(task.completion_date + 'T00:00:00') : null;
      
      // Generate the MMM d format from the completion date if available
      let completionDateMMMD;
      if (task.completion_date && completionDateObj && !isNaN(completionDateObj.getTime())) {
        completionDateMMMD = format(completionDateObj, "MMM d");
      }
      
      // Create Date objects for startDate and dueDate with proper validation
      let startDateObj: Date | null = null;
      let dueDateObj: Date | null = null;
      
      // Initialize with default values
      let formattedStartDate = '';
      let formattedDueDate = '';
      
      // Process start date
      console.log('Starting saveStickyNote with note:', JSON.stringify(note, null, 2));
  console.log('User ID:', userId);
  
  try {
        if (task.start_date) {
          // If it's already in ISO format, use it directly
          if (typeof task.start_date === 'string' && task.start_date.includes('-')) {
            const parsedDate = new Date(task.start_date);
            if (!isNaN(parsedDate.getTime())) {
              startDateObj = parsedDate;
              formattedStartDate = task.start_date; // Keep original ISO format
            }
          }
          // Handle case where start_date might be a date object
          else if (task.start_date instanceof Date) {
            if (!isNaN(task.start_date.getTime())) {
              startDateObj = task.start_date;
              formattedStartDate = format(task.start_date, 'yyyy-MM-dd');
            }
          }
        }
      } catch (e) {
        console.error(`Error processing startDate for task ${task.id}:`, e);
        startDateObj = null;
      }
      
      // Process due date
      console.log('Starting saveStickyNote with note:', JSON.stringify(note, null, 2));
  console.log('User ID:', userId);
  
  try {
        if (task.due_date) {
          // If it's already in ISO format, use it directly
          if (typeof task.due_date === 'string' && task.due_date.includes('-')) {
            const parsedDate = new Date(task.due_date);
            if (!isNaN(parsedDate.getTime())) {
              dueDateObj = parsedDate;
              formattedDueDate = task.due_date; // Keep original ISO format
            }
          }
          // Handle case where due_date might be a date object
          else if (task.due_date instanceof Date) {
            if (!isNaN(task.due_date.getTime())) {
              dueDateObj = task.due_date;
              formattedDueDate = format(task.due_date, 'yyyy-MM-dd');
            }
          }
        }
      } catch (e) {
        console.error(`Error processing dueDate for task ${task.id}:`, e);
        dueDateObj = null;
      }
      
      return {
        ...task,
        id: task.id,
        text: task.text,
        completed: task.completed,
        category: task.category,
        time: task.time,
        timeDisplay: task.time_display,
        description: task.description,
        startDate: formattedStartDate,
        dueDate: formattedDueDate,
        position: task.position,
        completionDate: task.completion_date,
        // Use our generated MMM d format since the column doesn't exist in the database
        completionDateMMMD: completionDateMMMD,
        completionDateObj,
        startDateObj,
        dueDateObj,
        subtasks: subtasks
          .filter((subtask) => subtask.task_id === task.id)
          .map((subtask) => ({
            id: subtask.id,
            text: subtask.text,
            completed: subtask.completed,
          })),
      };
    })

    return tasksWithSubtasks
  } catch (error) {
    console.error("Error getting tasks from Supabase:", error)
    // Fallback to localStorage if Supabase fails
    return getTasksFromLocalStorage()
  }
}

// Save a task to Supabase or localStorage
export async function saveTask(task: Task): Promise<Task | null> {
  console.log(`Attempting to save task: ${task.text} (ID: ${task.id}) with start date: ${task.startDate}`);

  // If Supabase is not configured, use localStorage
  if (!isSupabaseConfigured()) {
    const tasks = getTasksFromLocalStorage()
    const taskIndex = tasks.findIndex((t) => t.id === task.id)

    if (taskIndex !== -1) {
      tasks[taskIndex] = task
    } else {
      tasks.push(task)
    }

    saveTasksToLocalStorage(tasks)
    console.log(`Task saved to localStorage: ${task.text} (ID: ${task.id})`);
    return task
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    // Fallback to localStorage
    const tasks = getTasksFromLocalStorage()
    const taskIndex = tasks.findIndex((t) => t.id === task.id)

    if (taskIndex !== -1) {
      tasks[taskIndex] = task
    } else {
      tasks.push(task)
    }

    saveTasksToLocalStorage(tasks)
    console.log(`Task saved to localStorage: ${task.text} (ID: ${task.id})`);
    return task
  }

  console.log('Starting saveStickyNote with note:', JSON.stringify(note, null, 2));
  console.log('User ID:', userId);
  
  try {
    // Get user ID
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const userId = user?.id

    if (!userId) {
      throw new Error("User not authenticated")
    }

    // Store the MMM d format locally for client-side filtering
    // but don't send it to Supabase if the column doesn't exist
    let completionDateMMMD = task.completionDateMMMD;
    if (task.completionDate && !completionDateMMMD) {
      console.log('Starting saveStickyNote with note:', JSON.stringify(note, null, 2));
  console.log('User ID:', userId);
  
  try {
        // Try to generate the MMM d format from the ISO date
        const completionDate = new Date(task.completionDate + 'T00:00:00');
        if (!isNaN(completionDate.getTime())) {
          completionDateMMMD = format(completionDate, "MMM d");
          // Update the task object with the generated value for local use
          task.completionDateMMMD = completionDateMMMD;
        }
      } catch (e) {
        console.error("Error generating completionDateMMMD:", e);
      }
    }
    
    // Helper function to parse and format dates consistently
    const formatDateForDatabase = (dateString: string | undefined): string | null => {
      if (!dateString) return null;
      
      console.log('Starting saveStickyNote with note:', JSON.stringify(note, null, 2));
  console.log('User ID:', userId);
  
  try {
        // If it's already in ISO format, return as is
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return dateString;
        }
        
        // Handle MMM d format (e.g., "May 9")
        if (dateString.match(/^[A-Za-z]{3} \d{1,2}$/)) {
          const currentYear = new Date().getFullYear();
          const date = new Date(`${dateString}, ${currentYear}`);
          if (!isNaN(date.getTime())) {
            return format(date, 'yyyy-MM-dd');
          }
        }
        
        // Try parsing as a date string
        const parsedDate = new Date(dateString);
        if (!isNaN(parsedDate.getTime())) {
          return format(parsedDate, 'yyyy-MM-dd');
        }
        
        console.warn('Could not parse date:', dateString);
        return null;
      } catch (e) {
        console.error('Error formatting date:', dateString, e);
        return null;
      }
    };

    // Prepare task data for Supabase - only include fields that exist in the database
    const taskData: any = {
      text: task.text,
      completed: task.completed,
      category: task.category,
      time: task.time,
      time_display: task.timeDisplay,
      description: task.description,
      start_date: formatDateForDatabase(task.startDate),
      due_date: formatDateForDatabase(task.dueDate),
      position: task.position || 0,
      completion_date: formatDateForDatabase(task.completionDate),
      // Don't include completion_date_mmmd as it doesn't exist in the database
      user_id: userId,
    };
    
    // Only include the ID if it's an update (not a temp ID)
    if (task.id && !task.id.startsWith('temp-')) {
      taskData.id = task.id;
    }

    if (!supabase) {
      throw new Error('Supabase client is not available');
    }
    
    console.log('Starting saveStickyNote with note:', JSON.stringify(note, null, 2));
  console.log('User ID:', userId);
  
  try {
      const { data, error } = await supabase
        .from("tasks")
        .upsert(taskData)
        .select()
        .single();

      if (error) {
        console.error('Supabase upsert error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          error: error,
          taskData: JSON.stringify(taskData, null, 2)
        });
        console.error('Full error object:', error);
        console.error('Task data being saved:', taskData);
        throw new Error(`Failed to save task: ${error.message}`, { cause: error });
      }
      
      // Map the returned data from Supabase to our Task object
      const savedTask: Task = {
        ...task, // This will be overridden by the following fields
        id: data.id, // Use the ID from the database
        text: data.text || task.text,
        completed: data.completed || false,
        category: data.category || task.category,
        time: data.time || task.time,
        timeDisplay: data.time_display || task.timeDisplay,
        description: data.description || task.description,
        startDate: data.start_date || task.startDate || '',
        dueDate: data.due_date || task.dueDate || '',
        position: data.position || task.position || 0,
        completionDate: data.completion_date || task.completionDate,
        // Generate MMMD format from completion_date if it exists
        completionDateMMMD: data.completion_date 
          ? format(new Date(data.completion_date + 'T00:00:00'), 'MMM d')
          : task.completionDateMMMD,
        subtasks: task.subtasks || [],
        startDateObj: data.start_date 
          ? new Date(data.start_date) 
          : (task.startDate ? new Date(task.startDate) : null),
        dueDateObj: data.due_date 
          ? new Date(data.due_date) 
          : (task.dueDate ? new Date(task.dueDate) : null),
        completionDateObj: data.completion_date 
          ? new Date(data.completion_date) 
          : (task.completionDate ? new Date(task.completionDate) : null)
      };
      
      console.log(`Task saved to Supabase: ${savedTask.text} (ID: ${savedTask.id})`);
      
      // Process subtasks if they exist
      if (task.subtasks && task.subtasks.length > 0) {
        console.log('Starting saveStickyNote with note:', JSON.stringify(note, null, 2));
  console.log('User ID:', userId);
  
  try {
          // Prepare subtask data
          const subtaskData = task.subtasks.map((subtask, index) => ({
            id: subtask.id,
            task_id: savedTask.id,
            text: subtask.text,
            completed: subtask.completed,
            position: index,
          }));

          // Use upsert instead of delete+insert to avoid conflicts
          const { error: subtaskError } = await supabase
            .from("subtasks")
            .upsert(subtaskData, { onConflict: 'id' });
          
          if (subtaskError) {
            console.error("Error upserting subtasks:", subtaskError);
            // Even if there's an error with subtasks, continue with the task
          }
        } catch (subtaskError) {
          console.error("Error handling subtasks:", subtaskError);
        }
      }
      
      return savedTask;

    } catch (error) {
      console.error("Error in saveTask:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error saving task to Supabase:", error)

    // Fallback to localStorage if Supabase fails
    if (isBrowser()) {
      const tasks = getTasksFromLocalStorage()
      const taskIndex = tasks.findIndex((t) => t.id === task.id)

      if (taskIndex !== -1) {
        tasks[taskIndex] = task
      } else {
        tasks.push(task)
      }

      saveTasksToLocalStorage(tasks)
      console.log(`Task saved to localStorage: ${task.text} (ID: ${task.id})`);
    }

    return task
  }
}

// Delete a task from Supabase or localStorage
export async function deleteTaskFromSupabase(taskId: string): Promise<boolean> {
  // If Supabase is not configured, use localStorage
  if (!isSupabaseConfigured()) {
    const tasks = getTasksFromLocalStorage()
    const filteredTasks = tasks.filter((task) => task.id !== taskId)
    saveTasksToLocalStorage(filteredTasks)
    return true
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    // Fallback to localStorage
    const tasks = getTasksFromLocalStorage()
    const filteredTasks = tasks.filter((task) => task.id !== taskId)
    saveTasksToLocalStorage(filteredTasks)
    return true
  }

  console.log('Starting saveStickyNote with note:', JSON.stringify(note, null, 2));
  console.log('User ID:', userId);
  
  try {
    // Delete the task (subtasks will be deleted via cascade)
    const { error } = await supabase.from("tasks").delete().eq("id", taskId)

    if (error) throw error

    return true
  } catch (error) {
    console.error("Error deleting task from Supabase:", error)

    // Fallback to localStorage if Supabase fails
    if (isBrowser()) {
      const tasks = getTasksFromLocalStorage()
      const filteredTasks = tasks.filter((task) => task.id !== taskId)
      saveTasksToLocalStorage(filteredTasks)
    }

    return true
  }
}

// Save multiple tasks to Supabase or localStorage
export async function saveTasks(tasks: Task[]): Promise<void> {
  // If Supabase is not configured, use localStorage
  if (!isSupabaseConfigured()) {
    saveTasksToLocalStorage(tasks)
    return
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    saveTasksToLocalStorage(tasks)
    return
  }

  console.log('Starting saveStickyNote with note:', JSON.stringify(note, null, 2));
  console.log('User ID:', userId);
  
  try {
    for (const task of tasks) {
      await saveTask(task)
    }
  } catch (error) {
    console.error("Error saving tasks to Supabase:", error)

    // Fallback to localStorage if Supabase fails
    saveTasksToLocalStorage(tasks)
  }
}

// Reset to sample data
export async function resetToSampleData(): Promise<boolean> {
  // If Supabase is not configured, use localStorage
  if (!isSupabaseConfigured()) {
    saveTasksToLocalStorage(sampleTasks)
    return true
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    saveTasksToLocalStorage(sampleTasks)
    return true
  }

  console.log('Starting saveStickyNote with note:', JSON.stringify(note, null, 2));
  console.log('User ID:', userId);
  
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const userId = user?.id

    if (!userId) {
      throw new Error("User not authenticated")
    }

    // Delete all existing tasks for this user
    const { error: deleteError } = await supabase.from("tasks").delete().eq("user_id", userId)

    if (deleteError) throw deleteError

    // Insert sample tasks
    for (const task of sampleTasks) {
      const taskWithUserId = {
        ...task,
        user_id: userId,
      }
      await saveTask(taskWithUserId as Task)
    }

    return true
  } catch (error) {
    console.error("Error resetting to sample data:", error)

    // Fallback to localStorage if Supabase fails
    saveTasksToLocalStorage(sampleTasks)
    return true
  }
}

// For backward compatibility with existing code
export async function getUser() {
  if (!isSupabaseConfigured()) {
    return MOCK_USER
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return MOCK_USER
  }

  console.log('Starting saveStickyNote with note:', JSON.stringify(note, null, 2));
  console.log('User ID:', userId);
  
  try {
    const { data } = await supabase.auth.getUser()
    return data.user || MOCK_USER
  } catch (error) {
    console.error("Error getting user:", error)
    return MOCK_USER
  }
}

export function clearUser(): void {
  const supabase = getSupabaseClient()
  if (supabase) {
    supabase.auth.signOut().catch(console.error)
  }

  if (isBrowser()) {
    localStorage.removeItem(USER_STORAGE_KEY)
  }
}

export function saveUser(user: any): void {
  if (!isBrowser()) return

  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
  }
}

// Decision Matrix related functionality
export interface DecisionMatrixEntry {
  id: string
  limitingBelief: string
  empoweredDecision: string
  evidence: string
  createdAt: string
  // Only used for Supabase entries
  user_id?: string
  updated_at?: string
}

// Supabase table name for the decision matrix
const DECISION_MATRIX_TABLE = 'decision_matrix'

/**
 * Get the current authenticated user from Supabase
 * @returns Promise that resolves to the current user or null if not authenticated
 */
async function getCurrentUser() {
  if (!isSupabaseConfigured()) return null
  
  const supabase = getSupabaseClient()
  if (!supabase) return null
  
  console.log('Starting saveStickyNote with note:', JSON.stringify(note, null, 2));
  console.log('User ID:', userId);
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Get decision matrix entries from Supabase or localStorage fallback
 * @returns Promise that resolves to an array of DecisionMatrixEntry objects
 */
export async function getDecisionMatrix(): Promise<DecisionMatrixEntry[]> {
  // Try to get from Supabase if configured
  if (isSupabaseConfigured()) {
    console.log('Starting saveStickyNote with note:', JSON.stringify(note, null, 2));
  console.log('User ID:', userId);
  
  try {
      const supabase = getSupabaseClient()
      if (!supabase) return getDecisionMatrixFromLocalStorage()
      
      const user = await getCurrentUser()
      
      if (!user) {
        console.warn('No user found, cannot fetch decision matrix entries from Supabase')
        return getDecisionMatrixFromLocalStorage()
      }
      
      const { data, error } = await supabase
        .from(DECISION_MATRIX_TABLE)
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching decision matrix from Supabase:', error)
        return getDecisionMatrixFromLocalStorage()
      }
      
      // Map Supabase data to match our interface
      return data.map((entry) => ({
        id: entry.id,
        limitingBelief: entry.limiting_belief,
        empoweredDecision: entry.empowered_decision,
        evidence: entry.evidence,
        createdAt: entry.created_at,
        user_id: entry.user_id,
        updated_at: entry.updated_at,
      }))
    } catch (error) {
      console.error('Error in getDecisionMatrix:', error)
      return getDecisionMatrixFromLocalStorage()
    }
  }
  
  // Fallback to localStorage if Supabase is not configured
  return getDecisionMatrixFromLocalStorage()
}

/**
 * Save decision matrix entries to Supabase or localStorage fallback
 * @param entries Array of DecisionMatrixEntry objects
 * @returns Promise that resolves when the operation is complete
 */
export async function saveDecisionMatrix(entries: DecisionMatrixEntry[]): Promise<void> {
  // Try to save to Supabase if configured
  if (isSupabaseConfigured()) {
    console.log('Starting saveStickyNote with note:', JSON.stringify(note, null, 2));
  console.log('User ID:', userId);
  
  try {
      const supabase = getSupabaseClient()
      if (!supabase) {
        saveDecisionMatrixToLocalStorage(entries)
        return
      }
      
      const user = await getCurrentUser()
      
      if (!user) {
        console.warn('No user found, cannot save decision matrix entries to Supabase')
        saveDecisionMatrixToLocalStorage(entries)
        return
      }

      // We don't do a bulk upsert here since we need to handle deletes
      // Get current entries in Supabase
      const { data: existingEntries, error: fetchError } = await supabase
        .from(DECISION_MATRIX_TABLE)
        .select('id')
      
      if (fetchError) {
        console.error('Error fetching existing entries:', fetchError)
        saveDecisionMatrixToLocalStorage(entries)
        return
      }
      
      // Find entries to delete (in existingEntries but not in entries)
      const existingIds = existingEntries?.map(e => e.id) || []
      const currentIds = entries.map(e => e.id)
      const idsToDelete = existingIds.filter(id => !currentIds.includes(id))
      
      // Delete entries that no longer exist in the current set
      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from(DECISION_MATRIX_TABLE)
          .delete()
          .in('id', idsToDelete)
        
        if (deleteError) {
          console.error('Error deleting entries:', deleteError)
        }
      }
      
      // Upsert each entry
      for (const entry of entries) {
        const { error: upsertError } = await supabase
          .from(DECISION_MATRIX_TABLE)
          .upsert({
            id: entry.id,
            user_id: user.id,
            limiting_belief: entry.limitingBelief,
            empowered_decision: entry.empoweredDecision,
            evidence: entry.evidence,
            created_at: entry.createdAt,
            updated_at: new Date().toISOString(),
          })
        
        if (upsertError) {
          console.error('Error upserting entry:', upsertError)
        }
      }
    } catch (error) {
      console.error('Error in saveDecisionMatrix:', error)
      saveDecisionMatrixToLocalStorage(entries)
    }
    return
  }
  
  // Fallback to localStorage if Supabase is not configured
  saveDecisionMatrixToLocalStorage(entries)
}

/**
 * Delete a single decision matrix entry from Supabase
 * @param id ID of the entry to delete
 * @returns Promise that resolves when the operation is complete
 */
export async function deleteDecisionMatrixEntry(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    console.log('Starting saveStickyNote with note:', JSON.stringify(note, null, 2));
  console.log('User ID:', userId);
  
  try {
      const supabase = getSupabaseClient()
      if (!supabase) return
      
      const { error } = await supabase
        .from(DECISION_MATRIX_TABLE)
        .delete()
        .eq('id', id)
      
      if (error) {
        console.error('Error deleting entry from Supabase:', error)
      }
    } catch (error) {
      console.error('Error in deleteDecisionMatrixEntry:', error)
    }
  }
}

// Helper functions for localStorage fallback
function getDecisionMatrixFromLocalStorage(): DecisionMatrixEntry[] {
  if (!isBrowser()) return []

  console.log('Starting saveStickyNote with note:', JSON.stringify(note, null, 2));
  console.log('User ID:', userId);
  
  try {
    const matrixJson = localStorage.getItem(DECISION_MATRIX_STORAGE_KEY)
    return matrixJson ? JSON.parse(matrixJson) : []
  } catch (error) {
    console.error("Error getting decision matrix from localStorage:", error)
    return []
  }
}

function saveDecisionMatrixToLocalStorage(entries: DecisionMatrixEntry[]): void {
  if (!isBrowser()) return

  console.log('Starting saveStickyNote with note:', JSON.stringify(note, null, 2));
  console.log('User ID:', userId);
  
  try {
    localStorage.setItem(DECISION_MATRIX_STORAGE_KEY, JSON.stringify(entries))
  } catch (error) {
    console.error("Error saving decision matrix to localStorage:", error)
  }
}

// Sticky Notes Interfaces
// Define StickyNoteBase as the fundamental database schema
export interface StickyNoteBase {
  id: string;
  user_id: string;
  content: string;
  color: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  z_index: number;
  is_archived: boolean;
  category?: string;        // Made optional to match application needs
  category_id: string | null;
  created_at: string;
  updated_at: string;
}

// StickyNote extends StickyNoteBase with application-specific properties
export interface StickyNote extends StickyNoteBase {
  // Optional additional fields for app use
  category?: string;         // User-friendly category name
  createdAt?: string;        // Alias for created_at
  updatedAt?: string;        // Alias for updated_at
  userId?: string;           // Alias for user_id
}

export interface StickyNoteCategory {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
  updated_at: string
}

// Sticky Notes Functions
const STICKY_NOTES_KEY = 'taskmaster_sticky_notes';
const STICKY_NOTE_CATEGORIES_KEY = 'taskmaster_sticky_note_categories';

// Helper function to generate a unique ID for sticky notes
function generateStickyNoteId(): string {
  return 'note_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Helper function to get current user ID
export function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null;
  const user = JSON.parse(localStorage.getItem('sb-user') || 'null');
  return user?.id || null;
}

// Save a sticky note to local storage
export function saveStickyNoteToLocalStorage(note: Partial<StickyNote>): StickyNote | null {
  if (!isBrowser()) return null;
  
  try {
    // Try to get user ID from the note first, then from auth
    let userId = note.user_id || getCurrentUserId();
    
    // If still no user ID, use a default one for local storage
    if (!userId) {
      console.log('No authenticated user, using default user for local storage');
      userId = 'local-user';
    }

    const now = new Date().toISOString();
    const notes = getStickyNotesFromLocalStorage(userId);
    
    // Ensure all required fields have values
    const noteToSave: StickyNote = {
      id: note.id || generateStickyNoteId(),
      user_id: userId,
      content: note.content || '',
      color: note.color || '#fff9c4',
      position_x: note.position_x ?? 0,
      position_y: note.position_y ?? 0,
      width: note.width ?? 200,
      height: note.height ?? 200,
      z_index: note.z_index ?? 0,
      is_archived: note.is_archived ?? false,
      category: note.category || 'Uncategorized',
      category_id: note.category_id ?? null,
      created_at: note.created_at || now,
      updated_at: now,
      createdAt: note.createdAt || now,
      updatedAt: now,
    };
    
    const existingIndex = notes.findIndex(n => n.id === noteToSave.id);
    
    if (existingIndex >= 0) {
      notes[existingIndex] = noteToSave;
    } else {
      notes.push(noteToSave);
    }
    
    localStorage.setItem(`${STICKY_NOTES_KEY}_${userId}`, JSON.stringify(notes));
    return noteToSave;
  } catch (error) {
    console.error('Error saving sticky note to localStorage:', error);
    return null;
  }
}

// Convert database note to app note format
function mapDbNoteToAppNote(dbNote: any): StickyNote {
  if (!dbNote) {
    throw new Error('Cannot map null or undefined note');
  }

  const now = new Date().toISOString();
  
  // Create a StickyNote from database data with default values
  const appNote: StickyNote = {
    // Base properties from database
    // Ensure ID is a valid UUID, generate one if missing
    id: dbNote.id || uuidv4(),
    user_id: dbNote.user_id || '',
    content: dbNote.content || '',
    color: dbNote.color || '#fff9c4',
    position_x: Number(dbNote.position_x) || 0,
    position_y: Number(dbNote.position_y) || 0,
    width: Number(dbNote.width) || 200,
    height: Number(dbNote.height) || 200,
    z_index: Number(dbNote.z_index) || 0,
    is_archived: Boolean(dbNote.is_archived),
    category_id: dbNote.category_id || null,
    created_at: dbNote.created_at || now,
    updated_at: dbNote.updated_at || now,
    
    // Additional app properties
    category: dbNote.category || 'Uncategorized',
    createdAt: dbNote.created_at || now,
    updatedAt: dbNote.updated_at || now,
    userId: dbNote.user_id || ''
  };

  return appNote;
}

// Convert app note to database format
function mapAppNoteToDbNote(note: StickyNoteInput): Partial<StickyNoteBase> {
  if (!note) {
    throw new Error('Cannot map null or undefined note');
  }

  const now = new Date().toISOString();
  
  // Create a database representation
  const dbNote: Partial<StickyNoteBase> = {
    // Ensure ID is a valid UUID (remove any 'note_' prefix if present)
    id: (note.id && typeof note.id === 'string' && note.id.startsWith('note_')) 
      ? note.id.replace(/^note_/, '') 
      : note.id,
    user_id: note.userId || (note as any).user_id, // Use type assertion for user_id
    content: note.content || '',
    color: note.color || '#fff9c4',
    position_x: Number(note.position_x) || 0,
    position_y: Number(note.position_y) || 0,
    width: Number(note.width) || 200,
    height: Number(note.height) || 200,
    z_index: Number(note.z_index) || 0,
    is_archived: Boolean(note.is_archived),
    category_id: note.category_id || null,
    // Use type assertion to access created_at if it exists
    ...((note as any).created_at ? { created_at: (note as any).created_at } : {}),
    ...(note.createdAt ? { created_at: note.createdAt } : {}),
    // Always update the timestamp
    updated_at: now
  };

  // Remove any undefined values
  Object.keys(dbNote).forEach(key => dbNote[key as keyof typeof dbNote] === undefined && delete dbNote[key as keyof typeof dbNote]);
  
  return dbNote;
}

// Get all sticky notes for the current user
export async function getStickyNotes(userId: string): Promise<StickyNote[]> {
  if (!userId) {
    console.error('User ID is required to get sticky notes');
    return [];
  }

  // Ensure userId is a non-empty string
  const validUserId = typeof userId === 'string' && userId.trim() !== '' ? userId : '';
  
  // If user ID is missing, return empty array
  if (!validUserId) {
    console.error('User ID is required to get sticky notes');
    return [];
  }

  // If Supabase is not configured, use local storage
  if (!isSupabaseConfigured()) {
    return getStickyNotesFromLocalStorage(validUserId);
  }
  
  try {
    // Try to get notes from Supabase
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.error('Failed to initialize Supabase client');
      return getStickyNotesFromLocalStorage(validUserId);
    }

    const { data, error } = await supabase
      .from('sticky_notes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sticky notes from Supabase:', error);
      return getStickyNotesFromLocalStorage(userId);
    }

    // Map database notes to app notes format
    const notes = Array.isArray(data) 
      ? data.map(note => mapDbNoteToAppNote(note)).filter(Boolean) 
      : [];
    
    // Also save to local storage as fallback
    if (isBrowser()) {
      try {
        localStorage.setItem(`${STICKY_NOTES_KEY}_${userId}`, JSON.stringify(notes));
      } catch (e) {
        console.error('Error saving notes to localStorage:', e);
      }
    }
    
    return notes;
  } catch (error) {
    console.error('Error getting sticky notes from Supabase:', error);
    // Fall back to local storage if Supabase fails
    return getStickyNotesFromLocalStorage(userId);
  }
}

// Create or update a sticky note
export async function saveStickyNote(note: StickyNoteInput | Partial<StickyNote>, userId?: string): Promise<StickyNote | null> {
  // Always require an explicit userId parameter
  if (!userId) {
    console.error('User ID is required to save a sticky note');
    return null;
  }

  const now = new Date().toISOString();
  const isNewNote = !note?.id;
  
  try {
    // Prepare note data with required fields
    const noteData: Partial<StickyNote> = {
      ...note,
      user_id: userId,
      updatedAt: now,
      updated_at: now,
    };

    // For new notes, generate ID and set creation timestamp
    if (isNewNote) {
      noteData.id = uuidv4();
      noteData.createdAt = now;
      noteData.created_at = now;
    } else {
      // For existing notes, ensure we have the required fields
      const existingNote = (note && typeof note === 'object' && 'createdAt' in note && note.createdAt) || 
                         (note && typeof note === 'object' && 'created_at' in note && note.created_at) || 
                         now;
      noteData.createdAt = existingNote || now;
      noteData.created_at = existingNote || now;
      
      // Ensure the ID is a valid UUID (remove any prefix if present)
      if (note.id && typeof note.id === 'string' && note.id.startsWith('note_')) {
        noteData.id = note.id.replace(/^note_/, '');
      }
    }

    // Ensure required fields have defaults with proper null checks
    const safeNoteData: StickyNote = {
      id: noteData.id || uuidv4(),
      user_id: userId,
      content: noteData?.content || '',
      color: noteData?.color || '#fff9c4',
      position_x: typeof noteData?.position_x === 'number' ? noteData.position_x : 0,
      position_y: typeof noteData?.position_y === 'number' ? noteData.position_y : 0,
      width: typeof noteData?.width === 'number' ? noteData.width : 200,
      height: typeof noteData?.height === 'number' ? noteData.height : 200,
      z_index: typeof noteData?.z_index === 'number' ? noteData.z_index : 0,
      is_archived: Boolean(noteData?.is_archived),
      category: noteData?.category || 'Uncategorized',
      category_id: noteData?.category_id || null,
      created_at: noteData?.created_at || now,
      updated_at: now,
      createdAt: noteData?.createdAt || now,
      updatedAt: now,
    };

    // Convert app note to database format
    const dbNote = mapAppNoteToDbNote(safeNoteData);

    // Try to save note to Supabase if configured
    console.log('[saveStickyNote] Attempting to save to Supabase...');
    if (isSupabaseConfigured() && isBrowser()) {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Failed to initialize Supabase client');
      }

      console.log('[saveStickyNote] Sending to Supabase table: sticky_notes');
      const { data, error } = await supabase
        .from('sticky_notes')
        .upsert([dbNote])
        .select();

      if (error) {
        console.error('[saveStickyNote] Supabase upsert error:', error);
        console.error('[saveStickyNote] Error details:', {
          code: error.code,
          details: error.details,
          hint: error.hint,
          message: error.message
        });
        throw error;
      }
      
      if (data && Array.isArray(data) && data[0]) {
        const savedNote = mapDbNoteToAppNote(data[0]);
        // Update local storage with the saved note
        saveStickyNoteToLocalStorage(savedNote);
        return savedNote;
      }
    }
    
    // Fall back to local storage if Supabase is not configured or save failed
    return saveStickyNoteToLocalStorage({
      ...safeNoteData,
      user_id: userId // Ensure user_id is set when falling back to local storage
    });
  } catch (error) {
    console.error('[saveStickyNote] Error in main try-catch:', error);
    
    try {
      // Create a safe note object with all required fields for local storage
      const now = new Date().toISOString();
      const safeNoteForLocalStorage: StickyNote = {
        id: (note && 'id' in note && note.id) || uuidv4(),
        user_id: userId,
        content: (note && 'content' in note && note.content) || '',
        color: (note && 'color' in note && note.color) || '#fff9c4',
        position_x: (note && 'position_x' in note && typeof note.position_x === 'number') ? note.position_x : 0,
        position_y: (note && 'position_y' in note && typeof note.position_y === 'number') ? note.position_y : 0,
        width: (note && 'width' in note && typeof note.width === 'number') ? note.width : 200,
        height: (note && 'height' in note && typeof note.height === 'number') ? note.height : 200,
        z_index: (note && 'z_index' in note && typeof note.z_index === 'number') ? note.z_index : 0,
        is_archived: Boolean(note && 'is_archived' in note && note.is_archived),
        category: (note && 'category' in note && note.category) || 'Uncategorized',
        category_id: (note && 'category_id' in note && note.category_id) || null,
        created_at: (note && 'created_at' in note && note.created_at) || 
                   (note && 'createdAt' in note && note.createdAt) || 
                   now,
        updated_at: now,
        createdAt: (note && 'createdAt' in note && note.createdAt) || 
                  (note && 'created_at' in note && note.created_at) || 
                  now,
        updatedAt: now,
      };
      
      console.log('Falling back to local storage with note:', safeNoteForLocalStorage);
      
      // Fall back to local storage if Supabase fails
      return saveStickyNoteToLocalStorage(safeNoteForLocalStorage);
    } catch (fallbackError) {
      console.error('Error in fallback to local storage:', fallbackError);
      throw new Error('Failed to save note to local storage after Supabase error');
    }
  }
}

// Delete a sticky note
export async function deleteStickyNote(noteId: string, userId: string): Promise<boolean> {
  if (!userId) {
    console.error('User ID is required to delete sticky note');
    return false;
  }

  if (!noteId) {
    console.error('Note ID is required to delete sticky note');
    return false;
  }

  // If Supabase is not configured, use local storage
  if (!isSupabaseConfigured() || !isBrowser()) {
    return deleteStickyNoteFromLocalStorage(noteId, userId);
  }
  
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Failed to initialize Supabase client');
    }

    const { error } = await supabase
      .from('sticky_notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase delete error:', error);
      throw error;
    }

    // Also delete from local storage
    return deleteStickyNoteFromLocalStorage(noteId, userId);
  } catch (error) {
    console.error('Error deleting sticky note:', error);
    // Fall back to local storage if Supabase fails
    return deleteStickyNoteFromLocalStorage(noteId, userId);
  }
}

// Initialize default categories for a new user
async function initializeDefaultCategories(userId: string): Promise<StickyNoteCategory[]> {
  if (!userId) {
    console.error('User ID is required to initialize default categories');
    return [];
  }

  const now = new Date().toISOString();
  const defaultCategories = DEFAULT_STICKY_NOTE_CATEGORIES.map(cat => ({
    id: uuidv4(),
    user_id: userId,
    name: cat.name,
    color: cat.color,
    created_at: now,
    updated_at: now
  }));

  console.log(`Creating ${defaultCategories.length} default categories for user ${userId}`);

  console.log('Starting saveStickyNote with note:', JSON.stringify(note, null, 2));
  console.log('User ID:', userId);
  
  try {
    if (!isSupabaseConfigured()) {
      // Save to local storage if Supabase is not configured
      const userStorageKey = `${STICKY_NOTE_CATEGORIES_KEY}_${userId}`;
      localStorage.setItem(userStorageKey, JSON.stringify(defaultCategories));
      console.log(`Saved ${defaultCategories.length} default categories to local storage`);
      return defaultCategories;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Failed to initialize Supabase client');
    }

    // Check existing categories first
    const { data: existingCategories, error: checkError } = await supabase
      .from('sticky_note_categories')
      .select('name')
      .eq('user_id', userId);
      
    if (checkError) {
      console.error('Error checking existing categories:', checkError);
      // Fall back to localStorage if database check fails
      const userStorageKey = `${STICKY_NOTE_CATEGORIES_KEY}_${userId}`;
      localStorage.setItem(userStorageKey, JSON.stringify(defaultCategories));
      return defaultCategories;
    }
    
    // Filter out categories that already exist
    const existingNames = new Set(existingCategories.map(cat => cat.name));
    const categoriesToInsert = defaultCategories.filter(cat => !existingNames.has(cat.name));
    
    if (categoriesToInsert.length === 0) {
      console.log('All default categories already exist for this user');
      // Return the existing categories
      const { data: allCategories } = await supabase
        .from('sticky_note_categories')
        .select('*')
        .eq('user_id', userId);
      return allCategories || [];
    }
    
    // Insert only the missing categories
    console.log(`Inserting ${categoriesToInsert.length} missing default categories`);
    const { data, error } = await supabase
      .from('sticky_note_categories')
      .insert(categoriesToInsert)
      .select();

    if (error) {
      console.error('Error inserting default categories:', error);
      // Fall back to localStorage if database insert fails
      const userStorageKey = `${STICKY_NOTE_CATEGORIES_KEY}_${userId}`;
      localStorage.setItem(userStorageKey, JSON.stringify(defaultCategories));
      console.log('Fell back to local storage after database error');
      return defaultCategories;
    }
    
    // Return all categories including both existing and newly inserted ones
    const { data: allCategories } = await supabase
      .from('sticky_note_categories')
      .select('*')
      .eq('user_id', userId);
      
    console.log(`Successfully retrieved ${allCategories?.length} total categories`);
    return allCategories || [];
  } catch (error) {
    console.error('Error initializing default categories:', error);
    // Fall back to localStorage in case of any error
    const userStorageKey = `${STICKY_NOTE_CATEGORIES_KEY}_${userId}`;
    localStorage.setItem(userStorageKey, JSON.stringify(defaultCategories));
    console.log('Fell back to local storage after unexpected error');
    return defaultCategories;
  }
}

// Ensure a user has the default categories
// Returns true if categories were initialized, false otherwise
export async function ensureUserHasCategories(userId: string): Promise<boolean> {
  if (!userId) {
    console.error('User ID is required to ensure categories');
    return false;
  }
  
  try {
    // Check if user already has categories
    const existingCategories = await getStickyNoteCategories(userId);
    
    // If there are categories, no need to initialize
    if (existingCategories && existingCategories.length > 0) {
      console.log(`User ${userId} already has ${existingCategories.length} categories`);
      return true;
    }
    
    console.log(`Initializing default categories for user ${userId}`);
    const defaultCategories = await initializeDefaultCategories(userId);
    return defaultCategories.length > 0;
  } catch (error) {
    console.error('Error ensuring user has categories:', error);
    return false;
  }
}

// Get all categories for the current user, initializing defaults if none exist
export async function getStickyNoteCategories(userId: string): Promise<StickyNoteCategory[]> {
  console.log(`Fetching sticky note categories for user ${userId}`);
  
  // Validate userId
  if (!userId) {
    console.error('User ID is required to get sticky note categories');
    return transformDefaultCategories(userId);
  }

  // Try to get from database first if Supabase is configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.error('Failed to initialize Supabase client');
        return getStickyNoteCategoriesFromLocalStorage(userId);
      }
      
      const { data, error } = await supabase
        .from('sticky_note_categories')
        .select('*')
        .eq('user_id', userId)
        .order('name');

      if (error) {
        console.error('Error fetching sticky note categories:', error);
        return getStickyNoteCategoriesFromLocalStorage(userId);
      }

      console.log(`Found ${data ? data.length : 0} categories for user ${userId} in database`);

      if (data && data.length > 0) {
        // User has database categories, use those
        return data;
      } else {
        // No categories found for this user - initialize with defaults
        const defaultCategories = await initializeDefaultCategories(userId);
        
        // Try fetching again after initialization if we have Supabase
        if (isSupabaseConfigured() && supabase) {
          const { data: initializedData } = await supabase
            .from('sticky_note_categories')
            .select('*')
            .eq('user_id', userId)
            .order('name');
          
          return initializedData || defaultCategories;
        }
        
        return defaultCategories;
      }
    } catch (error) {
      console.error('Error in getStickyNoteCategories:', error);
      return getStickyNoteCategoriesFromLocalStorage(userId);
    }
  }
  
  // Fallback to localStorage
  return getStickyNoteCategoriesFromLocalStorage(userId);
}

// Helper to transform default categories into StickyNoteCategory objects
function transformDefaultCategories(userId: string = 'default'): StickyNoteCategory[] {
  const now = new Date().toISOString();
  return DEFAULT_STICKY_NOTE_CATEGORIES.map((cat, index) => ({
    id: `default-${index}-${Date.now()}`,
    user_id: userId,
    name: cat.name,
    color: cat.color,
    created_at: now,
    updated_at: now
  }));
}

// Create or update a category
export async function saveStickyNoteCategory(category: Partial<StickyNoteCategory>): Promise<StickyNoteCategory | null> {
  const isUpdate = !!category.id;
  const now = new Date().toISOString();
  
  // Ensure we have a valid user ID
  if (!category.user_id) {
    const currentUser = await getCurrentUser();
    if (currentUser?.id) {
      category.user_id = currentUser.id;
    } else {
      console.error('User ID is required to save a category');
      return null;
    }
  }
  
  const categoryData = {
    ...category,
    updated_at: now,
    ...(!isUpdate && { 
      id: uuidv4(),
      created_at: now 
    })
  };

  // If Supabase is not configured, use local storage
  if (!isSupabaseConfigured()) {
    return saveStickyNoteCategoryToLocalStorage(categoryData);
  }
  
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.error('Failed to initialize Supabase client');
      return saveStickyNoteCategoryToLocalStorage(categoryData);
    }

    const { data, error } = isUpdate
      ? await supabase
          .from('sticky_note_categories')
          .update(categoryData)
          .eq('id', category.id!)
          .select()
      : await supabase
          .from('sticky_note_categories')
          .insert([categoryData])
          .select();

    if (error) throw error;
    
    const savedCategory = data?.[0];
    if (savedCategory) {
      // Update local storage as cache
      saveStickyNoteCategoryToLocalStorage(savedCategory, categoryData.user_id);
      return savedCategory;
    }
    
    return null;
  } catch (error) {
    console.error('Error saving sticky note category:', error);
    // Fall back to local storage on error
    return saveStickyNoteCategoryToLocalStorage(categoryData);
  }
}

// Local storage fallback functions
function getStickyNotesFromLocalStorage(userId: string): StickyNote[] {
  if (!isBrowser() || !userId) return [];
  
  try {
    const notesJson = localStorage.getItem(`${STICKY_NOTES_KEY}_${userId}`);
    if (!notesJson) return [];
    
    const notes = JSON.parse(notesJson);
    if (!Array.isArray(notes)) return [];
    
    const now = new Date().toISOString();
    return notes
      .filter((note): note is Record<string, any> => note !== null && typeof note === 'object')
      .map((note) => ({
        id: note.id || generateStickyNoteId(),
        user_id: note.user_id || userId,
        content: note.content || '',
        color: note.color || '#fff9c4',
        position_x: typeof note.position_x === 'number' ? note.position_x : 0,
        position_y: typeof note.position_y === 'number' ? note.position_y : 0,
        width: typeof note.width === 'number' ? note.width : 200,
        height: typeof note.height === 'number' ? note.height : 200,
        z_index: typeof note.z_index === 'number' ? note.z_index : 0,
        is_archived: Boolean(note.is_archived),
        category: note.category || 'Uncategorized',
        category_id: note.category_id || null,
        created_at: note.created_at || note.createdAt || now,
        updated_at: note.updated_at || note.updatedAt || now,
        createdAt: note.createdAt || note.created_at || now,
        updatedAt: note.updatedAt || note.updated_at || now
      } as StickyNote));
  } catch (error) {
    console.error('Error getting sticky notes from localStorage:', error);
    return [];
  }
}

function deleteStickyNoteFromLocalStorage(noteId: string, userId: string): boolean {
  if (!isBrowser() || !noteId || !userId) return false;
  
  try {
    const notes = getStickyNotesFromLocalStorage(userId);
    const initialLength = notes.length;
    const filteredNotes = notes.filter(note => note && note.id !== noteId);
    
    if (filteredNotes.length === initialLength) return false; // No note was removed
    
    localStorage.setItem(`${STICKY_NOTES_KEY}_${userId}`, JSON.stringify(filteredNotes));
    return true;
  } catch (error) {
    console.error('Error deleting sticky note from localStorage:', error);
    return false;
  }
}

function getStickyNoteCategoriesFromLocalStorage(userId: string = 'default'): StickyNoteCategory[] {
  if (!isBrowser()) {
    return transformDefaultCategories(userId);
  }
  
  console.log('Starting saveStickyNote with note:', JSON.stringify(note, null, 2));
  console.log('User ID:', userId);
  
  try {
    // Try to get saved categories
    const key = `${STICKY_NOTE_CATEGORIES_KEY}_${userId}`;
    const categoriesJson = localStorage.getItem(key);
    
    if (!categoriesJson) {
      // If no categories exist, create and save default ones
      const defaultCategories = transformDefaultCategories(userId);
      localStorage.setItem(key, JSON.stringify(defaultCategories));
      return defaultCategories;
    }
    
    // Parse and validate saved categories
    const savedCategories = JSON.parse(categoriesJson);
    
    // Ensure we have a valid array of categories
    if (Array.isArray(savedCategories)) {
      const validCategories = savedCategories.filter((cat): cat is StickyNoteCategory => 
        cat && 
        typeof cat === 'object' && 
        'id' in cat && 
        'name' in cat &&
        'color' in cat
      );
      
      // If we have valid categories, return them
      if (validCategories.length > 0) {
        return validCategories;
      }
    }
    
    // If we get here, either the saved data was invalid or empty
    const defaultCategories = transformDefaultCategories(userId);
    localStorage.setItem(key, JSON.stringify(defaultCategories));
    return defaultCategories;
    
  } catch (error) {
    console.error('Error getting sticky note categories from localStorage:', error);
    // Return default categories as fallback
    return transformDefaultCategories(userId);
  }
}

function saveStickyNoteCategoryToLocalStorage(category: Partial<StickyNoteCategory>, userId?: string): StickyNoteCategory | null {
  if (!isBrowser()) return null;
  
  console.log('Starting saveStickyNote with note:', JSON.stringify(note, null, 2));
  console.log('User ID:', userId);
  
  try {
    const storageKey = userId ? `${STICKY_NOTE_CATEGORIES_KEY}_${userId}` : STICKY_NOTE_CATEGORIES_KEY;
    const categories = getStickyNoteCategoriesFromLocalStorage(userId);
    const now = new Date().toISOString();
    let updatedCategory: StickyNoteCategory | null = null;
    
    // Ensure required fields are present
    if (!category.name) {
      console.error('Category name is required');
      return null;
    }
    
    // Ensure user_id is set
    const categoryWithUserId = userId ? { ...category, user_id: userId } : category;
    
    if (category.id) {
      // Update existing category
      const index = categories.findIndex((c: StickyNoteCategory) => c.id === category.id);
      if (index >= 0) {
        categories[index] = { 
          ...categories[index], 
          ...categoryWithUserId, 
          updated_at: now 
        } as StickyNoteCategory;
        updatedCategory = categories[index];
      } else {
        // Create new category with specified ID
        const newCategory = {
          ...categoryWithUserId,
          id: category.id,
          created_at: now,
          updated_at: now,
        } as StickyNoteCategory;
        categories.push(newCategory);
        updatedCategory = newCategory;
      }
    } else {
      // Create new category with generated ID
      const newCategory = {
        ...categoryWithUserId,
        id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: now,
        updated_at: now,
      } as StickyNoteCategory;
      categories.push(newCategory);
      updatedCategory = newCategory;
    }
    
    // Save back to localStorage
    localStorage.setItem(storageKey, JSON.stringify(categories));
    return updatedCategory;
  } catch (error) {
    console.error('Error saving sticky note category to localStorage:', error);
    return null;
  }
}
