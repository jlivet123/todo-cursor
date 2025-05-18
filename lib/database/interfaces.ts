import type {
  AlterEgo,
  AlterEgoWithCategories,
  Category,
  Chat,
  ChatMessage,
  ChatWithMessages,
  SystemPrompt,
  AlterEgoPrompt,
  User,
} from "./types"

// Base interface for all database operations
export interface DatabaseInterface {
  // User operations
  getUser(id: string): Promise<User | null>
  saveUser(user: User): Promise<User>

  // AlterEgo operations
  getAlterEgos(userId: string): Promise<AlterEgoWithCategories[]>
  getAlterEgoById(id: string): Promise<AlterEgoWithCategories | null>
  saveAlterEgo(alterEgo: AlterEgo, categoryIds: string[]): Promise<AlterEgoWithCategories>
  deleteAlterEgo(id: string): Promise<boolean>

  // Category operations
  getCategories(userId: string): Promise<Category[]>
  saveCategory(category: Category): Promise<Category>
  deleteCategory(id: string): Promise<boolean>
  updateCategoryPositions(categoryIds: string[]): Promise<boolean>
  categoryHasAlterEgos(categoryId: string): Promise<boolean>

  // Chat operations
  getChats(userId: string): Promise<ChatWithMessages[]>
  getChatsByAlterEgoId(alterEgoId: string): Promise<Chat[]>
  getChatById(id: string): Promise<ChatWithMessages | null>
  saveChat(chat: Chat, messages: ChatMessage[]): Promise<ChatWithMessages>
  deleteChat(id: string): Promise<boolean>

  // Prompt operations
  getPrompts(userId: string): Promise<SystemPrompt[]>
  savePrompt(prompt: SystemPrompt): Promise<SystemPrompt>
  getAlterEgoPrompts(alterEgoId: string): Promise<SystemPrompt[]>
  saveAlterEgoPrompt(alterEgoPrompt: AlterEgoPrompt): Promise<AlterEgoPrompt>

  // Chat count operations
  getAlterEgoChatCount(alterEgoId: string): Promise<number>
}
