"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { X, Maximize2, MoreHorizontal, Calendar, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar } from "@/components/ui/avatar"
import { AvatarFallback } from "@/components/ui/avatar"
import { DatePickerModal } from "./date-picker-modal"
import { CustomCheckbox } from "@/components/ui/custom-checkbox"
import { cn } from "@/lib/utils"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Briefcase, User } from "lucide-react"

interface Subtask {
  id: string
  text: string
  completed: boolean
}

interface Task {
  id: string
  text: string
  completed: boolean
  time?: string
  category: "work" | "personal"
  subtasks: Subtask[]
  timeDisplay?: string
  description?: string
  startDate?: string
  dueDate?: string
  startDateObj?: Date | null
  dueDateObj?: Date | null
}

interface TaskModalProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  onSave: (updatedTask: Task) => void
  onDelete?: (taskId: string) => void
  isPastDay?: boolean
}

export function TaskModal({ task, isOpen, onClose, onSave, onDelete, isPastDay = false }: TaskModalProps) {
  const [editedTask, setEditedTask] = useState<Task | null>(null)
  const [newSubtaskText, setNewSubtaskText] = useState("")
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false)
  const [isDueDatePickerOpen, setIsDueDatePickerOpen] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const newSubtaskInputRef = useRef<HTMLInputElement>(null)

  // Initialize edited task when modal opens
  useEffect(() => {
    if (task) {
      setEditedTask({
        ...task,
        startDateObj: task.startDate ? new Date(task.startDate) : null,
        dueDateObj: task.dueDate ? new Date(task.dueDate) : null,
      })
    }
  }, [task])

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if clicking on the date picker
      if (event.target instanceof Element && event.target.closest('.date-picker-modal')) {
        return
      }
      
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) {
      setIsStartDatePickerOpen(false)
      setIsDueDatePickerOpen(false)
    }
  }, [isOpen])

  if (!isOpen || !editedTask) return null

  const handleTaskTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedTask({ ...editedTask, text: e.target.value })
  }

  const handleSubtaskTextChange = (id: string, text: string) => {
    setEditedTask({
      ...editedTask,
      subtasks: editedTask.subtasks.map((subtask) => (subtask.id === id ? { ...subtask, text } : subtask)),
    })
  }

  const handleSubtaskCompletion = (id: string) => {
    const updatedSubtasks = editedTask.subtasks.map((subtask) =>
      subtask.id === id ? { ...subtask, completed: !subtask.completed } : subtask,
    )

    // Check if all subtasks are completed
    const allSubtasksCompleted = updatedSubtasks.every((subtask) => subtask.completed)

    setEditedTask({
      ...editedTask,
      subtasks: updatedSubtasks,
      completed: allSubtasksCompleted && updatedSubtasks.length > 0 ? true : editedTask.completed,
    })
  }

  const handleTaskCompletion = () => {
    const newCompletedStatus = !editedTask.completed

    // If completing the task, also complete all subtasks
    const updatedSubtasks = editedTask.subtasks.map((subtask) => ({
      ...subtask,
      completed: newCompletedStatus ? true : subtask.completed,
    }))

    setEditedTask({
      ...editedTask,
      completed: newCompletedStatus,
      subtasks: updatedSubtasks,
    })
  }

  const handleAddSubtask = () => {
    const newSubtask: Subtask = {
      id: crypto.randomUUID(),
      text: "",
      completed: false,
    }

    setEditedTask({
      ...editedTask,
      subtasks: [...editedTask.subtasks, newSubtask],
    })

    // Focus the new input after rendering
    setTimeout(() => {
      if (newSubtaskInputRef.current) {
        newSubtaskInputRef.current.focus()
      }
    }, 0)
  }

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedTask({
      ...editedTask,
      description: e.target.value,
    })
  }

  const handleSave = () => {
    // Filter out empty subtasks
    const filteredSubtasks = editedTask.subtasks.filter((subtask) => subtask.text.trim() !== "")

    const updatedTask = {
      ...editedTask,
      subtasks: filteredSubtasks,
      startDate: editedTask.startDateObj ? format(editedTask.startDateObj, "MMM d") : undefined,
      dueDate: editedTask.dueDateObj ? format(editedTask.dueDateObj, "MMM d") : undefined,
    }

    onSave(updatedTask)
    onClose()
  }

  const handleStartDateSelect = (date: Date | null) => {
    setEditedTask({
      ...editedTask,
      startDateObj: date,
      startDate: date ? format(date, "MMM d") : undefined,
    })
    setIsStartDatePickerOpen(false)
  }

  const handleDueDateSelect = (date: Date | null) => {
    setEditedTask({
      ...editedTask,
      dueDateObj: date,
      dueDate: date ? format(date, "MMM d") : undefined,
    })
    setIsDueDatePickerOpen(false)
  }

  const handleDeleteTask = () => {
    if (onDelete && editedTask) {
      onDelete(editedTask.id)
      onClose()
    }
  }

  const getCategoryColor = () => {
    switch (editedTask.category) {
      case "work":
        return "text-blue-400 border-blue-500"
      case "personal":
        return "text-green-400 border-green-500"
      default:
        return "text-slate-400 border-slate-500"
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="bg-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg shadow-xl flex flex-col border border-slate-700"
      >
        {/* Modal header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ToggleGroup
              type="single"
              value={editedTask.category}
              onValueChange={(value) => {
                if (value) {
                  setEditedTask({
                    ...editedTask,
                    category: value as "work" | "personal",
                  })
                }
              }}
              className="border border-slate-600 rounded-md"
              disabled={isPastDay}
            >
              <ToggleGroupItem
                value="personal"
                aria-label="Personal"
                className={cn(
                  "data-[state=on]:bg-green-800/30 data-[state=on]:text-green-400 px-3 py-1",
                  "hover:bg-slate-700",
                )}
              >
                <User className="h-4 w-4 mr-1" />
                Personal
              </ToggleGroupItem>
              <ToggleGroupItem
                value="work"
                aria-label="Work"
                className={cn(
                  "data-[state=on]:bg-blue-800/30 data-[state=on]:text-blue-400 px-3 py-1",
                  "hover:bg-slate-700",
                )}
              >
                <Briefcase className="h-4 w-4 mr-1" />
                Work
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsStartDatePickerOpen(true)
                }}
                disabled={isPastDay}
              >
                Start: {editedTask.startDate || format(new Date(), "MMM d")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsDueDatePickerOpen(true)
                }}
                disabled={isPastDay}
              >
                {editedTask.dueDate ? `Due: ${editedTask.dueDate}` : "Due"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400"
                onClick={handleAddSubtask}
                disabled={isPastDay}
              >
                Add subtasks
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" disabled={isPastDay}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Modal body */}
        <div className="p-4 flex-1">
          {/* Main task */}
          <div className="flex items-center gap-3 mb-4">
            <CustomCheckbox
              checked={editedTask.completed}
              onCheckedChange={handleTaskCompletion}
              disabled={isPastDay}
            />
            <Input
              value={editedTask.text}
              onChange={handleTaskTextChange}
              className="flex-1 text-xl font-medium border-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
              disabled={isPastDay}
            />
          </div>

          {/* Subtasks */}
          <div className="ml-7 space-y-2">
            {editedTask.subtasks.map((subtask, index) => (
              <div key={subtask.id} className="flex items-center gap-3">
                <CustomCheckbox
                  checked={subtask.completed}
                  onCheckedChange={() => handleSubtaskCompletion(subtask.id)}
                  disabled={isPastDay || editedTask.completed}
                  size="sm"
                />
                <Input
                  ref={index === editedTask.subtasks.length - 1 ? newSubtaskInputRef : null}
                  value={subtask.text}
                  onChange={(e) => handleSubtaskTextChange(subtask.id, e.target.value)}
                  placeholder="Subtask description..."
                  className="flex-1 border-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                  disabled={isPastDay || editedTask.completed}
                />
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
            <Textarea
              placeholder="Add a description..."
              value={editedTask.description || ""}
              onChange={handleDescriptionChange}
              className="min-h-[100px] border-none resize-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-slate-700"
              disabled={isPastDay}
            />
          </div>
        </div>

        {/* Modal footer */}
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 bg-green-700">
              <AvatarFallback>JL</AvatarFallback>
            </Avatar>
            <Input placeholder="Comment..." className="flex-1 bg-slate-700 border-slate-600" disabled={isPastDay} />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" disabled={isPastDay}>
              <Calendar className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-4 text-sm text-slate-400 flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>
              Joel Livet created this in {editedTask.category} {format(new Date(), "MMM d, h:mm a")}
            </span>
          </div>
          <div className="mt-4 flex justify-between">
            <Button variant="destructive" onClick={handleDeleteTask} disabled={isPastDay}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Task
            </Button>
            <Button onClick={handleSave} disabled={isPastDay}>
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* Date Picker Modals */}
      <DatePickerModal
        isOpen={isStartDatePickerOpen}
        onClose={() => setIsStartDatePickerOpen(false)}
        onSelectDate={handleStartDateSelect}
        selectedDate={editedTask.startDateObj || null}
        type="start"
        onDelete={handleDeleteTask}
      />

      <DatePickerModal
        isOpen={isDueDatePickerOpen}
        onClose={() => setIsDueDatePickerOpen(false)}
        onSelectDate={handleDueDateSelect}
        selectedDate={editedTask.dueDateObj || null}
        type="due"
      />
    </div>
  )
}
