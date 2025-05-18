"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      const supabase = getSupabaseClient()
      if (!supabase) {
        throw new Error("Supabase client not available")
      }

      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      setSuccess(true)
      setTimeout(() => {
        router.push("/")
      }, 3000)
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-900">
      <div className="flex items-center p-4 border-b border-slate-800">
        <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold text-white">Reset Password</h1>
      </div>

      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-md flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {success ? (
            <div className="bg-green-900/30 border border-green-800 text-green-300 px-4 py-3 rounded-md">
              <h2 className="font-semibold text-lg mb-2">Password Updated!</h2>
              <p>Your password has been successfully reset. Redirecting to the login page...</p>
            </div>
          ) : (
            <>
              <div className="space-y-2 text-center">
                <h1 className="text-2xl font-bold tracking-tight text-white">Create a new password</h1>
                <p className="text-sm text-slate-400">Enter a new password for your account</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Reset Password
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
