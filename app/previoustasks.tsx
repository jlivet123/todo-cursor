"use client"

import React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { format, isToday, isWeekend, isBefore } from "date-fns"
import {
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Home,
  Calendar,
  Target,
  LayoutGrid,
  LogOut,
  RefreshCw,
  Lock,
  Command,
  Minimize2,
  Maximize2,
  Circle,
  CheckCircle,
  CornerDownRight,
  ClipboardList,
  AlertCircle,
  CheckSquare,
  Sunset,
  Sparkles,
  CalendarCheck,
  ClipboardCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { TaskModal } from "@/components/task-modal"
import { DndProvider, useDrag, useDrop } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { useTasks } from "@/lib/hooks/use-tasks"
import { useAuth } from "@/lib/auth-context"
import { Skeleton } from "@/components/ui/skeleton"
import { getSupabase } from "@/lib/supabase"
import { Task, Subtask, getTasksFromSupabase, saveTasksToSupabase } from "@/lib/storage"
import Link from "next/link"
import { SupabaseDiagnostic } from "@/components/supabase-diagnostic"
import { isSupabaseConfigured } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

// Drag item types
const ITEM_TYPE = "TASK"

// Subtask Item component
function SubtaskItem({
  subtask,
  onToggleCompletion,
}: {
  subtask: Subtask
  onToggleCompletion: () => void
}) {
  // Handle checkbox click
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleCompletion()
  }

  return (
    <div className="flex items-center py-1 pl-6 hover:bg-slate-800/30 rounded">
      <div className="flex-shrink-0 cursor-pointer" onClick={handleCheckboxClick}>
        <div className="w-4 h-4 border border-slate-600 rounded-sm flex items-center justify-center">
          {subtask.completed && <div className="w-2 h-2 bg-green-500 rounded-sm"></div>}
        </div>
      </div>
      <span
        className={cn("text-sm ml-2", subtask.completed && "line-through text-slate-400")}
      >
        {subtask.text}
      </span>
    </div>
  )
}

// Draggable Task component
function DraggableTask({
  task,
  dayIndex,
  columnType,
  index,
  onTaskClick,
  onToggleCompletion,
  onToggleSubtaskCompletion,
  moveTask,
  isPastDay,
}: {
  task: Task
  dayIndex: number
  columnType: "personal" | "work"
  index: number
  onTaskClick: () => void
  onToggleCompletion: () => void
  onToggleSubtaskCompletion: (subtaskId: string) => void
  moveTask: (
    dragIndex: number,
    hoverIndex: number,
    fromDayIndex: number,
    toDayIndex: number,
    fromColumnType: "personal" | "work",
    toColumnType: "personal" | "work",
    taskId?: string, // Added taskId parameter to fix type errors
  ) => void
  isPastDay: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { taskId: task.id, index, dayIndex, columnType },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: !isPastDay && !task.completed, // Disable dragging for past days and completed tasks
  })

  const [{ handlerId }, drop] = useDrop({
    accept: ITEM_TYPE,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      }
    },
    hover(item: any, monitor) {
      if (!ref.current || isPastDay || task.completed) {
        return
      }

      const dragTaskId = item.taskId
      const dragIndex = item.index
      const dragDayIndex = item.dayIndex
      const dragColumnType = item.columnType
      const hoverTaskId = task.id
      const hoverIndex = index
      const hoverDayIndex = dayIndex
      const hoverColumnType = columnType

      // Log the dragged task info for debugging
      console.log(`Dragging task ${dragTaskId} (${item.taskText || 'unknown'}) from day ${dragDayIndex} to day ${hoverDayIndex}`)

      // Don't replace items with themselves
      if (dragTaskId === hoverTaskId) {
        return
      }

      // For day-to-day or column-to-column dragging, allow the move immediately
      if (dragDayIndex !== hoverDayIndex || dragColumnType !== hoverColumnType) {
        // Pass both taskId and index, so moveTask can use taskId for reliable identification
        moveTask(dragIndex, hoverIndex, dragDayIndex, hoverDayIndex, dragColumnType, hoverColumnType, dragTaskId)
        item.index = hoverIndex
        item.dayIndex = hoverDayIndex
        item.columnType = hoverColumnType
        return
      }

      // For same day/column dragging, check vertical position
      const hoverBoundingRect = ref.current?.getBoundingClientRect()
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2
      const clientOffset = monitor.getClientOffset()
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top

      // Dragging upwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return
      }

      // Dragging downwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return
      }

      // Time to actually perform the action
      moveTask(dragIndex, hoverIndex, dragDayIndex, hoverDayIndex, dragColumnType, hoverColumnType, dragTaskId)

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      item.index = hoverIndex
      item.dayIndex = hoverDayIndex
      item.columnType = hoverColumnType
    },
    canDrop: () => !isPastDay && !task.completed, // Disable dropping for past days and completed tasks
  })

  // Only apply drag and drop refs if not a past day and not completed
  const dragDropRef = !isPastDay && !task.completed ? drag(drop(ref)) : ref

  // Handle checkbox click separately to prevent task modal from opening
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleCompletion()
  }

  // Format the date for display
  const displayDate = task.dueDate || task.startDate

  // Truncate description for preview
  const descriptionPreview = task.description
    ? task.description.slice(0, 60) + (task.description.length > 60 ? "..." : "")
    : ""

  // Calculate completion status of subtasks
  const completedSubtasks = task.subtasks ? task.subtasks.filter((st) => st.completed).length : 0
  const totalSubtasks = task.subtasks ? task.subtasks.length : 0
  const hasSubtasks = totalSubtasks > 0

  // State for expanding/collapsing subtasks
  const [isExpanded, setIsExpanded] = useState(true) // Default to expanded

  // Function to toggle expand/collapse state
  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent task modal from opening
    setIsExpanded(!isExpanded)
  }

  return (
    <div
      ref={dragDropRef as React.RefObject<HTMLDivElement>}
      className={cn(
        "flex flex-col gap-1 py-2 px-3 rounded-md transition-colors",
        !isPastDay && !task.completed && "cursor-pointer hover:bg-slate-800",
        (isPastDay || task.completed) && "opacity-75",
        isDragging && "opacity-50",
      )}
      onClick={(e) => {
        e.stopPropagation()
        onTaskClick()
      }}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      data-handler-id={handlerId}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 cursor-pointer" onClick={handleCheckboxClick}>
          <div className="w-5 h-5 border border-slate-600 rounded-full flex items-center justify-center">
            {task.completed && <div className="w-3 h-3 bg-green-500 rounded-full"></div>}
          </div>
        </div>
        <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
            <span
              className={cn("text-base font-medium truncate block", task.completed && "line-through text-slate-400")}
            >
              {task.text}
            </span>
            {hasSubtasks && (
              <button
                onClick={toggleExpand}
                className="text-xs text-slate-400 hover:text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded"
              >
                {completedSubtasks}/{totalSubtasks}
                <ChevronDown
                  className={cn("h-3 w-3 inline-block ml-1 transition-transform", isExpanded && "transform rotate-180")}
                />
              </button>
            )}
          </div>

          {displayDate && (
            <span className="text-xs text-slate-400 mt-1 block">
              {format(new Date(displayDate), "MMM d")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Badge
            variant="outline"
            className={cn(
              "text-xs whitespace-nowrap px-2 py-0 h-5 min-w-[60px] text-center",
              task.category === "work" && "bg-slate-700 text-blue-400 border-blue-500",
              task.category === "personal" && "bg-slate-700 text-green-400 border-green-500",
            )}
          >
            {task.category === "personal" ? "Perso." : "Work"}
          </Badge>
        </div>
      </div>

      {/* Description preview */}
      {task.description && (
        <div className="flex items-start pl-8 text-sm text-slate-400">
          <CornerDownRight className="h-3 w-3 mr-1 mt-1 flex-shrink-0" />
          <span className="truncate">{descriptionPreview}</span>
        </div>
      )}
            {/* Subtasks section */}
            {hasSubtasks && isExpanded && (
        <div className="mt-1 border-l border-slate-700 ml-2.5">
          {task.subtasks.map((subtask) => (
            <SubtaskItem
              key={subtask.id}
              subtask={subtask}
              onToggleCompletion={() => onToggleSubtaskCompletion(subtask.id)}
            />
          ))}
        </div>
      )}

    </div>
  )
}

// Compact Task for Collapsed Column
function CompactTask({
  task,
  dayIndex,
  columnType,
  index,
  onTaskClick,
  onToggleCompletion,
  moveTask,
  isPastDay,
}: {
  task: Task
  dayIndex: number
  columnType: "personal" | "work"
  index: number
  onTaskClick: () => void
  onToggleCompletion: () => void
  moveTask: (
    dragIndex: number,
    hoverIndex: number,
    fromDayIndex: number,
    toDayIndex: number,
    fromColumnType: "personal" | "work",
    toColumnType: "personal" | "work",
  ) => void
  isPastDay: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { taskId: task.id, index, dayIndex, columnType },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: !isPastDay && !task.completed, // Disable dragging for past days and completed tasks
  })

  const [{ handlerId }, drop] = useDrop({
    accept: ITEM_TYPE,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      }
    },
    hover(item: any, monitor) {
      if (!ref.current || isPastDay || task.completed) {
        return
      }

      const dragTaskId = item.taskId
      const dragIndex = item.index
      const dragDayIndex = item.dayIndex
      const dragColumnType = item.columnType
      const hoverIndex = index
      const hoverDayIndex = dayIndex
      const hoverColumnType = columnType
      
      // Log the task being dragged for debugging
      console.log(`Dragging task ID ${dragTaskId} from day ${dragDayIndex} to day ${hoverDayIndex}`)

      // Don't replace items with themselves
      if (dragIndex === hoverIndex && dragDayIndex === hoverDayIndex && dragColumnType === hoverColumnType) {
        return
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect()

      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2

      // Determine mouse position
      const clientOffset = monitor.getClientOffset()

      // Get pixels to the top
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%

      // Dragging upwards
      if (
        dragDayIndex === hoverDayIndex &&
        dragColumnType === hoverColumnType &&
        dragIndex < hoverIndex &&
        hoverClientY < hoverMiddleY
      ) {
        return
      }

      if (
        dragDayIndex === hoverDayIndex &&
        dragColumnType === hoverColumnType &&
        dragIndex > hoverIndex &&
        hoverClientY > hoverMiddleY
      ) {
        return
      }

      // Time to actually perform the action
      moveTask(dragIndex, hoverIndex, dragDayIndex, hoverDayIndex, dragColumnType, hoverColumnType, dragTaskId)

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      item.index = hoverIndex
      item.dayIndex = hoverDayIndex
      item.columnType = hoverColumnType
    },
    canDrop: () => !isPastDay && !task.completed, // Disable dropping for past days and completed tasks
  })

  // Only apply drag and drop refs if not a past day and not completed
  const dragDropRef = !isPastDay && !task.completed ? drag(drop(ref)) : ref

  // Handle checkbox click separately to prevent task modal from opening
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleCompletion()
  }

  // Get color based on category
  const getCategoryColor = () => {
    if (task.category === "work") return "border-blue-500"
    if (task.category === "personal") return "border-green-500"
    return "border-slate-500"
  }

    // Check if task has subtasks
    const hasSubtasks = task.subtasks && task.subtasks.length > 0
    const completedSubtasks = task.subtasks ? task.subtasks.filter((st) => st.completed).length : 0
    const totalSubtasks = task.subtasks ? task.subtasks.length : 0
  

  return (
    <div
      ref={dragDropRef as React.RefObject<HTMLDivElement>}
      className={cn(
        "flex items-center justify-center py-1 transition-colors border-l-2",
        getCategoryColor(),
        !isPastDay && !task.completed && "cursor-grab hover:bg-slate-800",
        (isPastDay || task.completed) && "opacity-75",
        isDragging && "opacity-50",
        task.completed && "line-through",
      )}
      onClick={(e) => {
        e.stopPropagation()
        onTaskClick()
      }}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      data-handler-id={handlerId}
      title={`${task.text}${task.description ? `\n\n${task.description}` : ""}`}
    >
      <div className="flex-shrink-0 cursor-pointer" onClick={handleCheckboxClick}>
        {task.completed ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <Circle className="h-4 w-4 text-slate-400" />
        )}
      </div>
    </div>
  )
}

// Category Column
function CategoryColumn({
  title,
  columnType,
  day,
  dayIndex,
  tasks,
  onTaskClick,
  onToggleCompletion,
  onToggleSubtaskCompletion,
  moveTask,
  showNewTaskInput,
  newTaskText,
  onNewTaskTextChange,
  onToggleNewTaskInput,
  onAddNewTask,
  isLoading,
  borderColor,
  onTaskCategoryChange,
  isPastDay,
  onKeyDown,
  isCollapsed,
  onToggleCollapse,
}: {
  title: string
  columnType: "personal" | "work"
  day: { date: Date; tasks: Task[]; isPast: boolean }
  dayIndex: number
  tasks: Task[]
  onTaskClick: (taskId: string) => void
  onToggleCompletion: (taskId: string) => void
  onToggleSubtaskCompletion: (taskId: string, subtaskId: string) => void
  moveTask: (
    dragIndex: number,
    hoverIndex: number,
    fromDayIndex: number,
    toDayIndex: number,
    fromColumnType: "personal" | "work",
    toColumnType: "personal" | "work",
  ) => void
  showNewTaskInput: boolean
  newTaskText: string
  onNewTaskTextChange: (text: string) => void
  onToggleNewTaskInput: () => void
  onAddNewTask: () => void
  isLoading: boolean
  borderColor: string
  onTaskCategoryChange: (task: Task) => void
  isPastDay: boolean
  onKeyDown: (dayIndex: number, columnType: "personal" | "work", e: React.KeyboardEvent) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showNewTaskInput && inputRef.current && !isPastDay) {
      inputRef.current.focus()
    }
  }, [showNewTaskInput, isPastDay])

  const [{ isOver }, drop] = useDrop({
    accept: ITEM_TYPE,
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
    }),
    drop: (item: any, monitor) => {
      // Get the source day and column information
      const fromDayIndex = item.dayIndex
      const fromColumnType = item.columnType
      const draggedTaskId = item.taskId
      
      // Don't do anything if dragging within the same day and column type
      if (fromDayIndex === dayIndex && fromColumnType === columnType && !monitor.didDrop()) {
        // The task wasn't dropped on a specific task item, but on the column
        // Find the task in the original day/column
        const task = day.tasks.find(t => t.id === draggedTaskId)
        if (task) {
          // No need to update anything since it's the same column and day
          return
        }
      }
      
      // If being dropped on the column (not a specific task)
      if (!monitor.didDrop()) {
        // Insert at the beginning of the list
        moveTask(
          item.index, // source index
          0, // target index (top of the list)
          fromDayIndex, // source day
          dayIndex, // target day
          fromColumnType, // source column
          columnType // target column
        )
      }
    },
    canDrop: () => !isPastDay, // Disable dropping for past days
  })

  // Sort tasks: incomplete first, then completed
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed === b.completed) return 0
    return a.completed ? 1 : -1
  })

  // Get overdue tasks
  const overdueTasks = sortedTasks.filter(
    (task) => !task.completed && task.dueDate && isBefore(new Date(task.dueDate), new Date()) && !isPastDay,
  )

  // Get regular tasks (not overdue)
  const regularTasks = sortedTasks.filter(
    (task) => !(!task.completed && task.dueDate && isBefore(new Date(task.dueDate), new Date()) && !isPastDay)
  )

  // Ensure tasks for future dates are displayed
  const futureTasks = sortedTasks.filter(
    (task) => !task.completed && !isPastDay
  )

  // Count of tasks
  const taskCount = tasks.length
  const completedCount = tasks.filter((task) => task.completed).length

  return (
    <div
      ref={drop as unknown as React.RefObject<HTMLDivElement>}
      className={cn(
        "flex flex-col h-full transition-all duration-300 ease-in-out overflow-hidden",
        isCollapsed ? "min-w-[50px] max-w-[50px]" : "min-w-[420px] flex-1 p-4",
        isOver && !isPastDay && "bg-slate-800",
      )}
    >
      <div className={cn("flex justify-between items-center", isCollapsed ? "p-2" : "mb-4")}>
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-lg">{title}</h3>
              <Badge variant="outline" className="text-xs text-slate-400 border-slate-600">
                {completedCount}/{taskCount}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {!isPastDay && (
                <button
                  className="flex items-center justify-center w-6 h-6 text-slate-400 hover:text-slate-200 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onToggleNewTaskInput()
                  }}
                >
                  <Plus className="h-5 w-5" />
                </button>
              )}
              <button
                className="flex items-center justify-center w-6 h-6 text-slate-400 hover:text-slate-200 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onToggleCollapse()
                }}
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          <button
            className="flex items-center justify-center w-full h-6 text-slate-400 hover:text-slate-200 cursor-pointer"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggleCollapse()
            }}
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {!isCollapsed ? (
        <>
          {showNewTaskInput && !isPastDay && (
            <div className="mb-4 bg-slate-800 rounded-md p-3">
              <div className="flex items-center gap-3">
                <Plus className="h-5 w-5 text-slate-400 flex-shrink-0" />
                <Input
                  ref={inputRef}
                  value={newTaskText}
                  onChange={(e) => onNewTaskTextChange(e.target.value)}
                  placeholder="Add new task"
                  className="text-base bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 flex-1 h-auto"
                  onKeyDown={(e) => onKeyDown(dayIndex, columnType, e)}
                />
                <Command className="h-5 w-5 text-slate-400 flex-shrink-0" />
              </div>
            </div>
          )}

          <div className="space-y-6 overflow-y-auto flex-1">
  {(() => {
    // Section 1: Overdue
    const todayStr = format(day.date, "MMM d");
    const isTodayDay = isToday(day.date);
    const overdue = tasks.filter((task) => {
      if (task.completed) return false;
      if (!task.dueDate) return false;
      return isBefore(new Date(task.dueDate), day.date) && isTodayDay;
    });
    // Section 2: To-dos
    const todos = tasks.filter((task) => {
      if (task.completed) return false;
      
      // For future dates, show tasks that start on that specific date
      const isFutureDay = !isPastDay && !isTodayDay;
      if (isFutureDay) {
        if (task.startDate) {
          // Show tasks that start on this future date
          return format(new Date(task.startDateObj || task.startDate), "MMM d") === todayStr;
        }
        return false;
      }
      
      // For today, show incomplete tasks if their startDate is in the past or today
      if (isTodayDay) {
        if (task.startDate) {
          const start = new Date(task.startDateObj || day.date);
          if (isBefore(start, day.date) || format(start, "MMM d") === todayStr) {
            // Only show if not due/overdue (handled above)
            if (!task.dueDate || format(new Date(task.dueDate), "MMM d") === todayStr) {
              return true;
            }
          }
          return false;
        } else {
          // No startDate: treat as today
          return true;
        }
      }
      
      // For past days, don't show incomplete tasks
      return false;
    });
    // Section 3: Complete (completed on this day only)
    const complete = tasks.filter(task => {
      // Must be completed to show in this section
      if (!task.completed) return false;
      
      // For today, show only tasks completed today
      if (isTodayDay) {
        const todayDate = new Date();
        const isCompletedToday = (
          task.completionDateObj?.getFullYear() === todayDate.getFullYear() &&
          task.completionDateObj?.getMonth() === todayDate.getMonth() &&
          task.completionDateObj?.getDate() === todayDate.getDate()
        );
        return isCompletedToday;
      }
      
      // For past days, check if the task was completed on this specific day
      // First try to use the completionDateObj if available
      if (task.completionDateObj) {
        try {
          const completionDate = new Date(task.completionDateObj);
          // Check if the completion date matches this day
          const isMatch = (
            completionDate.getFullYear() === day.date.getFullYear() &&
            completionDate.getMonth() === day.date.getMonth() &&
            completionDate.getDate() === day.date.getDate()
          );
          
          return isMatch;
        } catch (e) {
          console.error("Error parsing completionDateObj:", e);
        }
      }
      
      // Check the direct MMM d format match first
      if (task.completionDateMMMD) {
        const dayFormattedMMMD = format(day.date, "MMM d");
        if (task.completionDateMMMD === dayFormattedMMMD) {
          return true;
        }
      }
      
      // Fall back to completionDate string comparison with multiple formats
      if (task.completionDate) {
        // Try multiple date format comparisons
        const dayFormatted = format(day.date, "yyyy-MM-dd"); // ISO format
        const dayFormattedAlt = format(day.date, "MMM d"); // Legacy format
        
        const isMatch = (
          task.completionDate === dayFormatted ||
          task.completionDate === dayFormattedAlt ||
          task.completionDate === todayStr
        );
        
        return isMatch;
      }
      
      return false;
    });
    
    // Deduplicate by ID, ensuring a task appears in only one section
    const seen = new Set();
    const dedupedOverdue = overdue.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
    const dedupedTodos = todos.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
    const dedupedComplete = complete.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
    if (isLoading) {
      return Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2 px-3">
          <Skeleton className="h-6 w-6 rounded-full bg-slate-700" />
          <div className="flex-1">
            <Skeleton className="h-5 w-3/4 mb-1 bg-slate-700" />
          </div>
          <Skeleton className="h-5 w-16 bg-slate-700 rounded-md" />
        </div>
      ));
    }
    return (
      <>
        {dedupedOverdue.length > 0 && (
          <div>
            <div className="text-purple-300 font-semibold text-sm mb-1">Overdue</div>
            {dedupedOverdue.map((task, index) => (
              <DraggableTask
                key={`overdue-${task.id}-${dayIndex}-${columnType}`}
                task={task}
                dayIndex={dayIndex}
                columnType={columnType}
                index={index}
                onTaskClick={() => onTaskClick(task.id)}
                onToggleCompletion={() => onToggleCompletion(task.id)}
                onToggleSubtaskCompletion={(subtaskId) => onToggleSubtaskCompletion(task.id, subtaskId)}
                moveTask={moveTask}
                isPastDay={isPastDay}
              />
            ))}
          </div>
        )}
        {dedupedTodos.length > 0 && (
          <div>
            <div className="text-purple-300 font-semibold text-sm mb-1">To-dos</div>
            {dedupedTodos.map((task, index) => (
              <DraggableTask
                key={`todo-${task.id}-${dayIndex}-${columnType}`}
                task={task}
                dayIndex={dayIndex}
                columnType={columnType}
                index={index}
                onTaskClick={() => onTaskClick(task.id)}
                onToggleCompletion={() => onToggleCompletion(task.id)}
                onToggleSubtaskCompletion={(subtaskId) => onToggleSubtaskCompletion(task.id, subtaskId)}
                moveTask={moveTask}
                isPastDay={isPastDay}
              />
            ))}
          </div>
        )}
        {dedupedComplete.length > 0 && (
          <div>
            <div className="text-purple-300 font-semibold text-sm mb-1">Complete</div>
            {dedupedComplete.map((task, index) => (
              <DraggableTask
                key={`complete-${task.id}-${dayIndex}-${columnType}`}
                task={task}
                dayIndex={dayIndex}
                columnType={columnType}
                index={index}
                onTaskClick={() => onTaskClick(task.id)}
                onToggleCompletion={() => onToggleCompletion(task.id)}
                onToggleSubtaskCompletion={(subtaskId) => onToggleSubtaskCompletion(task.id, subtaskId)}
                moveTask={moveTask}
                isPastDay={isPastDay}
              />
            ))}
          </div>
        )}
        {dedupedOverdue.length === 0 && dedupedTodos.length === 0 && dedupedComplete.length === 0 && (
          <div className="text-slate-500 text-center py-6">No tasks</div>
        )}
      </>
    );
  })()}
</div>
        </>
      ) : (
        // Show nothing in collapsed view except the header button which is already outside this conditional
        <div className="hidden">
          {/* Tasks are completely hidden when column is collapsed */}
        </div>
      )}
    </div>
  )
}

// Day Column
function DayColumn({
  day,
  dayIndex,
  tasks,
  onTaskClick,
  onToggleCompletion,
  onToggleSubtaskCompletion,
  moveTask,
  showNewTaskInputs,
  newTaskTexts,
  onNewTaskTextChange,
  onToggleNewTaskInput,
  onAddNewTask,
  isLoading,
  onTaskCategoryChange,
  onKeyDown,
  collapsedColumns,
  onToggleColumnCollapse,
}: {
  day: { date: Date; tasks: Task[]; isPast: boolean }
  dayIndex: number
  tasks: Task[]
  onTaskClick: (taskId: string) => void
  onToggleCompletion: (taskId: string) => void
  onToggleSubtaskCompletion: (taskId: string, subtaskId: string) => void
  moveTask: (
    dragIndex: number,
    hoverIndex: number,
    fromDayIndex: number,
    toDayIndex: number,
    fromColumnType: "personal" | "work",
    toColumnType: "personal" | "work",
  ) => void
  showNewTaskInputs: { [key: string]: boolean }
  newTaskTexts: { [key: string]: string }
  onNewTaskTextChange: (columnType: "personal" | "work", text: string) => void
  onToggleNewTaskInput: (columnType: "personal" | "work") => void
  onAddNewTask: (columnType: "personal" | "work") => void
  isLoading: boolean
  onTaskCategoryChange: (task: Task) => void
  onKeyDown: (dayIndex: number, columnType: "personal" | "work", e: React.KeyboardEvent) => void
  collapsedColumns: { [key: string]: boolean }
  onToggleColumnCollapse: (dayIndex: number, columnType: "personal" | "work") => void
}) {
  // Filter tasks by category
  const personalTasks = tasks.filter((task) => task.category === "personal")
  const workTasks = tasks.filter((task) => task.category === "work")

  const dateKey = format(day.date, "yyyy-MM-dd")
  const personalKey = `${dateKey}-personal`
  const workKey = `${dateKey}-work`

  const isCurrentDay = isToday(day.date)
  const isPastDay = day.isPast
  const isWeekendDay = isWeekend(day.date)

  // Check if columns are collapsed
  const isPersonalCollapsed = collapsedColumns[`${dayIndex}-personal`] || false
  const isWorkCollapsed = collapsedColumns[`${dayIndex}-work`] || false

  // Calculate day column width based on collapsed state
  const dayWidth = (isPersonalCollapsed ? 50 : 420) + (isWorkCollapsed ? 50 : 420)

  return (
    <div
      className={cn(
        "border-r border-slate-700 flex flex-col h-[calc(100vh-73px)]",
        "bg-[#0a0e1a]",
        isCurrentDay && "ring-1 ring-blue-500 ring-inset",
        isWeekendDay && "bg-[#0a0e1a]",
      )}
      style={{ width: dayWidth, minWidth: dayWidth, maxWidth: dayWidth }}
    >
      <div
        className={cn(
          "p-4 border-b border-slate-700 flex items-center justify-between",
          isPastDay && "bg-slate-800",
          isWeekendDay && !isPastDay && "bg-slate-800/50",
        )}
      >
        <div>
          <h2 className={cn("font-semibold text-lg flex items-center", isCurrentDay && "text-purple-400")}>
            {isCurrentDay ? "Today" : format(day.date, "EEEE")}
            {isPastDay && <Lock className="ml-2 h-4 w-4 text-slate-400" />}
          </h2>
          <p className="text-sm text-slate-400">{format(day.date, "MMM d")}</p>
        </div>
        {isWeekendDay && !isPastDay && (
          <Badge variant="outline" className="text-blue-400 border-blue-600 rounded-full px-3 py-1">
            Weekend
          </Badge>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Personal Column */}
        <CategoryColumn
          title="Personal"
          columnType="personal"
          day={day}
          dayIndex={dayIndex}
          tasks={personalTasks}
          onTaskClick={onTaskClick}
          onToggleCompletion={onToggleCompletion}
          onToggleSubtaskCompletion={onToggleSubtaskCompletion}
          moveTask={moveTask}
          showNewTaskInput={showNewTaskInputs[personalKey] || false}
          newTaskText={newTaskTexts[personalKey] || ""}
          onNewTaskTextChange={(text) => onNewTaskTextChange("personal", text)}
          onToggleNewTaskInput={() => onToggleNewTaskInput("personal")}
          onAddNewTask={() => onAddNewTask("personal")}
          onKeyDown={onKeyDown}
          isLoading={isLoading}
          borderColor="border-green-700"
          onTaskCategoryChange={onTaskCategoryChange}
          isPastDay={isPastDay}
          isCollapsed={isPersonalCollapsed}
          onToggleCollapse={() => onToggleColumnCollapse(dayIndex, "personal")}
        />

        {/* Work Column */}
        <CategoryColumn
          title="Work"
          columnType="work"
          day={day}
          dayIndex={dayIndex}
          tasks={workTasks}
          onTaskClick={onTaskClick}
          onToggleCompletion={onToggleCompletion}
          onToggleSubtaskCompletion={onToggleSubtaskCompletion}
          moveTask={moveTask}
          showNewTaskInput={showNewTaskInputs[workKey] || false}
          newTaskText={newTaskTexts[workKey] || ""}
          onNewTaskTextChange={(text) => onNewTaskTextChange("work", text)}
          onToggleNewTaskInput={() => onToggleNewTaskInput("work")}
          onAddNewTask={() => onAddNewTask("work")}
          onKeyDown={onKeyDown}
          isLoading={isLoading}
          borderColor="border-blue-700"
          onTaskCategoryChange={onTaskCategoryChange}
          isPastDay={isPastDay}
          isCollapsed={isWorkCollapsed}
          onToggleCollapse={() => onToggleColumnCollapse(dayIndex, "work")}
        />
      </div>
    </div>
  )
}

// Login component
import { AuthForm } from "@/components/auth-form"
import { Alert, AlertDescription } from "@/components/ui/alert"

function Login() {
  const [error, setError] = React.useState<string | null>(null)

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-slate-800 rounded-lg shadow-lg border border-slate-700">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">TaskMaster</h1>
          <p className="mt-2 text-slate-300">Sign in to manage your tasks</p>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <AuthForm onError={setError} />
      </div>
    </div>
  )
}


export default function WeeklyTaskManager() {
  const { user, status, signOut } = useAuth()
  const {
    days,
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
    moveTask: originalMoveTask,
    refreshTasks,
    loadMoreDays,
    findTodayIndex,
    updateTaskPositions,
  } = useTasks()
  const [newTaskTexts, setNewTaskTexts] = useState<{ [key: string]: string }>({})
  const [showNewTaskInputs, setShowNewTaskInputs] = useState<{ [key: string]: boolean }>({})
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showDiagnostic, setShowDiagnostic] = useState(!isSupabaseConfigured())
  const [collapsedColumns, setCollapsedColumns] = useState<{ [key: string]: boolean }>({})
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  
  // Responsive view state
  const [isMobileView, setIsMobileView] = useState<boolean>(false)
  const [activeDayIndex, setActiveDayIndex] = useState<number>(0)
  const [activeColumnType, setActiveColumnType] = useState<'personal' | 'work'>('personal')
  
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const moveTask = useCallback((
    dragIndex: number,
    hoverIndex: number,
    dragDayIndex: number,
    hoverDayIndex: number,
    dragColumnType: 'work' | 'personal',
    hoverColumnType: 'work' | 'personal',
    taskId?: string  // Add taskId parameter
  ) => {
    // Prevent moving tasks to past days
    if (hoverDayIndex < 0) {
      return
    }

    // Call the original moveTask function from useTasks
    // Include the taskId for reliable task identification
    originalMoveTask(dragIndex, hoverIndex, dragDayIndex, hoverDayIndex, dragColumnType, hoverColumnType, taskId)
  }, [originalMoveTask])

  // Initialize state for new task inputs
  useEffect(() => {
    if (days.length > 0) {
      const initialNewTaskTexts: { [key: string]: string } = {}
      const initialShowNewTaskInputs: { [key: string]: boolean } = {}

      days.forEach((day) => {
        const dateKey = format(day.date, "yyyy-MM-dd")
        initialNewTaskTexts[`${dateKey}-personal`] = ""
        initialNewTaskTexts[`${dateKey}-work`] = ""
        initialShowNewTaskInputs[`${dateKey}-personal`] = false
        initialShowNewTaskInputs[`${dateKey}-work`] = false
      })

      setNewTaskTexts(initialNewTaskTexts)
      setShowNewTaskInputs(initialShowNewTaskInputs)
    }
  }, [days.length])
  
  // Responsive layout detection
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 1024) // Consider tablets and phones as mobile view
    }
    
    // Set initial state
    checkMobileView()
    
    // Add event listener for window resize
    window.addEventListener('resize', checkMobileView)
    
    // Clean up event listener
    return () => window.removeEventListener('resize', checkMobileView)
  }, [])
  
  // Set initial active day only once when component mounts
  useEffect(() => {
    if (days.length > 0) {
      const todayIndex = findTodayIndex()
      if (todayIndex !== null) {
        setActiveDayIndex(todayIndex)
      }
    }
  }, []) // Empty dependency array so it only runs once

  // No need to scroll to today when the app loads since today is already the first day

  // If not authenticated, show login screen
  if (status === "unauthenticated") {
    return <Login />
  }

  // If loading session, show loading state
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4 text-white">Loading...</h2>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    )
  }

  // If there's an error with Supabase configuration, show diagnostic
  if (showDiagnostic) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-4">
        <div className="w-full max-w-2xl">
          <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700 mb-6">
            <div className="flex items-center gap-3 mb-4 text-red-400">
              <AlertCircle className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Supabase Configuration Issue</h1>
            </div>
            <p className="mb-4">
              There appears to be an issue with your Supabase configuration. The app is currently running in fallback
              mode using localStorage.
            </p>
            <p className="mb-6">
              To fix this issue, please make sure your Supabase environment variables are correctly set up.
            </p>
            <SupabaseDiagnostic />
            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setShowDiagnostic(false)}>
                Continue in Fallback Mode
              </Button>
              <Button onClick={() => window.location.reload()}>Retry Connection</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleTaskCategoryChange = (task: Task) => {
    updateTask(task)
  }

  const toggleTaskCompletion = async (dayIndex: number, taskId: string) => {
    const task = days[dayIndex].tasks.find((t) => t.id === taskId)
    if (task) {
      // Toggle the task completion status
      const newCompletedStatus = !task.completed

      // If completing the task, also complete all subtasks
      const updatedSubtasks = task.subtasks.map((subtask) => ({
        ...subtask,
        completed: newCompletedStatus ? true : subtask.completed,
      }))
      
      // Set or clear the completion date based on the completion status
      const today = new Date()
      
      // Store both ISO format and MMM d format to ensure compatibility
      const completionDate = newCompletedStatus 
        ? format(today, "yyyy-MM-dd") 
        : undefined;
      const completionDateMMMD = newCompletedStatus 
        ? format(today, "MMM d") 
        : undefined;
      const completionDateObj = newCompletedStatus ? today : null

      // If uncompleting, move the task to today
      if (!newCompletedStatus) {
        task.startDate = format(today, "MMM d")
        task.startDateObj = today
      }

      await updateTask({
        ...task,
        completed: newCompletedStatus,
        subtasks: updatedSubtasks,
        completionDate,
        completionDateMMMD,
        completionDateObj,
      })
    }
  }

  const toggleSubtaskCompletion = async (dayIndex: number, taskId: string, subtaskId: string) => {
    // We allow toggling completion on any day (past or present) now
    const task = days[dayIndex].tasks.find((t) => t.id === taskId)
    if (task) {
      // Update the specific subtask
      const updatedSubtasks = task.subtasks.map((subtask) =>
        subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask,
      )

      // Check if all subtasks are completed
      const allSubtasksCompleted = updatedSubtasks.every((subtask) => subtask.completed)
      
      // Set the completion date if the task is being completed
      const today = new Date()
      const shouldComplete = allSubtasksCompleted && updatedSubtasks.length > 0 && !task.completed
      
      // Store both ISO format and MMM d format 
      const completionDate = shouldComplete 
        ? format(today, "yyyy-MM-dd") 
        : task.completionDate;
      const completionDateMMMD = shouldComplete 
        ? format(today, "MMM d") 
        : task.completionDateMMMD;
      const completionDateObj = shouldComplete ? today : task.completionDateObj
      
      if (shouldComplete) {
        console.log("Setting completion date from subtask completion:", {
          completionDate,
          completionDateMMMD,
          completionDateObj,
          taskId,
          taskText: task.text
        });
      }

      // Update the task with the new subtasks and potentially mark the task as completed
      const updatedTask = {
        ...task,
        subtasks: updatedSubtasks,
        completed: allSubtasksCompleted && updatedSubtasks.length > 0 ? true : task.completed,
        completionDate,
        completionDateMMMD,
        completionDateObj,
      }

      await updateTask(updatedTask)
    }
  }

  const addNewTask = async (dayIndex: number, columnType: "personal" | "work") => {
    // Don't allow adding tasks to past days
    if (days[dayIndex].isPast) {
      return
    }

    const day = days[dayIndex]
    const dateKey = format(day.date, "yyyy-MM-dd")
    const key = `${dateKey}-${columnType}`
    const taskText = newTaskTexts[key]

    if (taskText.trim() === "") return

    const newTask = {
      text: taskText,
      completed: false,
      category: columnType,
      subtasks: [],
      startDate: format(day.date, "MMM d"),
      startDateObj: day.date,
    }

    await createTask(newTask, dayIndex)

    // Clear the input but keep it open and focused
    setNewTaskTexts({
      ...newTaskTexts,
      [key]: "",
    })

    // We don't close the input anymore:
    // setShowNewTaskInputs({ ...showNewTaskInputs, [key]: false })
  }

  const toggleNewTaskInput = (dayIndex: number, columnType: "personal" | "work") => {
    // Don't allow adding tasks to past days
    if (days[dayIndex].isPast) {
      return
    }

    const dateKey = format(days[dayIndex].date, "yyyy-MM-dd")
    const key = `${dateKey}-${columnType}`

    setShowNewTaskInputs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleNewTaskTextChange = (dayIndex: number, columnType: "personal" | "work", text: string) => {
    const dateKey = format(days[dayIndex].date, "yyyy-MM-dd")
    const key = `${dateKey}-${columnType}`
    setNewTaskTexts({
      ...newTaskTexts,
      [key]: text,
    })
  }

  const openTaskModal = (dayIndex: number, taskId: string) => {
    const task = days[dayIndex].tasks.find((t) => t.id === taskId) || null
    setSelectedTask(task)
    setIsModalOpen(true)
  }

  const closeTaskModal = () => {
    setIsModalOpen(false)
    setSelectedTask(null)
  }

  const saveTaskChanges = async (updatedTask: Task) => {
    // Find the day for this task
    const dayIndex = days.findIndex((day) => {
      return day.tasks.some((task) => task.id === updatedTask.id)
    })

    // Don't allow editing tasks in past days
    if (dayIndex !== -1 && days[dayIndex].isPast) {
      closeTaskModal()
      return
    }

    await updateTask(updatedTask)
    closeTaskModal()
  }

  const handleDeleteTask = async (taskId: string) => {
    // Find the day for this task
    const dayIndex = days.findIndex((day) => {
      return day.tasks.some((task) => task.id === taskId)
    })

    // Don't allow deleting tasks in past days
    if (dayIndex !== -1 && days[dayIndex].isPast) {
      closeTaskModal()
      return
    }

    await deleteTask(taskId)
    closeTaskModal()
  }

  const handleResetToSampleData = () => {
    resetToSampleData()
    refreshTasks()
  }

  const scrollToToday = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: 0,
        behavior: "smooth",
      })
    }
  }

  const handleKeyDown = (dayIndex: number, columnType: "personal" | "work", e: React.KeyboardEvent) => {
    const dateKey = format(days[dayIndex].date, "yyyy-MM-dd")
    const key = `${dateKey}-${columnType}`

    if (e.key === "Enter") {
      e.preventDefault()
      addNewTask(dayIndex, columnType)
    } else if (e.key === "Escape") {
      e.preventDefault()
      setShowNewTaskInputs({
        ...showNewTaskInputs,
        [key]: false,
      })
    }
  }
  
  // Mobile navigation functions with debugging
  const goToNextDay = () => {
    if (activeDayIndex < days.length - 1) {
      const newIndex = activeDayIndex + 1
      console.log(`Navigation: Moving from day ${activeDayIndex} to day ${newIndex}`)
      setActiveDayIndex(newIndex)
    }
  }
  
  const goToPreviousDay = () => {
    if (activeDayIndex > 0) {
      const newIndex = activeDayIndex - 1
      console.log(`Navigation: Moving from day ${activeDayIndex} to day ${newIndex}`)
      setActiveDayIndex(newIndex)
    }
  }
  
  const toggleColumnType = () => {
    const newType = activeColumnType === 'personal' ? 'work' : 'personal'
    console.log(`Navigation: Switching column from ${activeColumnType} to ${newType}`)
    setActiveColumnType(newType)
  }

  const toggleColumnCollapse = (dayIndex: number, columnType: "personal" | "work") => {
    const key = `${dayIndex}-${columnType}`
    setCollapsedColumns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  // Function to collapse all columns of a specific type
  const collapseAllColumnsOfType = (columnType: "personal" | "work") => {
    const newCollapsedState = { ...collapsedColumns }
    days.forEach((_, dayIndex) => {
      newCollapsedState[`${dayIndex}-${columnType}`] = true
    })
    setCollapsedColumns(newCollapsedState)
  }

  // Function to expand all columns of a specific type
  const expandAllColumnsOfType = (columnType: "personal" | "work") => {
    const newCollapsedState = { ...collapsedColumns }
    days.forEach((_, dayIndex) => {
      newCollapsedState[`${dayIndex}-${columnType}`] = false
    })
    setCollapsedColumns(newCollapsedState)
  }

  // If there's an error, show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center max-w-md p-6 bg-slate-800 rounded-lg shadow-lg border border-slate-700">
          <div className="flex items-center justify-center mb-4 text-red-400">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-semibold mb-4 text-white">Error Loading Tasks</h2>
          <p className="mb-6 text-slate-300">{error}</p>
          <div className="flex flex-col gap-3">
            <Button onClick={refreshTasks}>Try Again</Button>
            <Button variant="outline" onClick={() => setShowDiagnostic(true)}>
              Show Diagnostic
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-screen bg-[#0a0e1a] text-slate-100">
        {/* Sidebar */}
        <div className={`${sidebarCollapsed ? 'w-[50px]' : 'w-[180px]'} border-r border-slate-700 p-4 flex flex-col bg-slate-800 transition-all duration-300 ease-in-out`}>
          <div className="flex items-center justify-between mb-6">
            {!sidebarCollapsed && <h2 className="font-semibold text-lg">TaskMaster</h2>}
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`${sidebarCollapsed ? 'mx-auto' : ''} text-slate-400 hover:text-slate-100 transition-colors`}
            >
              {sidebarCollapsed ? 
                <ChevronRight className="h-4 w-4" /> : 
                <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          <div className="space-y-1">
            <Button variant="ghost" className={`w-full ${sidebarCollapsed ? 'justify-center px-0' : 'justify-start'} text-slate-200`}>
              <Home className={`${sidebarCollapsed ? '' : 'mr-2'} h-4 w-4`} />
              {!sidebarCollapsed && 'Home'}
            </Button>
            <Button variant="ghost" className={`w-full ${sidebarCollapsed ? 'justify-center px-0' : 'justify-start'} bg-slate-700 text-slate-100`}>
              <Calendar className={`${sidebarCollapsed ? '' : 'mr-2'} h-4 w-4`} />
              {!sidebarCollapsed && 'Today'}
            </Button>
            <Button variant="ghost" className={`w-full ${sidebarCollapsed ? 'justify-center px-0' : 'justify-start'} text-slate-200`}>
              <Target className={`${sidebarCollapsed ? '' : 'mr-2'} h-4 w-4`} />
              {!sidebarCollapsed && 'Focus'}
            </Button>
          </div>

          {/* Daily rituals section - visible in both collapsed and expanded states */}
          <div className={`${sidebarCollapsed ? 'mt-6' : 'mt-8'}`}>
            {!sidebarCollapsed && (
              <h3 className="text-xs font-semibold text-slate-400 mb-2">DAILY RITUALS</h3>
            )}
            <div className="space-y-1">
              <Button variant="ghost" className={`w-full ${sidebarCollapsed ? 'justify-center px-0' : 'justify-start'} text-sm text-slate-200`} asChild>
                <Link href="/decision-matrix">
                  <ClipboardList className={`${sidebarCollapsed ? '' : 'mr-2'} h-4 w-4`} />
                  {!sidebarCollapsed && 'Decision Matrix'}
                </Link>
              </Button>
              <Button variant="ghost" className={`w-full ${sidebarCollapsed ? 'justify-center px-0' : 'justify-start'} text-sm text-slate-200`}>
                <CheckSquare className={`${sidebarCollapsed ? '' : 'mr-2'} h-4 w-4`} />
                {!sidebarCollapsed && 'Daily objectives'}
              </Button>
              <Button variant="ghost" className={`w-full ${sidebarCollapsed ? 'justify-center px-0' : 'justify-start'} text-sm text-slate-200`}>
                <Sunset className={`${sidebarCollapsed ? '' : 'mr-2'} h-4 w-4`} />
                {!sidebarCollapsed && 'Daily shutdown'}
              </Button>
              <Button variant="ghost" className={`w-full ${sidebarCollapsed ? 'justify-center px-0' : 'justify-start'} text-sm text-slate-200`}>
                <Sparkles className={`${sidebarCollapsed ? '' : 'mr-2'} h-4 w-4`} />
                {!sidebarCollapsed && 'Daily rituals'}
              </Button>
            </div>
          </div>

          {/* Weekly rituals section - visible in both collapsed and expanded states */}
          <div className={`${sidebarCollapsed ? 'mt-6' : 'mt-4'}`}>
            {!sidebarCollapsed && (
              <h3 className="text-xs font-semibold text-slate-400 mb-2">WEEKLY RITUALS</h3>
            )}
            <div className="space-y-1">
              <Button variant="ghost" className={`w-full ${sidebarCollapsed ? 'justify-center px-0' : 'justify-start'} text-sm text-slate-200`}>
                <CalendarCheck className={`${sidebarCollapsed ? '' : 'mr-2'} h-4 w-4`} />
                {!sidebarCollapsed && 'Weekly planning'}
              </Button>
              <Button variant="ghost" className={`w-full ${sidebarCollapsed ? 'justify-center px-0' : 'justify-start'} text-sm text-slate-200`}>
                <ClipboardCheck className={`${sidebarCollapsed ? '' : 'mr-2'} h-4 w-4`} />
                {!sidebarCollapsed && 'Weekly review'}
              </Button>
            </div>
          </div>

          {!sidebarCollapsed ? (
            <div className="mt-4">
              <h3 className="text-xs font-semibold text-slate-400 mb-2">COLUMN CONTROLS</h3>
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm text-slate-200"
                  onClick={() => collapseAllColumnsOfType("personal")}
                >
                  <Minimize2 className="mr-2 h-4 w-4" />
                  Collapse Personal
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm text-slate-200"
                  onClick={() => expandAllColumnsOfType("personal")}
                >
                  <Maximize2 className="mr-2 h-4 w-4" />
                  Expand Personal
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm text-slate-200"
                  onClick={() => collapseAllColumnsOfType("work")}
                >
                  <Minimize2 className="mr-2 h-4 w-4" />
                  Collapse Work
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm text-slate-200"
                  onClick={() => expandAllColumnsOfType("work")}
                >
                  <Maximize2 className="mr-2 h-4 w-4" />
                  Expand Work
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center space-y-2">
              <button 
                onClick={() => collapseAllColumnsOfType("personal")}
                className="text-slate-400 hover:text-slate-100 p-1"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => expandAllColumnsOfType("personal")}
                className="text-slate-400 hover:text-slate-100 p-1"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => collapseAllColumnsOfType("work")}
                className="text-slate-400 hover:text-slate-100 p-1"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => expandAllColumnsOfType("work")}
                className="text-slate-400 hover:text-slate-100 p-1"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="mt-auto space-y-2">
            {/* Only show diagnostic in development environments and when sidebar is expanded */}
            {!sidebarCollapsed && (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') && (
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2 border-slate-600 text-slate-200"
                onClick={() => setShowDiagnostic(true)}
              >
                <AlertCircle className="h-4 w-4" />
                Supabase Diagnostic
              </Button>
            )}
            
            {/* User profile section */}
            <div
              className={`flex items-center ${sidebarCollapsed ? 'justify-center' : ''} p-2 rounded-lg bg-slate-700 cursor-pointer hover:bg-slate-600`}
              onClick={() => router.push("/profile")}
            >
              <Avatar className={`h-8 w-8 ${sidebarCollapsed ? '' : 'mr-2'} bg-blue-600`}>
                <AvatarFallback>
                  {user?.user_metadata?.name
                    ? user.user_metadata.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()
                        .substring(0, 2)
                    : user?.email?.substring(0, 2).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              {!sidebarCollapsed && (
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-100">
                    {user?.user_metadata?.name || user?.email?.split("@")[0] || "User"}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                </div>
              )}
            </div>
            
            {/* Sign out button */}
            <Button 
              variant="outline" 
              className={`${sidebarCollapsed ? 'p-2 h-auto aspect-square' : 'w-full'} border-slate-600 text-slate-200 flex items-center justify-center`} 
              onClick={() => signOut()}
            >
              <LogOut className={`${sidebarCollapsed ? '' : 'mr-2'} h-4 w-4`} />
              {!sidebarCollapsed && 'Sign out'}
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={scrollToToday} className="border-slate-600 text-slate-200">
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => loadMoreDays("future")} className="border-slate-600 text-slate-200">
                Load More Days
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToSampleData}
                className="border-slate-600 text-slate-200"
              >
                Reset Data
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut()}
                className="border-slate-600 text-slate-200"
              >
                Sign Out
              </Button>
            </div>
          </div>

          {/* Tasks view */}
          <div
            className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800 p-4"
            ref={scrollContainerRef}
          >
            {/* Mobile View */}
            {isMobileView && days.length > 0 && (
              <div className="flex flex-col w-full">
                {/* Navigation Header */}
                <div className="flex justify-between items-center mb-4">
                  <button 
                    onClick={goToPreviousDay} 
                    disabled={activeDayIndex === 0}
                    className={`p-2 rounded-md ${activeDayIndex === 0 ? 'bg-gray-600 text-gray-400' : 'bg-blue-600 text-white'}`}
                    aria-label="Previous day"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  
                  <h2 className="text-xl font-semibold">
                    {days[activeDayIndex]?.date && format(days[activeDayIndex].date, 'EEEE, MMM d')}
                    <span className="ml-2 text-sm opacity-70">(Day {activeDayIndex + 1} of {days.length})</span>
                  </h2>
                  
                  <button 
                    onClick={goToNextDay} 
                    disabled={activeDayIndex === days.length - 1}
                    className={`p-2 rounded-md ${activeDayIndex === days.length - 1 ? 'bg-gray-600 text-gray-400' : 'bg-blue-600 text-white'}`}
                    aria-label="Next day"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
                
                {/* Column Type Switcher */}
                <div className="flex justify-center mb-4">
                  <button 
                    onClick={toggleColumnType}
                    className="px-4 py-2 rounded-md bg-purple-600 text-white flex items-center gap-2"
                  >
                    Switch to {activeColumnType === 'personal' ? 'Work' : 'Personal'}
                    <RefreshCw size={16} />
                  </button>
                </div>
                
                {/* Current Day Column with debug information */}
                {(() => {
                  // Using IIFE to enable local variables for debugging
                  const currentDay = days[activeDayIndex];
                  const dateKey = currentDay?.date ? format(currentDay.date, "yyyy-MM-dd") : '';
                  const taskCount = currentDay?.tasks.filter(t => t.category === activeColumnType).length || 0;
                  
                  console.log(`Rendering mobile view for day index: ${activeDayIndex}, date: ${dateKey}, ${activeColumnType} tasks: ${taskCount}`);
                  
                  return currentDay && (
                    <div className="w-full h-full">
                      <CategoryColumn
                        title={activeColumnType === 'personal' ? 'Personal' : 'Work'}
                        columnType={activeColumnType}
                        day={currentDay}
                        dayIndex={activeDayIndex}
                        tasks={currentDay.tasks.filter(task => task.category === activeColumnType)}
                        onTaskClick={(taskId) => openTaskModal(activeDayIndex, taskId)}
                        onToggleCompletion={(taskId) => toggleTaskCompletion(activeDayIndex, taskId)}
                        onToggleSubtaskCompletion={(taskId, subtaskId) => toggleSubtaskCompletion(activeDayIndex, taskId, subtaskId)}
                        moveTask={moveTask}
                        showNewTaskInput={showNewTaskInputs[`${dateKey}-${activeColumnType}`] || false}
                        newTaskText={newTaskTexts[`${dateKey}-${activeColumnType}`] || ''}
                        onNewTaskTextChange={(text) => handleNewTaskTextChange(activeDayIndex, activeColumnType, text)}
                        onToggleNewTaskInput={() => toggleNewTaskInput(activeDayIndex, activeColumnType)}
                        onAddNewTask={() => addNewTask(activeDayIndex, activeColumnType)}
                        isLoading={isLoading}
                        borderColor={activeColumnType === 'personal' ? 'border-blue-500' : 'border-green-500'}
                        onTaskCategoryChange={handleTaskCategoryChange}
                        isPastDay={currentDay.isPast}
                        onKeyDown={(_, columnType, e) => handleKeyDown(activeDayIndex, columnType, e)}
                        isCollapsed={false}
                        onToggleCollapse={() => {}}
                      />
                    </div>
                  );
                })()}
              </div>
            )}
            
            {/* Desktop View */}
            {!isMobileView && (
              <div className="flex gap-4">
                {days.map((day, dayIndex) => (
                  <DayColumn
                    key={`day-${dayIndex}`}
                    day={day}
                    dayIndex={dayIndex}
                    tasks={day.tasks}
                    onTaskClick={(taskId) => openTaskModal(dayIndex, taskId)}
                    onToggleCompletion={(taskId) => toggleTaskCompletion(dayIndex, taskId)}
                    onToggleSubtaskCompletion={(taskId, subtaskId) => toggleSubtaskCompletion(dayIndex, taskId, subtaskId)}
                    moveTask={moveTask}
                    showNewTaskInputs={showNewTaskInputs}
                    newTaskTexts={newTaskTexts}
                    onNewTaskTextChange={(columnType, text) => handleNewTaskTextChange(dayIndex, columnType, text)}
                    onToggleNewTaskInput={(columnType) => toggleNewTaskInput(dayIndex, columnType)}
                    onAddNewTask={(columnType) => addNewTask(dayIndex, columnType)}
                    isLoading={isLoading}
                    onTaskCategoryChange={handleTaskCategoryChange}
                    onKeyDown={(dayIndex, columnType, e) => handleKeyDown(dayIndex, columnType, e)}
                    collapsedColumns={collapsedColumns}
                    onToggleColumnCollapse={(dayIndex, columnType) => toggleColumnCollapse(dayIndex, columnType)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Task Modal */}
        <TaskModal
          task={selectedTask}
          isOpen={isModalOpen}
          onClose={closeTaskModal}
          onSave={saveTaskChanges}
          onDelete={handleDeleteTask}
          isPastDay={selectedTask ? days.find((day) => day.tasks.some((task) => task.id === selectedTask.id))?.isPast : false}
        />
      </div>
    </DndProvider>
  )
}
