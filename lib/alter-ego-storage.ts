import { v4 as uuidv4 } from "uuid"
import type {
  AlterEgo,
  AlterEgoCategory,
  AlterEgoCategoryMapping,
  SystemPrompt,
  Chat,
  ChatMessage,
  AlterEgoPrompt,
  AlterEgoWithCategories,
  ChatWithMessages,
} from "./types"

// Storage keys
const ALTER_EGOS_KEY = "alter_egos"
const ALTER_EGO_CATEGORIES_KEY = "alter_ego_categories"
const ALTER_EGO_CATEGORY_MAPPINGS_KEY = "alter_ego_category_mappings"
const SYSTEM_PROMPTS_KEY = "system_prompts"
const ALTER_EGO_PROMPTS_KEY = "alter_ego_prompt_relations"
const CHATS_KEY = "alter_ego_chats"
const CHAT_MESSAGES_KEY = "alter_ego_chat_messages"

// Mock user ID for local storage (will be replaced with actual user ID in production)
export const MOCK_USER_ID = "local-user-id"

// Helper function to check if we're in a browser environment
const isBrowser = () => typeof window !== "undefined"

// Default categories
const DEFAULT_CATEGORIES: AlterEgoCategory[] = [
  {
    id: "all",
    name: "All",
    description: null,
    position: 0, // All is always first
    created_at: new Date().toISOString(),
    user_id: MOCK_USER_ID,
  },
  {
    id: "leaders",
    name: "Leaders",
    description: null,
    position: 1,
    created_at: new Date().toISOString(),
    user_id: MOCK_USER_ID,
  },
  {
    id: "thinkers",
    name: "Thinkers",
    description: null,
    position: 2,
    created_at: new Date().toISOString(),
    user_id: MOCK_USER_ID,
  },
  {
    id: "artists",
    name: "Artists",
    description: null,
    position: 3,
    created_at: new Date().toISOString(),
    user_id: MOCK_USER_ID,
  },
  {
    id: "scientists",
    name: "Scientists",
    description: null,
    position: 4,
    created_at: new Date().toISOString(),
    user_id: MOCK_USER_ID,
  },
  {
    id: "entrepreneurs",
    name: "Entrepreneurs",
    description: null,
    position: 5,
    created_at: new Date().toISOString(),
    user_id: MOCK_USER_ID,
  },
]

// Default prompts
const DEFAULT_PROMPTS: SystemPrompt[] = [
  {
    id: uuidv4(),
    name: "Wisdom Sharing",
    description: "Default prompt for wisdom sharing",
    content: `I want you to become {name}. I'm going to have a conversation with you and I want you to answer in short 1-3 sentence answers as if you are {name}. I want you to speak like they would, with the same wording and patterns. I also want you to use your vast knowledge of {name} and sprinkle in examples from their life that could be words of wisdom based on the problem or limiting belief I'm having. Please give specific examples from their past. I'm going to ask a series of questions or comments and then I want you to reply as if you are {name}. Please stay productive and positive and try to show examples of how you have had a similar experience and how you overcame it.`,
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: MOCK_USER_ID,
  },
  {
    id: uuidv4(),
    name: "Life Coach",
    description: "Prompt for life coaching",
    content: `You are now embodying {name}. Your responses should reflect their unique perspective, life experiences, and communication style. Draw from {name}'s biography, known quotes, values, and approach to challenges. Keep responses concise (1-3 sentences) and authentic to how {name} would speak. When I share a problem or question, offer wisdom and practical advice as {name} would, referencing relevant experiences from their life. Maintain a supportive, encouraging tone while staying true to {name}'s character.`,
    is_default: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: MOCK_USER_ID,
  },
]

// Get all alter egos with their categories
export function getAlterEgos(userId: string): AlterEgoWithCategories[] {
  if (!isBrowser()) return []

  try {
    // Get alter egos
    const alterEgosStr = localStorage.getItem(ALTER_EGOS_KEY)
    const alterEgos = (alterEgosStr ? JSON.parse(alterEgosStr) : [])
      .filter((ego: AlterEgo) => ego.user_id === userId)

    // Get category mappings
    const mappingsStr = localStorage.getItem(ALTER_EGO_CATEGORY_MAPPINGS_KEY)
    const mappings = mappingsStr ? JSON.parse(mappingsStr) : []

    // Get categories
    const categoriesStr = localStorage.getItem(ALTER_EGO_CATEGORIES_KEY)
    const categories = (categoriesStr ? JSON.parse(categoriesStr) : [])
      .filter((cat: AlterEgoCategory) => cat.user_id === userId)

    // Return alter egos with their categories
    return alterEgos.map((ego: AlterEgo) => ({
      ...ego,
      categories: mappings
        .filter((m: AlterEgoCategoryMapping) => m.alter_ego_id === ego.id)
        .map((m: AlterEgoCategoryMapping) =>
          categories.find((c: AlterEgoCategory) => c.id === m.category_id)
        )
        .filter(Boolean),
    })) as AlterEgoWithCategories[]
  } catch (error) {
    console.error('Error getting alter egos:', error)
    return []
  }
}

// Check if a category has any alter egos
export function categoryHasAlterEgos(categoryId: string): boolean {
  if (!isBrowser()) return false

  try {
    const alterEgoCategoryMappingsJson = localStorage.getItem(ALTER_EGO_CATEGORY_MAPPINGS_KEY)
    const alterEgoCategoryMappings: AlterEgoCategoryMapping[] = alterEgoCategoryMappingsJson
      ? JSON.parse(alterEgoCategoryMappingsJson)
      : []

    // Check if any mapping exists for this category
    return alterEgoCategoryMappings.some((mapping) => mapping.category_id === categoryId)
  } catch (error) {
    console.error("Error checking if category has alter egos:", error)
    return false
  }
}

// Delete a category
export function deleteCategory(categoryId: string): boolean {
  if (!isBrowser()) return false

  try {
    // Don't allow deleting the "All" category
    if (categoryId === "all") {
      return false
    }

    // Check if the category has any alter egos
    if (categoryHasAlterEgos(categoryId)) {
      return false
    }

    // Get existing categories
    const categoriesJson = localStorage.getItem(ALTER_EGO_CATEGORIES_KEY)
    const categories: AlterEgoCategory[] = categoriesJson ? JSON.parse(categoriesJson) : []

    // Find the category to delete
    const categoryToDelete = categories.find((cat) => cat.id === categoryId)
    if (!categoryToDelete) return false

    // Filter out the category to delete
    const updatedCategories = categories.filter((category) => category.id !== categoryId)

    // Update positions for categories after the deleted one
    updatedCategories.forEach((category) => {
      if (category.position > categoryToDelete.position) {
        category.position -= 1
      }
    })

    // Save the updated categories
    localStorage.setItem(ALTER_EGO_CATEGORIES_KEY, JSON.stringify(updatedCategories))

    return true
  } catch (error) {
    console.error("Error deleting category:", error)
    return false
  }
}

// Update category positions
export function updateCategoryPositions(categoryIds: string[]): boolean {
  if (!isBrowser()) return false

  try {
    // Get existing categories
    const categoriesJson = localStorage.getItem(ALTER_EGO_CATEGORIES_KEY)
    const categories: AlterEgoCategory[] = categoriesJson ? JSON.parse(categoriesJson) : []

    // Make sure "all" is always first
    const allIndex = categoryIds.indexOf("all")
    if (allIndex > 0) {
      // Move "all" to the beginning
      categoryIds.splice(allIndex, 1)
      categoryIds.unshift("all")
    }

    // Update positions based on the new order
    const updatedCategories = categories.map((category) => {
      const newIndex = categoryIds.indexOf(category.id)
      if (newIndex !== -1) {
        return {
          ...category,
          position: newIndex,
        }
      }
      return category
    })

    // Save the updated categories
    localStorage.setItem(ALTER_EGO_CATEGORIES_KEY, JSON.stringify(updatedCategories))

    return true
  } catch (error) {
    console.error("Error updating category positions:", error)
    return false
  }
}

// Get alter ego by ID with its categories
export function getAlterEgoById(id: string): AlterEgoWithCategories | null {
  const alterEgos = getAlterEgos()
  return alterEgos.find((ego) => ego.id === id) || null
}

// Save alter ego with its categories
export function saveAlterEgo(alterEgo: AlterEgo, categoryIds: string[]): void {
  if (!isBrowser()) return

  try {
    // Get existing data
    const alterEgosJson = localStorage.getItem(ALTER_EGOS_KEY)
    const alterEgos: AlterEgo[] = alterEgosJson ? JSON.parse(alterEgosJson) : []

    const alterEgoCategoryMappingsJson = localStorage.getItem(ALTER_EGO_CATEGORY_MAPPINGS_KEY)
    const alterEgoCategoryMappings: AlterEgoCategoryMapping[] = alterEgoCategoryMappingsJson
      ? JSON.parse(alterEgoCategoryMappingsJson)
      : []

    // Update or add the alter ego
    const index = alterEgos.findIndex((ego) => ego.id === alterEgo.id)
    if (index !== -1) {
      alterEgos[index] = alterEgo
    } else {
      alterEgos.push(alterEgo)
    }

    // Remove existing category mappings for this alter ego
    const filteredMappings = alterEgoCategoryMappings.filter((mapping) => mapping.alter_ego_id !== alterEgo.id)

    // Add new category mappings
    const newMappings = categoryIds.map((categoryId) => ({
      id: uuidv4(),
      alter_ego_id: alterEgo.id,
      category_id: categoryId,
      created_at: new Date().toISOString(),
      user_id: alterEgo.user_id,
    }))

    const updatedMappings = [...filteredMappings, ...newMappings]

    // Save to localStorage
    localStorage.setItem(ALTER_EGOS_KEY, JSON.stringify(alterEgos))
    localStorage.setItem(ALTER_EGO_CATEGORY_MAPPINGS_KEY, JSON.stringify(updatedMappings))
  } catch (error) {
    console.error("Error saving alter ego:", error)
  }
}

// Delete alter ego and its relations
export function deleteAlterEgo(id: string): void {
  if (!isBrowser()) return

  try {
    // Get existing data
    const alterEgosJson = localStorage.getItem(ALTER_EGOS_KEY)
    const alterEgos: AlterEgo[] = alterEgosJson ? JSON.parse(alterEgosJson) : []

    const alterEgoCategoryMappingsJson = localStorage.getItem(ALTER_EGO_CATEGORY_MAPPINGS_KEY)
    const alterEgoCategoryMappings: AlterEgoCategoryMapping[] = alterEgoCategoryMappingsJson
      ? JSON.parse(alterEgoCategoryMappingsJson)
      : []

    const alterEgoPromptsJson = localStorage.getItem(ALTER_EGO_PROMPTS_KEY)
    const alterEgoPrompts: AlterEgoPrompt[] = alterEgoPromptsJson ? JSON.parse(alterEgoPromptsJson) : []

    // Remove the alter ego and its relations
    const updatedAlterEgos = alterEgos.filter((ego) => ego.id !== id)
    const updatedCategoryMappings = alterEgoCategoryMappings.filter((mapping) => mapping.alter_ego_id !== id)
    const updatedPromptRelations = alterEgoPrompts.filter((relation) => relation.alter_ego_id !== id)

    // Save to localStorage
    localStorage.setItem(ALTER_EGOS_KEY, JSON.stringify(updatedAlterEgos))
    localStorage.setItem(ALTER_EGO_CATEGORY_MAPPINGS_KEY, JSON.stringify(updatedCategoryMappings))
    localStorage.setItem(ALTER_EGO_PROMPTS_KEY, JSON.stringify(updatedPromptRelations))
  } catch (error) {
    console.error("Error deleting alter ego:", error)
  }
}

// Get all categories
export function getCategories(): AlterEgoCategory[] {
  if (!isBrowser()) return DEFAULT_CATEGORIES

  try {
    const json = localStorage.getItem(ALTER_EGO_CATEGORIES_KEY)
    if (!json) {
      // Initialize with default categories
      localStorage.setItem(ALTER_EGO_CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES))
      return DEFAULT_CATEGORIES
    }

    // Parse and sort by position
    const categories: AlterEgoCategory[] = JSON.parse(json)
    return categories.sort((a, b) => a.position - b.position)
  } catch (error) {
    console.error("Error getting categories:", error)
    return DEFAULT_CATEGORIES
  }
}

// Save category
export function saveCategory(category: AlterEgoCategory): void {
  if (!isBrowser()) return

  try {
    const categories = getCategories()
    const index = categories.findIndex((cat) => cat.id === category.id)

    if (index !== -1) {
      // Update existing
      categories[index] = category
    } else {
      // Add new - set position to the end
      const maxPosition = categories.reduce((max, cat) => Math.max(max, cat.position), -1)
      category.position = maxPosition + 1
      categories.push(category)
    }

    localStorage.setItem(ALTER_EGO_CATEGORIES_KEY, JSON.stringify(categories))
  } catch (error) {
    console.error("Error saving category:", error)
  }
}

// Get all prompts
export function getPrompts(): SystemPrompt[] {
  if (!isBrowser()) return DEFAULT_PROMPTS

  try {
    const json = localStorage.getItem(SYSTEM_PROMPTS_KEY)
    if (!json) {
      // Initialize with default prompts
      localStorage.setItem(SYSTEM_PROMPTS_KEY, JSON.stringify(DEFAULT_PROMPTS))
      return DEFAULT_PROMPTS
    }
    return JSON.parse(json)
  } catch (error) {
    console.error("Error getting prompts:", error)
    return DEFAULT_PROMPTS
  }
}

// Save prompt
export function savePrompt(prompt: SystemPrompt): void {
  if (!isBrowser()) return

  try {
    const prompts = getPrompts()
    const index = prompts.findIndex((p) => p.id === prompt.id)

    if (index !== -1) {
      // Update existing
      prompts[index] = prompt
    } else {
      // Add new
      prompts.push(prompt)
    }

    localStorage.setItem(SYSTEM_PROMPTS_KEY, JSON.stringify(prompts))
  } catch (error) {
    console.error("Error saving prompt:", error)
  }
}

// Get all chats with their messages
export function getChats(): ChatWithMessages[] {
  if (!isBrowser()) return []

  try {
    const chatsJson = localStorage.getItem(CHATS_KEY)
    const chats: Chat[] = chatsJson ? JSON.parse(chatsJson) : []

    const messagesJson = localStorage.getItem(CHAT_MESSAGES_KEY)
    const messages: ChatMessage[] = messagesJson ? JSON.parse(messagesJson) : []

    const alterEgos = getAlterEgos()

    // Join chats with their messages and alter ego
    return chats.map((chat) => {
      const chatMessages = messages
        .filter((message) => message.chat_id === chat.id)
        .sort((a, b) => a.message_order - b.message_order)

      const alterEgo = alterEgos.find((ego) => ego.id === chat.alter_ego_id)

      return {
        ...chat,
        messages: chatMessages,
        alter_ego: alterEgo || {
          id: chat.alter_ego_id,
          name: "Unknown",
          description: null,
          superpower: null,
          bio: null,
          image_url: null,
          quote: null,
          era: null,
          achievements: null,
          challenges_overcome: null,
          values: null,
          learning_resources: null,
          voice_style: null,
          context_settings: null,
          created_at: chat.created_at,
          updated_at: chat.updated_at,
          user_id: chat.user_id,
          categories: [],
        },
      }
    })
  } catch (error) {
    console.error("Error getting chats:", error)
    return []
  }
}

// Save chat and its messages
export function saveChat(chat: Chat, messages: ChatMessage[]): void {
  if (!isBrowser()) return

  try {
    // Validate inputs
    if (!chat) {
      throw new Error("Chat object is required")
    }

    if (!Array.isArray(messages)) {
      throw new Error("Messages must be an array")
    }

    // Get existing data
    const chatsJson = localStorage.getItem(CHATS_KEY)
    const chats: Chat[] = chatsJson ? JSON.parse(chatsJson) : []

    const messagesJson = localStorage.getItem(CHAT_MESSAGES_KEY)
    const existingMessages: ChatMessage[] = messagesJson ? JSON.parse(messagesJson) : []

    // Update or add the chat
    const chatIndex = chats.findIndex((c) => c.id === chat.id)
    if (chatIndex !== -1) {
      chats[chatIndex] = chat
    } else {
      chats.push(chat)
    }

    // Remove existing messages for this chat
    const filteredMessages = existingMessages.filter((message) => message.chat_id !== chat.id)

    // Add the new messages
    const updatedMessages = [...filteredMessages, ...messages]

    // Save to localStorage
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats))
    localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(updatedMessages))
  } catch (error) {
    console.error("Error saving chat:", error)
  }
}

// Delete chat and its messages
export function deleteChat(id: string): void {
  if (!isBrowser()) return

  try {
    // Get existing data
    const chatsJson = localStorage.getItem(CHATS_KEY)
    const chats: Chat[] = chatsJson ? JSON.parse(chatsJson) : []

    const messagesJson = localStorage.getItem(CHAT_MESSAGES_KEY)
    const messages: ChatMessage[] = messagesJson ? JSON.parse(messagesJson) : []

    // Remove the chat and its messages
    const updatedChats = chats.filter((chat) => chat.id !== id)
    const updatedMessages = messages.filter((message) => message.chat_id !== id)

    // Save to localStorage
    localStorage.setItem(CHATS_KEY, JSON.stringify(updatedChats))
    localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(updatedMessages))
  } catch (error) {
    console.error("Error deleting chat:", error)
  }
}

// Get alter ego prompts
export function getAlterEgoPrompts(alterEgoId: string): SystemPrompt[] {
  if (!isBrowser()) return []

  try {
    const alterEgoPromptsJson = localStorage.getItem(ALTER_EGO_PROMPTS_KEY)
    const alterEgoPrompts: AlterEgoPrompt[] = alterEgoPromptsJson ? JSON.parse(alterEgoPromptsJson) : []

    const promptsJson = localStorage.getItem(SYSTEM_PROMPTS_KEY)
    const prompts: SystemPrompt[] = promptsJson ? JSON.parse(promptsJson) : []

    // Get prompt IDs for this alter ego
    const promptIds = alterEgoPrompts
      .filter((relation) => relation.alter_ego_id === alterEgoId)
      .map((relation) => relation.prompt_id)

    // Return the prompts
    return prompts.filter((prompt) => promptIds.includes(prompt.id))
  } catch (error) {
    console.error("Error getting alter ego prompts:", error)
    return []
  }
}

// Save alter ego prompt relation
export function saveAlterEgoPrompt(alterEgoPrompt: AlterEgoPrompt): void {
  if (!isBrowser()) return

  try {
    const alterEgoPromptsJson = localStorage.getItem(ALTER_EGO_PROMPTS_KEY)
    const alterEgoPrompts: AlterEgoPrompt[] = alterEgoPromptsJson ? JSON.parse(alterEgoPromptsJson) : []

    const index = alterEgoPrompts.findIndex(
      (relation) =>
        relation.alter_ego_id === alterEgoPrompt.alter_ego_id && relation.prompt_id === alterEgoPrompt.prompt_id,
    )

    if (index !== -1) {
      // Update existing
      alterEgoPrompts[index] = alterEgoPrompt
    } else {
      // Add new
      alterEgoPrompts.push(alterEgoPrompt)
    }

    localStorage.setItem(ALTER_EGO_PROMPTS_KEY, JSON.stringify(alterEgoPrompts))
  } catch (error) {
    console.error("Error saving alter ego prompt relation:", error)
  }
}

// Get the number of chats for a specific alter ego
export function getAlterEgoChatCount(alterEgoId: string): number {
  if (!isBrowser()) return 0

  try {
    const chatsJson = localStorage.getItem(CHATS_KEY)
    const chats: Chat[] = chatsJson ? JSON.parse(chatsJson) : []

    // Count chats for this alter ego
    return chats.filter((chat) => chat.alter_ego_id === alterEgoId).length
  } catch (error) {
    console.error("Error getting chat count:", error)
    return 0
  }
}
