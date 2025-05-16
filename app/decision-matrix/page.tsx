"use client"

import { useState, useEffect } from "react"
import { v4 as uuidv4 } from "uuid"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash } from "lucide-react"
import { type DecisionMatrixEntry, getDecisionMatrix, saveDecisionMatrix, deleteDecisionMatrixEntry } from "@/lib/storage"
import { DecisionMatrixModal } from "@/components/decision-matrix-modal"
import { HelperText } from "@/components/helper-text"
import { PageLayout } from "@/components/page-layout"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"

export default function DecisionMatrixPage() {
  const { user, status } = useAuth()
  const [entries, setEntries] = useState<DecisionMatrixEntry[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentEntry, setCurrentEntry] = useState<DecisionMatrixEntry | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Function to load entries from Supabase or localStorage
    async function loadEntries() {
      setIsLoading(true)
      try {
        const loadedEntries = await getDecisionMatrix()
        setEntries(loadedEntries)
      } catch (error) {
        console.error('Error loading decision matrix entries:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadEntries()
  }, [])

  const handleAddEntry = () => {
    setCurrentEntry(undefined)
    setIsModalOpen(true)
  }

  const handleEditEntry = (entry: DecisionMatrixEntry) => {
    setCurrentEntry(entry)
    setIsModalOpen(true)
  }

  const handleDeleteEntry = async (id: string) => {
    if (confirm("Are you sure you want to delete this entry?")) {
      try {
        setIsLoading(true)
        await deleteDecisionMatrixEntry(id)
        setEntries(entries.filter(entry => entry.id !== id))
      } catch (error) {
        console.error('Error deleting entry:', error)
        alert('Failed to delete entry')
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleSaveEntry = async (entryData: Omit<DecisionMatrixEntry, "id" | "createdAt">) => {
    try {
      setIsLoading(true)
      
      if (currentEntry) {
        // Update existing entry
        const updatedEntry = { 
          ...currentEntry, 
          ...entryData,
        }
        
        await saveDecisionMatrix([updatedEntry])
        
        // Update in local state
        setEntries(entries.map(entry => 
          entry.id === currentEntry.id ? updatedEntry : entry
        ))
      } else {
        // Create new entry
        const newEntry: DecisionMatrixEntry = {
          id: uuidv4(),
          createdAt: new Date().toISOString(),
          ...entryData,
        }
        
        await saveDecisionMatrix([newEntry])
        
        // Add to local state
        setEntries([...entries, newEntry])
      }
      
      // Close modal
      setIsModalOpen(false)
    } catch (error) {
      console.error('Error saving entry:', error)
      alert('Failed to save entry')
    } finally {
      setIsLoading(false)
    }
  }

  // Helper text for users
  const helperContent = (
    <div className="space-y-4">
      <div>
        <p>
          The Decision Matrix helps you transform limiting beliefs into empowered decisions.
          Document your thought patterns and create positive changes in your life.
        </p>
        <ol className="list-decimal pl-5 space-y-1 mt-2">
          <li>Identify a limiting belief that's holding you back</li>
          <li>Create a new empowered decision to replace it</li>
          <li>Document evidence from your life that supports this new belief</li>
        </ol>
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
    </div>
  )

  // Loading state
  if (status === "loading") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  // Not logged in state
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Please sign in to access the Decision Matrix</h1>
          <Button asChild>
            <Link href="/">Go to Login</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Main content
  return (
    <PageLayout>
      <div className="p-6 flex-1 overflow-y-auto">
        <div className="container mx-auto">
          <div className="mb-8 space-y-4">
            <h1 className="text-2xl font-bold">The Decision Matrix</h1>
            <HelperText title="About the Decision Matrix" content={helperContent} />
          </div>

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Your Entries</h2>
            <Button onClick={handleAddEntry} className="flex items-center gap-1">
              <Plus className="h-4 w-4" /> Add Entry
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 border border-slate-700 rounded-lg bg-slate-800">
              <p className="text-slate-400">No entries yet. Click "Add Entry" to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-800">
                    <th className="border border-slate-700 p-3 text-left">Limiting Belief</th>
                    <th className="border border-slate-700 p-3 text-left">New Empowered Decision</th>
                    <th className="border border-slate-700 p-3 text-left">Evidence from your life</th>
                    <th className="border border-slate-700 p-3 text-center w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-slate-700 hover:bg-slate-800/50">
                      <td className="border border-slate-700 p-3 align-top whitespace-pre-wrap">{entry.limitingBelief}</td>
                      <td className="border border-slate-700 p-3 align-top whitespace-pre-wrap">{entry.empoweredDecision}</td>
                      <td className="border border-slate-700 p-3 align-top whitespace-pre-wrap">{entry.evidence}</td>
                      <td className="border border-slate-700 p-3 text-center">
                        <div className="flex justify-center space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEditEntry(entry)} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteEntry(entry.id)} title="Delete">
                            <Trash className="h-4 w-4" />
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
      </div>
    </PageLayout>
  )
}
