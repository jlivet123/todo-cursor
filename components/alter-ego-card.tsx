"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlterEgoForm } from "@/components/alter-ego-form"
import { MessageCircle, Edit, Trash2, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { getAlterEgoChatCount } from "@/lib/alter-ego-storage"
import type { AlterEgoWithCategories } from "@/lib/types"

interface AlterEgoCardProps {
  alterEgo: AlterEgoWithCategories
  onDelete: (id: string) => void
  onUpdate: (alterEgo: AlterEgoWithCategories) => void
}

export function AlterEgoCard({ alterEgo, onDelete, onUpdate }: AlterEgoCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const router = useRouter()

  // Get the chat count for this alter ego
  const chatCount = getAlterEgoChatCount(alterEgo.id)

  const handleStartChat = () => {
    router.push(`/alter-egos/chat/${alterEgo.id}`)
  }

  const handleDelete = () => {
    onDelete(alterEgo.id)
    setIsConfirmingDelete(false)
  }

  return (
    <>
      <Card className="overflow-hidden flex flex-col h-full relative">
        {/* Chat count badge */}
        {chatCount > 0 && (
          <div className="absolute top-2 right-2 z-10">
            <Badge variant="secondary" className="flex items-center gap-1 bg-primary/10">
              <MessageCircle className="h-3 w-3" />
              <span>{chatCount}</span>
            </Badge>
          </div>
        )}

        <div className="relative h-40 bg-muted">
          {alterEgo.image_url ? (
            <img
              src={alterEgo.image_url || "/placeholder.svg"}
              alt={alterEgo.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900">
              <User className="h-16 w-16 text-slate-400" />
            </div>
          )}
        </div>

        <CardHeader className="pb-2 pt-3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold leading-tight">{alterEgo.name}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{alterEgo.superpower}</p>
              {alterEgo.era && <p className="text-xs text-muted-foreground mt-0.5">Era: {alterEgo.era}</p>}
            </div>
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsEditing(true)
                }}
              >
                <Edit className="h-3.5 w-3.5" />
                <span className="sr-only">Edit</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsConfirmingDelete(true)
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="py-0 px-6 flex-1">
          <div className="flex flex-wrap gap-1 mb-3">
            {alterEgo.categories.map((category) => (
              <Badge key={category.id} variant="secondary" className="text-xs">
                {category.name}
              </Badge>
            ))}
          </div>
          {alterEgo.description && <p className="text-sm text-muted-foreground line-clamp-3">{alterEgo.description}</p>}
        </CardContent>

        <CardFooter className="border-t pt-3 pb-3">
          <Button className="w-full flex items-center gap-2 h-8 text-sm" onClick={handleStartChat}>
            <MessageCircle className="h-3.5 w-3.5" />
            {chatCount > 0 ? `Continue Chat (${chatCount})` : `Chat with ${alterEgo.name.split(" ")[0]}`}
          </Button>
        </CardFooter>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit {alterEgo.name}</DialogTitle>
          </DialogHeader>
          <AlterEgoForm
            onSave={(updatedEgo) => {
              onUpdate(updatedEgo)
              setIsEditing(false)
            }}
            alterEgo={alterEgo}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isConfirmingDelete} onOpenChange={setIsConfirmingDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {alterEgo.name}?</DialogTitle>
          </DialogHeader>
          <p className="py-4">Are you sure you want to delete this alter ego? This action cannot be undone.</p>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsConfirmingDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
