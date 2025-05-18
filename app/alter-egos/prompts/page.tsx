"use client"

import { Badge } from "@/components/ui/badge"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { PlusCircle, Edit, Trash2, Check } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { getPrompts, savePrompt } from "@/lib/alter-ego-storage"
import type { SystemPrompt } from "@/lib/types"
import { v4 as uuidv4 } from "uuid"

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<SystemPrompt[]>([])
  const [isAddingPrompt, setIsAddingPrompt] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<SystemPrompt | null>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isDefault, setIsDefault] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<string | null>(null)

  useEffect(() => {
    // Load prompts
    const loadedPrompts = getPrompts()
    setPrompts(loadedPrompts)
  }, [])

  const handleAddPrompt = () => {
    setTitle("")
    setContent("")
    setIsDefault(false)
    setIsAddingPrompt(true)
    setEditingPrompt(null)
  }

  const handleEditPrompt = (prompt: SystemPrompt) => {
    setTitle(prompt.name)
    setContent(prompt.content)
    setIsDefault(prompt.is_default)
    setEditingPrompt(prompt)
    setIsAddingPrompt(true)
  }

  const handleSavePrompt = () => {
    if (!title.trim() || !content.trim()) return

    const promptData: Omit<SystemPrompt, 'id' | 'created_at' | 'updated_at'> = {
      name: title,
      content,
      is_default: isDefault,
      description: null,
      user_id: 'local-user-id' // Mock user ID for local storage
    }

    // Save the prompt and get the updated list
    savePrompt({
      ...promptData,
      id: editingPrompt?.id || uuidv4(),
      created_at: editingPrompt?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as SystemPrompt)

    // Refresh the prompts list
    setPrompts(getPrompts())
    
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
      is_default: p.id === id,
    }))

    setPrompts(updatedPrompts)

    // Save all prompts
    updatedPrompts.forEach((p) => savePrompt(p))
  }

  return (
    <AppLayout>
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
                  <h3 className="text-lg font-semibold">{prompt.name}</h3>
                  {prompt.is_default && (
                    <Badge variant="secondary" className="ml-2">
                      Default
                    </Badge>
                  )}
                </div>
                <div className="flex space-x-2">
                  {!prompt.is_default && (
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
              <div className="text-sm text-muted-foreground">
                Created: {new Date(prompt.created_at).toLocaleDateString()}
              </div>
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
    </AppLayout>
  )
}
