"use client"

import { useState } from "react"
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
import { ChevronLeft, ChevronRight, ArrowUpFromLine, Trash2 } from "lucide-react"
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
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete()
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center date-picker-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="mt-16 bg-slate-800 text-white rounded-lg shadow-xl w-80 overflow-hidden border border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {type === "due" ? (
          <div className="p-4">
            <div className="text-slate-400 mb-2">Due date:</div>
            <div className="flex justify-center mb-2">
              <div className="bg-slate-700 rounded-md px-4 py-2">Set due date</div>
            </div>
          </div>
        ) : (
          <div className="p-4 border-b border-slate-700">
            <div className="text-slate-300 mb-4">
              This has rolled over 5 times. You'll feel better if you snooze or delete it.
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>Snooze one day</div>
                <div className="text-slate-400">D</div>
              </div>
              <div className="flex items-center justify-between">
                <div>Move to next week</div>
                <div className="flex items-center gap-2">
                  <ArrowUpFromLine className="h-4 w-4" />
                  <span className="text-slate-400">Z</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>Move to backlog</div>
                <div className="text-slate-400">Z</div>
              </div>
              <div
                className="flex items-center justify-between cursor-pointer hover:bg-slate-700 p-1 rounded"
                onClick={handleDelete}
              >
                <div>Delete</div>
                <div className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  <span className="text-slate-400">Delete</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>Keep for today</div>
              </div>
            </div>
            <div className="mt-4 text-slate-400">Start date:</div>
          </div>
        )}

        <div className="p-4">
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
        </div>
      </div>
    </div>
  )
}
