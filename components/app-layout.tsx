"use client"

import React, { ReactNode } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Home, Calendar, StickyNote } from "lucide-react"
import { NavigationSidebar } from '@/components/navigation-sidebar'

interface AppLayoutProps {
  children: ReactNode
  // Optional functions for task list page column management
  collapseAllColumnsOfType?: (columnType: "personal" | "work") => void
  expandAllColumnsOfType?: (columnType: "personal" | "work") => void
}

export function AppLayout({ 
  children, 
  collapseAllColumnsOfType, 
  expandAllColumnsOfType 
}: AppLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  
  // Determine if we're on the main task list page
  const isTaskListPage = pathname === "/" || pathname === "/tasks"

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
