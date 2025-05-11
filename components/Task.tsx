"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface TaskProps {
  task: {
    id: string
    text: string
    completed: boolean
  }
  onTaskClick: () => void
  onToggleCompletion: () => void
  isPastDay: boolean
}

const Task = React.forwardRef<HTMLDivElement, TaskProps>(
  ({ task, onTaskClick, onToggleCompletion, isPastDay }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-start justify-between p-2 rounded-md hover:bg-slate-700/50 cursor-pointer",
          task.completed && "opacity-50",
          isPastDay && "cursor-default hover:bg-transparent",
        )}
        onClick={onTaskClick}
      >
        <div className="flex items-start min-w-0">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={onToggleCompletion}
            disabled={isPastDay}
            className="mt-1 mr-2 h-5 w-5 rounded-full border-slate-500 text-green-500 focus:ring-0 focus:ring-offset-0 cursor-pointer flex-shrink-0"
          />
          <span className={cn("break-words whitespace-pre-wrap", task.completed && "line-through text-slate-400")}>
            {task.text}
          </span>
        </div>
      </div>
    )
  },
)
Task.displayName = "Task"

export { Task }
