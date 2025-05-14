"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Calendar,
  Target,
  ClipboardList,
  CheckSquare,
  Sunset,
  Sparkles,
  CalendarCheck,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

interface SidebarProps {
  collapseAllColumnsOfType?: (columnType: "personal" | "work") => void
  expandAllColumnsOfType?: (columnType: "personal" | "work") => void
  setShowDiagnostic?: (show: boolean) => void
}

export function Sidebar({
  collapseAllColumnsOfType,
  expandAllColumnsOfType,
  setShowDiagnostic,
}: SidebarProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(true)
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const router = useRouter()

  return (
    <div className={`${sidebarCollapsed ? 'w-[50px]' : 'w-[180px]'} border-r border-slate-700 p-4 flex flex-col bg-slate-800 transition-all duration-300 ease-in-out`}>
      <div className="flex items-center justify-between mb-6">
        {!sidebarCollapsed && <h2 className="font-semibold text-lg">TaskMaster</h2>}
        <button 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={`${sidebarCollapsed ? 'mx-auto' : ''} text-slate-400 hover:text-slate-100 transition-colors`}
        >
          {sidebarCollapsed ? 
            <ChevronRight className="h-4 w-4" /> : 
            <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <div className="space-y-1">
        <Button 
          variant="ghost" 
          className={`w-full ${sidebarCollapsed ? 'justify-center px-0' : 'justify-start'} text-slate-200 ${pathname === '/' ? 'bg-slate-700' : ''}`} 
          asChild
        >
          <Link href="/">
            <Home className={`${sidebarCollapsed ? '' : 'mr-2'} h-4 w-4`} />
            {!sidebarCollapsed && 'Home'}
          </Link>
        </Button>
        
        <Button 
          variant="ghost" 
          className={`w-full ${sidebarCollapsed ? 'justify-center px-0' : 'justify-start'} text-slate-200 ${pathname === '/decision-matrix' ? 'bg-slate-700' : ''}`} 
          asChild
        >
          <Link href="/decision-matrix">
            <ClipboardList className={`${sidebarCollapsed ? '' : 'mr-2'} h-4 w-4`} />
            {!sidebarCollapsed && 'Decision Matrix'}
          </Link>
        </Button>
      </div>

      {/* Daily rituals section - visible in both collapsed and expanded states */}
      <div className={`${sidebarCollapsed ? 'mt-6' : 'mt-8'}`}>
        {!sidebarCollapsed && (
          <h3 className="text-xs font-semibold text-slate-400 mb-2">DAILY RITUALS</h3>
        )}
        <div className="space-y-1">
          <Button variant="ghost" className={`w-full ${sidebarCollapsed ? 'justify-center px-0' : 'justify-start'} text-sm text-slate-200`}>
            <CheckSquare className={`${sidebarCollapsed ? '' : 'mr-2'} h-4 w-4`} />
            {!sidebarCollapsed && 'Daily objectives'}
          </Button>
          <Button variant="ghost" className={`w-full ${sidebarCollapsed ? 'justify-center px-0' : 'justify-start'} text-sm text-slate-200`}>
            <Sunset className={`${sidebarCollapsed ? '' : 'mr-2'} h-4 w-4`} />
            {!sidebarCollapsed && 'Daily shutdown'}
          </Button>
          <Button variant="ghost" className={`w-full ${sidebarCollapsed ? 'justify-center px-0' : 'justify-start'} text-sm text-slate-200`}>
            <Sparkles className={`${sidebarCollapsed ? '' : 'mr-2'} h-4 w-4`} />
            {!sidebarCollapsed && 'Daily rituals'}
          </Button>
        </div>
      </div>

      {/* Weekly rituals section - visible in both collapsed and expanded states */}
      <div className={`${sidebarCollapsed ? 'mt-6' : 'mt-4'}`}>
        {!sidebarCollapsed && (
          <h3 className="text-xs font-semibold text-slate-400 mb-2">WEEKLY RITUALS</h3>
        )}
        <div className="space-y-1">
          <Button variant="ghost" className={`w-full ${sidebarCollapsed ? 'justify-center px-0' : 'justify-start'} text-sm text-slate-200`}>
            <CalendarCheck className={`${sidebarCollapsed ? '' : 'mr-2'} h-4 w-4`} />
            {!sidebarCollapsed && 'Weekly planning'}
          </Button>
          <Button variant="ghost" className={`w-full ${sidebarCollapsed ? 'justify-center px-0' : 'justify-start'} text-sm text-slate-200`}>
            <ClipboardCheck className={`${sidebarCollapsed ? '' : 'mr-2'} h-4 w-4`} />
            {!sidebarCollapsed && 'Weekly review'}
          </Button>
        </div>
      </div>

      {/* Column controls - only display if they exist */}
      {collapseAllColumnsOfType && expandAllColumnsOfType && (
        <>
          {!sidebarCollapsed ? (
            <div className="mt-4">
              <h3 className="text-xs font-semibold text-slate-400 mb-2">COLUMN CONTROLS</h3>
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm text-slate-200"
                  onClick={() => collapseAllColumnsOfType("personal")}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Collapse Personal
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm text-slate-200"
                  onClick={() => expandAllColumnsOfType("personal")}
                >
                  <ChevronRight className="mr-2 h-4 w-4" />
                  Expand Personal
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm text-slate-200"
                  onClick={() => collapseAllColumnsOfType("work")}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Collapse Work
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm text-slate-200"
                  onClick={() => expandAllColumnsOfType("work")}
                >
                  <ChevronRight className="mr-2 h-4 w-4" />
                  Expand Work
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center space-y-2">
              <button 
                onClick={() => collapseAllColumnsOfType("personal")}
                className="text-slate-400 hover:text-slate-100 p-1"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => expandAllColumnsOfType("personal")}
                className="text-slate-400 hover:text-slate-100 p-1"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => collapseAllColumnsOfType("work")}
                className="text-slate-400 hover:text-slate-100 p-1"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => expandAllColumnsOfType("work")}
                className="text-slate-400 hover:text-slate-100 p-1"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}

      <div className="mt-auto space-y-2">
        {/* Only show diagnostic in development environments and when sidebar is expanded */}
        {!sidebarCollapsed && setShowDiagnostic && (process.env.NODE_ENV === 'development' || typeof window !== 'undefined' && window.location.hostname === 'localhost') && (
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2 border-slate-600 text-slate-200"
            onClick={() => setShowDiagnostic(true)}
          >
            Supabase Diagnostic
          </Button>
        )}
        
        {/* User profile section */}
        {user && (
          <div
            className={`flex items-center ${sidebarCollapsed ? 'justify-center' : ''} p-2 rounded-lg bg-slate-700 cursor-pointer hover:bg-slate-600`}
            onClick={() => router.push("/profile")}
          >
            <Avatar className={`h-8 w-8 ${sidebarCollapsed ? '' : 'mr-2'} bg-blue-600`}>
              <AvatarFallback>
                {user?.user_metadata?.name
                  ? user.user_metadata.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()
                      .substring(0, 2)
                  : user?.email?.substring(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            {!sidebarCollapsed && (
              <div className="truncate">
                <div className="font-medium text-sm truncate">
                  {user?.user_metadata?.name || user?.email || "User"}
                </div>
                <Button
                  variant="link"
                  onClick={(e) => {
                    e.stopPropagation()
                    signOut()
                  }}
                  className="h-auto p-0 text-xs text-slate-400 hover:text-slate-200"
                >
                  Sign Out
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
