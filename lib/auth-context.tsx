"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { getSupabaseClient, isSupabaseConfigured } from "./supabase"
import type { User, Provider } from "@supabase/supabase-js"
import { MOCK_USER } from "./storage"
import { useRouter } from "next/navigation"

interface AuthContextType {
  user: User | null
  status: "authenticated" | "unauthenticated" | "loading" | "unconfigured"
  signIn: (options: { email?: string; password?: string; provider?: Provider }) => Promise<void>
  signUp: (options: { email: string; password: string }) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateProfile: (data: { name?: string; avatar_url?: string }) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  status: "loading",
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
  updateProfile: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<"authenticated" | "unauthenticated" | "loading" | "unconfigured">("loading")
  const router = useRouter()

  useEffect(() => {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.warn("Supabase is not configured. Please set up your environment variables.")
      setStatus("unconfigured")
      return
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      setStatus("unconfigured")
      return
    }

    // Check if user is already logged in
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session?.user?.email)
      if (session?.user) {
        setUser(session.user)
        setStatus("authenticated")
      } else {
        setUser(null)
        setStatus("unauthenticated")
      }
    })

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        setStatus("authenticated")
      } else {
        setStatus("unauthenticated")
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const signIn = async (options: { email?: string; password?: string; provider?: Provider }) => {
    const supabase = getSupabaseClient()
    if (!supabase) {
      throw new Error("Cannot sign in: Supabase client not available")
    }

    try {
      if (options.provider) {
        // OAuth sign in
        const { error } = await supabase.auth.signInWithOAuth({
          provider: options.provider,
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) throw error
      } else if (options.email && options.password) {
        // Email/password sign in
        const { error } = await supabase.auth.signInWithPassword({
          email: options.email,
          password: options.password,
        })
        if (error) throw error
      } else {
        throw new Error("Invalid sign in options")
      }
    } catch (error) {
      console.error("Sign in error:", error)
      throw error
    }
  }

  const signUp = async (options: { email: string; password: string }) => {
    const supabase = getSupabaseClient()
    if (!supabase) {
      throw new Error("Cannot sign up: Supabase client not available")
    }

    try {
      const { error } = await supabase.auth.signUp({
        email: options.email,
        password: options.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (error) {
      console.error("Sign up error:", error)
      throw error
    }
  }

  const signOut = async () => {
    const supabase = getSupabaseClient()
    if (supabase) {
      try {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
      } catch (error) {
        console.error("Sign out error:", error)
      }
    }
    setUser(null)
    setStatus("unauthenticated")
    router.push("/auth")
  }

  const resetPassword = async (email: string) => {
    const supabase = getSupabaseClient()
    if (!supabase) {
      throw new Error("Cannot reset password: Supabase client not available")
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) throw error
    } catch (error) {
      console.error("Reset password error:", error)
      throw error
    }
  }

  const updateProfile = async (data: { name?: string; avatar_url?: string }) => {
    const supabase = getSupabaseClient()
    if (!supabase || !user) {
      throw new Error("Cannot update profile: User not authenticated or Supabase not available")
    }

    try {
      // Update user metadata
      const { error } = await supabase.auth.updateUser({
        data,
      })
      if (error) throw error

      // Refresh user data
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (userData.user) {
        setUser(userData.user)
      }
    } catch (error) {
      console.error("Update profile error:", error)
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ user, status, signIn, signUp, signOut, resetPassword, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
