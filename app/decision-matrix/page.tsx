"use client"

import { useState, useEffect } from "react"
import { v4 as uuidv4 } from "uuid"
import { Button } from "@/components/ui/button"
import { PlusIcon, PencilIcon, TrashIcon } from "lucide-react"
import { type DecisionMatrixEntry, getDecisionMatrix, saveDecisionMatrix } from "@/lib/storage"
import { DecisionMatrixModal } from "@/components/decision-matrix-modal"
import { HelperText } from "@/components/helper-text"

export default function DecisionMatrixPage() {
  const [entries, setEntries] = useState<DecisionMatrixEntry[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentEntry, setCurrentEntry] = useState<DecisionMatrixEntry | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load entries from localStorage
    const loadedEntries = getDecisionMatrix()
    setEntries(loadedEntries)
    setIsLoading(false)
  }, [])

  const handleAddEntry = () => {
    setCurrentEntry(undefined)
    setIsModalOpen(true)
  }

  const handleEditEntry = (entry: DecisionMatrixEntry) => {
    setCurrentEntry(entry)
    setIsModalOpen(true)
  }

  const handleDeleteEntry = (id: string) => {
    if (confirm("Are you sure you want to delete this entry?")) {
      const updatedEntries = entries.filter((entry) => entry.id !== id)
      setEntries(updatedEntries)
      saveDecisionMatrix(updatedEntries)
    }
  }

  const handleSaveEntry = (entryData: Omit<DecisionMatrixEntry, "id" | "createdAt">) => {
    let updatedEntries: DecisionMatrixEntry[]

    if (currentEntry) {
      // Editing existing entry
      updatedEntries = entries.map((entry) => (entry.id === currentEntry.id ? { ...entry, ...entryData } : entry))
    } else {
      // Adding new entry
      const newEntry: DecisionMatrixEntry = {
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        ...entryData,
      }
      updatedEntries = [...entries, newEntry]
    }

    setEntries(updatedEntries)
    saveDecisionMatrix(updatedEntries)
    setIsModalOpen(false)
  }

  // Update the helperContent variable with the new content
  const helperContent = (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">The Decision Matrix: Rewire Your Limiting Beliefs</h2>
      <p>
        The Decision Matrix is a simple but powerful 3-column journaling tool that helps you identify, reframe, and
        replace limiting beliefs using actual experiences from your life.
      </p>

      <div>
        <h3 className="text-lg font-medium mb-2">💡 Why It Works</h3>
        <p>
          Limiting beliefs aren't facts—they're decisions we made, often unconsciously, based on past experiences. The
          brain stores not just memories, but also the meanings we attached to them. Over time, those meanings become
          beliefs that shape how we think, feel, and act.
        </p>
        <p className="mt-2">The Decision Matrix works by:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Turning a belief into a conscious decision you can change.</li>
          <li>
            Using real-life evidence to support the new belief, rewiring your brain through neuroscience-backed memory
            activation.
          </li>
        </ul>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">📝 How to Use the Decision Matrix</h3>
        <p>Create three columns labeled:</p>
        <ol className="list-decimal pl-5 mt-2 space-y-1">
          <li>Limiting Belief</li>
          <li>New Empowered Decision</li>
          <li>Evidence the New Decision is True</li>
        </ol>
      </div>

      <div>
        <h4 className="font-medium">Step 1: Identify a Limiting Belief</h4>
        <p>Write down a belief that feels negative, self-defeating, or emotionally painful.</p>
        <p className="mt-1">Examples:</p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>"Money is hard to make"</li>
          <li>"I'm not good enough"</li>
          <li>"I can't trust people"</li>
        </ul>
        <p className="mt-2 italic">Tip: If it doesn't feel good, it's likely a limiting belief.</p>
      </div>

      <div>
        <h4 className="font-medium">Step 2: Create a New Empowered Decision</h4>
        <p>
          Write the opposite, positive version of that belief. This is your new decision—one that aligns with the future
          you want to create.
        </p>
        <p className="mt-1">Examples:</p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>"Money is easy to make"</li>
          <li>"I am enough"</li>
          <li>"I can trust the right people"</li>
        </ul>
        <p className="mt-2">Think of this as choosing a belief that will move you into a powerful emotional state.</p>
      </div>

      <div>
        <h4 className="font-medium">Step 3: Gather Evidence</h4>
        <p>Ask yourself:</p>
        <p className="mt-1 italic">"What real evidence do I have that this new decision is true?"</p>
        <p className="mt-1">
          Then write down 3–7 examples from your own life—memories, moments, or proof—that support the new belief.
        </p>
        <p className="mt-1">Examples:</p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>"I got a surprise bonus last year"</li>
          <li>"My friend Jen has always been trustworthy"</li>
          <li>"I completed a hard project and got great feedback"</li>
        </ul>
        <p className="mt-2">
          You're training your brain to see and reinforce the new belief using its own memory system.
        </p>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">🔄 How It Rewires Your Brain</h3>
        <p>
          Your brain is like a search engine. Ask it the right question ("What evidence do I have?"), and it will return
          powerful results.
        </p>
        <p className="mt-2">
          By retrieving real memories, you reactivate neural pathways tied to positive belief structures.
        </p>
        <p className="mt-2">
          Over time, this reduces the emotional charge of the old belief and strengthens the new one.
        </p>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">🧘‍♀️ Helpful Tips</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Don't worry if your evidence seems small—small truths compound.</li>
          <li>Revisit your matrix daily or weekly to reinforce your new decisions.</li>
          <li>
            If the old belief creeps back in, simply remind yourself: <span className="italic">"It's not true."</span>
          </li>
        </ul>
      </div>
    </div>
  )

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center mb-6">
        <h1 className="text-2xl font-bold">The Decision Matrix</h1>
        <div className="ml-2">
          <HelperText title="About The Decision Matrix" content={helperContent} />
        </div>
      </div>

      <div className="mb-6">
        <Button onClick={handleAddEntry}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add New Entry
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 border rounded-lg bg-card">
          <p className="text-muted-foreground">No entries yet. Click "Add New Entry" to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="border p-3 text-left">Limiting Belief</th>
                <th className="border p-3 text-left">New Empowered Decision</th>
                <th className="border p-3 text-left">Evidence from your life</th>
                <th className="border p-3 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b hover:bg-muted/50">
                  <td className="border p-3 align-top whitespace-pre-wrap">{entry.limitingBelief}</td>
                  <td className="border p-3 align-top whitespace-pre-wrap">{entry.empoweredDecision}</td>
                  <td className="border p-3 align-top whitespace-pre-wrap">{entry.evidence}</td>
                  <td className="border p-3 text-center">
                    <div className="flex justify-center space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEditEntry(entry)} title="Edit">
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteEntry(entry.id)} title="Delete">
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DecisionMatrixModal
        entry={currentEntry}
        onSave={handleSaveEntry}
        onCancel={() => setIsModalOpen(false)}
        isOpen={isModalOpen}
      />
    </div>
  )
}
