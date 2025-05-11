"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { UserProfile } from "@/components/user-profile"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"

export default function ProfilePage() {
  const { status } = useAuth()
  const router = useRouter()

  // If not authenticated, redirect to auth page
  if (status === "unauthenticated") {
    router.push("/auth")
    return null
  }

  // If loading, show loading state
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <h2 className="text-xl font-semibold text-white">Loading profile...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Your Profile</h1>
        </div>

        <div className="grid gap-6">
          <UserProfile />

          <div className="p-4 rounded-lg bg-slate-800 border border-slate-700">
            <h2 className="text-xl font-semibold mb-4">Account Settings</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-700">
                <div>
                  <h3 className="font-medium">Email Notifications</h3>
                  <p className="text-sm text-slate-400">Receive email notifications for task updates</p>
                </div>
                <div className="flex items-center h-6 w-11 bg-slate-700 rounded-full p-1 cursor-pointer">
                  <div className="h-4 w-4 bg-slate-400 rounded-full"></div>
                </div>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-700">
                <div>
                  <h3 className="font-medium">Two-Factor Authentication</h3>
                  <p className="text-sm text-slate-400">Add an extra layer of security to your account</p>
                </div>
                <Button variant="outline" size="sm">
                  Enable
                </Button>
              </div>

              <div className="flex justify-between items-center py-2">
                <div>
                  <h3 className="font-medium text-red-400">Delete Account</h3>
                  <p className="text-sm text-slate-400">Permanently delete your account and all data</p>
                </div>
                <Button variant="destructive" size="sm">
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
