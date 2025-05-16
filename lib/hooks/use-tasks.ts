"use client"

import { useState, useEffect } from "react"
import { format, addDays, subDays, startOfToday, isBefore, isToday } from "date-fns"
import { type Task, getTasks, saveTask, deleteTaskFromSupabase, saveTasks } from "@/lib/storage"
import { useAuth } from "@/lib/auth-context"
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase"

interface DayWithTasks {
  date: Date
  tasks: Task[]
  isPast: boolean
}

// Add this debounce/throttle utility at the top of the file, just below the imports
// This will prevent the moveTask function from being called too frequently
function throttle<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;
    
    // Store the latest arguments
    lastArgs = args;
    
    // If we're within the throttle period, schedule a call
    if (timeSinceLastCall < delay) {
      // Clear any existing timeout
      if (timeout) clearTimeout(timeout);
      
      // Schedule a new call with the latest arguments
      timeout = setTimeout(() => {
        lastCall = Date.now();
        func(...(lastArgs as Parameters<T>));
        timeout = null;
        lastArgs = null;
      }, delay - timeSinceLastCall);
      
      return;
    }
    
    // Otherwise call immediately
    lastCall = now;
    func(...args);
  };
}

// Debugging function to log task assignments
const logTaskAssignments = (days: DayWithTasks[]) => {
  console.log('=== TASK ASSIGNMENT DEBUGGING ===');
  
  days.forEach((day, idx) => {
    console.log(`Day ${idx}: ${format(day.date, 'MMM d')} - ${day.tasks.length} tasks`);
    
    if (day.tasks.length > 0) {
      day.tasks.forEach(task => {
        console.log(`  - Task: ${task.text} (ID: ${task.id.substring(0, 6)}...)`);
        console.log(`    Start Date: ${task.startDate}, Completed: ${task.completed}`);
      });
    }
  });
};

export function useTasks() {
  const [days, setDays] = useState<DayWithTasks[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [visibleDaysRange, setVisibleDaysRange] = useState({ past: 0, future: 21 })
  const { user, status } = useAuth()

  // Load tasks from Supabase or localStorage
  const fetchTasks = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Only fetch if user is authenticated or Supabase is not configured
      if (status === "authenticated" || status === "unconfigured" || !isSupabaseConfigured()) {
        const tasks = await getTasks()
        setAllTasks(tasks)

        // Group tasks by start date
        const today = startOfToday()

        // Efficiently generate date strings for comparison
        const todayFormatted = format(today, "MMM d");
        const futureDateStrings = Array.from(
          { length: visibleDaysRange.future }, 
          (_, i) => format(addDays(today, i), "MMM d")
        );
        
        // Cache tomorrow's date string for frequent comparisons
        const tomorrowFormatted = format(addDays(today, 1), "MMM d");
        
        console.log(`Today is ${todayFormatted}, tomorrow is ${tomorrowFormatted}`);

        // Get all TRULY incomplete tasks from PAST days ONLY for rollover
        const incompletePastTasks = tasks.filter(task => {
          // Skip completed tasks immediately
          if (task.completed) return false;
          
          // Skip tasks with no start date
          if (!task.startDate) return false;

          // EXPLICITLY exclude tomorrow's tasks from showing up today
          if (task.startDate === tomorrowFormatted) {
            console.log(`Task ${task.text} is scheduled for tomorrow (${tomorrowFormatted}), NOT showing today`);
            return false;
          }
          
          // Also check future dates beyond tomorrow
          if (futureDateStrings.slice(1).includes(task.startDate)) { // slice(1) removes today
            console.log(`Task ${task.text} is scheduled for a future date (${task.startDate}), NOT showing today`);
            return false;
          }
          
          // Exclude tasks explicitly scheduled for today
          if (task.startDate === todayFormatted) {
            console.log(`Task ${task.text} is scheduled for today (${todayFormatted}), not considered 'past'`);
            return false;
          }
          
          // If we have a date object, use it for reliable comparison
          if (task.startDateObj) {
            // Only include if it's strictly from past (before today)
            return isBefore(task.startDateObj, today) && !isToday(task.startDateObj);
          }
          
          // For tasks with string dates we need to be more careful
          try {
            // Try parsing as ISO date first
            const taskDate = new Date(task.startDate);
            if (!isNaN(taskDate.getTime())) {
              return isBefore(taskDate, today) && !isToday(taskDate);
            }
            
            // If we get here, assume the task is from the past 
            // since we already eliminated today and future dates
            console.log(`Task ${task.text} with date ${task.startDate} presumed to be from past, rolling to today`);
            return true;
          } catch (e) {
            console.error(`Error determining if task is from past: ${task.text}`, e);
            return false;
          }
        });

        // Create past days
        const pastDays = Array.from({ length: visibleDaysRange.past }, (_, i) => {
          const date = subDays(today, visibleDaysRange.past - i);
          const dateStr = format(date, "MMM d");
          const isPast = isBefore(date, today) && !isToday(date);
          
          // Get tasks for this past day
          const tasksForDay = tasks.filter(task => {
            // Match tasks that start on this day
            if (task.startDate === dateStr) return true;
            
            // Match tasks completed on this day
            if (task.completionDateObj) {
              const completionDate = new Date(task.completionDateObj);
              return completionDate.getFullYear() === date.getFullYear() &&
                     completionDate.getMonth() === date.getMonth() &&
                     completionDate.getDate() === date.getDate();
            }
            
            if (task.completionDate) {
              if (task.completionDate === dateStr) return true;
              
              try {
                const completionD = new Date(task.completionDate);
                if (!isNaN(completionD.getTime())) {
                  return completionD.getFullYear() === date.getFullYear() &&
                         completionD.getMonth() === date.getMonth() &&
                         completionD.getDate() === date.getDate();
                }
              } catch (e) { /* Ignore parsing errors */ }
            }
            
            return false;
          }).sort((a, b) => (a.position || 0) - (b.position || 0));
          
          return {
            date,
            isPast,
            tasks: tasksForDay
          };
        });

        // Create future days (including today)
        const futureDays = Array.from({ length: visibleDaysRange.future }, (_, i) => {
          const date = addDays(today, i);
          const dateStr = format(date, "MMM d");
          const isPast = false; // Future days are never past
          
          // Start with empty task list
          let dayTasks: Task[] = [];
          
          if (i === 0) {
            // TODAY ONLY: Include specific logic for today
            
            // 1. Tasks explicitly assigned to today (only exact matches for today's date)
            const todaysAssignedTasks = tasks.filter(task => {
              // Only include tasks where the startDate exactly matches today's date string
              if (task.startDate === dateStr && !task.completed) {
                return true;
              }
              
              // Or if startDateObj is available and matches today
              if (task.startDateObj && !task.completed) {
                return isToday(task.startDateObj);
              }
              
              return false;
            });
            
            // 2. Incomplete tasks from past dates (rollover)
            // We've already calculated these above
            
            // 3. Tasks completed today
            const completedToday = tasks.filter(task => {
              if (task.completionDateObj) {
                const completionDate = new Date(task.completionDateObj);
                return completionDate.getFullYear() === date.getFullYear() &&
                       completionDate.getMonth() === date.getMonth() &&
                       completionDate.getDate() === date.getDate();
              }
              if (task.completionDate) {
                if (task.completionDate === dateStr) return true;
                try {
                  const completionD = new Date(task.completionDate);
                  if (!isNaN(completionD.getTime())) {
                    return completionD.getFullYear() === date.getFullYear() &&
                           completionD.getMonth() === date.getMonth() &&
                           completionD.getDate() === date.getDate();
                  }
                } catch (e) { /* Ignore parsing errors */ }
              }
              return false;
            });
            
            // Combine all tasks for today, with no duplicates
            const todayTaskMap = new Map<string, Task>();
            
            // Add in order of priority (completed tasks will override incomplete)
            [...todaysAssignedTasks, ...incompletePastTasks, ...completedToday].forEach(task => {
              todayTaskMap.set(task.id, task);
            });
            
            dayTasks = Array.from(todayTaskMap.values());
            
          } else {
            // FUTURE DAYS: Only include tasks explicitly for this day + completed on this day
            
            // 1. Tasks explicitly and ONLY assigned to this future day
            const assignedToThisDay = tasks.filter(task => {
              // First, exclude completed tasks from future dates (they should only show on completion date)
              if (task.completed) {
                // For completed tasks, check if they were completed on this day
                if (task.completionDateObj) {
                  const completionDate = new Date(task.completionDateObj);
                  const matches = completionDate.getFullYear() === date.getFullYear() &&
                                 completionDate.getMonth() === date.getMonth() &&
                                 completionDate.getDate() === date.getDate();
                  return matches;
                }
                
                if (task.completionDate === dateStr) {
                  return true;
                }
                
                // If not completed on this day, don't show it
                return false;
              }
              
              // For incomplete tasks, check if they start on this day
              // First check startDate string match - most common format
              if (task.startDate === dateStr) {
                return true;
              }
              
              // Check startDateObj for precise date matching if available
              if (task.startDateObj && !isNaN(task.startDateObj.getTime())) {
                try {
                  const taskDateStr = format(task.startDateObj, "MMM d");
                  return taskDateStr === dateStr;
                } catch (e) {
                  console.error(`Error formatting startDateObj for task ${task.id}:`, e);
                  return false;
                }
              }
              
              // Check if dueDate matches this day
              if (task.dueDate) {
                try {
                  const dueDate = new Date(task.dueDate);
                  if (!isNaN(dueDate.getTime())) {
                    const dueDateStr = format(dueDate, "MMM d");
                    return dueDateStr === dateStr;
                  }
                } catch (e) { /* Ignore parsing errors */ }
              }
              
              // No match found
              return false;
            });
            
            // Add debugging
            if (assignedToThisDay.length > 0) {
              console.log(`Day ${dateStr} has ${assignedToThisDay.length} assigned tasks:`, 
                assignedToThisDay.map(t => t.text));
            }
            
            dayTasks = assignedToThisDay;
          }
          
          // Sort tasks by position
          dayTasks.sort((a, b) => (a.position || 0) - (b.position || 0));
          
          return {
            date,
            isPast,
            tasks: dayTasks,
          }
        })

        setDays([...pastDays, ...futureDays])
        
        // Add debug logging
        if (process.env.NODE_ENV !== 'production') {
          logTaskAssignments([...pastDays, ...futureDays]);
        }
      }
    } catch (err) {
      console.error("Error fetching tasks:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  // Load more days in either direction
  const loadMoreDays = async (direction: "past" | "future", count = 7) => {
    try {
      const tasks = allTasks
      const today = startOfToday()

      if (direction === "past") {
        // Add more past days
        const newPastDaysCount = visibleDaysRange.past + count
        const newPastDays = Array.from({ length: count }, (_, i) => {
          const date = subDays(today, newPastDaysCount - i)
          const dateStr = format(date, "MMM d")
          const isPast = isBefore(date, today) && !isToday(date)

          // Get unique tasks that either start on this day or were completed on this day
          const tasksMap = new Map();
          tasks.filter(task => task.startDate === dateStr)
               .forEach(task => tasksMap.set(task.id, task));
          tasks.filter(task => {
            if (task.completionDateObj) {
              const completionDate = new Date(task.completionDateObj);
              return completionDate.getFullYear() === date.getFullYear() &&
                     completionDate.getMonth() === date.getMonth() &&
                     completionDate.getDate() === date.getDate();
            }
            if (task.completionDate) {
              try {
                const completionD = new Date(task.completionDate);
                if (!isNaN(completionD.getTime())) {
                  return completionD.getFullYear() === date.getFullYear() &&
                         completionD.getMonth() === date.getMonth() &&
                         completionD.getDate() === date.getDate();
                }
              } catch (e) { /* Ignore parsing errors, fallback to string comparison */ }
              return task.completionDate === dateStr;
            }
            return false;
          }).forEach(task => {
            if (!tasksMap.has(task.id)) {
              tasksMap.set(task.id, task);
            }
          });
          const tasksForDay = Array.from(tasksMap.values())
            .sort((a, b) => (a.position || 0) - (b.position || 0))

          return {
            date,
            isPast,
            tasks: tasksForDay,
          }
        })
        
        setDays((prevDays) => [...newPastDays, ...prevDays])
        setVisibleDaysRange((prev) => ({ ...prev, past: newPastDaysCount }))
      } else {
        // Add more future days
        const currentLastDay = days[days.length - 1].date
        // Get all incomplete tasks from past days for rollover
        const incompletePastTasks = tasks.filter(task => {
          // If there's no startDate, skip this task
          if (!task.startDate) return false;
          
          // Check if the task is from a past date and is incomplete
          const taskDate = new Date(task.startDateObj || task.startDate);
          return !task.completed && 
                 isBefore(taskDate, today);
        });
        
        const newFutureDays = Array.from({ length: count }, (_, i) => {
          const date = addDays(currentLastDay, i + 1)
          const dateStr = format(date, "MMM d")
          const isPast = false

          // Get unique tasks that either start on this day or were completed on this day
          // Use a Map to ensure we don't have duplicates based on task ID
          const tasksMap = new Map();
          
          // First add tasks that start on this day
          tasks.filter(task => task.startDate === dateStr)
               .forEach(task => tasksMap.set(task.id, task));
          
          // Then add tasks completed on this day (if not already in the map)
          tasks.filter(task => {
            if (task.completionDateObj) {
              const completionDate = new Date(task.completionDateObj);
              return completionDate.getFullYear() === date.getFullYear() &&
                     completionDate.getMonth() === date.getMonth() &&
                     completionDate.getDate() === date.getDate();
            }
            if (task.completionDate) {
              try {
                const completionD = new Date(task.completionDate);
                if (!isNaN(completionD.getTime())) {
                  return completionD.getFullYear() === date.getFullYear() &&
                         completionD.getMonth() === date.getMonth() &&
                         completionD.getDate() === date.getDate();
                }
              } catch (e) { /* Ignore parsing errors, fallback to string comparison */ }
              return task.completionDate === dateStr;
            }
            return false;
          }).forEach(task => {
            if (!tasksMap.has(task.id)) {
              tasksMap.set(task.id, task);
            }
          });
          
          let dayTasks = Array.from(tasksMap.values())
            .sort((a, b) => (a.position || 0) - (b.position || 0))
            
          // For today, include incomplete past tasks as well
          if (isToday(date)) {
            dayTasks = [...incompletePastTasks, ...dayTasks];
          }
            
          return {
            date,
            isPast,
            tasks: dayTasks,
          }
        })

        setDays((prevDays) => [...prevDays, ...newFutureDays])
        setVisibleDaysRange((prev) => ({ ...prev, future: prev.future + count }))
      }
    } catch (err) {
      console.error(`Error loading more ${direction} days:`, err)
    }
  }

  // Create a new task
  const createTask = async (task: Omit<Task, "id">, dayIndex: number) => {
    try {
      const newTask: Task = {
        ...task,
        id: crypto.randomUUID(),
      }

      // Save to Supabase or localStorage
      const savedTask = await saveTask(newTask)

      if (!savedTask) throw new Error("Failed to save task")

      // Add to all tasks
      const updatedTasks = [savedTask, ...allTasks]
      setAllTasks(updatedTasks)

      // Update local state
      setDays((prevDays) => {
        const newDays = [...prevDays]
        newDays[dayIndex] = {
          ...newDays[dayIndex],
          tasks: [savedTask, ...newDays[dayIndex].tasks],
        }
        return newDays
      })

      return savedTask
    } catch (err) {
      console.error("Error creating task:", err)
      throw err
    }
  }

  // Update a task
  const updateTask = async (updatedTask: Task) => {
    try {
      // Save to Supabase or localStorage
      const savedTask = await saveTask(updatedTask)

      if (!savedTask) throw new Error("Failed to update task")

      // Update in all tasks
      const updatedTasks = allTasks.map((task) => (task.id === updatedTask.id ? savedTask : task))
      setAllTasks(updatedTasks)

      // Find which day the task is currently in
      let currentDayIndex = -1
      let taskFound = false

      for (let i = 0; i < days.length; i++) {
        const taskIndex = days[i].tasks.findIndex((task) => task.id === updatedTask.id)
        if (taskIndex !== -1) {
          currentDayIndex = i
          taskFound = true
          break
        }
      }

      if (!taskFound) return

      // If start date has changed, move task to the appropriate day
      if (updatedTask.startDateObj && !isNaN(updatedTask.startDateObj.getTime())) {
        try {
          const targetDateStr = format(updatedTask.startDateObj, "MMM d")

          // Find the target day index
          const targetDayIndex = days.findIndex((day) => format(day.date, "MMM d") === targetDateStr)
          
          if (targetDayIndex !== -1 && targetDayIndex !== currentDayIndex) {
            // Move task between days
            setDays((prevDays) => {
              const newDays = [...prevDays]

              // Remove from current day
              newDays[currentDayIndex] = {
                ...newDays[currentDayIndex],
                tasks: newDays[currentDayIndex].tasks.filter((task) => task.id !== updatedTask.id),
              }

              // Add to target day
              newDays[targetDayIndex] = {
                ...newDays[targetDayIndex],
                tasks: [...newDays[targetDayIndex].tasks, updatedTask],
              }

              return newDays
            })
          }
        } catch (e) {
          console.error(`Error processing task startDate for task ${updatedTask.id}:`, e);
        }
      } else {
        // If we're not moving the task, just update it in place
        setDays((prevDays) => {
          return prevDays.map((day) => ({
            ...day,
            tasks: day.tasks.map((task) => (task.id === updatedTask.id ? savedTask : task)),
          }))
        })
      }
      
      return savedTask;
    } catch (err) {
      console.error("Error updating task:", err)
      throw err
    }
  }

  // Delete a task
  const deleteTask = async (taskId: string) => {
    try {
      // Delete from Supabase or localStorage
      const success = await deleteTaskFromSupabase(taskId)

      if (!success) throw new Error("Failed to delete task")

      // Remove from all tasks
      const updatedTasks = allTasks.filter((task) => task.id !== taskId)
      setAllTasks(updatedTasks)

      // Update local state
      setDays((prevDays) => {
        return prevDays.map((day) => ({
          ...day,
          tasks: day.tasks.filter((task) => task.id !== taskId),
        }))
      })
    } catch (err) {
      console.error("Error deleting task:", err)
      throw err
    }
  }

  // Update all task positions across all days
  const updateTaskPositions = async () => {
    try {
      const supabase = getSupabaseClient()
      if (!supabase) return

      // Get all tasks
      const updatedTasks: Task[] = []

      // Update position for each task based on its index in the day's task list
      days.forEach((day) => {
        // Get tasks for this day, group by category
        const workTasks = day.tasks.filter((task) => task.category === "work")
        const personalTasks = day.tasks.filter((task) => task.category === "personal")

        // Update positions for work tasks
        workTasks.forEach((task, index) => {
          if (task.position !== index) {
            updatedTasks.push({
              ...task,
              position: index,
            })
          }
        })

        // Update positions for personal tasks
        personalTasks.forEach((task, index) => {
          if (task.position !== index) {
            updatedTasks.push({
              ...task,
              position: index,
            })
          }
        })
      })

      if (updatedTasks.length === 0) return

      // Batch update all tasks with new positions
      const { error } = await supabase.from("tasks").upsert(
        updatedTasks.map((task) => ({
          id: task.id,
          position: task.position,
        }))
      )

      if (error) {
        console.error("Error updating task positions:", error)
      } else {
        // Update local tasks
        setAllTasks((prevTasks) =>
          prevTasks.map((task) => {
            const updatedTask = updatedTasks.find((t) => t.id === task.id)
            if (updatedTask) {
              return {
                ...task,
                position: updatedTask.position,
              }
            }
            return task
          })
        )
      }
    } catch (err) {
      console.error("Error updating task positions:", err)
    }
  }
  
  // Update task positions just for one specific day and category
  const updateTaskPositionsForDayAndCategory = async (dayIndex: number, category: 'work' | 'personal') => {
    try {
      const supabase = getSupabaseClient()
      if (!supabase || dayIndex < 0 || dayIndex >= days.length) return
      
      console.log(`Updating positions for day ${dayIndex}, category ${category}`)
      
      // Get tasks for this day and category
      const tasksToUpdate = days[dayIndex].tasks
        .filter(task => task.category === category)
        .map((task, index) => ({
          ...task,
          position: index // Set the position to match the index in the array
        }));
      
      if (tasksToUpdate.length === 0) return
      
      console.log(`Updating positions for ${tasksToUpdate.length} tasks`)
      
      // Log the positions we're setting for debugging
      tasksToUpdate.forEach(task => {
        console.log(`Task: ${task.text} (ID: ${task.id}) - Setting position: ${task.position}`);
      });
      
      // Instead of a direct upsert which could violate RLS policies,
      // use the saveTask function to update tasks one by one
      // This ensures all required fields are included
      try {
        console.log(`Updating positions for ${tasksToUpdate.length} tasks via saveTask`)
        
        // Process tasks sequentially to avoid race conditions
        for (const task of tasksToUpdate) {
          // Preserve all existing task fields and just update the position
          // This avoids RLS policy issues by including all required fields
          await saveTask(task);
        }
        
        console.log(`Successfully updated positions for ${tasksToUpdate.length} tasks`);
        
        // Update local state
        setAllTasks(prevTasks => 
          prevTasks.map(task => {
            const updatedTask = tasksToUpdate.find(t => t.id === task.id);
            if (updatedTask) {
              return {
                ...task,
                position: updatedTask.position
              };
            }
            return task;
          })
        )
      } catch (error) {
        console.error("Error updating task positions for day and category:", error)
      }
    } catch (err) {
      console.error("Error updating task positions for day and category:", err)
    }
  }

  // The moveTask function and its implementation
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
      // Skip invalid moves right away
      if (days.length <= fromDayIndex || days.length <= toDayIndex || fromDayIndex < 0 || toDayIndex < 0) {
        console.error(`Invalid day indices - fromDayIndex: ${fromDayIndex}, toDayIndex: ${toDayIndex}, days length: ${days.length}`);
        return;
      }

      // First try to find task by ID - most reliable
      let draggedTask: Task | undefined;
      
      if (taskId) {
        // First try the specific day and column
        draggedTask = days[fromDayIndex].tasks.find(t => t.id === taskId && t.category === fromColumnType);
        
        // Then just by ID in the source day
        if (!draggedTask) {
          draggedTask = days[fromDayIndex].tasks.find(t => t.id === taskId);
        }
        
        // Finally look in all tasks
        if (!draggedTask) {
          draggedTask = allTasks.find(t => t.id === taskId);
        }
      }
      
      // If still not found, try by index and category
      if (!draggedTask && dragIndex !== undefined && dragIndex >= 0) {
        const tasksWithCategory = days[fromDayIndex].tasks.filter(t => t.category === fromColumnType);
        if (tasksWithCategory.length > dragIndex) {
          draggedTask = tasksWithCategory[dragIndex];
        }
      }

      // If we still couldn't find the task, log error and return
      if (!draggedTask) {
        console.error(`Could not find task to move (Index: ${dragIndex}, Day: ${fromDayIndex}, Column: ${fromColumnType}, ID: ${taskId || 'none'})`);
        return;
      }
      
      // Create updated task with new properties
      const updatedTask = {
        ...draggedTask,
        category: toColumnType, // Always update category
      };

      // If moving to a different day, update both startDate and dueDate
      if (fromDayIndex !== toDayIndex) {
        const targetDate = days[toDayIndex].date;
        const formattedDate = format(targetDate, "MMM d");
        const isoDate = format(targetDate, "yyyy-MM-dd");
        
        updatedTask.startDate = formattedDate;
        updatedTask.startDateObj = targetDate;
        updatedTask.dueDate = isoDate;
      }

      // Optimistically update the UI state
      setDays(prevDays => {
        const newDays = [...prevDays];
        
        // Remove from source day
        newDays[fromDayIndex] = {
          ...newDays[fromDayIndex],
          tasks: newDays[fromDayIndex].tasks.filter(t => t.id !== draggedTask!.id)
        };
        
        // Add to target day
        newDays[toDayIndex] = {
          ...newDays[toDayIndex],
          tasks: [
            ...newDays[toDayIndex].tasks.slice(0, hoverIndex),
            updatedTask,
            ...newDays[toDayIndex].tasks.slice(hoverIndex)
          ]
        };
        
        return newDays;
      });
      
      // Update allTasks state
      setAllTasks(prevTasks => 
        prevTasks.map(t => t.id === updatedTask.id ? updatedTask : t)
      );

      // Save to backend without waiting
      try {
        const supabase = getSupabaseClient();
        if (supabase) {
          supabase
            .from("tasks")
            .update({
              start_date: updatedTask.startDate,
              due_date: updatedTask.dueDate,
              category: updatedTask.category
            })
            .eq("id", updatedTask.id)
            .then(({ error }) => {
              if (error) {
                console.error("Error updating task:", error);
                saveTask(updatedTask).catch(console.error);
              }
            });
        } else {
          saveTask(updatedTask).catch(console.error);
        }

        // Update positions in background if needed
        if (fromDayIndex === toDayIndex && fromColumnType === toColumnType) {
          setTimeout(() => {
            updateTaskPositionsForDayAndCategory(toDayIndex, toColumnType);
          }, 100);
        }
      } catch (err) {
        console.error("Error saving moved task:", err);
      }
    } catch (err) {
      console.error("Error moving task:", err);
    }
  };

  // Create a throttled version of moveTask to prevent excessive calls
  const moveTask = throttle(moveTaskImpl, 300);

  // Find the index of today in the days array
  const findTodayIndex = () => {
    return days.findIndex((day) => isToday(day.date))
  }

  // Load tasks when user changes or on initial render
  useEffect(() => {
    if (status === "authenticated" || status === "unconfigured" || !isSupabaseConfigured()) {
      fetchTasks()
    }
  }, [status, user])

  return {
    days,
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    refreshTasks: fetchTasks,
    loadMoreDays,
    findTodayIndex,
    updateTaskPositions,
  }
}
