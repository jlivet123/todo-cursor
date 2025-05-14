import { getSupabaseClient, isSupabaseConfigured } from "./supabase"
import { sampleTasks } from "./sample-data"
import { format } from "date-fns"

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
  startDate?: string
  dueDate?: string
  startDateObj?: Date | null
  dueDateObj?: Date | null
  position?: number
  completionDate?: string
  completionDateMMMD?: string
  completionDateObj?: Date | null
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


// Helper function to check if we're in a browser environment
const isBrowser = () => typeof window !== "undefined"

// Fallback to localStorage if Supabase is not configured
function getTasksFromLocalStorage(): Task[] {
  if (!isBrowser()) return []

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
      
      return {
        ...task,
        id: task.id,
        text: task.text,
        completed: task.completed,
        category: task.category,
        time: task.time,
        timeDisplay: task.time_display,
        description: task.description,
        startDate: task.start_date,
        dueDate: task.due_date,
        position: task.position,
        completionDate: task.completion_date,
        // Use our generated MMM d format since the column doesn't exist in the database
        completionDateMMMD: completionDateMMMD,
        completionDateObj,
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
    
    // Prepare task data for Supabase - only include fields that exist in the database
    const taskData = {
      id: task.id,
      text: task.text,
      completed: task.completed,
      category: task.category,
      time: task.time,
      time_display: task.timeDisplay,
      description: task.description,
      start_date: task.startDate,
      due_date: task.dueDate,
      position: task.position || 0,
      completion_date: task.completionDate,
      // Don't include completion_date_mmmd as it doesn't exist in the database
      user_id: userId,
    }

    // Debugging log for taskData
    console.log(`Saving task to Supabase: ${task.text} (ID: ${task.id}) with data:`, taskData);

    // Insert or update task
    const { data, error } = await supabase.from("tasks").upsert(taskData).select().single()

    if (error) throw error
    
    // Map the returned data from Supabase to our Task object
    const savedTask = {
      ...task,
      id: data.id,
      text: data.text,
      completed: data.completed,
      category: data.category,
      time: data.time,
      timeDisplay: data.time_display,
      description: data.description,
      startDate: data.start_date,
      dueDate: data.due_date,
      position: data.position,
      completionDate: data.completion_date,
      completionDateMMMD: data.completion_date_mmmd
    }

    console.log(`Task saved to Supabase: ${savedTask.text} (ID: ${savedTask.id})`);

    // Process subtasks if they exist
    // Note: For task moves between days, we now use a direct update in use-tasks.ts
    // which avoids calling this function altogether for simple date/category changes
    if (task.subtasks && task.subtasks.length > 0) {
      try {
        // Prepare subtask data
        const subtaskData = task.subtasks.map((subtask, index) => ({
          id: subtask.id,
          task_id: savedTask.id,
          text: subtask.text,
          completed: subtask.completed,
          position: index,
        }))

        // Use upsert instead of delete+insert to avoid conflicts
        const { error: subtaskError } = await supabase
          .from("subtasks")
          .upsert(subtaskData, { onConflict: 'id' })
        
        if (subtaskError) {
          console.error("Error upserting subtasks:", subtaskError);
          // Even if there's an error with subtasks, continue with the task
        }
      } catch (subtaskError) {
        console.error("Error handling subtasks:", subtaskError);
      }
    }
    
    // Always include the subtasks in the returned task object
    savedTask.subtasks = task.subtasks || [];

    return savedTask
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

  try {
    localStorage.setItem(DECISION_MATRIX_STORAGE_KEY, JSON.stringify(entries))
  } catch (error) {
    console.error("Error saving decision matrix to localStorage:", error)
  }
}
