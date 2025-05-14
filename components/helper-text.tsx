"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { InfoIcon, XIcon } from "lucide-react"

interface HelperTextProps {
  title: string
  content: React.ReactNode
}

export function HelperText({ title, content }: HelperTextProps) {
  const [isOpen, setIsOpen] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close the popup when clicking outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative inline-block">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        className="h-6 w-6 rounded-full p-0"
        onClick={() => setIsOpen(!isOpen)}
      >
        <InfoIcon className="h-4 w-4" />
        <span className="sr-only">Help</span>
      </Button>

      {isOpen && (
        <div
          ref={popupRef}
          className="fixed z-50 top-1/4 left-1/2 transform -translate-x-1/2 w-[90%] max-w-2xl p-6 bg-card rounded-lg shadow-lg border max-h-[70vh] overflow-y-auto"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-lg">{title}</h3>
            <Button variant="ghost" size="sm" className="h-6 w-6 rounded-full p-0" onClick={() => setIsOpen(false)}>
              <XIcon className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          <div className="text-sm space-y-4">{content}</div>
        </div>
      )}
    </div>
  )
}
