'use client'

import { useState, useEffect } from 'react'

// Type-safe localStorage hook
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(initialValue)

  // Only try to get from localStorage after mounting (client-side only)
  useEffect(() => {
    try {
      // Get from localStorage by key
      const item = window.localStorage.getItem(key)
      // Parse stored json or if none return initialValue
      setStoredValue(item ? JSON.parse(item) : initialValue)
    } catch (error) {
      // If error also return initialValue
      console.error(`Error reading localStorage key "${key}":`, error)
      setStoredValue(initialValue)
    }
  }, [key, initialValue])

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value
      // Save state
      setStoredValue(valueToStore)
      // Save to localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }

  return [storedValue, setValue]
}

// Function to safely get from localStorage (works on client-side only)
export function getFromLocalStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') {
    return defaultValue
  }
  
  try {
    const item = window.localStorage.getItem(key)
    return item ? (JSON.parse(item) as T) : defaultValue
  } catch (error) {
    console.error(`Error reading localStorage key "${key}":`, error)
    return defaultValue
  }
}

// Function to safely set to localStorage (works on client-side only)
export function setToLocalStorage<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.error(`Error setting localStorage key "${key}":`, error)
    return false
  }
}
