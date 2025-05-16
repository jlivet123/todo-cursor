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
import { isSupabaseConfigured } from "@/lib/supabase"
import { Task, Subtask, resetToSampleData } from "@/lib/storage"
import Link from "next/link"
import { SupabaseDiagnostic } from "@/components/supabase-diagnostic"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PageLayout } from "@/components/page-layout"

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
    taskId?: string, // Added taskId parameter for more reliable identification
  ) => void
  isPastDay: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { taskId: task.id, taskText: task.text, index, dayIndex, columnType },
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

      // Don't replace items with themselves
      if (dragTaskId === hoverTaskId) {
        return
      }

      // For day-to-day or column-to-column dragging, allow the move immediately
      if (dragDayIndex !== hoverDayIndex || dragColumnType !== hoverColumnType) {
        // Pass taskId for reliable identification
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
      const hoverClientY = clientOffset ? clientOffset.y - hoverBoundingRect.top : 0

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return
      }

      // Dragging upwards
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

  // Handle checkbox click
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
        isDragging && "opacity-50"
      )}
      onClick={(e) => {
        e.stopPropagation()
        onTaskClick()
      }}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      data-handler-id={handlerId}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 pt-1 cursor-pointer" onClick={handleCheckboxClick}>
            {task.completed ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <Circle className="h-4 w-4 text-slate-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className={cn(
                "font-medium truncate",
                task.completed && "line-through text-slate-400"
              )}
            >
              {task.text}
            </h3>
            {descriptionPreview && (
              <p className="text-xs text-slate-400 mt-1">{descriptionPreview}</p>
            )}
          </div>
        </div>

        {/* Task category indicator */}
        <div
          className={cn(
            "h-2 w-2 rounded-full mt-1.5",
            task.category === "personal" ? "bg-blue-500" : "bg-green-500"
          )}
        ></div>
      </div>

      {/* Task metadata */}
      <div className="pl-6 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          {/* Due date */}
          {displayDate && (
            <div className="flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              {displayDate}
            </div>
          )}

          {/* Subtasks counter */}
          {hasSubtasks && (
            <div className="flex items-center">
              <ClipboardList className="h-3 w-3 mr-1" />
              {completedSubtasks}/{totalSubtasks}
              <button
                onClick={toggleExpand}
                className="ml-1 text-slate-400 hover:text-slate-300"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Subtasks list */}
      {hasSubtasks && isExpanded && (
        <div className="mt-1">
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
    taskId?: string
  ) => void
  isPastDay: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { taskId: task.id, taskText: task.text, index, dayIndex, columnType },
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

      // Don't replace items with themselves
      if (dragTaskId === hoverTaskId) {
        return
      }

      // For day-to-day or column-to-column dragging, allow the move immediately
      if (dragDayIndex !== hoverDayIndex || dragColumnType !== hoverColumnType) {
        // Pass taskId for reliable identification
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
      const hoverClientY = clientOffset ? clientOffset.y - hoverBoundingRect.top : 0

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return
      }

      // Dragging upwards
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

  // Handle checkbox click
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleCompletion()
  }

  return (
    <div
      ref={dragDropRef as React.RefObject<HTMLDivElement>}
      className={cn(
        "flex items-center gap-2 px-2 py-2 rounded-md transition-colors my-1",
        !isPastDay && !task.completed && "cursor-grab hover:bg-slate-800",
        (isPastDay || task.completed) && "opacity-75",
        isDragging && "opacity-40 border border-blue-500 shadow-lg"
      )}
      onClick={(e) => {
        e.stopPropagation()
        onTaskClick()
      }}
      style={{
        opacity: isDragging ? 0.4 : 1,
        cursor: isDragging ? 'grabbing' : ((!isPastDay && !task.completed) ? 'grab' : 'default')
      }}
      data-handler-id={handlerId}
    >
      <div className="flex items-center gap-1">
        <div className="cursor-pointer" onClick={handleCheckboxClick}>
          {task.completed ? (
            <CheckCircle className="h-3 w-3 text-green-500" />
          ) : (
            <Circle className="h-3 w-3 text-slate-500" />
          )}
        </div>
        <div className="text-xs truncate">{task.text}</div>
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

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ITEM_TYPE,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
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

  // Count of tasks
  const taskCount = tasks.length
  const completedCount = tasks.filter((task) => task.completed).length

  return (
    <div
      className={cn(
        "flex flex-col h-full transition-all duration-300 ease-in-out overflow-hidden",
        isCollapsed ? "min-w-[50px] max-w-[50px]" : "min-w-[420px] flex-1 p-4"
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

          <div 
            ref={drop as unknown as React.RefObject<HTMLDivElement>}
            className={cn(
              "space-y-6 overflow-y-auto flex-1 rounded-md",
              isOver && canDrop && !isPastDay && "ring-2 ring-blue-500 ring-opacity-50 p-2 bg-slate-800/20"
            )}>
            {(() => {
              // Section 1: Overdue
              const todayStr = format(day.date, "MMM d");
              const isTodayDay = isToday(day.date);
              const overdue = tasks.filter((task) => {
                // We only show overdue tasks on today's column
                return !task.completed && task.dueDate && isBefore(new Date(task.dueDate), day.date) && isTodayDay;
              });
              
              // Only show unique overdue tasks (avoid showing the same task multiple times)
              const overdueSeen = new Set();
              const dedupedOverdue = overdue.filter((task) => {
                const isDupe = overdueSeen.has(task.id);
                overdueSeen.add(task.id);
                return !isDupe;
              });
              
              // Section 2: To-Dos
              // Incomplete tasks with startDate or dueDate for that day,
              // or with no specific date if this is the current day
              const todos = tasks.filter((task) => {
                // Don't include completed tasks in to-dos
                if (task.completed) return false;
                
                // Don't include overdue tasks in to-dos (they're in their own section)
                if (task.dueDate && isBefore(new Date(task.dueDate), day.date) && isTodayDay) return false;
                
                // Always show tasks with today as the due date
                if (task.dueDate && format(new Date(task.dueDate), "yyyy-MM-dd") === format(day.date, "yyyy-MM-dd")) {
                  return true;
                }
                
                // For today, also show tasks with no due date
                if (!task.dueDate && isTodayDay) {
                  return true;
                }
                
                return false;
              });
              
              // Section 3: Completed
              // Tasks that were completed on this day
              const completedTasks = tasks.filter((task) => {
                if (!task.completed) return false;
                
                // Use completionDate if available
                if (task.completionDate) {
                  const completionDate = new Date(task.completionDate);
                  const dayDate = new Date(day.date);
                  
                  // Compare year, month, and day
                  return (
                    completionDate.getFullYear() === dayDate.getFullYear() &&
                    completionDate.getMonth() === dayDate.getMonth() &&
                    completionDate.getDate() === dayDate.getDate()
                  );
                }
                
                // Fallback to completionDateMMMD for legacy support
                if (task.completionDateMMMD) {
                  return task.completionDateMMMD === format(day.date, "MMM d");
                }
                
                return false;
              });
              
              // Sort all tasks to ensure consistent ordering
              const sortedTodos = [...todos].sort((a, b) => {
                // Sort by due date
                if (a.dueDate && !b.dueDate) return -1;
                if (!a.dueDate && b.dueDate) return 1;
                if (a.dueDate && b.dueDate) {
                  return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                }
                
                // Then sort by text (task title)
                // Add null checks to handle tasks without text
                const aText = a.text || "";
                const bText = b.text || "";
                return aText.localeCompare(bText);
              });
              
              const taskSeen = new Set<string>();
              
              return (
                <>
                  {dedupedOverdue.length > 0 && (
                    <div>
                      <div className="text-purple-300 font-semibold text-sm mb-1">Overdue</div>
                      <div className="space-y-2">
                        {dedupedOverdue.map((task, index) => {
                          taskSeen.add(task.id);
                          return (
                            <DraggableTask
                              key={task.id}
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
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {sortedTodos.length > 0 && (
                    <div>
                      <div className="text-blue-300 font-semibold text-sm mb-1">To-Dos</div>
                      <div className="space-y-2">
                        {sortedTodos.map((task, index) => {
                          // Skip if we've already shown this task in the overdue section
                          if (taskSeen.has(task.id)) return null;
                          taskSeen.add(task.id);
                          
                          return (
                            <DraggableTask
                              key={task.id}
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
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {completedTasks.length > 0 && (
                    <div>
                      <div className="text-green-300 font-semibold text-sm mb-1">Completed</div>
                      <div className="space-y-2">
                        {completedTasks.map((task, index) => {
                          // Skip if we've already shown this task in another section
                          if (taskSeen.has(task.id)) return null;
                          taskSeen.add(task.id);
                          
                          return (
                            <DraggableTask
                              key={task.id}
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
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </>
      ) : (
        // Show nothing in collapsed view except the header button which is already outside this conditional
        <div className="hidden">
          {/* This is intentionally empty */}
        </div>
      )}
    </div>
  )
}
// Day Column
function DayColumn({
  day,
  dayIndex,
  onTaskClick,
  onToggleCompletion,
  onToggleSubtaskCompletion,
  moveTask,
  showNewTaskInput,
  personalNewTaskText,
  workNewTaskText,
  onPersonalNewTaskTextChange,
  onWorkNewTaskTextChange,
  onTogglePersonalNewTaskInput,
  onToggleWorkNewTaskInput,
  onAddNewTask,
  isLoading,
  onTaskCategoryChange,
  onKeyDown,
  isPersonalCollapsed,
  isWorkCollapsed,
  onTogglePersonalCollapse,
  onToggleWorkCollapse,
}: {
  day: { date: Date; tasks: Task[]; isPast: boolean }
  dayIndex: number
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
  personalNewTaskText: string
  workNewTaskText: string
  onPersonalNewTaskTextChange: (text: string) => void
  onWorkNewTaskTextChange: (text: string) => void
  onTogglePersonalNewTaskInput: () => void
  onToggleWorkNewTaskInput: () => void
  onAddNewTask: (dayIndex: number, columnType: "personal" | "work") => void
  isLoading: boolean
  onTaskCategoryChange: (task: Task) => void
  onKeyDown: (dayIndex: number, columnType: "personal" | "work", e: React.KeyboardEvent) => void
  isPersonalCollapsed: boolean
  isWorkCollapsed: boolean
  onTogglePersonalCollapse: () => void
  onToggleWorkCollapse: () => void
}) {
  const today = new Date()
  const isWeekendDay = isWeekend(day.date)
  const formattedDate = format(day.date, "EEEE, MMMM d")
  const isPastDay = day.isPast

  // Filter personal and work tasks
  const personalTasks = day.tasks.filter((task) => task.category === "personal")
  const workTasks = day.tasks.filter((task) => task.category === "work")

  return (
    <div
      className={cn(
        "flex-shrink-0 border-l border-slate-700 last:border-r transition-all duration-300 ease-in-out",
        isPersonalCollapsed && isWorkCollapsed ? "w-[120px]" : "w-[920px]",
        isToday(day.date) && "bg-slate-900/50",
        isWeekendDay && "bg-slate-800/20",
      )}
    >
      <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-700 sticky top-0 z-10">
        <div className="text-sm font-medium">
          {isToday(day.date) ? (
            <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Today</Badge>
          ) : (
            format(day.date, "EEE, MMM d")
          )}
        </div>
      </div>

      <div className="flex h-[calc(100vh-170px)]">
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
          showNewTaskInput={showNewTaskInput}
          newTaskText={personalNewTaskText}
          onNewTaskTextChange={onPersonalNewTaskTextChange}
          onToggleNewTaskInput={onTogglePersonalNewTaskInput}
          onAddNewTask={() => onAddNewTask(dayIndex, "personal")}
          isLoading={isLoading}
          borderColor="border-blue-500"
          onTaskCategoryChange={onTaskCategoryChange}
          isPastDay={isPastDay}
          onKeyDown={onKeyDown}
          isCollapsed={isPersonalCollapsed}
          onToggleCollapse={onTogglePersonalCollapse}
        />

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
          showNewTaskInput={showNewTaskInput}
          newTaskText={workNewTaskText}
          onNewTaskTextChange={onWorkNewTaskTextChange}
          onToggleNewTaskInput={onToggleWorkNewTaskInput}
          onAddNewTask={() => onAddNewTask(dayIndex, "work")}
          isLoading={isLoading}
          borderColor="border-green-500"
          onTaskCategoryChange={onTaskCategoryChange}
          isPastDay={isPastDay}
          onKeyDown={onKeyDown}
          isCollapsed={isWorkCollapsed}
          onToggleCollapse={onToggleWorkCollapse}
        />
      </div>
    </div>
  )
}
// Tasks main component
export default function Tasks() {
  const { days, isLoading, error, refreshTasks } = useTasks()
  const { user } = useAuth()
  const router = useRouter()
  
  // State for the modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  
  // State for day columns
  const [visibleDays, setVisibleDays] = useState(days)
  const [currentDayIndex, setCurrentDayIndex] = useState(0)
  
  // State for new task input
  const [showNewTaskInput, setShowNewTaskInput] = useState(false)
  const [personalNewTaskTexts, setPersonalNewTaskTexts] = useState<string[]>(Array(7).fill(''))
  const [workNewTaskTexts, setWorkNewTaskTexts] = useState<string[]>(Array(7).fill(''))
  
  // State for collapsed columns
  const [personalCollapsed, setPersonalCollapsed] = useState<boolean[]>(Array(7).fill(false))
  const [workCollapsed, setWorkCollapsed] = useState<boolean[]>(Array(7).fill(false))
  
  // Helper function to toggle column collapse state
  const toggleColumnCollapse = (dayIndex: number, columnType: "personal" | "work") => {
    if (columnType === "personal") {
      const newCollapsedState = [...personalCollapsed]
      newCollapsedState[dayIndex] = !newCollapsedState[dayIndex]
      setPersonalCollapsed(newCollapsedState)
    } else {
      const newCollapsedState = [...workCollapsed]
      newCollapsedState[dayIndex] = !newCollapsedState[dayIndex]
      setWorkCollapsed(newCollapsedState)
    }
  }
  
  // Update visible days when days changes
  useEffect(() => {
    if (days && days.length > 0) {
      console.log("Days updated:", days)
      setVisibleDays(days)
    }
  }, [days])
  
  // Function to handle task clicks
  const handleTaskClick = (taskId: string) => {
    // Find the task in all days
    for (const day of days) {
      const task = day.tasks.find((t) => t.id === taskId)
      if (task) {
        setSelectedTask(task)
        setIsTaskModalOpen(true)
        return
      }
    }
  }
  
  // Function to handle toggling task completion
  const handleToggleCompletion = (taskId: string) => {
    console.log("Toggle completion for task:", taskId)
    
    // Find the task in all days
    let taskToUpdate: Task | null = null
    let taskDay: { date: Date; tasks: Task[]; isPast: boolean } | null = null
    
    for (const day of days) {
      const task = day.tasks.find((t) => t.id === taskId)
      if (task) {
        taskToUpdate = { ...task }
        taskDay = day
        break
      }
    }
    
    if (taskToUpdate && taskDay) {
      const newCompletionState = !taskToUpdate.completed
      
      // Update completion state and date
      taskToUpdate.completed = newCompletionState
      
      if (newCompletionState) {
        // If completing the task, set completion date to today in ISO format
        const today = new Date()
        taskToUpdate.completionDate = format(today, "yyyy-MM-dd")
        // Also set the MMM d format for legacy compatibility
        taskToUpdate.completionDateMMMD = format(today, "MMM d")
      } else {
        // If uncompleting, remove dates
        taskToUpdate.completionDate = null
        taskToUpdate.completionDateMMMD = null
      }
      
      // Update localStorage
      const storageKey = isSupabaseConfigured() ? "supabase-tasks" : "tasks"
      const storedTasks = JSON.parse(localStorage.getItem(storageKey) || "[]")
      
      // Find and update the task in storage
      const updatedStoredTasks = storedTasks.map((t: Task) => {
        if (t.id === taskId) {
          return { ...t, ...taskToUpdate }
        }
        return t
      })
      
      // Save to localStorage
      localStorage.setItem(storageKey, JSON.stringify(updatedStoredTasks))
      
      // Refresh tasks to update the UI
      refreshTasks()
    }
  }
  
  // Function to handle toggling subtask completion
  const handleToggleSubtaskCompletion = (taskId: string, subtaskId: string) => {
    console.log("Toggle completion for subtask:", subtaskId, "of task:", taskId)
    
    // Find the task in all days
    let taskToUpdate: Task | null = null
    
    for (const day of days) {
      const task = day.tasks.find((t) => t.id === taskId)
      if (task) {
        taskToUpdate = { ...task }
        break
      }
    }
    
    if (taskToUpdate && taskToUpdate.subtasks) {
      // Find and update the subtask
      const updatedSubtasks = taskToUpdate.subtasks.map((subtask) => {
        if (subtask.id === subtaskId) {
          return { ...subtask, completed: !subtask.completed }
        }
        return subtask
      })
      
      taskToUpdate.subtasks = updatedSubtasks
      
      // Update localStorage
      const storageKey = isSupabaseConfigured() ? "supabase-tasks" : "tasks"
      const storedTasks = JSON.parse(localStorage.getItem(storageKey) || "[]")
      
      // Find and update the task in storage
      const updatedStoredTasks = storedTasks.map((t: Task) => {
        if (t.id === taskId) {
          return { ...t, subtasks: updatedSubtasks }
        }
        return t
      })
      
      // Save to localStorage
      localStorage.setItem(storageKey, JSON.stringify(updatedStoredTasks))
      
      // Refresh tasks to update the UI
      refreshTasks()
    }
  }
  
  // Function to move a task
  const moveTask = (
    dragIndex: number,
    hoverIndex: number,
    fromDayIndex: number,
    toDayIndex: number,
    fromColumnType: "personal" | "work",
    toColumnType: "personal" | "work",
    dragTaskId?: string, // Optional task ID for more reliable identification
  ) => {
    if (isLoading) return
    
    // Get the current tasks from localStorage to ensure we have the latest data
    const storageKey = isSupabaseConfigured() ? "supabase-tasks" : "tasks"
    const storedTasks = JSON.parse(localStorage.getItem(storageKey) || "[]")
    
    // Find the task being moved - first try by taskId if provided
    let taskToMove: Task | null = null
    
    if (dragTaskId) {
      // If dragTaskId is provided, find the task directly by ID (more reliable)
      
      // First try to find the task in localStorage
      const foundTaskInStorage = storedTasks.find((t: Task) => t.id === dragTaskId)
      if (foundTaskInStorage) {
        taskToMove = { ...foundTaskInStorage }
      }
      
      // If not found in localStorage, try to find it in the days array
      if (!taskToMove) {
        // Search through all days and their tasks
        for (let i = 0; i < days.length; i++) {
          const foundTask = days[i].tasks.find(t => t.id === dragTaskId)
          if (foundTask) {
            taskToMove = { ...foundTask }
            // Update fromDayIndex if the task was found in a different day
            if (i !== fromDayIndex) {
              console.log(`Task found in day ${i} instead of specified fromDayIndex ${fromDayIndex}`)
              fromDayIndex = i
            }
            break
          }
        }
      }
    } else {
      // Otherwise use the day and column index method as fallback
      const allTasksForDay = days[fromDayIndex].tasks
      const tasksInSourceColumn = allTasksForDay.filter(task => task.category === fromColumnType)
      
      if (dragIndex < tasksInSourceColumn.length) {
        taskToMove = { ...tasksInSourceColumn[dragIndex] }
      }
    }
    
    console.log("moveTask called with:", { dragIndex, hoverIndex, fromDayIndex, toDayIndex, fromColumnType, toColumnType, dragTaskId });

    if (!taskToMove) {
      console.error("Failed to find task to move", { dragIndex, fromDayIndex, fromColumnType, dragTaskId });
      return;
    }
    
    // Update the task's category if it's being moved between columns
    if (fromColumnType !== toColumnType) {
      taskToMove.category = toColumnType
    }
    
    // Update the task's due date if it's being moved between days
    if (fromDayIndex !== toDayIndex && days[toDayIndex]) {
      const targetDate = days[toDayIndex].date
      taskToMove.dueDate = format(targetDate, "yyyy-MM-dd")
    }
    
    // Update the task in localStorage
    const updatedStoredTasks = storedTasks.map((t: Task) => {
      if (t.id === taskToMove.id) {
        return taskToMove
      }
      return t
    })
    
    // Save to localStorage
    localStorage.setItem(storageKey, JSON.stringify(updatedStoredTasks))
    
    // Force a refresh of the tasks to update the UI
    setTimeout(() => {
      refreshTasks()
    }, 0)
  }
  
  // Function to add a new task
  const handleAddNewTask = (dayIndex: number, columnType: "personal" | "work") => {
    if (isLoading) return
    
    // Get the new task text
    const newTaskText = columnType === "personal"
      ? personalNewTaskTexts[dayIndex]
      : workNewTaskTexts[dayIndex]
    
    if (!newTaskText.trim()) return
    
    // Create a new task
    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      text: newTaskText.trim(),
      description: "",
      category: columnType,
      completed: false,
      dueDate: format(days[dayIndex].date, "yyyy-MM-dd"),
      subtasks: [],
    }
    
    // Add to localStorage
    const storageKey = isSupabaseConfigured() ? "supabase-tasks" : "tasks"
    const storedTasks = JSON.parse(localStorage.getItem(storageKey) || "[]")
    storedTasks.push(newTask)
    localStorage.setItem(storageKey, JSON.stringify(storedTasks))
    
    // Clear the input
    if (columnType === "personal") {
      const updatedTexts = [...personalNewTaskTexts]
      updatedTexts[dayIndex] = ""
      setPersonalNewTaskTexts(updatedTexts)
    } else {
      const updatedTexts = [...workNewTaskTexts]
      updatedTexts[dayIndex] = ""
      setWorkNewTaskTexts(updatedTexts)
    }
    
    // Refresh tasks to update the UI
    refreshTasks()
  }
  
  // Function to handle changing a task's category
  const handleTaskCategoryChange = (task: Task) => {
    if (isLoading) return
    
    // Update the task's category
    const updatedTask = { ...task, category: task.category === "personal" ? "work" : "personal" }
    
    // Update localStorage
    const storageKey = isSupabaseConfigured() ? "supabase-tasks" : "tasks"
    const storedTasks = JSON.parse(localStorage.getItem(storageKey) || "[]")
    
    // Find and update the task in storage
    const updatedStoredTasks = storedTasks.map((t: Task) => {
      if (t.id === task.id) {
        return updatedTask
      }
      return t
    })
    
    // Save to localStorage
    localStorage.setItem(storageKey, JSON.stringify(updatedStoredTasks))
    
    // Refresh tasks to update the UI
    refreshTasks()
  }
  
  // Function to handle key presses in the new task input
  const handleInputKeyDown = (dayIndex: number, columnType: "personal" | "work", e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddNewTask(dayIndex, columnType)
    } else if (e.key === "Escape") {
      e.preventDefault()
      setShowNewTaskInput(false)
    }
  }
  
  // Function to handle toggling the new task input
  const handleToggleNewTaskInput = (dayIndex: number, columnType: "personal" | "work") => {
    setShowNewTaskInput(true)
  }
  
  // Function to handle changing the new task text
  const handlePersonalNewTaskTextChange = (dayIndex: number, text: string) => {
    const updatedTexts = [...personalNewTaskTexts]
    updatedTexts[dayIndex] = text
    setPersonalNewTaskTexts(updatedTexts)
  }
  
  const handleWorkNewTaskTextChange = (dayIndex: number, text: string) => {
    const updatedTexts = [...workNewTaskTexts]
    updatedTexts[dayIndex] = text
    setWorkNewTaskTexts(updatedTexts)
  }
  
  // Function to handle scrolling through days
  const scrollDays = (direction: "left" | "right") => {
    setCurrentDayIndex((prevIndex) => {
      const newIndex = direction === "left" ? Math.max(0, prevIndex - 1) : Math.min(days.length - 1, prevIndex + 1)
      return newIndex
    })
  }
  
  return (
    <PageLayout>
      <div className="w-full">
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-700 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={() => refreshTasks()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          <h1 className="text-lg font-semibold">My Tasks</h1>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => scrollDays("left")}
              disabled={currentDayIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-slate-400">
              {visibleDays.length > 0 &&
                `${format(visibleDays[currentDayIndex]?.date || new Date(), "MMMM d")}`}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => scrollDays("right")}
              disabled={currentDayIndex >= days.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-[calc(100vh-170px)]">
            <div className="space-y-4">
              <Skeleton className="h-8 w-48 mb-4" />
              <div className="space-y-2">
                <Skeleton className="h-12 w-96" />
                <Skeleton className="h-12 w-80" />
                <Skeleton className="h-12 w-72" />
              </div>
            </div>
          </div>
        ) : days.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-[calc(100vh-170px)]">
            <AlertCircle className="h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium">No tasks found</h3>
            <p className="text-slate-400 mt-1 mb-4">Create a task to get started</p>
            <Button onClick={() => setShowNewTaskInput(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
        ) : (
          <DndProvider backend={HTML5Backend}>
            <div className="flex overflow-x-auto h-[calc(100vh-120px)]">
              {visibleDays.map((day, dayIndex) => (
                <DayColumn
                  key={format(day.date, "yyyy-MM-dd")}
                  day={day}
                  dayIndex={dayIndex}
                  onTaskClick={handleTaskClick}
                  onToggleCompletion={handleToggleCompletion}
                  onToggleSubtaskCompletion={handleToggleSubtaskCompletion}
                  moveTask={moveTask}
                  showNewTaskInput={showNewTaskInput}
                  personalNewTaskText={personalNewTaskTexts[dayIndex]}
                  workNewTaskText={workNewTaskTexts[dayIndex]}
                  onPersonalNewTaskTextChange={(text) => handlePersonalNewTaskTextChange(dayIndex, text)}
                  onWorkNewTaskTextChange={(text) => handleWorkNewTaskTextChange(dayIndex, text)}
                  onTogglePersonalNewTaskInput={() => handleToggleNewTaskInput(dayIndex, "personal")}
                  onToggleWorkNewTaskInput={() => handleToggleNewTaskInput(dayIndex, "work")}
                  onAddNewTask={handleAddNewTask}
                  isLoading={isLoading}
                  onTaskCategoryChange={handleTaskCategoryChange}
                  onKeyDown={handleInputKeyDown}
                  isPersonalCollapsed={personalCollapsed[dayIndex]}
                  isWorkCollapsed={workCollapsed[dayIndex]}
                  onTogglePersonalCollapse={() => toggleColumnCollapse(dayIndex, "personal")}
                  onToggleWorkCollapse={() => toggleColumnCollapse(dayIndex, "work")}
                />
              ))}
            </div>
          </DndProvider>
        )}
        
        {isTaskModalOpen && selectedTask && (
          <TaskModal
            task={selectedTask}
            isOpen={isTaskModalOpen}
            onClose={() => setIsTaskModalOpen(false)}
            onSave={(updatedTask) => {
              refreshTasks()
              setIsTaskModalOpen(false)
            }}
            onDelete={(taskId) => {
              refreshTasks()
              setIsTaskModalOpen(false)
            }}
          />
        )}
      </div>
    </PageLayout>
  )
}
