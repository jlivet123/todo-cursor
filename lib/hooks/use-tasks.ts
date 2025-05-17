"use client"

import { useState, useEffect } from "react"
import { format, addDays, subDays, startOfToday, isBefore, isToday } from "date-fns"
import { type Task, getTasks, saveTask, deleteTaskFromSupabase, saveTasks } from "@/lib/storage"
import { useAuth } from "@/lib/auth-context"
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase"

// Helper to ensure consistent date object creation
function ensureDateObj(dateStr: string | undefined): Date | undefined {
  if (!dateStr) return undefined;
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? undefined : date;
  } catch (e) {
    return undefined;
  }
}

interface DayWithTasks {
  date: Date
  tasks: Task[]
  isPast: boolean
}

// Add this debounce utility to prevent the moveTask function from being called too frequently
function debounce<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return function(...args: Parameters<T>) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      func(...args)
    }, delay)
  }
}

export function useTasks() {
  const [days, setDays] = useState<DayWithTasks[]>([])
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user, status } = useAuth()

  // Function to fetch tasks from the database
  const fetchTasks = async () => {
    try {
      setIsLoading(true)
      const tasks = await getTasks()
      setAllTasks(tasks)
      // Process tasks into days
      processTasksIntoDays(tasks)
    } catch (err) {
      console.error("Error fetching tasks:", err)
      setError("Failed to load tasks")
    } finally {
      setIsLoading(false)
    }
  }

  // Process tasks into days with proper date handling
  const processTasksIntoDays = (tasks: Task[]) => {
    const today = startOfToday()
    const newDays: DayWithTasks[] = []
    
    // Create 7 days (today + 6 days)
    for (let i = 0; i < 7; i++) {
      const date = addDays(today, i)
      const dateStr = format(date, 'yyyy-MM-dd')
      const dateMMMD = format(date, 'MMM d')
      
      // Filter tasks for this day
      const dayTasks = tasks.filter(task => {
        const currentDate = date; // The date we're currently processing (today + i days)
        const currentDateStr = format(currentDate, 'yyyy-MM-dd');
        const currentDateMMMD = format(currentDate, 'MMM d');
        
        // For completed tasks, check if they were completed on this exact day
        if (task.completed) {
          const completedDate = task.completionDate || task.completionDateMMMD;
          return completedDate === currentDateStr || completedDate === currentDateMMMD;
        }
        
        // For incomplete tasks
        const dueDate = task.dueDate;
        const startDate = task.startDate;
        
        // Parse dates if they exist
        const taskDueDate = dueDate ? new Date(dueDate) : null;
        const taskStartDate = startDate ? new Date(startDate) : null;
        
        // Check if task should be visible on this date
        const isStartDateMatch = taskStartDate ? 
          (format(taskStartDate, 'yyyy-MM-dd') === currentDateStr || 
          format(taskStartDate, 'MMM d') === currentDateMMMD) : false;
          
        const isDueDateMatch = taskDueDate ? 
          (format(taskDueDate, 'yyyy-MM-dd') === currentDateStr || 
          format(taskDueDate, 'MMM d') === currentDateMMMD) : false;
        
        // Check if task should be shown today (i === 0)
        if (i === 0) { // Today's column
          // Only show if task has started (start date is today or in the past)
          // and either has no due date or is due today or in the future
          const hasStarted = !taskStartDate || (taskStartDate <= currentDate);
          const notOverdue = !taskDueDate || (taskDueDate >= currentDate);
          
          if (hasStarted && notOverdue) {
            return true;
          }
        }
        
        // For any day, only show if it's the exact start date or due date
        return isStartDateMatch || isDueDateMatch;
      });
      
      newDays.push({
        date,
        tasks: dayTasks,
        isPast: isBefore(date, today) && !isToday(date)
      })
    }
    
    setDays(newDays)
  }

  // Create a task
  const createTask = async (text: string, dayIndex: number, category: 'work' | 'personal') => {
    try {
      const newTask: Omit<Task, 'id'> = {
        text,
        completed: false,
        category,
        position: 0,
        day: format(days[dayIndex].date, "yyyy-MM-dd"),
        startDate: format(days[dayIndex].date, "MMM d"),
        dueDate: format(days[dayIndex].date, "yyyy-MM-dd"),
        startDateObj: new Date(days[dayIndex].date.getTime()),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      const savedTask = await saveTask(newTask)
      if (savedTask) {
        setAllTasks(prev => [...prev, savedTask])
        await fetchTasks() // Refresh the task list
        return savedTask
      }
      return null
    } catch (err) {
      console.error("Error creating task:", err)
      return null
    }
  }

  // Update a task
  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const taskToUpdate = allTasks.find(t => t.id === taskId)
      if (!taskToUpdate) return null
      
      const updatedTask = { ...taskToUpdate, ...updates, updatedAt: new Date().toISOString() }
      const savedTask = await saveTask(updatedTask)
      
      if (savedTask) {
        setAllTasks(prev => prev.map(t => t.id === taskId ? savedTask : t))
        await fetchTasks() // Refresh the task list
      }
      
      return savedTask
    } catch (err) {
      console.error("Error updating task:", err)
      return null
    }
  }

  // Delete a task
  const deleteTask = async (taskId: string) => {
    try {
      await deleteTaskFromSupabase(taskId)
      setAllTasks(prev => prev.filter(t => t.id !== taskId))
      await fetchTasks() // Refresh the task list
      return true
    } catch (err) {
      console.error("Error deleting task:", err)
      return false
    }
  }

  // Update task positions after reordering
  const updatePositionsAfterReorder = async (dayIndex: number, columnType: 'work' | 'personal') => {
    try {
      const dayTasks = [...days[dayIndex].tasks]
      const columnTasks = dayTasks.filter(task => task.category === columnType)
      
      // Update positions based on current order
      const updatedTasks = columnTasks.map((task, index) => ({
        ...task,
        position: index,
        updatedAt: new Date().toISOString()
      }))
      
      // Save all updated tasks
      await Promise.all(updatedTasks.map(task => saveTask(task)))
      
      // Update local state
      setAllTasks(prev => 
        prev.map(task => {
          const updatedTask = updatedTasks.find(t => t.id === task.id)
          return updatedTask || task
        })
      )
    } catch (err) {
      console.error("Error updating task positions:", err)
    }
  }

  // Move task implementation
  const moveTaskImpl = async (
    dragIndex: number,
    hoverIndex: number,
    fromDayIndex: number,
    toDayIndex: number,
    fromColumnType: 'work' | 'personal',
    toColumnType: 'work' | 'personal',
    taskId?: string
  ) => {
    try {


      // Skip invalid moves
      if (days.length <= fromDayIndex || days.length <= toDayIndex || fromDayIndex < 0 || toDayIndex < 0) {
        console.error(`Invalid day indices - fromDayIndex: ${fromDayIndex}, toDayIndex: ${toDayIndex}, days length: ${days.length}`);
        return null;
      }

      // Find the task to move - first by ID (most reliable)
      let draggedTask: Task | undefined;
      
      if (taskId) {
        // First try the specific day and column
        if (fromDayIndex >= 0 && fromDayIndex < days.length) {
          draggedTask = days[fromDayIndex].tasks.find(t => t.id === taskId);
        }
        
        // If not found, search all tasks
        if (!draggedTask) {
          for (const day of days) {
            const foundTask = day.tasks.find(t => t.id === taskId);
            if (foundTask) {
              draggedTask = foundTask;
              break;
            }
          }
        }
        
        // Last resort, check allTasks
        if (!draggedTask) {
          draggedTask = allTasks.find(t => t.id === taskId);
        }
      }
      
      // If task wasn't found by ID, try using indices
      if (!draggedTask && fromDayIndex >= 0 && fromDayIndex < days.length) {
        const tasksInSourceColumn = days[fromDayIndex].tasks.filter(
          task => task.category === fromColumnType
        );
        
        if (dragIndex >= 0 && dragIndex < tasksInSourceColumn.length) {
          draggedTask = tasksInSourceColumn[dragIndex];
        }
      }

      // If we still couldn't find the task, abort
      if (!draggedTask) {
        const errorMsg = `Could not find task to move (index: ${dragIndex}, day: ${fromDayIndex}, id: ${taskId}). Available tasks: ${allTasks.length} total, ${days[fromDayIndex]?.tasks?.length || 0} in source day.`;
        console.error(errorMsg);
        console.debug('All tasks:', allTasks);
        console.debug('Source day tasks:', days[fromDayIndex]?.tasks || []);
        throw new Error(errorMsg);
      }

      // Create a deep copy of the task to avoid mutation issues
      const updatedTask: Task = { ...draggedTask };
      
      // Update category if needed
      if (fromColumnType !== toColumnType) {
        updatedTask.category = toColumnType;

      }

      // Update dates when moving between days
      if (fromDayIndex !== toDayIndex && toDayIndex >= 0 && toDayIndex < days.length) {
        // Get the target date from the day
        const targetDate = days[toDayIndex].date;
        
        // For display (MMM d format)
        updatedTask.startDate = format(targetDate, "MMM d");
        
        // For ISO format (yyyy-MM-dd)
        updatedTask.dueDate = format(targetDate, "yyyy-MM-dd");
        
        // Day field for better filtering
        updatedTask.day = format(targetDate, "yyyy-MM-dd");
        
        // Create a clean date object for startDateObj
        updatedTask.startDateObj = new Date(targetDate.getTime());
        

      }

      // Make sure the task has all necessary fields
      const taskToSave = {
        ...updatedTask,
        // Ensure critical fields are present
        id: updatedTask.id,
        category: updatedTask.category,
        // If moving between days, ensure day and date fields are set
        ...(fromDayIndex !== toDayIndex && {
          day: format(days[toDayIndex].date, "yyyy-MM-dd"),
          startDate: format(days[toDayIndex].date, "MMM d"),
          dueDate: format(days[toDayIndex].date, "yyyy-MM-dd"),
          startDateObj: new Date(days[toDayIndex].date.getTime())
        })
      };
      

      
      // Save to database
      const savedTask = await saveTask(taskToSave);
      
      // Manually save to localStorage as a backup
      try {
        const storageKey = isSupabaseConfigured() ? "supabase-tasks" : "tasks";
        const storedTasks = JSON.parse(localStorage.getItem(storageKey) || "[]");
        
        // Find and update the task in localStorage
        let found = false;
        const updatedStoredTasks = storedTasks.map((t: Task) => {
          if (t.id === taskToSave.id) {
            found = true;
            return taskToSave;
          }
          return t;
        });
        
        // If not found, add it
        if (!found) {
          updatedStoredTasks.push(taskToSave);
        }
        
        // Save back to localStorage
        localStorage.setItem(storageKey, JSON.stringify(updatedStoredTasks));

      } catch (storageError) {
        console.error('Error saving to localStorage:', storageError);
        // Don't fail the operation if localStorage fails
      }
      
      if (!savedTask) {
        const errorMsg = `Failed to save task to database: ${JSON.stringify(taskToSave, null, 2)}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      

      
      // Update UI states
      setAllTasks(prevTasks => 
        prevTasks.map(t => t.id === savedTask.id ? savedTask : t)
      );
      
      setDays(prevDays => {
        const newDays = [...prevDays];
        
        // Remove from source day
        if (fromDayIndex >= 0 && fromDayIndex < newDays.length) {
          newDays[fromDayIndex] = {
            ...newDays[fromDayIndex],
            tasks: newDays[fromDayIndex].tasks.filter(t => t.id !== savedTask.id)
          };
        }
        
        // Add to target day at the specific position
        if (toDayIndex >= 0 && toDayIndex < newDays.length) {
          const targetDayTasks = [...newDays[toDayIndex].tasks];
          
          // Insert at the position specified by hoverIndex or at the end
          const insertAt = Math.min(hoverIndex, targetDayTasks.length);
          targetDayTasks.splice(insertAt, 0, savedTask);
          
          newDays[toDayIndex] = {
            ...newDays[toDayIndex],
            tasks: targetDayTasks
          };
        }
        
        return newDays;
      });

      // Update positions if necessary
      if (fromDayIndex === toDayIndex && fromColumnType === toColumnType) {
        await updatePositionsAfterReorder(toDayIndex, toColumnType);
      }
      
      // Set flag to prevent immediate refresh
      if (typeof window !== 'undefined') {
        window.lastTaskMoveTime = Date.now();
      }
      
      // Force a database sync after a slight delay
      setTimeout(async () => {
        try {
          if (isSupabaseConfigured()) {
            const supabase = getSupabaseClient();
            if (supabase) {
              // Try to sync the specific task with the database
              const { data, error } = await supabase
                .from("tasks")
                .select("*")
                .eq("id", savedTask.id)
                .single();
                
              if (error) {
                console.error("Error checking task in database:", error);
              } else if (!data) {
                // Attempt direct insertion if not found
                const { error: insertError } = await supabase
                  .from("tasks")
                  .insert([savedTask]);
                  
                if (insertError) {
                  console.error("Error inserting task to database:", insertError);
                }
              } else {
                console.log("Task successfully verified in database");
              }
            }
          }
        } catch (syncError) {
          console.error("Error syncing with database:", syncError);
        }
      }, 1000);
      
      return savedTask;
    } catch (err) {
      console.error("Error moving task:", err);
      return null;
    }
  };

  // Create a debounced version of moveTask that properly handles Promises
  const moveTask = (
    ...args: Parameters<typeof moveTaskImpl>
  ): Promise<Task | null> => {
    return new Promise((resolve) => {
      const debouncedFn = debounce(async () => {
        try {
          const result = await moveTaskImpl(...args);
          resolve(result);
        } catch (err) {
          console.error('Error in debounced moveTask:', err);
          resolve(null);
        }
      }, 150);
      
      debouncedFn();
    });
  };

  // Find the index of today in the days array
  const findTodayIndex = () => {
    return days.findIndex((day) => isToday(day.date));
  }

  // Load tasks when user changes or on initial render
  useEffect(() => {
    if (status === "authenticated" || status === "unconfigured" || !isSupabaseConfigured()) {
      fetchTasks();
    }
  }, [status, user]);

  return {
    days,
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    refreshTasks: fetchTasks,
    loadMoreDays: () => { /* Implement if needed */ },
    findTodayIndex,
    updateTaskPositions: updatePositionsAfterReorder,
  };
}
