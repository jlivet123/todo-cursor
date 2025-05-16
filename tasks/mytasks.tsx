"use client"

import { useState, useEffect, useRef } from "react"
import { DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { format, isToday } from "date-fns"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"
import { useTasks } from "@/lib/hooks/use-tasks"
import { useAuth } from "@/lib/auth-context"
import { resetToSampleData } from "@/lib/storage"
import { PageLayout } from "@/components/page-layout"
import LeftNav from '@/components/LeftNav';

export default function TasksPage() {
  // Core hooks and state
  const { user, signOut } = useAuth()
  const { days, isLoading, error, refreshTasks } = useTasks()
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({})
  
  // Refs for scrolling
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  // Function to reset to sample data
  const handleResetToSampleData = async () => {
    await resetToSampleData()
    refreshTasks()
  }
  
  // Function to scroll to today
  const scrollToToday = () => {
    const todayIndex = days.findIndex(day => isToday(day.date))
    if (todayIndex !== -1 && scrollContainerRef.current) {
      const dayElements = scrollContainerRef.current.querySelectorAll('.day-column')
      if (dayElements[todayIndex]) {
        dayElements[todayIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
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
  
  useEffect(() => {
    if (!isLoading && days.length > 0) {
      console.log('Tasks loaded:', days.length, 'days')
      
      // Log the tasks for each day for debugging
      days.forEach((day, index) => {
        console.log(`Day ${index}:`, format(day.date, 'yyyy-MM-dd'), 'Tasks:', day.tasks.length)
      })
    }
  }, [isLoading, days.length, days])
  
  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center max-w-md p-6 bg-slate-800 rounded-lg shadow-lg border border-slate-700">
          <div className="flex items-center justify-center mb-4 text-red-400">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-semibold mb-4 text-white">Error Loading Tasks</h2>
          <p className="mb-6 text-slate-300">{error}</p>
          <Button onClick={refreshTasks}>Try Again</Button>
        </div>
      </div>
    )
  }
  
  // Main component render
  return (
    <div className="flex">
      <LeftNav />
      <div className="flex-1">
        <DndProvider backend={HTML5Backend}>
          <PageLayout
            collapseAllColumnsOfType={collapseAllColumnsOfType}
            expandAllColumnsOfType={expandAllColumnsOfType}
          >
            <div className="flex flex-col h-full bg-slate-900 text-slate-100">
              {/* Header/toolbar */}
              <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={scrollToToday} className="border-slate-600 text-slate-200">
                    Today
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
                    onClick={refreshTasks} 
                    className="border-slate-600 text-slate-200"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
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
                className="flex-1 overflow-x-auto p-4 flex"
                ref={scrollContainerRef}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center w-full">
                    <p className="text-slate-400">Loading tasks...</p>
                  </div>
                ) : days.length === 0 ? (
                  <div className="flex items-center justify-center w-full">
                    <p className="text-slate-400">No tasks available</p>
                  </div>
                ) : (
                  <div className="flex gap-4">
                    {days.map((day, dayIndex) => (
                      <div key={dayIndex} className="day-column flex flex-col min-w-[300px] bg-slate-800 rounded-md p-4">
                        <h3 className="text-lg font-medium mb-2">{format(day.date, 'EEEE, MMM d')}</h3>
                        
                        {day.tasks.length === 0 ? (
                          <p className="text-slate-400 text-sm">No tasks for this day</p>
                        ) : (
                          <div className="space-y-2">
                            {day.tasks.map(task => (
                              <div 
                                key={task.id} 
                                className={`p-3 rounded-md ${task.completed ? 'bg-slate-700/50' : 'bg-slate-700'}`}
                              >
                                <div className="flex items-start gap-2">
                                  <div className={`w-1 self-stretch rounded-full ${task.category === 'personal' ? 'bg-blue-500' : 'bg-green-500'}`} />
                                  <div className="flex-1">
                                    <h4 className={`font-medium ${task.completed ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                                      {task.text}
                                    </h4>
                                    {task.description && (
                                      <p className="text-sm text-slate-400 mt-1">{task.description}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </PageLayout>
        </DndProvider>
      </div>
    </div>
  )
} 