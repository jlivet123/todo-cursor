"use client"

// Simple auth utility for localStorage-based authentication
// This replaces the previous NextAuth + Supabase implementation

import { MOCK_USER } from "./storage"

export const signIn = () => {
  // In a real app, this would handle authentication
  // For this demo, we just return the mock user
  return Promise.resolve(MOCK_USER)
}

export const signOut = () => {
  // In a real app, this would handle sign out
  return Promise.resolve()
}

export const auth = () => {
  // In a real app, this would check the session
  // For this demo, we just return the mock user
  return Promise.resolve({ user: MOCK_USER })
}
