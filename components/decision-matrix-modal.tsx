"use client"

import type { DecisionMatrixEntry } from "@/lib/storage"
import { DecisionMatrixForm } from "./decision-matrix-form"

interface DecisionMatrixModalProps {
  entry?: DecisionMatrixEntry
  onSave: (entry: Omit<DecisionMatrixEntry, "id" | "createdAt">) => void
  onCancel: () => void
  isOpen: boolean
}

export function DecisionMatrixModal({ entry, onSave, onCancel, isOpen }: DecisionMatrixModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">{entry ? "Edit Entry" : "Add New Entry"}</h2>
        </div>

        <div className="p-4">
          <DecisionMatrixForm onSave={onSave} onCancel={onCancel} initialValues={entry} isEditing={!!entry} />
        </div>
      </div>
    </div>
  )
}
