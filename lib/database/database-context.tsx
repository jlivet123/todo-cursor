"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { DatabaseInterface } from "./interfaces"
import { LocalStorageDB } from "./local-storage-db"

// Create the context with a default implementation
const localStorageDB = new LocalStorageDB()
const DatabaseContext = createContext<DatabaseInterface>(localStorageDB)

// Mock user ID for local storage
export const MOCK_USER_ID = "local-user-id"

// Provider component
export function DatabaseProvider({ children }: { children: ReactNode }) {
  // We're initializing the database directly instead of using useState/useEffect
  // This prevents the loading state issue
  return <DatabaseContext.Provider value={localStorageDB}>{children}</DatabaseContext.Provider>
}

// Hook to use the database
export function useDatabase() {
  const context = useContext(DatabaseContext)
  return context
}
