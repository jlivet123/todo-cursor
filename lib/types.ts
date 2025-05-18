export interface User {
  id: string
  email?: string
}

export interface AlterEgo {
  id: string
  name: string
  description: string | null
  superpower: string | null
  bio: string | null
  image_url: string | null
  quote: string | null
  era: string | null
  achievements: string | null
  challenges_overcome: string | null
  values: string | null
  learning_resources: string | null
  voice_style: string | null
  context_settings: string | null
  created_at: string
  updated_at: string
  user_id: string
}

export interface Category {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface AlterEgoCategory {
  id: string
  name: string
  description: string | null
  position: number
  created_at: string
  user_id: string
}

export interface AlterEgoCategoryMapping {
  id: string
  alter_ego_id: string
  category_id: string
  created_at: string
  user_id: string
}

export interface ChatSession {
  id: string
  alterEgoId: string
  title: string | null
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

export interface Chat {
  id: string
  alter_ego_id: string
  title: string | null
  created_at: string
  updated_at: string
  user_id: string
}

export interface ChatMessage {
  id: string
  chat_id: string
  role: "system" | "user" | "assistant"
  content: string
  created_at: string
  message_order: number
  user_id: string
}

export interface SystemPrompt {
  id: string
  name: string
  description: string | null
  content: string
  is_default: boolean
  created_at: string
  updated_at: string
  user_id: string
}

export interface Prompt {
  id: string
  title: string
  content: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface AlterEgoPrompt {
  id: string
  alter_ego_id: string
  prompt_id: string
  is_primary: boolean
  created_at: string
  user_id: string
}

export interface AlterEgoWithCategories extends AlterEgo {
  categories: AlterEgoCategory[]
}

export interface ChatWithMessages extends Chat {
  messages: ChatMessage[]
  alter_ego: AlterEgo
}

export interface AlterEgoFormData {
  name: string
  description: string | null
  superpower: string | null
  bio: string | null
  image_url: string | null
  quote: string | null
  era: string | null
  achievements: string | null
  challenges_overcome: string | null
  values: string | null
  learning_resources: string | null
  voice_style: string | null
  context_settings: string | null
  category_ids: string[]
}
