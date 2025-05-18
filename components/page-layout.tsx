"use client"

import React, { ReactNode } from "react"
import { NavigationSidebarSafe } from "./navigation-sidebar-safe"
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
    <div className="flex h-screen bg-slate-900 text-white">
      {/* Navigation Sidebar - Only pass column control functions when on task list page */}
      <NavigationSidebarSafe 
        isTaskListPage={isTaskListPage}
        collapseAllColumnsOfType={isTaskListPage ? collapseAllColumnsOfType : undefined}
        expandAllColumnsOfType={isTaskListPage ? expandAllColumnsOfType : undefined}
      />
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
