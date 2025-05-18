"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { AuthForm } from "@/components/auth-form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function AuthPage() {
  const [error, setError] = useState<string | null>(null)
  const { status } = useAuth()

  if (status === "authenticated") {
    window.location.href = "/"
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Welcome to Foo Todo</h1>
          <p className="mt-2 text-sm text-slate-400">Sign in to manage your tasks</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <AuthForm onError={setError} />
      </div>
    </div>
  )
}
