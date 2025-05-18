import type { DatabaseInterface } from "./interfaces"
import { LocalStorageDB } from "./local-storage-db"
import { SupabaseDB } from "./supabase-db"

// Database types
export enum DatabaseType {
  LocalStorage = "localStorage",
  Supabase = "supabase",
}

// Factory function to get the appropriate database implementation
export function getDatabaseImplementation(type: DatabaseType): DatabaseInterface {
  switch (type) {
    case DatabaseType.LocalStorage:
      return new LocalStorageDB()
    case DatabaseType.Supabase:
      return new SupabaseDB()
    default:
      return new LocalStorageDB()
  }
}
