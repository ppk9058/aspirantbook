"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface ItemGateValue {
  gateMode: "inherit" | "free" | "preview" | "locked" | string
  previewPercentage?: number | null
}

interface ItemGateRowControlProps {
  value: ItemGateValue
  onChange: (updated: ItemGateValue) => void
  coursePreviewPercentage?: number
  isCourseGated?: boolean
  disabled?: boolean
  compact?: boolean
  parentGateMode?: string
  parentPreviewPercentage?: number | null
  parentName?: string
}

export function ItemGateRowControl({
  value,
  onChange,
  coursePreviewPercentage = 20,
  isCourseGated = false,
  disabled = false,
  compact = false,
  parentGateMode,
  parentPreviewPercentage,
  parentName,
}: ItemGateRowControlProps) {
  const currentMode = (value.gateMode || "inherit").toLowerCase() as
    | "inherit"
    | "free"
    | "preview"
    | "locked"

  // Local state for the number input to avoid immediate server re-render on keystroke
  const [localPct, setLocalPct] = useState<string>(() => {
    const p = value.previewPercentage
    if (p !== undefined && p !== null) return String(p)
    return String(coursePreviewPercentage)
  })

  // Synchronize local input state when value.previewPercentage changes externally
  useEffect(() => {
    if (value.previewPercentage !== undefined && value.previewPercentage !== null) {
      setLocalPct(String(value.previewPercentage))
    } else {
      setLocalPct(String(coursePreviewPercentage))
    }
  }, [value.previewPercentage, coursePreviewPercentage])

  // Commit debounced percentage updates (400ms)
  const isMounted = useRef(false)
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true
      return
    }
    if (currentMode !== "preview") return

    const timer = setTimeout(() => {
      const num = parseInt(localPct, 10)
      if (!isNaN(num)) {
        const clamped = Math.max(0, Math.min(100, num))
        if (clamped !== value.previewPercentage) {
          onChange({
            gateMode: "preview",
            previewPercentage: clamped,
          })
        }
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [localPct, currentMode, value.previewPercentage, onChange])

  const handleCommit = useCallback(() => {
    let num = parseInt(localPct, 10)
    if (isNaN(num)) {
      num = coursePreviewPercentage
    }
    const clamped = Math.max(0, Math.min(100, num))
    setLocalPct(String(clamped))
    if (clamped !== value.previewPercentage || currentMode !== "preview") {
      onChange({
        gateMode: "preview",
        previewPercentage: clamped,
      })
    }
  }, [localPct, coursePreviewPercentage, currentMode, value.previewPercentage, onChange])

  const handleModeChange = (newMode: string) => {
    if (newMode === "preview") {
      const p = value.previewPercentage ?? coursePreviewPercentage
      setLocalPct(String(p))
      onChange({
        gateMode: "preview",
        previewPercentage: p,
      })
    } else if (newMode === "inherit") {
      onChange({
        gateMode: "inherit",
        previewPercentage: null,
      })
    } else if (newMode === "locked") {
      onChange({
        gateMode: "locked",
        previewPercentage: 0,
      })
    } else if (newMode === "free") {
      onChange({
        gateMode: "free",
        previewPercentage: 100,
      })
    } else {
      onChange({
        gateMode: newMode,
        previewPercentage: null,
      })
    }
  }

  // Calculate effective percentage and inherited source
  let effectivePct = 100
  let inheritanceSource = ""

  if (!isCourseGated) {
    effectivePct = 100
  } else if (currentMode === "free") {
    effectivePct = 100
  } else if (currentMode === "locked") {
    effectivePct = 0
  } else if (currentMode === "preview") {
    const parsed = parseInt(localPct, 10)
    effectivePct = !isNaN(parsed) ? Math.max(0, Math.min(100, parsed)) : (value.previewPercentage ?? coursePreviewPercentage)
  } else {
    // Inherit mode
    if (parentGateMode && parentGateMode.toLowerCase() !== "inherit") {
      const parentMode = parentGateMode.toLowerCase()
      inheritanceSource = parentName || "Phase"
      if (parentMode === "free") {
        effectivePct = 100
      } else if (parentMode === "locked") {
        effectivePct = 0
      } else if (parentMode === "preview") {
        effectivePct = parentPreviewPercentage ?? coursePreviewPercentage
      } else {
        effectivePct = coursePreviewPercentage
      }
    } else {
      inheritanceSource = "Course"
      effectivePct = coursePreviewPercentage
    }
  }

  // Visual status badge
  const renderBadge = () => {
    if (!isCourseGated) {
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-gray-500 border-gray-200">
            Ungated
          </Badge>
          <Badge
            variant="outline"
            className="text-[10px] py-0 px-1.5 border-dashed text-gray-600 dark:text-gray-400"
            data-testid="item-effective-guest-badge"
          >
            Effective for guests: 100%
          </Badge>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {currentMode === "free" && (
          <Badge
            data-testid="item-gate-mode-badge"
            className="text-[10px] py-0 px-1.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300"
          >
            Free (100%)
          </Badge>
        )}
        {currentMode === "locked" && (
          <Badge
            data-testid="item-gate-mode-badge"
            className="text-[10px] py-0 px-1.5 bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-300"
          >
            Locked (0%)
          </Badge>
        )}
        {currentMode === "preview" && (
          <Badge
            data-testid="item-gate-mode-badge"
            className="text-[10px] py-0 px-1.5 bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-300"
          >
            Preview {effectivePct}%
          </Badge>
        )}
        {currentMode === "inherit" && (
          <Badge
            data-testid="item-gate-mode-badge"
            variant="outline"
            className="text-[10px] py-0 px-1.5 text-blue-700 bg-blue-50/50 dark:text-blue-300 border-blue-200"
          >
            Inherit ({effectivePct}%)
          </Badge>
        )}
        <Badge
          variant="outline"
          className="text-[10px] py-0 px-1.5 font-medium border-dashed border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
          data-testid="item-effective-guest-badge"
        >
          Effective for guests: {effectivePct}%{inheritanceSource ? ` (from ${inheritanceSource})` : ""}
        </Badge>
      </div>
    )
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${compact ? "text-xs" : ""}`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {renderBadge()}

      <div className="flex items-center gap-1.5">
        <Select
          value={currentMode}
          onValueChange={handleModeChange}
          disabled={disabled}
        >
          <SelectTrigger
            className="h-7 w-32 text-xs font-medium bg-white dark:bg-gray-800"
            data-testid="item-gate-mode-select"
          >
            <SelectValue placeholder="Mode" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-gray-800 border-border">
            <SelectItem value="inherit" className="text-xs">
              Inherit
            </SelectItem>
            <SelectItem value="free" className="text-xs">
              Free (100%)
            </SelectItem>
            <SelectItem value="preview" className="text-xs">
              Preview %
            </SelectItem>
            <SelectItem value="locked" className="text-xs">
              Fully locked (0%)
            </SelectItem>
          </SelectContent>
        </Select>

        {currentMode === "preview" && (
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-md border border-input px-1 py-0.5">
            <Input
              type="number"
              min={0}
              max={100}
              value={localPct}
              onChange={(e) => setLocalPct(e.target.value)}
              onBlur={handleCommit}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  ;(e.target as HTMLElement).blur()
                  handleCommit()
                }
              }}
              disabled={disabled}
              className="h-6 w-12 text-xs text-center font-bold px-0.5 border-0 shadow-none focus-visible:ring-0"
              data-testid="item-gate-preview-input"
            />
            <span className="text-xs text-muted-foreground mr-1">%</span>
          </div>
        )}
      </div>

      {currentMode === "preview" && (
        <span
          className="text-[10px] text-muted-foreground hidden sm:inline select-none"
          title="100% = fully open, 0% = fully locked"
        >
          (100% = fully open, 0% = fully locked)
        </span>
      )}
    </div>
  )
}
