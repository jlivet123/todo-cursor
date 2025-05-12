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
  console.log("=== TASK ASSIGNMENT DEBUGGING ===");
  days.forEach((day, index) => {
    const dateStr = format(day.date, "MMM d");
    console.log(`Day ${index}: ${dateStr} - ${day.tasks.length} tasks`);
    day.tasks.forEach(task => {
      console.log(`  - Task: ${task.text} (ID: ${task.id.slice(0, 6)}...)`);
      console.log(`    Start Date: ${task.startDate}, Completed: ${task.completed}`);
    });
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

        // Generate days for the visible range
        const pastDays = Array.from({ length: visibleDaysRange.past }, (_, i) => {
          const date = subDays(today, visibleDaysRange.past - i)
          const dateStr = format(date, "MMM d")
          const isPast = isBefore(date, today) && !isToday(date)

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
          
          const tasksForDay = Array.from(tasksMap.values())
            .sort((a, b) => (a.position || 0) - (b.position || 0))

          return {
            date,
            isPast,
            tasks: tasksForDay
          }
        })
        
        const todayDateStr = format(today, "MMM d")
        // Get all incomplete tasks from past days for rollover
        const incompletePastTasks = tasks.filter(task => {
          // If there's no startDate, skip this task
          if (!task.startDate) return false;
          
          // Only include tasks from past dates, not today or future dates
          try {
            // First try using the startDateObj if available
            if (task.startDateObj) {
              return !task.completed && 
                     isBefore(task.startDateObj, today) && 
                     !isToday(task.startDateObj);
            }
            
            // Otherwise try to parse the startDate string
            const taskDate = new Date(task.startDate);
            // Check if it's a valid date and is in the past
            if (!isNaN(taskDate.getTime())) {
              return !task.completed && 
                     isBefore(taskDate, today) && 
                     !isToday(taskDate);
            }
            
            // For MMM d format strings, we need to parse differently
            // Compare the startDate with today's formatted date
            const todayFormatted = format(today, "MMM d");
            const startDateParts = task.startDate.split(" ");
            if (startDateParts.length === 2) {
              // If the task's startDate is today's date in MMM d format, it's not a past task
              if (task.startDate === todayFormatted) return false;
              
              // If it's a future date, don't include it as a past task
              const allDatesMap = new Map();
              // Create a map of all the dates we're showing in MMM d format
              days.forEach(day => {
                allDatesMap.set(format(day.date, "MMM d"), day);
              });
              
              // If the task's startDate is in the future
              const dateObj = allDatesMap.get(task.startDate);
              if (dateObj && !isBefore(dateObj.date, today)) {
                return false;
              }
            }
            
            // If we can't parse it and it's not today, assume it might be a past date
            return !task.completed && task.startDate !== todayFormatted;
          } catch (e) {
            console.error("Error determining if task is from past:", e);
            return false;
          }
        });

        const futureDays = Array.from({ length: visibleDaysRange.future }, (_, i) => {
          const date = addDays(today, i);
          const dateStr = format(date, "MMM d");
          const isPast = false; // Future days are never past
          
          // Start with empty task list
          let dayTasks: Task[] = [];
          
          if (i === 0) {
            // TODAY ONLY: Include specific logic for today
            
            // 1. Tasks explicitly assigned to today
            const todaysAssignedTasks = tasks.filter(task => 
              task.startDate === dateStr && !task.completed
            );
            
            // 2. Incomplete tasks from past dates (rollover)
            const rolloverTasks = tasks.filter(task => {
              // Skip if no start date or if already added to today
              if (!task.startDate || todaysAssignedTasks.some(t => t.id === task.id)) {
                return false;
              }
              
              // Skip if completed
              if (task.completed) {
                return false;
              }
              
              // Skip if start date is today or in future
              if (task.startDate === dateStr) {
                return false; // Today's tasks already added above
              }
              
              // For dates in "MMM d" format, we need to check dates carefully
              const allDays = [...pastDays, ...futureDays.slice(0, i)];
              const futureDateStrs = futureDays.slice(i).map(d => format(d.date, "MMM d"));
              
              // If the task's start date matches any future day, it's not a rollover
              if (futureDateStrs.includes(task.startDate)) {
                console.log(`Task ${task.text} has future start date ${task.startDate}, not rolling over to today`);
                return false;
              }
              
              // If we get here, it's a past incomplete task
              return true;
            });
            
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
            [...todaysAssignedTasks, ...rolloverTasks, ...completedToday].forEach(task => {
              todayTaskMap.set(task.id, task);
            });
            
            dayTasks = Array.from(todayTaskMap.values());
            
          } else {
            // FUTURE DAYS: Only include tasks explicitly for this day + completed on this day
            
            // 1. Tasks explicitly assigned to this future day
            const assignedToThisDay = tasks.filter(task => {
              if (task.startDate === dateStr) {
                console.log(`Task ${task.text} assigned to future day ${dateStr} by startDate match`);
                return true;
              }
              
              if (task.startDateObj) {
                const doesMatch = format(task.startDateObj, "MMM d") === dateStr;
                if (doesMatch) {
                  console.log(`Task ${task.text} assigned to future day ${dateStr} by startDateObj match`);
                }
                return doesMatch;
              }
              
              return false;
            });
            
            // 2. Tasks completed on this future day
            const completedOnThisDay = tasks.filter(task => {
              // Skip if already included
              if (assignedToThisDay.some(t => t.id === task.id)) return false;
              
              // Check for completion on this day
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
            
            // Combine without duplicates
            const taskMap = new Map<string, Task>();
            [...assignedToThisDay, ...completedOnThisDay].forEach(task => {
              taskMap.set(task.id, task);
            });
            
            dayTasks = Array.from(taskMap.values());
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
      if (updatedTask.startDateObj) {
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
              tasks: [savedTask, ...newDays[targetDayIndex].tasks],
            }

            return newDays
          })

          return
        }
      }

      // If we're not moving the task, just update it in place
      setDays((prevDays) => {
        return prevDays.map((day) => ({
          ...day,
          tasks: day.tasks.map((task) => (task.id === updatedTask.id ? savedTask : task)),
        }))
      })
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

  // Update task positions after drag and drop
  const updateTaskPositions = async () => {
    try {
      // Update positions in all tasks
      const updatedTasks = [...allTasks]

      // Update positions based on days array
      days.forEach((day) => {
        day.tasks.forEach((task, index) => {
          const taskIndex = updatedTasks.findIndex((t) => t.id === task.id)
          if (taskIndex !== -1) {
            updatedTasks[taskIndex] = {
              ...updatedTasks[taskIndex],
              position: index,
            }
          }
        })
      })

      setAllTasks(updatedTasks)

      // Save all updated tasks to Supabase or localStorage
      await saveTasks(updatedTasks)
    } catch (err) {
      console.error("Error updating task positions:", err)
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
        
        if (draggedTask) {
          console.log(`Found task by ID: ${draggedTask.text} (ID: ${draggedTask.id})`);
        }
      }
      
      // If still not found, try by index and category
      if (!draggedTask && dragIndex !== undefined && dragIndex >= 0) {
        // First try by position and category, limiting to tasks with the matching category
        const tasksWithCategory = days[fromDayIndex].tasks.filter(t => t.category === fromColumnType);
        if (tasksWithCategory.length > dragIndex) {
          draggedTask = tasksWithCategory[dragIndex];
          console.log(`Found task by category and index: ${draggedTask.text} (ID: ${draggedTask.id})`);
        } else if (days[fromDayIndex].tasks.length > 0) {
          // As a fallback, just pick the first task with matching category
          const firstTaskWithCategory = days[fromDayIndex].tasks.find(t => t.category === fromColumnType);
          if (firstTaskWithCategory) {
            draggedTask = firstTaskWithCategory;
            console.log(`Fallback to first task with category: ${draggedTask.text} (ID: ${draggedTask.id})`);
          }
        }
      }

      // If we still couldn't find the task, log error and return
      if (!draggedTask) {
        console.error(`Could not find task to move (Index: ${dragIndex}, Day: ${fromDayIndex}, Column: ${fromColumnType}, ID: ${taskId || 'none'})`);
        return;
      }
      
      // If actually moving to a different day or column - that's when we need to save
      if (fromDayIndex !== toDayIndex || fromColumnType !== toColumnType) {
        console.log(`Moving task: ${draggedTask.text} (ID: ${draggedTask.id}) from day ${fromDayIndex} to day ${toDayIndex}`);
        
        // Create a copy of the days array
        const newDays = [...days];

        // Remove the task from the source day using its ID
        newDays[fromDayIndex] = {
          ...newDays[fromDayIndex],
          tasks: newDays[fromDayIndex].tasks.filter(t => t.id !== draggedTask!.id),
        };
        
        // Create updated task with new day and category
        const updatedTask = {
          ...draggedTask,
          startDate: format(newDays[toDayIndex].date, "MMM d"),
          startDateObj: newDays[toDayIndex].date,
          category: toColumnType,
        };

        console.log(`Updated task: ${updatedTask.text} to new start date: ${updatedTask.startDate}`);

        // Insert the updated task at the target position
        newDays[toDayIndex] = {
          ...newDays[toDayIndex],
          tasks: [
            ...newDays[toDayIndex].tasks.slice(0, hoverIndex),
            updatedTask,
            ...newDays[toDayIndex].tasks.slice(hoverIndex),
          ],
        };

        // Update the days state
        setDays(newDays);
        
        // Save the updated task to persist the changes
        try {
          // Perform a direct update in Supabase to minimize data transfer
          const supabase = getSupabaseClient();
          if (supabase) {
            console.log(`Saving task directly to Supabase: ${updatedTask.id}`);
            const { error } = await supabase
              .from("tasks")
              .update({
                start_date: updatedTask.startDate,
                category: updatedTask.category
              })
              .eq("id", updatedTask.id);
              
            if (error) {
              console.error("Error updating task:", error);
              // Fall back to full save
              await saveTask(updatedTask);
            }
          } else {
            // No Supabase connection, use regular save
            await saveTask(updatedTask);
          }
        } catch (err) {
          console.error("Error saving moved task:", err);
        }
      } else if (fromDayIndex === toDayIndex && hoverIndex !== dragIndex) {
        // Just reordering within the same day and column
        console.log(`Reordering task within day ${toDayIndex}`);
        
        // Create a copy of the days array
        const newDays = [...days];
        
        // Get all tasks for this category
        const tasksInCategory = newDays[toDayIndex].tasks.filter(t => t.category === fromColumnType);
        
        // Remove the dragged task
        const remainingTasks = tasksInCategory.filter(t => t.id !== draggedTask!.id);
        
        // Insert the task at the new position
        const reorderedTasks = [
          ...remainingTasks.slice(0, hoverIndex),
          draggedTask,
          ...remainingTasks.slice(hoverIndex)
        ];
        
        // Replace just the tasks for this category
        newDays[toDayIndex] = {
          ...newDays[toDayIndex],
          tasks: [
            ...newDays[toDayIndex].tasks.filter(t => t.category !== fromColumnType),
            ...reorderedTasks
          ]
        };
        
        // Update the state
        setDays(newDays);
        
        // Only update positions once reordering is done, not on every move
        // This will be triggered by onDragEnd in the UI component
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
