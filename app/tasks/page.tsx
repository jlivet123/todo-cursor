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
import { DndProvider, useDrag, useDrop, DragPreviewImage } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { useTasks } from "@/lib/hooks/use-tasks"
import { useAuth } from "@/lib/auth-context"
import { Skeleton } from "@/components/ui/skeleton"
import { isSupabaseConfigured } from "@/lib/supabase"
import { Task, Subtask, resetToSampleData } from "@/lib/storage"
import Link from "next/link"
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
    taskId?: string
  ) => void
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

      // Time to actually perform the action
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
        "flex flex-col gap-1 py-2 px-3 rounded-md transition-colors",
        !isPastDay && !task.completed && "cursor-grab active:cursor-grabbing hover:bg-slate-800",
        (isPastDay || task.completed) && "opacity-75",
        isDragging && "opacity-40 bg-slate-800 shadow-lg"
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

      // Move the task immediately
      moveTask(dragIndex, hoverIndex, dragDayIndex, hoverDayIndex, dragColumnType, hoverColumnType, dragTaskId)
      
      // Update the dragged item's position
      item.index = hoverIndex
      item.dayIndex = hoverDayIndex
      item.columnType = hoverColumnType
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
    taskId?: string
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
  const inputRef = useRef<HTMLInputElement>(null);
  const dropContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showNewTaskInput && inputRef.current && !isPastDay) {
      inputRef.current.focus();
    }
  }, [showNewTaskInput, isPastDay]);

  const [{ isOver }, drop] = useDrop({
    accept: ITEM_TYPE,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
    drop: (item: any, monitor) => {
      if (!monitor.didDrop() && !isPastDay) {
        const dragTaskId = item.taskId;
        const dragIndex = item.index;
        const dragDayIndex = item.dayIndex;
        const dragColumnType = item.columnType;
        
        // If dropping on a different column or day, move the task
        if (dragColumnType !== columnType || dragDayIndex !== dayIndex) {
          moveTask(
            dragIndex,
            0, // Insert at the beginning of the target column
            dragDayIndex,
            dayIndex,
            dragColumnType,
            columnType,
            dragTaskId
          );
          
          return { moved: true };
        }
      }
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
        isCollapsed ? "min-w-[50px] max-w-[50px]" : "min-w-[420px] flex-1 p-4"
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
            ref={dropContainerRef}
            className={cn(
              "space-y-6 overflow-y-auto overflow-x-hidden flex-1 rounded-md",
              isOver && !isPastDay && "bg-slate-800/30 transition-colors duration-200"
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
                
                // For today, we want to show:
                // 1. Tasks explicitly assigned to today
                // 2. Incomplete tasks from the past (rollover)
                if (isTodayDay) {
                  // For tasks with a start date, check if it's today or in the past
                  if (task.startDate) {
                    try {
                      // If we have a date object, use it for reliable comparison
                      if (task.startDateObj) {
                        // Show tasks from today or earlier
                        return isBefore(task.startDateObj, day.date) || isToday(task.startDateObj);
                      }
                      
                      // Try to parse the startDate string
                      if (task.startDate === todayStr) {
                        return true; // Explicitly for today
                      }
                      
                      // Check if it's from the past (assuming MMM d format)
                      const taskDate = new Date(task.startDate);
                      if (!isNaN(taskDate.getTime())) {
                        return isBefore(taskDate, day.date);
                      }
                    } catch (e) {
                      // If we can't parse the date, assume it should be shown
                      return true;
                    }
                  }
                  
                  // Tasks with no start date also show under today
                  return true;
                }
                
                // For future days, we already have the correct logic
                if (!isTodayDay && !isPastDay) {
                  const dayStr = format(day.date, "MMM d");
                  
                  // Match by startDate string
                  if (task.startDate === dayStr) {
                    return true;
                  }
                  
                  // Match by startDateObj if available
                  if (task.startDateObj && !isNaN(task.startDateObj.getTime())) {
                    const taskDateStr = format(task.startDateObj, "MMM d");
                    return taskDateStr === dayStr;
                  }
                  
                  // Match by dueDate if it's on this day
                  if (task.dueDate) {
                    try {
                      const dueDate = new Date(task.dueDate);
                      if (!isNaN(dueDate.getTime())) {
                        return format(dueDate, "MMM d") === dayStr;
                      }
                    } catch (e) { /* Ignore parsing errors */ }
                  }
                  
                  return false;
                }
                
                // Past days should not show incomplete tasks
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
    taskId?: string
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
  
  // Debug log to check tasks for this day
  const debugDate = format(day.date, "yyyy-MM-dd");
  console.log(`Day ${debugDate} (${dayIndex}) has ${day.tasks.length} tasks:`, 
    day.tasks.map(t => ({
      id: t.id.slice(0, 6),
      text: t.text,
      category: t.category,
      startDate: t.startDate,
      dueDate: t.dueDate
    }))
  );
  console.log(`  Personal: ${personalTasks.length}, Work: ${workTasks.length}`);

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
  const [localLoading, setLocalLoading] = useState(true);
  const { days, isLoading, error, refreshTasks, updateTask, deleteTask } = useTasks();
  const { user } = useAuth();
  const router = useRouter();
  
  // State for the modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // State for day columns
  const [visibleDays, setVisibleDays] = useState(days);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  
  // State for new task input
  const [showNewTaskInput, setShowNewTaskInput] = useState(false);
  const [personalNewTaskTexts, setPersonalNewTaskTexts] = useState<string[]>(Array(7).fill(''));
  const [workNewTaskTexts, setWorkNewTaskTexts] = useState<string[]>(Array(7).fill(''));
  
  // State for collapsed columns
  const [personalCollapsed, setPersonalCollapsed] = useState<boolean[]>(Array(7).fill(false));
  const [workCollapsed, setWorkCollapsed] = useState<boolean[]>(Array(7).fill(false));
  
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
      setVisibleDays(days);
    }
  }, [days]);
  
  // Custom refresh function to update UI without showing loading state
  const handleRefresh = () => {
    // Don't set loading state to true immediately to avoid flickering
    refreshTasks();
  };
  
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
        taskToUpdate.completionDate = undefined
        taskToUpdate.completionDateMMMD = undefined
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
    // Don't attempt to move tasks while the app is in a loading state
    if (isLoading) return;
    
    console.log(`Moving task: ${dragTaskId} from day ${fromDayIndex} (${fromColumnType}) to day ${toDayIndex} (${toColumnType})`);
    
    // First, find the task using taskId (most reliable method)
    let taskToMove: Task | null = null;
    
    if (dragTaskId) {
      // Look for the task in all days
      for (const day of visibleDays) {
        const foundTask = day.tasks.find(t => t.id === dragTaskId);
        if (foundTask) {
          taskToMove = { ...foundTask };
          break;
        }
      }
    }
    
    // If task wasn't found by ID, try using indices
    if (!taskToMove && fromDayIndex >= 0 && fromDayIndex < visibleDays.length) {
      const tasksInSourceColumn = visibleDays[fromDayIndex].tasks.filter(
        task => task.category === fromColumnType
      );
      
      if (dragIndex >= 0 && dragIndex < tasksInSourceColumn.length) {
        taskToMove = { ...tasksInSourceColumn[dragIndex] };
      }
    }
    
    // If we still couldn't find the task, abort
    if (!taskToMove) {
      console.error("Could not find task to move");
      return;
    }
    
    // Make a copy of days for immutable updates
    const newDays = [...visibleDays];
    
    // Create an updated task with new properties
    const updatedTask = { ...taskToMove };
    
    // 1. Apply category change if moving between columns
    if (fromColumnType !== toColumnType) {
      console.log(`Changing category from ${fromColumnType} to ${toColumnType}`);
      updatedTask.category = toColumnType;
    }
    
    // 2. Apply date change if moving between days
    if (fromDayIndex !== toDayIndex) {
      console.log(`Changing start date to match target day ${toDayIndex}`);
      const targetDate = visibleDays[toDayIndex].date;
      const formattedDate = format(targetDate, "MMM d");
      const isoDate = format(targetDate, "yyyy-MM-dd");
      
      // Update start date (for display)
      updatedTask.startDate = formattedDate;
      
      // Update due date (ISO format)
      updatedTask.dueDate = isoDate;
    }
    
    // 3. Remove the task from its original day
    if (fromDayIndex >= 0 && fromDayIndex < newDays.length) {
      newDays[fromDayIndex] = {
        ...newDays[fromDayIndex],
        tasks: newDays[fromDayIndex].tasks.filter(t => t.id !== taskToMove!.id)
      };
    }
    
    // 4. Add the task to its new day
    if (toDayIndex >= 0 && toDayIndex < newDays.length) {
      // Get all tasks in the target day
      const targetDayTasks = [...newDays[toDayIndex].tasks];
      
      // Insert the task at the specified position
      if (hoverIndex <= targetDayTasks.length) {
        targetDayTasks.splice(hoverIndex, 0, updatedTask);
      } else {
        // If the position is out of bounds, append to the end
        targetDayTasks.push(updatedTask);
      }
      
      // Update the day
      newDays[toDayIndex] = {
        ...newDays[toDayIndex],
        tasks: targetDayTasks
      };
    }
    
    // 5. Update the visible days
    setVisibleDays(newDays);
    
    // 6. Save the changes to localStorage
    const storageKey = isSupabaseConfigured() ? "supabase-tasks" : "tasks";
    const storedTasks = JSON.parse(localStorage.getItem(storageKey) || "[]");
    
    // Update the task in localStorage
    const updatedStoredTasks = storedTasks.map((t: Task) => {
      if (t.id === taskToMove!.id) {
        return updatedTask;
      }
      return t;
    });
    
    // Save to localStorage
    localStorage.setItem(storageKey, JSON.stringify(updatedStoredTasks));
    
    // 7. Update the server in the background after a short delay
    setTimeout(() => {
      refreshTasks();
    }, 200);
  };
  
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
                  moveTask={moveTask}
                  showNewTaskInput={showNewTaskInput}
                  personalNewTaskText={personalNewTaskTexts[dayIndex]}
                  workNewTaskText={workNewTaskTexts[dayIndex]}
                  onPersonalNewTaskTextChange={(text) => handlePersonalNewTaskTextChange(dayIndex, text)}
                  onWorkNewTaskTextChange={(text) => handleWorkNewTaskTextChange(dayIndex, text)}
                  onTogglePersonalNewTaskInput={() => handleToggleNewTaskInput(dayIndex, "personal")}
                  onToggleWorkNewTaskInput={() => handleToggleNewTaskInput(dayIndex, "work")}
                  onAddNewTask={handleAddNewTask}
                  isLoading={localLoading}
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
              await updateTask(updatedTask);
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
