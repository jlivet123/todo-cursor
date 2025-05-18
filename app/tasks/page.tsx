"use client"

// Extend the Window interface to include our custom property
declare global {
  interface Window {
    lastTaskMoveTime?: number;
  }
}

import React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { format, isToday, isWeekend, isBefore, isSameDay } from "date-fns"

// Debug task information for a specific day
function displayTaskDebug(dayIndex: number, days: { date: Date; tasks: Task[]; isPast: boolean }[]) {
  if (!days[dayIndex]) return;
  
  const day = days[dayIndex];
  const today = getLocalToday();
  const currentDay = new Date(day.date);
  currentDay.setHours(0, 0, 0, 0);
  
  console.group(`Tasks for ${format(currentDay, 'yyyy-MM-dd')} (${day.tasks.length} total)`);
  
  // Log all tasks
  day.tasks.forEach(task => {
    const taskState = [];
    if (task.completed) taskState.push('Completed');
    if (isTaskOverdue(task, today)) taskState.push('Overdue');
    if (isTaskTodo(task, currentDay, today, day.isPast)) taskState.push('Todo');
    if (isTaskCompleted(task, currentDay)) taskState.push('CompletedToday');
  });
  
  console.groupEnd();
}

// Debugging utility function for individual task logging
function logTaskInfo(task: Task, bucket: string, reason: string) {
  console.log(`Task "${task.text}" (${task.id}) in ${bucket}: ${reason}`, {
    completed: task.completed,
    startDate: task.startDate,
    dueDate: task.dueDate,
    completionDate: task.completionDate
  });
}

// Task filtering utilities
function createLocalDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  } catch (e) {
    console.error('Error creating local date:', e);
    return null;
  }
}

function getLocalToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

function isSameLocalDay(date1: Date | null | undefined, date2: Date | null | undefined): boolean {
  if (!date1 || !date2) return false;
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// Check if a task is overdue
function isTaskOverdue(task: Task, today: Date): boolean {
  // Task must not be completed
  if (task.completed) return false;
  
  // Must have a due date
  if (!task.dueDate) return false;
  
  // Due date must be before today
  const dueDate = createLocalDate(task.dueDate);
  return dueDate ? dueDate < today : false;
}

// Check if a task belongs in the "todos" section for a given day
function isTaskTodo(task: Task, dayDate: Date, today: Date, isPastDay: boolean): boolean {
  // Task must not be completed
  if (task.completed) return false;
  
  const isTodayView = isSameLocalDay(dayDate, today);
  
  // For today's column: show all tasks where startDate <= today
  if (isTodayView) {
    // If no start date, show in today's todos
    if (!task.startDate) return true;
    
    // Check if start date <= today
    const startDate = createLocalDate(task.startDate);
    return startDate ? startDate <= today : false;
  }
  
  // For future days: only show tasks with matching start date
  if (dayDate > today) {
    // Must have a start date matching this day
    if (!task.startDate) return false;
    
    const startDate = createLocalDate(task.startDate);
    return startDate ? isSameLocalDay(startDate, dayDate) : false;
  }
  
  // For past days: don't show incomplete tasks
  return false;
}

// Check if a task belongs in the "completed" section for a given day
function isTaskCompleted(task: Task, dayDate: Date): boolean {
  // Task must be completed
  if (!task.completed) return false;
  
  // Must have completion date
  if (!task.completionDate) return false;
  
  // Completion date must match this day
  const completionDate = createLocalDate(task.completionDate);
  return completionDate ? isSameLocalDay(completionDate, dayDate) : false;
}

// Extend the Window interface to include our custom property
declare global {
  interface Window {
    lastTaskMoveTime?: number;
  }
}
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
  XCircle,
  Check,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { TaskModal } from "@/components/task-modal"
import { DndProvider, useDrag, useDrop, DragPreviewImage } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { useTasks } from "@/lib/hooks/use-tasks"

import { useAuth } from "@/lib/auth-context"
import { Skeleton } from "@/components/ui/skeleton"
import { isSupabaseConfigured } from "@/lib/supabase"
import { type Task, type Subtask, resetToSampleData } from "@/lib/storage"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PageLayout } from "@/components/page-layout"

// Drag item types
const ITEM_TYPE = "TASK"

// Notification types
type NotificationType = 'success' | 'error' | 'info';

interface NotificationProps {
  message: string;
  type: NotificationType;
  onClose: () => void;
}

// TaskNotification component for providing visual feedback
function TaskNotification({ message, type, onClose }: NotificationProps) {
  // Auto-dismiss after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [onClose]);
  
  return (
    <div className={cn(
      "fixed bottom-4 right-4 p-4 rounded-md shadow-lg max-w-md z-50 transition-all duration-300 flex items-center gap-3",
      type === 'success' && "bg-green-800/90 border border-green-600 text-white",
      type === 'error' && "bg-red-800/90 border border-red-600 text-white",
      type === 'info' && "bg-blue-800/90 border border-blue-600 text-white"
    )}>
      {type === 'success' && <Check className="h-5 w-5 text-green-400" />}
      {type === 'error' && <XCircle className="h-5 w-5 text-red-400" />}
      {type === 'info' && <AlertCircle className="h-5 w-5 text-blue-400" />}
      <p className="flex-1">{message}</p>
      <button 
        onClick={onClose}
        className="text-slate-300 hover:text-white transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

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
  updateTask,
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
    taskId?: string
  ) => void
  updateTask: (task: Task) => void
  isPastDay: boolean
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Configure drag behavior
  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: () => ({
      taskId: task.id,
      taskText: task.text,
      index,
      dayIndex,
      columnType
    }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: !isPastDay && !task.completed,
  });

  // Configure drop behavior
  const [, drop] = useDrop({
    accept: ITEM_TYPE,
    hover(item: any, monitor) {
      // Don't allow dropping on completed or past tasks
      if (!ref.current || isPastDay || task.completed) {
        return;
      }
      
      const dragTaskId = item.taskId;
      const dragIndex = item.index;
      const dragDayIndex = item.dayIndex;
      const dragColumnType = item.columnType;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragTaskId === task.id) {
        return;
      }

      // Get rectangle on screen
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the item's height
      
      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Prevent excessive updates - only call moveTask if we're changing position
      const isSameLocation = dragDayIndex === dayIndex && 
                           dragColumnType === columnType && 
                           dragIndex === hoverIndex;
      if (isSameLocation) {
        return;
      }

      // Only move if a significant change has occurred
      moveTask(
        dragIndex,
        hoverIndex,
        dragDayIndex,
        dayIndex,
        dragColumnType,
        columnType,
        dragTaskId
      );

      // Update the dragged item's position directly to prevent flickering
      item.index = hoverIndex;
      item.dayIndex = dayIndex;
      item.columnType = columnType;
      // Note: The actual task update is handled inside the moveTaskImpl function
      // in the use-tasks.ts hook which calls setAllTasks internally

      // Update the dragged item's position directly to prevent flickering
      item.index = hoverIndex;
      item.dayIndex = dayIndex;
      item.columnType = columnType;
    },
    canDrop: () => !isPastDay && !task.completed,
  });

  // Combine the drag and drop refs
  const dragDropRef = useCallback((node: HTMLDivElement | null) => {
    ref.current = node;
    const dragNode = drag(node);
    drop(dragNode);
  }, [drag, drop]);

  // Handling checkbox click
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleCompletion();
  };

  // Format the date for display
  const displayDate = task.dueDate || task.startDate;
  let formattedDisplayDate = displayDate;

  // Add a proper formatter for ISO dates
  try {
    if (displayDate && displayDate.includes("-")) { // Check if it's an ISO format
      formattedDisplayDate = format(new Date(displayDate), "MMM d, yyyy");
    }
  } catch (e) {
    // Keep original format if parsing fails
  }

  // Truncate description for preview
  const descriptionPreview = task.description
    ? task.description.slice(0, 60) + (task.description.length > 60 ? "..." : "")
    : "";

  // Calculate completion status of subtasks
  const completedSubtasks = task.subtasks ? task.subtasks.filter((st) => st.completed).length : 0;
  const totalSubtasks = task.subtasks ? task.subtasks.length : 0;
  const hasSubtasks = totalSubtasks > 0;

  // State for expanding/collapsing subtasks
  const [isExpanded, setIsExpanded] = useState(true); // Default to expanded

  // Function to toggle expand/collapse state
  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent task modal from opening
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      ref={dragDropRef}
      className={cn(
        "flex flex-col gap-1 py-2 px-3 rounded-md transition-all duration-200",
        !isPastDay && !task.completed && "cursor-grab active:cursor-grabbing hover:bg-slate-800",
        (isPastDay || task.completed) && "opacity-75",
        isDragging && "opacity-50 bg-slate-700 shadow-xl scale-[0.98] border border-slate-500"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onTaskClick();
      }}
      style={{
        opacity: isDragging ? 0.4 : 1,
        cursor: isDragging ? 'grabbing' : (!isPastDay && !task.completed ? 'grab' : 'default')
      }}
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
              {formattedDisplayDate}
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
  );
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
  updateTask,
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
  updateTask: (task: Task) => void
  isPastDay: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)

  // Configure drag behavior
  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: () => ({
      taskId: task.id,
      taskText: task.text,
      index,
      dayIndex,
      columnType
    }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: !isPastDay && !task.completed,
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
        return;
      }
      
      const dragTaskId = item.taskId;
      const dragIndex = item.index;
      const dragDayIndex = item.dayIndex;
      const dragColumnType = item.columnType;
      const hoverIndex = index;
      
      // Don't replace items with themselves
      if (dragTaskId === task.id) {
        return;
      }
      
      // Get rectangle on screen
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;
      
      // Only perform the move when the mouse has crossed half of the item's height
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }
      
      // Move the task
      moveTask(
        dragIndex,
        hoverIndex,
        dragDayIndex,
        dayIndex,
        dragColumnType,
        columnType,
        dragTaskId
      );
      
      // Update the dragged item's position
      item.index = hoverIndex;
      item.dayIndex = dayIndex;
      item.columnType = columnType;
    },
    canDrop: () => !isPastDay && !task.completed, // Disable dropping for past days and completed tasks
  })

  // Handle checkbox click
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleCompletion()
  }

  return (
    <div
      ref={(node) => {
        drag(node);
        drop(node);
      }}
      className={cn(
        "flex items-center gap-2 px-2 py-2 rounded-md transition-colors my-1",
        !isPastDay && !task.completed && "cursor-grab hover:bg-slate-800",
        (isPastDay || task.completed) && "opacity-75",
        isDragging && "opacity-40 border border-blue-500 shadow-lg"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onTaskClick();
      }}
      style={{
        opacity: isDragging ? 0.4 : 1,
        cursor: isDragging ? 'grabbing' : (!isPastDay && !task.completed ? 'grab' : 'default')
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
  updateTask,
  isNewTaskOpen,
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
    taskId?: string
  ) => void
  updateTask: (task: Task) => void
  isNewTaskOpen: boolean
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
  const inputRef = useRef<HTMLInputElement>(null);
  const dropContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isNewTaskOpen && inputRef.current && !isPastDay) {
      inputRef.current.focus();
    }
  }, [isNewTaskOpen, isPastDay]);

  const [{ isOver }, drop] = useDrop({
    accept: ITEM_TYPE,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
    drop: async (item: any, monitor) => {
      // Only process if not already handled and not in a past day
      if (!monitor.didDrop() && !isPastDay) {
        const { taskId, index: dragIndex, dayIndex: dragDayIndex, columnType: dragColumnType } = item;
        
        // If dropping on a different column or day, move the task
        if (dragColumnType !== columnType || dragDayIndex !== dayIndex) {
          
          // IMPORTANT: Wait for the moveTask operation to complete before returning
          const success = await moveTask(
            dragIndex,
            0, // Insert at the beginning of the target column
            dragDayIndex,
            dayIndex,
            dragColumnType,
            columnType,
            taskId  // Always pass the taskId for reliable identification
          );
          
          // Return the success status to prevent further processing if needed
          return { moved: success };
        }
      }
      return undefined;
    },
    canDrop: () => !isPastDay,
  });

  // Apply the drop ref to the container
  useEffect(() => {
    if (dropContainerRef.current) {
      drop(dropContainerRef.current);
    }
  }, [drop]);

  return (
    <div
      className={cn(
        "flex flex-col h-full transition-all duration-300 ease-in-out",
        isCollapsed ? "min-w-[50px] max-w-[50px]" : "min-w-[320px] flex-1 p-4"
      )}
    >
      <div className={cn("flex justify-between items-center", isCollapsed ? "p-2" : "mb-4")}>
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-lg">{title}</h3>
              <Badge variant="outline" className="text-xs text-slate-400 border-slate-600">
                {tasks.filter(t => t.completed).length}/{tasks.length}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {!isPastDay && (
                <button
                  className="flex items-center justify-center w-6 h-6 text-slate-400 hover:text-slate-200 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleNewTaskInput();
                  }}
                >
                  <Plus className="h-5 w-5" />
                </button>
              )}
              <button
                className="flex items-center justify-center w-6 h-6 text-slate-400 hover:text-slate-200 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleCollapse();
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
              e.preventDefault();
              e.stopPropagation();
              onToggleCollapse();
            }}
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {!isCollapsed ? (
        <>
          {isNewTaskOpen && !isPastDay && (
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
            ref={dropContainerRef}
            className={cn(
              "space-y-6 overflow-y-auto overflow-x-hidden flex-1 rounded-md p-2 transition-all duration-200",
              isOver && !isPastDay && "bg-slate-800/50 border border-dashed border-slate-600 shadow-inner",
              !isOver && !isPastDay && "hover:bg-slate-900/30"
            )}
          >
            {(() => {
              const today = getLocalToday();
              const currentDay = new Date(day.date);
              currentDay.setHours(0, 0, 0, 0);
              const isTodayColumn = isSameLocalDay(currentDay, today);
              
              // Get tasks for each bucket
              const overdueTasks = isTodayColumn 
                ? tasks.filter(task => {
                    const isOverdue = isTaskOverdue(task, today);
                    if (isOverdue) {
                      // logTaskInfo(task, 'overdue', 'Task is past due date');
                    }
                    return isOverdue;
                  })
                : [];
                
              const todoTasks = tasks.filter(task => {
                const isTodo = isTaskTodo(task, currentDay, today, isPastDay) && 
                             !overdueTasks.some(ov => ov.id === task.id);
                if (isTodo) {
                  // logTaskInfo(task, 'todos', 'Task is active and due/started today');
                }
                return isTodo;
              });
                
              const completedTasks = tasks.filter(task => {
                const isCompleted = isTaskCompleted(task, currentDay);
                if (isCompleted) {
                  // logTaskInfo(task, 'completed', 'Task was completed on this day');
                }
                return isCompleted;
              });
              
              // Track shown tasks to avoid duplicates
              const shownTaskIds = new Set();
              
              return (
                <>
                  {overdueTasks.length > 0 && (
                    <div>
                      <div className="text-purple-300 font-semibold text-sm mb-1">Overdue</div>
                      <div className="space-y-2">
                        {overdueTasks.map((task, index) => {
                          shownTaskIds.add(task.id);
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
                              updateTask={updateTask}
                              isPastDay={isPastDay}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {todoTasks.length > 0 && (
                    <div>
                      <div className="text-blue-300 font-semibold text-sm mb-1">To-Dos</div>
                      <div className="space-y-2">
                        {todoTasks.map((task, index) => {
                          // Skip tasks already shown in overdue
                          if (shownTaskIds.has(task.id)) return null;
                          shownTaskIds.add(task.id);
                          
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
                              updateTask={updateTask}
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
                          // Skip tasks already shown in other sections
                          if (shownTaskIds.has(task.id)) return null;
                          shownTaskIds.add(task.id);
                          
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
                              updateTask={updateTask}
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
  );
}

// Day Column
function DayColumn({
  day,
  dayIndex,
  onTaskClick,
  onToggleCompletion,
  onToggleSubtaskCompletion,
  moveTask,
  updateTask,
  personalIsNewTaskOpen,
  workIsNewTaskOpen,
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
    taskId?: string
  ) => void
  updateTask: (task: Task) => void
  personalIsNewTaskOpen: boolean
  workIsNewTaskOpen: boolean
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
  
  // Debug log to check tasks for this day
  const debugDate = format(day.date, "yyyy-MM-dd");
  // Removed unused debug code that was causing a syntax error
  
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

      <div className="flex h-[calc(100vh-170px)] overflow-hidden">
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
          updateTask={updateTask}
          isNewTaskOpen={personalIsNewTaskOpen}
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
          updateTask={updateTask}
          isNewTaskOpen={workIsNewTaskOpen}
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
  const [localLoading, setLocalLoading] = useState(true);
  const { 
    days, 
    isLoading, 
    error, 
    refreshTasks: originalRefreshTasks, 
    createTask,
    updateTask: updateTaskFromHook, 
    deleteTask, 
    moveTask: moveTaskFromHook
  } = useTasks();
  
  // Enhanced refresh function with debug logging
  const refreshTasks = async () => {

  };

  // Wrapper for updateTask to ensure consistent error handling and parameter format
  const updateTask = async (taskOrId: string | Task, updates?: Partial<Task>) => {
    try {
      let taskId: string;
      let taskUpdates: Partial<Task>;
      
      // Handle both parameter formats for backward compatibility
      if (typeof taskOrId === 'string') {
        // Called with (taskId, updates)
        taskId = taskOrId;
        taskUpdates = updates || {};
      } else {
        // Called with (task)
        const task = taskOrId as Task;
        taskId = task.id;
        taskUpdates = { ...task };
        delete taskUpdates.id; // Remove id from updates to prevent issues
      }
      
      const result = await updateTaskFromHook(taskId, taskUpdates);
      
      if (result) {
        showNotification("Task updated successfully", "success");
      } else {
        throw new Error("Failed to update task: no result returned");
      }
      
      return result;
    } catch (error) {
      console.error("Error updating task:", error);
      showNotification("Failed to update task", "error");
      return null;
    }
  };
  
  // Initialize window.lastTaskMoveTime if it doesn't exist
  if (typeof window !== 'undefined' && window.lastTaskMoveTime === undefined) {
    window.lastTaskMoveTime = 0;
  }
  const { user } = useAuth();
  const router = useRouter();
  
  // State for the modal and notifications
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    visible: boolean;
  } | null>(null);
  
  // Function to show a notification
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type, visible: true });
    
    // Auto-hide notification after 3 seconds
    const timer = setTimeout(() => {
      setNotification(prev => prev ? { ...prev, visible: false } : null);
    }, 3000);
    
    return () => clearTimeout(timer);
  };
  
  // Function to hide the notification
  const hideNotification = () => {
    setNotification(null);
  };
  
  // Enhanced move task function with error handling and notifications
  const handleMove = async (
    dragIndex: number,
    hoverIndex: number,
    fromDayIndex: number,
    toDayIndex: number,
    fromColumnType: "personal" | "work",
    toColumnType: "personal" | "work",
    taskId?: string
  ) => {
    // Don't attempt to move tasks while the app is in a loading state
    if (isLoading) {
      showNotification("Please wait while tasks are loading...", "info");
      return false;
    }
    
    try { 
      // Set the lastTaskMoveTime to prevent auto-refresh
      window.lastTaskMoveTime = Date.now();
      
      // Type assertion for the moveTaskFromHook function
      const moveTaskFn = moveTaskFromHook as (
        dragIndex: number,
        hoverIndex: number,
        fromDayIndex: number,
        toDayIndex: number,
        fromColumnType: "personal" | "work",
        toColumnType: "personal" | "work",
        taskId?: string
      ) => Promise<Task | null>;
      
      // Call the function from the hook
      const result = await moveTaskFn(
        dragIndex,
        hoverIndex,
        fromDayIndex, 
        toDayIndex,
        fromColumnType,
        toColumnType,
        taskId
      ).catch(err => {
        console.error('Error in moveTask:', err);
        throw err; // Re-throw to be caught by the outer catch
      });
      
      if (!result) {
        const errorMsg = 'Failed to move task: No result returned from moveTask';
        console.error(errorMsg);
        showNotification(errorMsg, "error");
        return false;
      }
      
      // Show success notification for important moves (day changes)
      if (fromDayIndex !== toDayIndex || fromColumnType !== toColumnType) {
        showNotification("Task moved successfully", "success");
        
        // After 3 seconds, do a refresh to ensure everything is in sync
        setTimeout(async () => {
          await refreshTasks();
        }, 3000);
      }
      
      return true;
    } catch (err) {
      console.error("Error in handleMove:", err);
      showNotification("An error occurred while moving the task.", "error");
      return false;
    }
  };
  
  // State for day columns
  const [visibleDays, setVisibleDays] = useState(days);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  
  // State for new task input
  const [personalNewTaskOpen, setPersonalNewTaskOpen] = useState<boolean[]>(
    Array(days.length || 7).fill(false)
  );
  const [workNewTaskOpen, setWorkNewTaskOpen] = useState<boolean[]>(
    Array(days.length || 7).fill(false)
  );
  const [personalNewTaskTexts, setPersonalNewTaskTexts] = useState<string[]>(Array(7).fill(''));
  const [workNewTaskTexts, setWorkNewTaskTexts] = useState<string[]>(Array(7).fill(''));
  
  // State for collapsed columns
  const [personalCollapsed, setPersonalCollapsed] = useState<boolean[]>(Array(7).fill(false));
  const [workCollapsed, setWorkCollapsed] = useState<boolean[]>(Array(7).fill(false));
  
  // Log when days change
  useEffect(() => {
    if (days && days.length > 0) {
      setVisibleDays(days);
    }
  }, [days]);
  
  // Ensure arrays are correctly sized when days change
  useEffect(() => {
    if (days.length > 0) {
      // Resize the array when days change
      if (personalNewTaskOpen.length !== days.length) {
        setPersonalNewTaskOpen(Array(days.length).fill(false));
      }
      if (workNewTaskOpen.length !== days.length) {
        setWorkNewTaskOpen(Array(days.length).fill(false));
      }
    }
  }, [days.length, personalNewTaskOpen.length, workNewTaskOpen.length]);
  
  // Helper function to toggle column collapse state
  const toggleColumnCollapse = (dayIndex: number, columnType: "personal" | "work") => {
    if (columnType === "personal") {
      const newCollapsedState = [...personalCollapsed];
      newCollapsedState[dayIndex] = !newCollapsedState[dayIndex];
      setPersonalCollapsed(newCollapsedState);
    } else {
      const newCollapsedState = [...workCollapsed];
      newCollapsedState[dayIndex] = !newCollapsedState[dayIndex];
      setWorkCollapsed(newCollapsedState);
    }
  };
  
  // Update local loading state with a delay to prevent flash
  useEffect(() => {
    if (!isLoading && days.length > 0) {
      // Once we have data, clear loading state after a short delay
      const timer = setTimeout(() => {
        setLocalLoading(false);
      }, 100);
      return () => clearTimeout(timer);
    } else if (isLoading) {
      // Only show loading state if it persists for more than 1000ms
      // This prevents flashing during quick operations like drag and drop
      const timer = setTimeout(() => {
        if (isLoading) {
          setLocalLoading(true);
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, days]);
  
  // Update visible days when days changes
  useEffect(() => {
    if (days && days.length > 0) {
      // Always update visibleDays when days changes, immediately
      setVisibleDays(days);
     }
  }, [days]);
  
  // Custom refresh function to update UI without showing loading state
  const handleRefresh = async () => {
    // Don't set loading state to true immediately to avoid flickering
    await refreshTasks();
  };
  
  // Function to handle task category changes
  const handleTaskCategoryChange = async (task: Task) => {
    try {
      // Update the task in the database
      await updateTask(task.id, { ...task });
      showNotification("Task category updated", "success");
    } catch (err) {
      console.error("Error updating task category:", err);
      showNotification("Failed to update task category", "error");
    }
  };

  // Function to handle task clicks
  const handleTaskClick = (taskId: string) => {
    // Find the task in all days
    for (const day of days) {
      const task = day.tasks.find((t) => t.id === taskId);
      if (task) {
        setSelectedTask(task);
        setIsTaskModalOpen(true);
        return;
      }
    }
  }
  
  // Function to handle toggling task completion
  const handleToggleCompletion = (taskId: string) => {    
    // Find the task in all days
    let taskToUpdate: Task | null = null
    
    // Search through all days to find the task
    for (const day of days) {
      const foundTask = day.tasks.find((t) => t.id === taskId)
      if (foundTask) {
        // Create a deep copy of the task to avoid mutating the original
        taskToUpdate = JSON.parse(JSON.stringify(foundTask))
        break
      }
    }
    
    if (!taskToUpdate) return;

    const newCompletionState = !taskToUpdate.completed
    
    // Update completion state and date
    taskToUpdate.completed = newCompletionState
    
    if (newCompletionState) {
      // If completing the task, set completion date to today in local time
      const today = getLocalToday()
      
      // Set both date formats for compatibility
      taskToUpdate.completionDate = format(today, "yyyy-MM-dd")
      taskToUpdate.completionDateMMMD = format(today, "MMM d")
      
    } else {
      // If uncompleting, clear both date formats
      taskToUpdate.completionDate = undefined
      taskToUpdate.completionDateMMMD = undefined
    }
    
    // Update the task in the database
    updateTask(taskToUpdate)
    
    // Also update localStorage for offline support
    const storageKey = isSupabaseConfigured() ? "supabase-tasks" : "tasks"
    const storedTasks = JSON.parse(localStorage.getItem(storageKey) || "[]")
    
    // Find and update the task in storage
    const updatedStoredTasks = storedTasks.map((t: Task) => 
      t.id === taskToUpdate?.id ? taskToUpdate : t
    )
    
    // Save to localStorage
    localStorage.setItem(storageKey, JSON.stringify(updatedStoredTasks))
    
    // Update the task in the database if applicable
    if (isSupabaseConfigured() && taskToUpdate.id) {
      updateTask(taskToUpdate).catch(error => {
        console.error('Error updating task in database:', error);
      });
    }
    
    // Refresh tasks to update the UI
    refreshTasks();
  }
  
  // Function to add a new task
  const handleAddNewTask = async (dayIndex: number, columnType: "personal" | "work") => {
    try {
      // Get the text input value
      const text = columnType === "personal" 
        ? personalNewTaskTexts[dayIndex]
        : workNewTaskTexts[dayIndex];
      
      // Validate input
      if (!text.trim()) return;
      
      // Show loading notification
      showNotification("Creating task...", "info");
      
      // Use the createTask function from the hook which handles saving and UI updates
      const savedTask = await createTask(text.trim(), dayIndex, columnType);
      
      if (!savedTask) {
        throw new Error("Failed to create task");
      }
      
      // Manual localStorage backup to ensure the task is persisted
      const storageKey = isSupabaseConfigured() ? "supabase-tasks" : "tasks";
      const storedTasks = JSON.parse(localStorage.getItem(storageKey) || "[]");
      const taskExists = storedTasks.some((t: Task) => t.id === savedTask.id);

      if (!taskExists) {
        storedTasks.push(savedTask);
        localStorage.setItem(storageKey, JSON.stringify(storedTasks));
      }
      
      // Clear the input but keep it open for the next task
      if (columnType === "personal") {
        const updatedTexts = [...personalNewTaskTexts];
        updatedTexts[dayIndex] = '';
        setPersonalNewTaskTexts(updatedTexts);
      } else {
        const updatedTexts = [...workNewTaskTexts];
        updatedTexts[dayIndex] = '';
        setWorkNewTaskTexts(updatedTexts);
      }
      
      // Show success notification
      showNotification("Task created successfully", "success");
      
      // The createTask function already refreshes the UI
      // No need to call refreshTasks() here
      
      return savedTask;
    } catch (error) {
      console.error("Error creating task:", error);
      showNotification("Failed to create task. Please try again.", "error");
      throw error; // Re-throw to allow callers to handle the error if needed
    }
  };

  // Function to handle toggling subtask completion
  const handleToggleSubtaskCompletion = (taskId: string, subtaskId: string) => {
    if (isLoading) return;
    
    // Find the task in all days
    let taskToUpdate: Task | null = null;
    
    for (const day of days) {
      const task = day.tasks.find((t) => t.id === taskId);
      if (task) {
        taskToUpdate = { ...task };
        break;
      }
    }
    
    if (!taskToUpdate || !taskToUpdate.subtasks) return;
    
    // Find and update the subtask
    const updatedSubtasks = taskToUpdate.subtasks.map((subtask) => {
      if (subtask.id === subtaskId) {
        return { ...subtask, completed: !subtask.completed };
      }
      return subtask;
    });
    
    taskToUpdate.subtasks = updatedSubtasks;
    
    // Update localStorage
    const storageKey = isSupabaseConfigured() ? "supabase-tasks" : "tasks";
    const storedTasks = JSON.parse(localStorage.getItem(storageKey) || "[]");
    
    // Find and update the task in storage
    const updatedStoredTasks = storedTasks.map((t: Task) => {
      if (t.id === taskId) {
        return { ...t, subtasks: updatedSubtasks };
      }
      return t;
    });
    
    // Save to localStorage
    localStorage.setItem(storageKey, JSON.stringify(updatedStoredTasks));
    
    // Update the task in the database if applicable
    if (isSupabaseConfigured() && taskToUpdate.id) {
      updateTask(taskToUpdate).catch(error => {
        console.error('Error updating task in database:', error);
      });
    }
    
    // Refresh tasks to update the UI
    refreshTasks();
  };

  // Function to handle key presses in the new task input
  const handleInputKeyDown = (dayIndex: number, columnType: "personal" | "work", e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddNewTask(dayIndex, columnType);
    } else if (e.key === "Escape") {
      e.preventDefault();
      
      // Close only the specific column's input
      if (columnType === "personal") {
        const newFlags = [...personalNewTaskOpen];
        newFlags[dayIndex] = false;
        setPersonalNewTaskOpen(newFlags);
      } else {
        const newFlags = [...workNewTaskOpen];
        newFlags[dayIndex] = false;
        setWorkNewTaskOpen(newFlags);
      }
    }
  }
  
  // Function to handle toggling the new task input for a specific column
  const handleToggleNewTaskInput = (dayIndex: number, columnType: "personal" | "work") => {
    // Don't allow adding tasks to past days
    if (days[dayIndex]?.isPast) return;
    
    if (columnType === "personal") {
      // Toggle the Personal column input state for this day only
      const newFlags = [...personalNewTaskOpen];
      newFlags[dayIndex] = !newFlags[dayIndex];
      setPersonalNewTaskOpen(newFlags);
      
      // Close work input if it's open for the same day
      if (workNewTaskOpen[dayIndex]) {
        const workUpdated = [...workNewTaskOpen];
        workUpdated[dayIndex] = false;
        setWorkNewTaskOpen(workUpdated);
      }
    } else {
      // Toggle the Work column input state for this day only
      const newFlags = [...workNewTaskOpen];
      newFlags[dayIndex] = !newFlags[dayIndex];
      setWorkNewTaskOpen(newFlags);
      
      // Close personal input if it's open for the same day
      if (personalNewTaskOpen[dayIndex]) {
        const personalUpdated = [...personalNewTaskOpen];
        personalUpdated[dayIndex] = false;
        setPersonalNewTaskOpen(personalUpdated);
      }
    }
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
        {notification && notification.visible && (
          <TaskNotification 
            message={notification.message}
            type={notification.type}
            onClose={hideNotification}
          />
        )}
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-700 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={handleRefresh}>
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
        
        {localLoading && days.length === 0 ? (
          <div className="flex justify-center items-center h-[calc(100vh-170px)]">
            <p className="text-slate-400 text-lg">Loading...</p>
          </div>
        ) : days.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-[calc(100vh-170px)]">
            <AlertCircle className="h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium">No tasks found</h3>
            <p className="text-slate-400 mt-1 mb-4">Create a task to get started</p>
            <Button onClick={() => {
              // Default to opening task input in today's Personal column
              const todayIndex = days.findIndex(day => isToday(day.date));
              const targetIndex = todayIndex >= 0 ? todayIndex : 0;
              handleToggleNewTaskInput(targetIndex, "personal");
            }}>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
        ) : (
          <DndProvider backend={HTML5Backend} options={{ enableMouseEvents: true, enableTouchEvents: true }}>
            <div className="flex overflow-x-auto overflow-y-hidden h-[calc(100vh-120px)]">
              {visibleDays.map((day, dayIndex) => (
                <DayColumn
                  key={format(day.date, "yyyy-MM-dd")}
                  day={day}
                  dayIndex={dayIndex}
                  onTaskClick={handleTaskClick}
                  onToggleCompletion={handleToggleCompletion}
                  onToggleSubtaskCompletion={handleToggleSubtaskCompletion}
                  moveTask={handleMove}
                  updateTask={updateTask}
                  personalIsNewTaskOpen={personalNewTaskOpen[dayIndex]}
                  workIsNewTaskOpen={workNewTaskOpen[dayIndex]}
                  personalNewTaskText={personalNewTaskTexts[dayIndex]}
                  workNewTaskText={workNewTaskTexts[dayIndex]}
                  onPersonalNewTaskTextChange={(text) => handlePersonalNewTaskTextChange(dayIndex, text)}
                  onWorkNewTaskTextChange={(text) => handleWorkNewTaskTextChange(dayIndex, text)}
                  onTogglePersonalNewTaskInput={() => handleToggleNewTaskInput(dayIndex, "personal")}
                  onToggleWorkNewTaskInput={() => handleToggleNewTaskInput(dayIndex, "work")}
                  onAddNewTask={handleAddNewTask}
                  isLoading={isLoading || localLoading}
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
            onSave={async (updatedTask) => {
              await updateTask(updatedTask.id, updatedTask);
              setIsTaskModalOpen(false);
              setSelectedTask(null);
            }}
            onDelete={async (taskId) => {
              await deleteTask(taskId);
              setIsTaskModalOpen(false);
              setSelectedTask(null);
            }}
          />
        )}
      </div>
    </PageLayout>
  )
}
