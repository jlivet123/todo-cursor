"use client"

import { useState, useEffect } from "react"
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addDays,
} from "date-fns"
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface DatePickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectDate: (date: Date | null) => void
  selectedDate: Date | null
  type: "start" | "due"
  onDelete?: () => void
}

export function DatePickerModal({ isOpen, onClose, onSelectDate, selectedDate, type, onDelete }: DatePickerModalProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date())
  
  // Update current month when selected date changes
  useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(selectedDate);
    }
  }, [selectedDate]);

  // Early return if not open
  if (!isOpen) return null

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Add days from previous month to start the calendar on Monday
  const startDay = monthStart.getDay() === 0 ? 6 : monthStart.getDay() - 1
  const prevMonthDays = Array.from({ length: startDay }, (_, i) => addDays(monthStart, -(startDay - i)))

  // Add days from next month to complete the calendar
  const endDay = monthEnd.getDay() === 0 ? 0 : 7 - monthEnd.getDay()
  const nextMonthDays = Array.from({ length: endDay }, (_, i) => addDays(monthEnd, i + 1))

  const allDays = [...prevMonthDays, ...monthDays, ...nextMonthDays]

  const handleDateClick = (date: Date) => {
    onSelectDate(date)
    onClose()
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete()
      onClose()
    }
  }

  // This event handler ensures the modal closes when clicking outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Handle escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 date-picker-modal"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-slate-800 text-white rounded-lg shadow-xl w-80 overflow-hidden border border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3 border-b border-slate-700">
          <div className="text-slate-300 font-medium">
            {type === "start" ? "Start date" : "Due date"}
          </div>
        </div>

        {/* Calendar */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1 rounded-full hover:bg-slate-700">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="font-medium text-lg">{format(currentMonth, "MMMM yyyy")}</div>
            <button onClick={nextMonth} className="p-1 rounded-full hover:bg-slate-700">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
              <div key={i} className="text-slate-400 text-sm">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {allDays.map((day, i) => {
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false

              return (
                <button
                  key={i}
                  onClick={() => handleDateClick(day)}
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-sm",
                    !isCurrentMonth && "text-slate-600",
                    isSelected && "bg-blue-600 text-white",
                    !isSelected && isCurrentMonth && "hover:bg-slate-700",
                  )}
                >
                  {format(day, "d")}
                </button>
              )
            })}
          </div>
          
          {/* Footer */}
          <div className="mt-4 flex justify-between">
            {onDelete && (
              <button 
                onClick={handleDelete}
                className="text-red-400 hover:text-red-300 flex items-center"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </button>
            )}
            <button
              onClick={() => {
                onSelectDate(null);
                onClose();
              }}
              className="ml-auto text-slate-400 hover:text-slate-300"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
