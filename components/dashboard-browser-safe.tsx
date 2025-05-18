'use client'

import React from "react"
import { BarChart3, Activity, Calendar, TrendingUp, CheckCircle2, Clock, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"

function DashboardCard({ title, icon, value, description, color }: {
  title: string
  icon: React.ReactNode
  value: string
  description: string
  color: string
}) {
  return (
    <div className={`p-6 rounded-lg border shadow-sm ${color}`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-sm text-slate-500 dark:text-slate-400">{title}</h3>
          <div className="mt-2 flex items-baseline">
            <p className="text-2xl font-semibold">{value}</p>
            <p className="ml-2 text-xs text-slate-500 dark:text-slate-400">{description}</p>
          </div>
        </div>
        <div className="p-2 rounded-full bg-slate-100 dark:bg-slate-800">
          {icon}
        </div>
      </div>
    </div>
  )
}

export function DashboardBrowserSafe() {
  const { user, status } = useAuth()

  // If not authenticated, show loading
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-slate-800 rounded-lg shadow-lg border dark:border-slate-700">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Welcome to TaskMaster
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Your all-in-one productivity solution
            </p>
          </div>
          <div className="mt-8">
            <Button className="w-full" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <div className="mt-4">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/signup">Create New Account</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400">Welcome back, {user.user_metadata?.name || user.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <DashboardCard
          title="Tasks Due Today"
          icon={<Clock className="h-6 w-6 text-orange-500" />}
          value="5"
          description="tasks"
          color="bg-orange-50 dark:bg-orange-950"
        />
        <DashboardCard
          title="Completed Tasks"
          icon={<CheckCircle2 className="h-6 w-6 text-green-500" />}
          value="12"
          description="this week"
          color="bg-green-50 dark:bg-green-950"
        />
        <DashboardCard
          title="Upcoming Tasks"
          icon={<Calendar className="h-6 w-6 text-blue-500" />}
          value="8"
          description="next week"
          color="bg-blue-50 dark:bg-blue-950"
        />
        <DashboardCard
          title="Active Projects"
          icon={<BarChart3 className="h-6 w-6 text-purple-500" />}
          value="3"
          description="projects"
          color="bg-purple-50 dark:bg-purple-950"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-lg border p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Recent Activity</h2>
            <Button variant="ghost" size="sm" className="text-blue-500">
              See All
            </Button>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-4 pb-4 border-b">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="font-medium">Completed "Update project documentation"</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Today at 10:30 AM</p>
              </div>
            </div>
            <div className="flex items-start gap-4 pb-4 border-b">
              <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900">
                <Clock className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="font-medium">Due soon: "Prepare presentation slides"</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Due in 2 hours</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                <Activity className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="font-medium">Started new project "Website Redesign"</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Yesterday at 3:45 PM</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Quick Access</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/tasks"
              className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
            >
              <Calendar className="h-8 w-8 text-blue-500 mb-2" />
              <span className="font-medium">Tasks</span>
            </Link>
            <Link
              href="/projects"
              className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
            >
              <BarChart3 className="h-8 w-8 text-purple-500 mb-2" />
              <span className="font-medium">Projects</span>
            </Link>
            <Link
              href="/sticky-notes"
              className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
            >
              <TrendingUp className="h-8 w-8 text-green-500 mb-2" />
              <span className="font-medium">Sticky Notes</span>
            </Link>
            <Link
              href="/alter-egos"
              className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
            >
              <Users className="h-8 w-8 text-orange-500 mb-2" />
              <span className="font-medium">Alter Egos</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
