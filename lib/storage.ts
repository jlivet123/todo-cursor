import { getSupabaseClient, isSupabaseConfigured } from "./supabase"
import { sampleTasks } from "./sample-data"

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
    const tasksWithSubtasks = tasks.map((task) => ({
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
      subtasks: subtasks
        .filter((subtask) => subtask.task_id === task.id)
        .map((subtask) => ({
          id: subtask.id,
          text: subtask.text,
          completed: subtask.completed,
        })),
    }))

    return tasksWithSubtasks
  } catch (error) {
    console.error("Error getting tasks from Supabase:", error)
    // Fallback to localStorage if Supabase fails
    return getTasksFromLocalStorage()
  }
}

// Save a task to Supabase or localStorage
export async function saveTask(task: Task): Promise<Task | null> {
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

    // Prepare task data for Supabase
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
      user_id: userId,
    }

    // Insert or update task
    const { data, error } = await supabase.from("tasks").upsert(taskData).select().single()

    if (error) throw error

    // Handle subtasks
    if (task.subtasks && task.subtasks.length > 0) {
      // Prepare subtask data
      const subtaskData = task.subtasks.map((subtask, index) => ({
        id: subtask.id,
        task_id: task.id,
        text: subtask.text,
        completed: subtask.completed,
        position: index,
      }))

      // Insert or update subtasks
      const { error: subtaskError } = await supabase.from("subtasks").upsert(subtaskData)

      if (subtaskError) throw subtaskError
    }

    return {
      ...task,
      id: data.id,
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
  if (!isSupabaseConfigured() && isBrowser()) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
  }
}
