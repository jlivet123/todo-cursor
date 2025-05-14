"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { DecisionMatrixEntry } from "@/lib/storage"

interface DecisionMatrixFormProps {
  onSave: (entry: Omit<DecisionMatrixEntry, "id" | "createdAt">) => void
  onCancel: () => void
  initialValues?: Partial<DecisionMatrixEntry>
  isEditing?: boolean
}

export function DecisionMatrixForm({
  onSave,
  onCancel,
  initialValues = {},
  isEditing = false,
}: DecisionMatrixFormProps) {
  const [limitingBelief, setLimitingBelief] = useState(initialValues.limitingBelief || "")
  const [empoweredDecision, setEmpoweredDecision] = useState(initialValues.empoweredDecision || "")
  const [evidence, setEvidence] = useState(initialValues.evidence || "")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      limitingBelief,
      empoweredDecision,
      evidence,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-card rounded-lg border">
      <div>
        <label htmlFor="limitingBelief" className="block text-sm font-medium mb-1">
          Limiting Belief
        </label>
        <textarea
          id="limitingBelief"
          value={limitingBelief}
          onChange={(e) => setLimitingBelief(e.target.value)}
          className="w-full p-2 border rounded-md bg-background"
          rows={2}
          required
        />
      </div>

      <div>
        <label htmlFor="empoweredDecision" className="block text-sm font-medium mb-1">
          New Empowered Decision
        </label>
        <textarea
          id="empoweredDecision"
          value={empoweredDecision}
          onChange={(e) => setEmpoweredDecision(e.target.value)}
          className="w-full p-2 border rounded-md bg-background"
          rows={2}
          required
        />
      </div>

      <div>
        <label htmlFor="evidence" className="block text-sm font-medium mb-1">
          Evidence from your life
        </label>
        <textarea
          id="evidence"
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          className="w-full p-2 border rounded-md bg-background"
          rows={3}
          required
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{isEditing ? "Update" : "Add"} Entry</Button>
      </div>
    </form>
  )
}
