import type {
  AlterEgo,
  Category,
  AlterEgoCategoryMapping,
  SystemPrompt,
  AlterEgoPrompt,
  Chat,
  ChatMessage,
} from "./types"
import { SupabaseDB } from "./supabase-db"

// Helper function to check if we're in a browser environment
const isBrowser = () => typeof window !== "undefined"

// Function to export all data from localStorage
export async function exportLocalStorageData(): Promise<{
  alterEgos: AlterEgo[]
  categories: Category[]
  alterEgoCategoryMappings: AlterEgoCategoryMapping[]
  systemPrompts: SystemPrompt[]
  alterEgoPrompts: AlterEgoPrompt[]
  chats: Chat[]
  chatMessages: ChatMessage[]
}> {
  if (!isBrowser()) {
    throw new Error("This function can only be called in a browser environment")
  }

  // Get data from localStorage
  const alterEgosJson = localStorage.getItem("alter_egos")
  const categoriesJson = localStorage.getItem("alter_ego_categories")
  const alterEgoCategoryMappingsJson = localStorage.getItem("alter_ego_category_mappings")
  const systemPromptsJson = localStorage.getItem("system_prompts")
  const alterEgoPromptsJson = localStorage.getItem("alter_ego_prompt_relations")
  const chatsJson = localStorage.getItem("alter_ego_chats")
  const chatMessagesJson = localStorage.getItem("alter_ego_chat_messages")

  // Parse data
  const alterEgos: AlterEgo[] = alterEgosJson ? JSON.parse(alterEgosJson) : []
  const categories: Category[] = categoriesJson ? JSON.parse(categoriesJson) : []
  const alterEgoCategoryMappings: AlterEgoCategoryMapping[] = alterEgoCategoryMappingsJson
    ? JSON.parse(alterEgoCategoryMappingsJson)
    : []
  const systemPrompts: SystemPrompt[] = systemPromptsJson ? JSON.parse(systemPromptsJson) : []
  const alterEgoPrompts: AlterEgoPrompt[] = alterEgoPromptsJson ? JSON.parse(alterEgoPromptsJson) : []
  const chats: Chat[] = chatsJson ? JSON.parse(chatsJson) : []
  const chatMessages: ChatMessage[] = chatMessagesJson ? JSON.parse(chatMessagesJson) : []

  return {
    alterEgos,
    categories,
    alterEgoCategoryMappings,
    systemPrompts,
    alterEgoPrompts,
    chats,
    chatMessages,
  }
}

// Function to migrate data from localStorage to Supabase
export async function migrateToSupabase(userId: string): Promise<boolean> {
  try {
    // Export data from localStorage
    const data = await exportLocalStorageData()

    // Create a new Supabase DB instance
    const supabaseDB = new SupabaseDB()

    // Migrate categories
    for (const category of data.categories) {
      // Update user ID to the new Supabase user ID
      const updatedCategory: Category = {
        ...category,
        user_id: userId,
      }

      await supabaseDB.saveCategory(updatedCategory)
    }

    // Migrate alter egos and their category mappings
    for (const alterEgo of data.alterEgos) {
      // Update user ID to the new Supabase user ID
      const updatedAlterEgo: AlterEgo = {
        ...alterEgo,
        user_id: userId,
      }

      // Get category IDs for this alter ego
      const categoryIds = data.alterEgoCategoryMappings
        .filter((mapping) => mapping.alter_ego_id === alterEgo.id)
        .map((mapping) => mapping.category_id)

      await supabaseDB.saveAlterEgo(updatedAlterEgo, categoryIds)
    }

    // Migrate system prompts
    for (const prompt of data.systemPrompts) {
      // Update user ID to the new Supabase user ID
      const updatedPrompt: SystemPrompt = {
        ...prompt,
        user_id: userId,
      }

      await supabaseDB.savePrompt(updatedPrompt)
    }

    // Migrate alter ego prompts
    for (const alterEgoPrompt of data.alterEgoPrompts) {
      // Update user ID to the new Supabase user ID
      const updatedAlterEgoPrompt: AlterEgoPrompt = {
        ...alterEgoPrompt,
        user_id: userId,
      }

      await supabaseDB.saveAlterEgoPrompt(updatedAlterEgoPrompt)
    }

    // Migrate chats and their messages
    for (const chat of data.chats) {
      // Update user ID to the new Supabase user ID
      const updatedChat: Chat = {
        ...chat,
        user_id: userId,
      }

      // Get messages for this chat
      const messages = data.chatMessages
        .filter((message) => message.chat_id === chat.id)
        .map((message) => ({
          ...message,
          user_id: userId,
        }))

      await supabaseDB.saveChat(updatedChat, messages)
    }

    return true
  } catch (error) {
    console.error("Error migrating to Supabase:", error)
    return false
  }
}
