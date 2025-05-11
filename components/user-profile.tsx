"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, User, LogOut } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function UserProfile() {
  const { user, signOut, updateProfile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(user?.user_metadata?.name || "")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      await updateProfile({ name })
      setIsEditing(false)
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  // Get user initials for avatar fallback
  const getInitials = () => {
    const userName = user?.user_metadata?.name || user?.email || ""
    if (userName.includes("@")) {
      return userName.substring(0, 2).toUpperCase()
    }
    return userName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <div className="p-4 rounded-lg bg-slate-800 border border-slate-700">
      <div className="flex items-center gap-4 mb-4">
        <Avatar className="h-16 w-16">
          <AvatarImage
            src={user?.user_metadata?.avatar_url || "/placeholder.svg"}
            alt={user?.user_metadata?.name || "User"}
          />
          <AvatarFallback className="bg-blue-600 text-white">{getInitials()}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-xl font-semibold">{user?.user_metadata?.name || user?.email?.split("@")[0] || "User"}</h2>
          <p className="text-sm text-slate-400">{user?.email}</p>
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-700 border-slate-600"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={isLoading}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditing(true)} className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Edit Profile
          </Button>
          <Button variant="outline" onClick={signOut} className="flex items-center gap-2 text-red-400 border-red-800">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      )}
    </div>
  )
}
