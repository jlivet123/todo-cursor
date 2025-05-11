"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { getSupabaseClient, setSupabaseCredentials } from "@/lib/supabase"

export function SupabaseDiagnostic() {
  const [status, setStatus] = useState<"checking" | "configured" | "not-configured">("checking")
  const [manualUrl, setManualUrl] = useState("")
  const [manualKey, setManualKey] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    checkSupabaseConfig()
  }, [])

  const checkSupabaseConfig = () => {
    try {
      const supabase = getSupabaseClient()
      if (supabase) {
        setStatus("configured")
        setMessage("Supabase client created successfully!")
      } else {
        setStatus("not-configured")
        setMessage("Supabase client could not be created. Check console for details.")
      }
    } catch (error) {
      setStatus("not-configured")
      setMessage(`Error checking Supabase configuration: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const handleManualConfig = (e: React.FormEvent) => {
    e.preventDefault()
    if (setSupabaseCredentials(manualUrl, manualKey)) {
      setMessage("Manual configuration successful!")
      checkSupabaseConfig()
    } else {
      setMessage("Failed to set manual configuration. Check console for details.")
    }
  }

  return (
    <div className="p-4 border border-slate-700 rounded-md bg-slate-800 max-w-md mx-auto my-4">
      <h2 className="text-xl font-bold mb-4">Supabase Configuration Diagnostic</h2>

      <div className="mb-4">
        <p className="mb-2">
          Status:{" "}
          {status === "checking" ? "Checking..." : status === "configured" ? "Configured ✅" : "Not Configured ❌"}
        </p>
        <p className="text-sm text-slate-400">{message}</p>
      </div>

      {status === "not-configured" && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Manual Configuration</h3>
          <form onSubmit={handleManualConfig} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Supabase URL</label>
              <input
                type="text"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full p-2 bg-slate-700 rounded border border-slate-600"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Anon Key</label>
              <input
                type="password"
                value={manualKey}
                onChange={(e) => setManualKey(e.target.value)}
                placeholder="your-anon-key"
                className="w-full p-2 bg-slate-700 rounded border border-slate-600"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Apply Configuration
            </button>
          </form>
        </div>
      )}

      <div className="mt-4 text-sm">
        <p className="font-semibold">Environment Variables:</p>
        <p>NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? "Set ✅" : "Not Set ❌"}</p>
        <p>NEXT_PUBLIC_SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Set ✅" : "Not Set ❌"}</p>
      </div>
    </div>
  )
}
