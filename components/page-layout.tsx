"use client"

import React, { ReactNode } from "react"
import { NavigationSidebar } from "./navigation-sidebar"
import { usePathname } from "next/navigation"

interface PageLayoutProps {
  children: ReactNode
  // Optional functions for task list page column management
  collapseAllColumnsOfType?: (columnType: "personal" | "work") => void
  expandAllColumnsOfType?: (columnType: "personal" | "work") => void
}

export function PageLayout({
  children,
  collapseAllColumnsOfType,
  expandAllColumnsOfType
}: PageLayoutProps) {
  const pathname = usePathname()
  
  // Determine if we're on the main task list page
  const isTaskListPage = pathname === "/tasks"

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex">
      {/* Navigation Sidebar - Only pass column control functions when on task list page */}
      <NavigationSidebar 
        isTaskListPage={isTaskListPage}
        collapseAllColumnsOfType={isTaskListPage ? collapseAllColumnsOfType : undefined}
        expandAllColumnsOfType={isTaskListPage ? expandAllColumnsOfType : undefined}
      />
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
