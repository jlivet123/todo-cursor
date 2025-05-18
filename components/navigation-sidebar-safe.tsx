'use client'

import { useState, useEffect } from "react"
import { NavigationSidebar } from "./navigation-sidebar"
import { getFromLocalStorage, setToLocalStorage } from "@/lib/hooks/use-local-storage"

interface NavigationSidebarSafeProps {
  isTaskListPage?: boolean
  collapseAllColumnsOfType?: (columnType: "personal" | "work") => void
  expandAllColumnsOfType?: (columnType: "personal" | "work") => void
}

export function NavigationSidebarSafe(props: NavigationSidebarSafeProps) {
  const [isMounted, setIsMounted] = useState(false)
  
  // Only render once the component is mounted on the client
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Don't render anything during SSR
  if (!isMounted) {
    return (
      <div className="w-14 md:w-64 h-screen bg-slate-800 transition-all duration-300 ease-in-out shrink-0">
        {/* Loading placeholder */}
      </div>
    )
  }
  
  // Once mounted on the client, render the actual sidebar
  return <NavigationSidebar {...props} />
}
