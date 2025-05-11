import { createClient } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"

// Store the client instance
let supabaseInstance: SupabaseClient | null = null

// Function to validate a URL string
function isValidUrl(urlString: string): boolean {
  try {
    // This will throw if the URL is invalid
    new URL(urlString)
    return true
  } catch (e) {
    return false
  }
}

// Function to get or create the Supabase client
export function getSupabaseClient(): SupabaseClient | null {
  // If we already have an instance, return it
  if (supabaseInstance) return supabaseInstance

  try {
    // Check if environment variables are available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Log the environment variables (without the key for security)
    console.log("Supabase URL from env:", supabaseUrl ? "Found" : "Not found")
    console.log("Supabase Anon Key from env:", supabaseAnonKey ? "Found" : "Not found")

    // Validate URL format
    if (!supabaseUrl || !isValidUrl(supabaseUrl)) {
      console.warn("Invalid or missing Supabase URL. Please check your NEXT_PUBLIC_SUPABASE_URL environment variable.")
      return null
    }

    // Validate anon key
    if (!supabaseAnonKey) {
      console.warn("Missing Supabase Anon Key. Please check your NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable.")
      return null
    }

    // Create the client
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })

    console.log("Supabase client created successfully")
    return supabaseInstance
  } catch (error) {
    console.error("Error creating Supabase client:", error)
    return null
  }
}

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  try {
    return !!getSupabaseClient()
  } catch (error) {
    console.error("Error checking Supabase configuration:", error)
    return false
  }
}

// Function to manually set Supabase credentials (useful for testing)
export function setSupabaseCredentials(url: string, key: string): boolean {
  try {
    // Validate URL
    if (!isValidUrl(url)) {
      console.error("Invalid Supabase URL provided")
      return false
    }

    // Reset any existing instance
    supabaseInstance = null

    // Create a new client with the provided credentials
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })

    return true
  } catch (error) {
    console.error("Error setting Supabase credentials:", error)
    return false
  }
}
