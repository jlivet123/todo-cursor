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
    // Try parsing as a standard date string first
    const dateObj = new Date(dateStr);
    if (!isNaN(dateObj.getTime())) {
      return dateObj;
    }
    
    // Try parsing as "MMM d" format (e.g., "May 20")
    const parts = dateStr.split(' ');
    if (parts.length === 2) {
      const month = parts[0];
      const day = parseInt(parts[1], 10);
      
      if (!isNaN(day)) {
        const now = new Date();
        const year = now.getFullYear();
        const monthIndex = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
          .findIndex(m => m.toLowerCase() === month.toLowerCase());
        
        if (monthIndex !== -1) {
          return new Date(year, monthIndex, day);
        }
      }
    }
  } catch (e) {
    console.error(`Error parsing date string: ${dateStr}`, e);
  }
  
  return undefined;
}

interface DayWithTasks {
  date: Date
  tasks: Task[]
  isPast: boolean
}

// Add this debounce utility to prevent the moveTask function from being called too frequently
function debounce<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    // Clear any existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    // Set a new timeout
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
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

// Debug function to track why a task is assigned to a specific day
function debugTaskAssignment(task: Task, dayDate: Date, reason: string, isAssigned: boolean) {
  if (process.env.NODE_ENV !== 'production') {
    const dateStr = format(dayDate, "yyyy-MM-dd");
    console.log(
      `Task "${task.text.substring(0, 20)}${task.text.length > 20 ? '...' : ''}" (ID: ${task.id.slice(0, 6)}...)
      ${isAssigned ? 'ASSIGNED TO' : 'NOT ASSIGNED TO'} ${dateStr}
      Reason: ${reason}
      Category: ${task.category}
      Completed: ${task.completed}
      Start date: ${task.startDate}
      Due date: ${task.dueDate}
      Completion date: ${task.completionDate}`
    );
  }
}

// Debugging function to log date comparison details
function debugDateComparison(taskId: string, taskText: string, date1: Date | undefined, date2: Date | undefined, operation: string) {
  if (!date1 || !date2) {
    console.log(`[DATE DEBUG] ${operation} - Task ${taskId} (${taskText.substring(0, 20)}...) - One of the dates is undefined`);
    return;
  }
  
  console.log(
    `[DATE DEBUG] ${operation} - Task ${taskId} (${taskText.substring(0, 20)}...) - ` +
    `Comparing ${date1.toISOString()} vs ${date2.toISOString()} - ` +
    `Year: ${date1.getFullYear() === date2.getFullYear()}, ` +
    `Month: ${date1.getMonth() === date2.getMonth()}, ` +
    `Day: ${date1.getDate() === date2.getDate()}`
  );
}

// Helper to ensure consistent date formatting
function formatTaskDates(task: Task, targetDate: Date) {
  // For display (MMM d format)
  const displayDate = format(targetDate, "MMM d");
  
  // For ISO format (yyyy-MM-dd)
  const isoDate = format(targetDate, "yyyy-MM-dd");
  
  // Create a clean date object to avoid serialization issues
  const dateObj = new Date(targetDate.getTime());
  
  return {
    startDate: displayDate,
    startDateObj: dateObj,
    dueDate: isoDate
  };
}

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
        
        // Make sure we have date objects for all task dates
        tasks.forEach(task => {
          if (task.startDate && !task.startDateObj) {
            task.startDateObj = ensureDateObj(task.startDate);
          }
          
          if (task.completionDate && !task.completionDateObj) {
            task.completionDateObj = ensureDateObj(task.completionDate);
          }
        });
        
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
                console.log(`Task ${task.text} matches today's date (${dateStr})`);
                return true;
              }
              
              // Or if startDateObj is available and matches today
              if (task.startDateObj && !task.completed) {
                const isOnToday = isToday(task.startDateObj);
                if (isOnToday) console.log(`Task ${task.text} matches today via startDateObj`);
                return isOnToday;
              }
              
              return false;
            });
            
            // 2. Incomplete tasks from past dates (rollover)
            console.log(`Adding ${incompletePastTasks.length} incomplete past tasks to today`);
            for (const task of incompletePastTasks) {
              console.log(`Rolling over past task to today: ${task.text} (${task.startDate})`);
            }
            
            // 3. Tasks completed today
            const completedToday = tasks.filter(task => {
              if (!task.completed) return false; // Only show completed tasks here
              
              if (task.completionDateObj) {
                const completionDate = new Date(task.completionDateObj);
                const matches = completionDate.getFullYear() === date.getFullYear() &&
                               completionDate.getMonth() === date.getMonth() &&
                               completionDate.getDate() === date.getDate();
                if (matches) console.log(`Task ${task.text} was completed today`);
                return matches;
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
            
            // Add in priority order (completed tasks will override incomplete)
            [...todaysAssignedTasks, ...incompletePastTasks, ...completedToday].forEach(task => {
              todayTaskMap.set(task.id, task);
            });
            
            dayTasks = Array.from(todayTaskMap.values());
            
            console.log(`Today has ${dayTasks.length} tasks total`);
            console.log(`- ${todaysAssignedTasks.length} tasks assigned to today`);
            console.log(`- ${incompletePastTasks.length} incomplete tasks from past`);
            console.log(`- ${completedToday.length} tasks completed today`);
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
                console.log(`Task ${task.text} matched future day ${dateStr} by string comparison`);
                return true;
              }
              
              // Check startDateObj for precise date matching if available
              if (task.startDateObj && !isNaN(task.startDateObj.getTime())) {
                try {
                  const taskDateStr = format(task.startDateObj, "MMM d");
                  const matches = taskDateStr === dateStr;
                  if (matches) {
                    console.log(`Task ${task.text} matched future day ${dateStr} by date object comparison`);
                  }
                  return matches;
                } catch (e) {
                  console.error(`Error formatting startDateObj for task ${task.id}:`, e);
                  return false;
                }
              }
              
              // Also check if dueDate matches this day exactly
              if (task.dueDate) {
                try {
                  const dueDate = new Date(task.dueDate);
                  if (!isNaN(dueDate.getTime())) {
                    const dueDateStr = format(dueDate, "MMM d");
                    const matches = dueDateStr === dateStr;
                    if (matches) {
                      console.log(`Task ${task.text} matched future day ${dateStr} by due date comparison`);
                    }
                    return matches;
                  }
                } catch (e) { /* Ignore parsing errors */ }
              }
              
              // No match found
              return false;
            });
            
            // Add debugging output
            if (i > 0 && assignedToThisDay.length > 0) {
              console.log(`Future day ${dateStr} (${i} days from today) has ${assignedToThisDay.length} assigned tasks:`, 
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
  
  // Update the positions of tasks within a day and category
  const updatePositionsAfterReorder = async (dayIndex: number, columnType: "personal" | "work") => {
    // Skip if we're out of bounds
    if (dayIndex < 0 || dayIndex >= days.length) return;
    
    // Get all tasks in the specified day and category
    const tasksToUpdate = days[dayIndex].tasks
      .filter(t => t.category === columnType)
      .map((task, index) => ({
        ...task,
        position: index // Update position based on array order
      }));
    
    // Skip if there are no tasks
    if (tasksToUpdate.length === 0) return;
    
    console.log(`Updating positions for ${tasksToUpdate.length} tasks in day ${dayIndex}, ${columnType}`);
    
    // Save the updated positions
    // Use an efficient batch update if available, otherwise update individually
    if (isSupabaseConfigured()) {
      try {
        // Update all tasks with their new positions
        for (const task of tasksToUpdate) {
          await saveTask(task);
        }
        
        // Update local state
        setAllTasks(prevTasks => 
          prevTasks.map(task => {
            const updatedTask = tasksToUpdate.find(t => t.id === task.id);
            return updatedTask || task;
          })
        );
      } catch (err) {
        console.error("Error updating task positions:", err);
      }
    } else {
      // For localStorage, we can just update the tasks directly
      const storageKey = "tasks";
      const storedTasks = JSON.parse(localStorage.getItem(storageKey) || "[]");
      
      // Update positions in stored tasks
      const updatedStoredTasks = storedTasks.map((t: Task) => {
        const updatedTask = tasksToUpdate.find(ut => ut.id === t.id);
        return updatedTask || t;
      });
      
      // Save to localStorage
      localStorage.setItem(storageKey, JSON.stringify(updatedStoredTasks));
      
      // Update local state
      setAllTasks(prevTasks => 
        prevTasks.map(task => {
          const updatedTask = tasksToUpdate.find(t => t.id === task.id);
          return updatedTask || task;
        })
      );
    }
  };

// 1. Enhanced moveTask function with complete implementation
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
    // Add this detailed logging at the beginning
    console.log(`
    ===== MOVE TASK OPERATION =====
    Task ID: ${taskId}
    From Day: ${fromDayIndex}, To Day: ${toDayIndex}
    From Column: ${fromColumnType}, To Column: ${toColumnType}
    From Index: ${dragIndex}, To Index: ${hoverIndex}
  `);
    // Skip invalid moves right away
    if (days.length <= fromDayIndex || days.length <= toDayIndex || fromDayIndex < 0 || toDayIndex < 0) {
      console.error(`Invalid day indices - fromDayIndex: ${fromDayIndex}, toDayIndex: ${toDayIndex}, days length: ${days.length}`);
      return null;
    }

    // First try to find task by ID - most reliable
    let draggedTask: Task | undefined;
    
    // Add detailed logging for task finding
    console.log(`Looking for task with ID: ${taskId}`);
    if (taskId) {
      // First try to find in the specified day and column
      draggedTask = days[fromDayIndex]?.tasks?.find(
        t => t.id === taskId && t.category === fromColumnType
      );
      
      // If not found, search in the entire day
      if (!draggedTask) {
        draggedTask = days[fromDayIndex]?.tasks?.find(t => t.id === taskId);
      }
      
      // If still not found, search in all tasks
      if (!draggedTask) {
        draggedTask = allTasks.find(t => t.id === taskId);
      }
    }
    
    // Fallback to index-based lookup if ID lookup fails
    if (!draggedTask && dragIndex >= 0) {
      const tasksInSourceColumn = days[fromDayIndex].tasks.filter(
        t => t.category === fromColumnType
      );
      
      if (dragIndex < tasksInSourceColumn.length) {
        draggedTask = tasksInSourceColumn[dragIndex];
      }
    }

    // If we couldn't find the task, abort
    if (!draggedTask) {
      console.error(`Could not find task to move (ID: ${taskId})`);
      return null;
    }
    
    // Create a deep copy of the task to avoid mutation issues
    const updatedTask = { ...draggedTask };
    
    // Always update the category if it's changing
    if (fromColumnType !== toColumnType) {
      updatedTask.category = toColumnType;
    }

    // Update dates when moving between days
    if (fromDayIndex !== toDayIndex) {
      const targetDate = days[toDayIndex].date;
      const formattedDates = formatTaskDates(updatedTask, targetDate);
      
      // Apply all date fields consistently
      updatedTask.startDate = formattedDates.startDate;
      updatedTask.startDateObj = formattedDates.startDateObj;
      updatedTask.dueDate = formattedDates.dueDate;
    }

    // Update the task in the array
    const storageKey = isSupabaseConfigured() ? "supabase-tasks" : "tasks";
    const storedTasks = JSON.parse(localStorage.getItem(storageKey) || "[]");
    
    // Update the stored task data
    const updatedStoredTasks = storedTasks.map((t: Task) => {
      if (t.id === draggedTask!.id) {
        return updatedTask;
      }
      return t;
    });
    
    // Save to localStorage
    localStorage.setItem(storageKey, JSON.stringify(updatedStoredTasks));

    // Optimistically update the UI state
    setDays(prevDays => {
      const newDays = [...prevDays];
      
      // Remove from source day
      newDays[fromDayIndex] = {
        ...newDays[fromDayIndex],
        tasks: newDays[fromDayIndex].tasks.filter(t => t.id !== draggedTask!.id)
      };
      
      // Add to target day at the specific position
      const targetDayTasks = [...newDays[toDayIndex].tasks];
      
      // Insert at the position specified by hoverIndex
      if (hoverIndex <= targetDayTasks.length) {
        targetDayTasks.splice(hoverIndex, 0, updatedTask);
      } else {
        // If position is out of bounds, append to the end
        targetDayTasks.push(updatedTask);
      }
      
      newDays[toDayIndex] = {
        ...newDays[toDayIndex],
        tasks: targetDayTasks
      };
      
      return newDays;
    });
    
    // Update allTasks for consistency
    setAllTasks(prevTasks => 
      prevTasks.map(t => t.id === updatedTask.id ? updatedTask : t)
    );

    // Update positions when reordering within the same column
    if (fromDayIndex === toDayIndex && fromColumnType === toColumnType) {
      // Update positions when reordering within the same column
      await updatePositionsAfterReorder(toDayIndex, toColumnType);
    }
    
    // Return the updated task object
    return updatedTask;
  } catch (err) {
    console.error("Error moving task:", err);
    return null;
  }
};

  // Create a debounced version of moveTask to prevent flickering and excessive calls
  const moveTask = debounce(moveTaskImpl, 150);

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
