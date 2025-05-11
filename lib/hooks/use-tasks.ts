"use client"

import { useState, useEffect } from "react"
import { format, addDays, subDays, startOfToday, isBefore, isToday } from "date-fns"
import { type Task, getTasks, saveTask, deleteTaskFromSupabase, saveTasks } from "@/lib/storage"
import { useAuth } from "@/lib/auth-context"
import { isSupabaseConfigured } from "@/lib/supabase"

interface DayWithTasks {
  date: Date
  tasks: Task[]
  isPast: boolean
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
          tasks.filter(task => task.completionDate === dateStr)
               .forEach(task => {
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
          
          // Check if the task is from a past date and is incomplete
          const taskDate = new Date(task.startDateObj || task.startDate);
          return !task.completed && 
                 isBefore(taskDate, today) && 
                 !isToday(taskDate);
        });

        const futureDays = Array.from({ length: visibleDaysRange.future }, (_, i) => {
          const date = addDays(today, i)
          const dateStr = format(date, "MMM d")
          const isPast = false // Future days are never past
          
          // Get unique tasks that either start on this day or were completed on this day
          // Use a Map to ensure we don't have duplicates based on task ID
          const tasksMap = new Map();
          
          // First add tasks that start on this day
          tasks.filter(task => task.startDate === dateStr)
               .forEach(task => tasksMap.set(task.id, task));
          
          // Then add tasks completed on this day (if not already in the map)
          tasks.filter(task => task.completionDate === dateStr)
               .forEach(task => {
                 if (!tasksMap.has(task.id)) {
                   tasksMap.set(task.id, task);
                 }
               });
          
          let dayTasks = Array.from(tasksMap.values())
            .sort((a, b) => (a.position || 0) - (b.position || 0))
          
          // Add incomplete past tasks to today and future days
          if (i === 0 || format(date, "MMM d") === todayDateStr) {
            // Only add incomplete past tasks to today
            dayTasks = [...incompletePastTasks, ...dayTasks];
          }
          
          return {
            date,
            isPast,
            tasks: dayTasks,
          }
        })

        setDays([...pastDays, ...futureDays])
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

          return {
            date,
            isPast,
            tasks: tasks
              .filter((task) => task.startDate === dateStr)
              .sort((a, b) => (a.position || 0) - (b.position || 0)),
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
          tasks.filter(task => task.completionDate === dateStr)
               .forEach(task => {
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

  // Move a task (for drag and drop)
  const moveTask = async (
    dragIndex: number,
    hoverIndex: number,
    fromDayIndex: number,
    toDayIndex: number,
    fromColumnType: 'work' | 'personal',
    toColumnType: 'work' | 'personal'
  ) => {
    try {
      // Get the task being dragged
      const draggedTask = days[fromDayIndex].tasks.find(t => t.position === dragIndex && t.category === fromColumnType)
      if (!draggedTask) return

      // Create a copy of the days array
      const newDays = [...days]

      // Remove the task from the source day
      newDays[fromDayIndex] = {
        ...newDays[fromDayIndex],
        tasks: newDays[fromDayIndex].tasks.filter(t => t.position !== dragIndex || t.category !== fromColumnType),
      }

      // If moving to a different day or column, update the task
      if (fromDayIndex !== toDayIndex || fromColumnType !== toColumnType) {
        const updatedTask = {
          ...draggedTask,
          startDate: format(newDays[toDayIndex].date, "MMM d"),
          startDateObj: newDays[toDayIndex].date,
          category: toColumnType,
        }

        // Insert the updated task at the target position
        newDays[toDayIndex] = {
          ...newDays[toDayIndex],
          tasks: [
            ...newDays[toDayIndex].tasks.slice(0, hoverIndex),
            updatedTask,
            ...newDays[toDayIndex].tasks.slice(hoverIndex),
          ],
        }

        // Update the days state
        setDays(newDays)

        // Update the task in storage
        await saveTask(updatedTask)
      } else {
        // Moving within the same day and category
        newDays[toDayIndex] = {
          ...newDays[toDayIndex],
          tasks: [
            ...newDays[toDayIndex].tasks.slice(0, hoverIndex),
            draggedTask,
            ...newDays[toDayIndex].tasks.slice(hoverIndex),
          ],
        }

        // Update the days state
        setDays(newDays)
      }

      // Update task positions
      await updateTaskPositions()
    } catch (err) {
      console.error("Error moving task:", err)
    }
  }

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
