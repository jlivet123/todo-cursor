"use client"

import { useState, useEffect } from "react"
import { useDatabase } from "@/lib/database/database-context"

export function useAlterEgoChatCount(alterEgoId: string) {
  const db = useDatabase()
  const [count, setCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!alterEgoId) {
      setLoading(false)
      return
    }

    async function fetchChatCount() {
      try {
        setLoading(true)
        const chatCount = await db.getAlterEgoChatCount(alterEgoId)
        setCount(chatCount)
        setError(null)
      } catch (err) {
        console.error("Error fetching chat count:", err)
        setError(err instanceof Error ? err : new Error(String(err)))
        // Set count to 0 on error to prevent loading state from persisting
        setCount(0)
      } finally {
        setLoading(false)
      }
    }

    fetchChatCount()
  }, [alterEgoId, db])

  return { count, loading, error }
}
