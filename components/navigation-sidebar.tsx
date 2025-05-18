"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Home,
  Calendar, 
  StickyNote, 
  Sparkles, 
  Target,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  LogOut,
  CheckSquare,
  Flag,
  Sun,
  BarChart3,
  AlarmClock,
  Brain,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

interface NavigationSidebarProps {
  // Only show task collapse controls on the main task list page
  isTaskListPage?: boolean
  // Task collapse functions for the task list page
  collapseAllColumnsOfType?: (columnType: "personal" | "work") => void
  expandAllColumnsOfType?: (columnType: "personal" | "work") => void
}

export function NavigationSidebar({
  isTaskListPage = false,
  collapseAllColumnsOfType,
  expandAllColumnsOfType,
}: NavigationSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const router = useRouter()

  // Load sidebar state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem("sidebar_collapsed")
    if (savedState !== null) {
      setIsCollapsed(savedState === "true")
    }
  }, [])

  // Save sidebar state to localStorage when it changes
  const toggleSidebar = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem("sidebar_collapsed", String(newState))
  }

  // Handle sign out
  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  return (
    <div className={cn(
      "bg-slate-800 border-r border-slate-700 flex flex-col h-screen transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        {!isCollapsed && <h1 className="text-xl font-bold text-white">TaskMaster</h1>}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleSidebar}
          className="text-slate-400 hover:text-white hover:bg-slate-700"
        >
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Main Category */}
        {!isCollapsed && <h3 className="text-xs font-semibold text-slate-400 mb-2 uppercase">Main</h3>}
        <div className="space-y-1 mb-4">
          {/* Dashboard (placeholder) */}
          <Button 
            variant="ghost" 
            asChild
            className={cn(
              "w-full", 
              isCollapsed ? "justify-center px-0" : "justify-start",
              pathname === "/" ? "bg-slate-700 text-white" : "text-slate-200 hover:bg-slate-700/50"
            )}
          >
            <Link href="/">
              <BarChart3 className={cn(isCollapsed ? "" : "mr-2", "h-4 w-4")} />
              {!isCollapsed && "Dashboard"}
            </Link>
          </Button>

          {/* My Tasks */}
          <Button 
            variant="ghost" 
            asChild
            className={cn(
              "w-full", 
              isCollapsed ? "justify-center px-0" : "justify-start",
              pathname === "/tasks" ? "bg-slate-700 text-white" : "text-slate-200 hover:bg-slate-700/50"
            )}
          >
            <Link href="/tasks">
              <CheckSquare className={cn(isCollapsed ? "" : "mr-2", "h-4 w-4")} />
              {!isCollapsed && "My Tasks"}
            </Link>
          </Button>

          {/* Sticky Notes */}
          <Button 
            variant="ghost" 
            asChild
            className={cn(
              "w-full", 
              isCollapsed ? "justify-center px-0" : "justify-start",
              pathname === "/sticky-notes" ? "bg-slate-700 text-white" : "text-slate-200 hover:bg-slate-700/50"
            )}
          >
            <Link href="/sticky-notes">
              <StickyNote className={cn(isCollapsed ? "" : "mr-2", "h-4 w-4")} />
              {!isCollapsed && "Sticky Notes"}
            </Link>
          </Button>

           {/* Alter Egos */}
           <Button 
            variant="ghost" 
            asChild
            className={cn(
              "w-full", 
              isCollapsed ? "justify-center px-0" : "justify-start",
              pathname === "/alter-egos" ? "bg-slate-700 text-white" : "text-slate-200 hover:bg-slate-700/50"
            )}
          >
            <Link href="/alter-egos">
              <Brain className={cn(isCollapsed ? "" : "mr-2", "h-4 w-4")} />
              {!isCollapsed && "Alter Egos"}
            </Link>
          </Button>
        </div>

        {/* Life Category */}
        {!isCollapsed && <h3 className="text-xs font-semibold text-slate-400 mb-2 mt-6 uppercase">Life</h3>}
        <div className="space-y-1 mb-4">
          {/* Decision Matrix */}
          <Button 
            variant="ghost" 
            asChild
            className={cn(
              "w-full", 
              isCollapsed ? "justify-center px-0" : "justify-start",
              pathname === "/decision-matrix" ? "bg-slate-700 text-white" : "text-slate-200 hover:bg-slate-700/50"
            )}
          >
            <Link href="/decision-matrix">
              <Sparkles className={cn(isCollapsed ? "" : "mr-2", "h-4 w-4")} />
              {!isCollapsed && "Decision Matrix"}
            </Link>
          </Button>
          
          {/* Goals (not linked) */}
          <Button 
            variant="ghost" 
            className={cn(
              "w-full", 
              isCollapsed ? "justify-center px-0" : "justify-start",
              "text-slate-200 hover:bg-slate-700/50 opacity-70"
            )}
            onClick={() => alert("Goals feature coming soon!")}
          >
            <Flag className={cn(isCollapsed ? "" : "mr-2", "h-4 w-4")} />
            {!isCollapsed && "Goals"}
          </Button>
        </div>

        {/* Rituals Category */}
        {!isCollapsed && <h3 className="text-xs font-semibold text-slate-400 mb-2 mt-6 uppercase">Rituals</h3>}
        <div className="space-y-1 mb-4">
          {/* Daily (not linked) */}
          <Button 
            variant="ghost" 
            className={cn(
              "w-full", 
              isCollapsed ? "justify-center px-0" : "justify-start",
              "text-slate-200 hover:bg-slate-700/50 opacity-70"
            )}
            onClick={() => alert("Daily rituals feature coming soon!")}
          >
            <Sun className={cn(isCollapsed ? "" : "mr-2", "h-4 w-4")} />
            {!isCollapsed && "Daily"}
          </Button>
          
          {/* Weekly (not linked) */}
          <Button 
            variant="ghost" 
            className={cn(
              "w-full", 
              isCollapsed ? "justify-center px-0" : "justify-start",
              "text-slate-200 hover:bg-slate-700/50 opacity-70"
            )}
            onClick={() => alert("Weekly rituals feature coming soon!")}
          >
            <AlarmClock className={cn(isCollapsed ? "" : "mr-2", "h-4 w-4")} />
            {!isCollapsed && "Weekly"}
          </Button>
        </div>

        {/* Column Controls - Only show on tasks page */}
        {isTaskListPage && !isCollapsed && (
          <div className="mt-4 border-t border-slate-700 pt-4">
            <h3 className="text-xs font-semibold text-slate-400 mb-2 uppercase">Column Controls</h3>
            <div className="space-y-1">
              <Button 
                variant="outline" 
                size="sm"
                className="w-full text-xs h-7 border-slate-600 text-slate-300 justify-start mb-1"
                onClick={() => collapseAllColumnsOfType?.("personal")}
                disabled={!collapseAllColumnsOfType}
              >
                1. Collapse Personal
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="w-full text-xs h-7 border-slate-600 text-slate-300 justify-start mb-1"
                onClick={() => expandAllColumnsOfType?.("personal")}
                disabled={!expandAllColumnsOfType}
              >
                2. Expand Personal
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="w-full text-xs h-7 border-slate-600 text-slate-300 justify-start mb-1"
                onClick={() => collapseAllColumnsOfType?.("work")}
                disabled={!collapseAllColumnsOfType}
              >
                3. Collapse Work
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="w-full text-xs h-7 border-slate-600 text-slate-300 justify-start mb-1"
                onClick={() => expandAllColumnsOfType?.("work")}
                disabled={!expandAllColumnsOfType}
              >
                4. Expand Work
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* User Section */}
      <div className="p-3 border-t border-slate-700">
        {user ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {!isCollapsed && (
                <div className="ml-2 text-sm text-slate-300 truncate">
                  {user.email}
                </div>
              )}
            </div>
            <Button 
              variant="ghost" 
              size={isCollapsed ? "icon" : "sm"}
              onClick={handleSignOut}
              className="text-slate-400 hover:text-white hover:bg-slate-700"
            >
              <LogOut className="h-4 w-4" />
              {!isCollapsed && <span className="ml-2">Logout</span>}
            </Button>
          </div>
        ) : (
          <Button 
            variant="ghost" 
            asChild
            className="w-full text-slate-200 hover:bg-slate-700/50"
          >
            <Link href="/login">
              {isCollapsed ? <LogOut className="h-4 w-4" /> : "Login"}
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}
