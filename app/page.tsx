"use client"

import React from "react"
import { BarChart3, Activity, Calendar, TrendingUp, CheckCircle2, Clock, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { PageLayout } from "@/components/page-layout"
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

export default function Dashboard() {
  const { user, status } = useAuth()

  // If not authenticated, redirect to login
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="w-full max-w-md p-8 space-y-8 bg-slate-800 rounded-lg shadow-lg border border-slate-700">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white">TaskMaster</h1>
            <p className="mt-2 text-slate-300">Sign in to access your dashboard</p>
          </div>
          <div className="flex justify-center">
            <Button asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <PageLayout>
      <div className="p-6 flex-1 overflow-y-auto">
        <div className="container mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-slate-500 dark:text-slate-400">Welcome to your productivity hub</p>
          </div>

          {/* Dashboard cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <DashboardCard
              title="Tasks Completed"
              icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
              value="12"
              description="This week"
              color="border-green-100 dark:border-green-900/30 bg-green-50 dark:bg-green-900/20"
            />
            <DashboardCard
              title="Active Projects"
              icon={<Activity className="h-5 w-5 text-blue-500" />}
              value="4"
              description="In progress"
              color="border-blue-100 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-900/20"
            />
            <DashboardCard
              title="Upcoming Due"
              icon={<Calendar className="h-5 w-5 text-purple-500" />}
              value="3"
              description="Next 48 hours"
              color="border-purple-100 dark:border-purple-900/30 bg-purple-50 dark:bg-purple-900/20"
            />
            <DashboardCard
              title="Productivity"
              icon={<TrendingUp className="h-5 w-5 text-orange-500" />}
              value="82%"
              description="+12% from last week"
              color="border-orange-100 dark:border-orange-900/30 bg-orange-50 dark:bg-orange-900/20"
            />
          </div>

          {/* Coming soon */}
          <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Quick Access</h2>
              <Button size="sm" variant="outline" asChild>
                <Link href="/tasks">View All Tasks</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 p-4 rounded border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Clock className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">Today's Tasks</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">5 remaining</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-4 rounded border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                    <Users className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">Team Projects</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Coming soon</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-4 rounded border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <BarChart3 className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">Analytics</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Coming soon</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* More sections can be added here */}
          <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Getting Started</h2>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>Create and organize tasks in <Link href="/tasks" className="text-blue-500 hover:underline">My Tasks</Link></span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>Keep track of ideas with <Link href="/sticky-notes" className="text-blue-500 hover:underline">Sticky Notes</Link></span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>Transform limiting beliefs using the <Link href="/decision-matrix" className="text-blue-500 hover:underline">Decision Matrix</Link></span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
