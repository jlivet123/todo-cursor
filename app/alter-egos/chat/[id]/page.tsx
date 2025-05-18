"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Send, Settings } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { getAlterEgoById, getPrompts, saveChat, getChats, MOCK_USER_ID } from "@/lib/alter-ego-storage"
import type { AlterEgo, ChatMessage, Chat } from "@/lib/types"
import { v4 as uuidv4 } from "uuid"
import { HelperText } from "@/components/helper-text"

// Helper component for chat guidance content
function ChatGuidanceContent() {
  return (
    <div className="space-y-6">
      <p>
        This is your personal space to connect with wisdom from one of history's most inspiring figures. Ask questions,
        share challenges, or seek guidance as if you were speaking directly with them.
      </p>

      <div>
        <h4 className="font-medium mb-2">Try Questions Like These:</h4>
        <div className="space-y-4">
          <div>
            <p className="font-medium text-sm">For personal challenges:</p>
            <p className="italic text-sm mt-1 pl-4 border-l-2 border-muted-foreground/30">
              "Marie Curie, I often doubt my abilities when facing difficult problems. How did you maintain confidence
              in your research despite skepticism?"
            </p>
          </div>

          <div>
            <p className="font-medium text-sm">For career guidance:</p>
            <p className="italic text-sm mt-1 pl-4 border-l-2 border-muted-foreground/30">
              "Steve Jobs, I'm at a crossroads in my career. How did you know when to take risks versus play it safe?"
            </p>
          </div>

          <div>
            <p className="font-medium text-sm">For life philosophy:</p>
            <p className="italic text-sm mt-1 pl-4 border-l-2 border-muted-foreground/30">
              "Aristotle, how do you define a meaningful life in today's world of constant distraction?"
            </p>
          </div>

          <div>
            <p className="font-medium text-sm">For creative inspiration:</p>
            <p className="italic text-sm mt-1 pl-4 border-l-2 border-muted-foreground/30">
              "Frida Kahlo, I feel blocked creatively. How did you transform your pain into such powerful artistic
              expression?"
            </p>
          </div>

          <div>
            <p className="font-medium text-sm">For leadership advice:</p>
            <p className="italic text-sm mt-1 pl-4 border-l-2 border-muted-foreground/30">
              "Gandhi, I need to lead my team through a difficult transition. How can I inspire them while staying true
              to my values?"
            </p>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-2">Real Conversations, Timeless Wisdom</h4>
        <p className="mb-2">
          When you chat with your alter ego, they'll respond with the unique perspective, tone, and wisdom of the actual
          historical figure:
        </p>

        <div className="bg-muted p-3 rounded-md mb-4">
          <p className="font-medium text-sm">
            "Martin Luther King Jr., how do you stay hopeful when change seems impossible?"
          </p>
          <p className="mt-2 text-sm">
            "My friend, hope is not blind optimism. During our darkest days in Birmingham, I saw hatred in its rawest
            form. But I also witnessed ordinary people standing extraordinarily tall. Remember that the arc of the moral
            universe is long, but it bends toward justice. Your small acts of courage today are tomorrow's foundation
            for change."
          </p>
        </div>

        <div className="bg-muted p-3 rounded-md">
          <p className="font-medium text-sm">
            "Eleanor Roosevelt, I struggle with worrying about others' opinions. How did you overcome this?"
          </p>
          <p className="mt-2 text-sm">
            "No one can make you feel inferior without your consent. When I first entered public life, criticism stung
            deeply. But I learned that those who mind don't matter, and those who matter don't mind. Focus your energy
            not on what others think, but on what your conscience knows to be right."
          </p>
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-2">Make the Most of Your Conversation</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Be specific about your situation for more personalized guidance</li>
          <li>Ask follow-up questions to explore topics more deeply</li>
          <li>Share your challenges honestly – vulnerability leads to meaningful insights</li>
          <li>Save important insights to revisit when you need them most</li>
        </ul>
      </div>

      <p>
        Your conversation history is saved, allowing you to build an ongoing relationship with your alter ego and
        revisit their wisdom whenever you need guidance or inspiration.
      </p>
      <p className="font-medium">
        Type your message below to begin your conversation with wisdom that has stood the test of time.
      </p>
    </div>
  )
}

export default function AlterEgoChatPage() {
  const params = useParams()
  const router = useRouter()
  const [alterEgo, setAlterEgo] = useState<AlterEgo | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null)
  const [customPrompt, setCustomPrompt] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [chat, setChat] = useState<Chat | null>(null)

  // Load alter ego and chat history
  useEffect(() => {
    if (params.id) {
      const id = Array.isArray(params.id) ? params.id[0] : params.id
      const ego = getAlterEgoById(id)

      if (ego) {
        setAlterEgo(ego)

        // Check for existing chat sessions
        const chats = getChats()
        const existingChat = chats.find((chat) => chat.alter_ego_id === id)

        if (existingChat) {
          setChat(existingChat)
          setMessages(existingChat.messages || [])
        } else {
          // Create a new chat session
          const newChat: Chat = {
            id: uuidv4(),
            alter_ego_id: id,
            title: `Chat with ${ego.name}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            user_id: MOCK_USER_ID,
          }
          setChat(newChat)
        }

        // Set default prompt
        const prompts = getPrompts()
        const defaultPrompt = prompts.find((p) => p.is_default)
        if (defaultPrompt) {
          setSelectedPrompt(defaultPrompt.id)
        }
      } else {
        // Alter ego not found, redirect back
        router.push("/alter-egos")
      }
    }
  }, [params.id, router])

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim() || !alterEgo || !chat) return

    // Add user message
    const userMessage: ChatMessage = {
      id: uuidv4(),
      chat_id: chat.id,
      role: "user",
      content: input,
      created_at: new Date().toISOString(),
      message_order: messages.length,
      user_id: MOCK_USER_ID,
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput("")
    setIsLoading(true)

    // In a real app, you would call the ChatGPT API here
    // For now, we'll simulate a response
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        chat_id: chat.id,
        role: "assistant",
        content: simulateResponse(input, alterEgo),
        created_at: new Date().toISOString(),
        message_order: updatedMessages.length,
        user_id: MOCK_USER_ID,
      }

      const newMessages = [...updatedMessages, assistantMessage]
      setMessages(newMessages)
      setIsLoading(false)

      // Update chat session
      const updatedChat = {
        ...chat,
        updated_at: new Date().toISOString(),
      }
      setChat(updatedChat)

      // Save chat with messages
      try {
        saveChat(updatedChat, newMessages)
      } catch (error) {
        console.error("Error saving chat:", error)
      }
    }, 1500)
  }

  // Simple response simulation
  const simulateResponse = (input: string, ego: AlterEgo): string => {
    const responses = [
      `As ${ego.name}, I would say that the path to true wisdom comes through perseverance.`,
      `In my experience, the challenges you face are opportunities for growth.`,
      `I believe that every person has the capacity for greatness within them.`,
      `When I faced similar situations, I found strength in staying true to my values.`,
      `Remember that your actions today will shape the legacy you leave behind.`,
    ]
    return responses[Math.floor(Math.random() * responses.length)]
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!alterEgo) {
    return (
      <AppLayout>
        <div className="container mx-auto py-8 px-4 text-center">Loading...</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* Chat header */}
        <div className="border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/alter-egos")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted overflow-hidden">
                {alterEgo.image_url ? (
                  <img
                    src={alterEgo.image_url || "/placeholder.svg"}
                    alt={alterEgo.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-slate-700 to-slate-900" />
                )}
              </div>
              <div className="flex items-center">
                <h2 className="font-semibold">{alterEgo.name}</h2>
                <HelperText title={`Chat with ${alterEgo.name}`} content={<ChatGuidanceContent />} />
              </div>
              <p className="text-xs text-muted-foreground">{alterEgo.superpower}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="max-w-md space-y-4">
                <h3 className="text-xl font-semibold">Start chatting with {alterEgo.name}</h3>
                <p className="text-muted-foreground">
                  Ask questions, seek advice, or discuss challenges. {alterEgo.name} will respond based on their life
                  experiences and wisdom.
                </p>
                <div className="grid grid-cols-1 gap-2 mt-4">
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => setInput("What's your greatest life lesson?")}
                  >
                    What's your greatest life lesson?
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => setInput("How did you overcome your biggest challenge?")}
                  >
                    How did you overcome your biggest challenge?
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => setInput("What advice would you give to someone feeling stuck?")}
                  >
                    What advice would you give to someone feeling stuck?
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask ${alterEgo.name} something...`}
              className="min-h-[60px] resize-none"
              disabled={isLoading}
            />
            <Button className="self-end" size="icon" onClick={handleSendMessage} disabled={!input.trim() || isLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chat Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Select Prompt Template</h3>
              <select
                className="w-full p-2 border rounded-md"
                value={selectedPrompt || ""}
                onChange={(e) => setSelectedPrompt(e.target.value)}
              >
                <option value="">Select a prompt</option>
                {getPrompts().map((prompt) => (
                  <option key={prompt.id} value={prompt.id}>
                    {prompt.name}
                  </option>
                ))}
                <option value="custom">Custom Prompt</option>
              </select>
            </div>

            {selectedPrompt === "custom" && (
              <div>
                <h3 className="text-sm font-medium mb-2">Custom Prompt</h3>
                <Textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Enter your custom prompt..."
                  rows={6}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsSettingsOpen(false)}>Save Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
