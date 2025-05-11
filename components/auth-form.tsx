"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Mail, Github } from "lucide-react"

type AuthMode = "signin" | "signup" | "reset"

interface AuthFormProps {
  onError: (error: string | null) => void
}

export function AuthForm({ onError }: AuthFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [mode, setMode] = useState<AuthMode>("signin")
  const [resetSent, setResetSent] = useState(false)
  const { signIn, signUp, resetPassword } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    onError(null)

    try {
      if (mode === "signin") {
        await signIn({ email, password })
        router.push("/")
      } else if (mode === "signup") {
        await signUp({ email, password })
        // Show success message
        onError("Check your email for the confirmation link!")
      } else if (mode === "reset") {
        await resetPassword(email)
        setResetSent(true)
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthSignIn = async (provider: "github" | "google") => {
    setIsLoading(true)
    onError(null)

    try {
      await signIn({ provider })
      // The redirect will be handled by Supabase
    } catch (error) {
      onError(error instanceof Error ? error.message : "An error occurred")
      setIsLoading(false)
    }
  }

  const handleModeChange = (newMode: string) => {
    setMode(newMode as AuthMode)
    onError(null)
    setResetSent(false)
  }

  return (
    <Tabs value={mode} onValueChange={handleModeChange} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="signin">Sign In</TabsTrigger>
        <TabsTrigger value="signup">Sign Up</TabsTrigger>
      </TabsList>

      <TabsContent value="signin" className="space-y-4">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">Welcome back</h1>
          <p className="text-sm text-slate-400">Sign in to your account to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-slate-800 border-slate-700"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Button
                type="button"
                variant="link"
                className="text-xs text-slate-400 h-auto p-0"
                onClick={() => setMode("reset")}
              >
                Forgot password?
              </Button>
            </div>
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
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Sign In
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-slate-900 px-2 text-slate-400">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button
            type="button"
            variant="outline"
            className="border-slate-700"
            onClick={() => handleOAuthSignIn("github")}
            disabled={isLoading}
          >
            <Github className="h-4 w-4 mr-2" />
            GitHub
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-slate-700"
            onClick={() => handleOAuthSignIn("google")}
            disabled={isLoading}
          >
            <Mail className="h-4 w-4 mr-2" />
            Google
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="signup" className="space-y-4">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">Create an account</h1>
          <p className="text-sm text-slate-400">Enter your email to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-slate-800 border-slate-700"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
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
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Sign Up
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-slate-900 px-2 text-slate-400">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button
            type="button"
            variant="outline"
            className="border-slate-700"
            onClick={() => handleOAuthSignIn("github")}
            disabled={isLoading}
          >
            <Github className="h-4 w-4 mr-2" />
            GitHub
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-slate-700"
            onClick={() => handleOAuthSignIn("google")}
            disabled={isLoading}
          >
            <Mail className="h-4 w-4 mr-2" />
            Google
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="reset" className="space-y-4">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">Reset password</h1>
          <p className="text-sm text-slate-400">Enter your email to receive a password reset link</p>
        </div>

        {resetSent ? (
          <div className="bg-green-900/30 border border-green-800 text-green-300 px-4 py-3 rounded-md">
            <p>Password reset link sent! Check your email.</p>
            <Button
              type="button"
              variant="link"
              className="mt-2 p-0 h-auto text-green-300"
              onClick={() => setMode("signin")}
            >
              Back to sign in
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Send Reset Link
            </Button>
            <Button type="button" variant="link" className="w-full text-slate-400" onClick={() => setMode("signin")}>
              Back to sign in
            </Button>
          </form>
        )}
      </TabsContent>
    </Tabs>
  )
}
