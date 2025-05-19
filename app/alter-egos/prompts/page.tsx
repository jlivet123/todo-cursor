"use client"

import { Badge } from "@/components/ui/badge"

import { useState, useEffect } from "react"
import { PageLayout } from "@/components/page-layout"
import { Button } from "@/components/ui/button"
import { PlusCircle, Edit, Trash2, Check } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { getPrompts, savePrompt } from "@/lib/alter-ego-storage"
import type { Prompt, SystemPrompt } from "@/lib/types"
import { v4 as uuidv4 } from "uuid"

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [isAddingPrompt, setIsAddingPrompt] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isDefault, setIsDefault] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<string | null>(null)

  useEffect(() => {
    // Load prompts and convert from SystemPrompt to Prompt format
    const systemPrompts = getPrompts()
    const convertedPrompts: Prompt[] = systemPrompts.map(p => ({
      id: p.id,
      title: p.name,
      content: p.content,
      isDefault: p.is_default,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }))
    setPrompts(convertedPrompts)
  }, [])

  const handleAddPrompt = () => {
    setTitle("")
    setContent("")
    setIsDefault(false)
    setIsAddingPrompt(true)
    setEditingPrompt(null)
  }

  const handleEditPrompt = (prompt: Prompt) => {
    setTitle(prompt.title)
    setContent(prompt.content)
    setIsDefault(prompt.isDefault)
    setEditingPrompt(prompt)
    setIsAddingPrompt(true)
  }

  const handleSavePrompt = () => {
    if (!title.trim() || !content.trim()) return

    const newPrompt: Prompt = {
      id: editingPrompt?.id || uuidv4(),
      title,
      content,
      isDefault,
      createdAt: editingPrompt?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Convert to SystemPrompt format for storage
    const systemPrompt: SystemPrompt = {
      id: newPrompt.id,
      name: newPrompt.title,
      description: null,
      content: newPrompt.content,
      is_default: newPrompt.isDefault,
      created_at: newPrompt.createdAt,
      updated_at: newPrompt.updatedAt,
      user_id: 'local-user-id'
    }

    if (isDefault) {
      const updatedPrompts = prompts.map((p) => ({
        ...p,
        isDefault: p.id === newPrompt.id,
      }))
      setPrompts(updatedPrompts)

      // Save all prompts
      updatedPrompts.forEach((p) => {
        const systemPromptToSave: SystemPrompt = {
          id: p.id,
          name: p.title,
          description: null,
          content: p.content,
          is_default: p.isDefault,
          created_at: p.createdAt,
          updated_at: p.updatedAt,
          user_id: 'local-user-id'
        }
        savePrompt(systemPromptToSave)
      })
    } else {
      // Just save this prompt
      savePrompt(systemPrompt)

      // Update local state
      setPrompts((prev) => {
        const index = prev.findIndex((p) => p.id === newPrompt.id)
        if (index !== -1) {
          const updated = [...prev]
          updated[index] = newPrompt
          return updated
        }
        return [...prev, newPrompt]
      })
    }

    setIsAddingPrompt(false)
    setEditingPrompt(null)
  }

  const handleDeletePrompt = (id: string) => {
    const updatedPrompts = prompts.filter((p) => p.id !== id)
    setPrompts(updatedPrompts)

    // In a real app, you would delete from storage here
    // For now, we'll just update the local state

    setIsConfirmingDelete(null)
  }

  const handleSetDefault = (id: string) => {
    const updatedPrompts = prompts.map((p) => ({
      ...p,
      isDefault: p.id === id,
    }))

    setPrompts(updatedPrompts)

    // Save all prompts
    updatedPrompts.forEach((p) => {
      const systemPromptToSave: SystemPrompt = {
        id: p.id,
        name: p.title,
        description: null,
        content: p.content,
        is_default: p.isDefault,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
        user_id: 'local-user-id'
      }
      savePrompt(systemPromptToSave)
    })
  }

  return (
    <PageLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Prompt Templates</h1>
          <Button onClick={handleAddPrompt} className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Add Prompt
          </Button>
        </div>

        <div className="space-y-4">
          {prompts.map((prompt) => (
            <div key={prompt.id} className="border rounded-lg p-4 bg-card">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{prompt.title}</h3>
                  {prompt.isDefault && (
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                      Default
                    </Badge>
                  )}
                </div>
                <div className="flex space-x-2">
                  {!prompt.isDefault && (
                    <Button variant="outline" size="sm" onClick={() => handleSetDefault(prompt.id)} className="text-xs">
                      <Check className="h-3 w-3 mr-1" />
                      Set as Default
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditPrompt(prompt)}>
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setIsConfirmingDelete(prompt.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </div>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">{prompt.content}</div>
            </div>
          ))}

          {prompts.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">No prompts yet. Add one to get started.</div>
          )}
        </div>
      </div>

      {/* Add/Edit Prompt Dialog */}
      <Dialog open={isAddingPrompt} onOpenChange={setIsAddingPrompt}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingPrompt ? "Edit Prompt" : "Add New Prompt"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Wisdom Sharing"
                required
              />
            </div>

            <div>
              <Label htmlFor="content">Prompt Template</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter your prompt template..."
                rows={10}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use {"{name}"} as a placeholder for the alter ego's name.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isDefault"
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked === true)}
              />
              <Label htmlFor="isDefault">Set as default prompt</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingPrompt(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePrompt}>{editingPrompt ? "Update" : "Create"} Prompt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!isConfirmingDelete} onOpenChange={() => setIsConfirmingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Prompt?</DialogTitle>
          </DialogHeader>
          <p className="py-4">Are you sure you want to delete this prompt? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmingDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => isConfirmingDelete && handleDeletePrompt(isConfirmingDelete)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}