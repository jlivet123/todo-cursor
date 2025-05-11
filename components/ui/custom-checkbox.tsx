"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface CustomCheckboxProps extends React.HTMLAttributes<HTMLDivElement> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  size?: "sm" | "md" | "lg"
}

const CustomCheckbox = React.forwardRef<HTMLDivElement, CustomCheckboxProps>(
  ({ className, checked = false, onCheckedChange, disabled = false, size = "md", ...props }, ref) => {
    const sizeClasses = {
      sm: "h-4 w-4",
      md: "h-5 w-5",
      lg: "h-6 w-6",
    }

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-full border transition-colors",
          checked
            ? "border-green-500 bg-green-500 text-slate-50"
            : "border-slate-500 bg-transparent hover:bg-slate-700/10",
          disabled && "cursor-not-allowed opacity-50",
          !disabled && "cursor-pointer",
          sizeClasses[size],
          className,
        )}
        onClick={() => {
          if (!disabled && onCheckedChange) {
            onCheckedChange(!checked)
          }
        }}
        {...props}
      >
        {checked && <Check className={cn("h-3 w-3 text-current", size === "sm" && "h-2 w-2")} />}
      </div>
    )
  },
)

CustomCheckbox.displayName = "CustomCheckbox"

export { CustomCheckbox }
