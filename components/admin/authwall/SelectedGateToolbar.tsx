"use client"

import React, { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Lock, Unlock, Eye, Sparkles, Save, Loader2, BookOpen, FileText } from "lucide-react"

export type GateMode = "inherit" | "free" | "preview" | "locked"

export interface SelectedItemGateInfo {
  id: string
  title: string
  type: "chapter" | "lesson"
  gateMode?: string | null
  previewPercentage?: number | null
  parentTitle?: string
  parentGateMode?: string | null
  parentPreviewPercentage?: number | null
}

interface SelectedGateToolbarProps {
  selectedItem: SelectedItemGateInfo | null
  coursePreviewPercentage: number
  isCourseGated: boolean
  onSave: (gate: { gateMode: GateMode; previewPercentage: number | null }) => Promise<void> | void
  disabled?: boolean
}

export function SelectedGateToolbar({
  selectedItem,
  coursePreviewPercentage = 20,
  isCourseGated = false,
  onSave,
  disabled = false,
}: SelectedGateToolbarProps) {
  const initialMode = ((selectedItem?.gateMode as GateMode) || "inherit")
  const initialPct = selectedItem?.previewPercentage ?? coursePreviewPercentage ?? 20

  const [mode, setMode] = useState<GateMode>(initialMode)
  const [localPct, setLocalPct] = useState<number | string>(initialPct)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  // Sync state when selectedItem changes
  useEffect(() => {
    if (!selectedItem) return
    const nextMode = ((selectedItem.gateMode as GateMode) || "inherit")
    const nextPct = selectedItem.previewPercentage ?? coursePreviewPercentage ?? 20
    setMode(nextMode)
    setLocalPct(nextPct)
    setIsDirty(false)
  }, [selectedItem?.id, selectedItem?.gateMode, selectedItem?.previewPercentage, coursePreviewPercentage])

  // Compute effective percentage for display
  const effectivePct = React.useMemo(() => {
    if (!selectedItem) return 100
    if (mode === "free") return 100
    if (mode === "locked") return 0
    if (mode === "preview") {
      const p = typeof localPct === "number" ? localPct : parseInt(localPct as string, 10)
      return isNaN(p) ? (selectedItem.previewPercentage ?? 20) : p
    }
    // Inherited
    if (selectedItem.parentGateMode && selectedItem.parentGateMode !== "inherit") {
      if (selectedItem.parentGateMode === "free") return 100
      if (selectedItem.parentGateMode === "locked") return 0
      if (selectedItem.parentGateMode === "preview") return selectedItem.parentPreviewPercentage ?? coursePreviewPercentage ?? 20
    }
    return isCourseGated ? (coursePreviewPercentage ?? 20) : 100
  }, [mode, localPct, selectedItem, isCourseGated, coursePreviewPercentage])

  const sourceLabel = React.useMemo(() => {
    if (!selectedItem || mode !== "inherit") return ""
    if (selectedItem.parentGateMode && selectedItem.parentGateMode !== "inherit") {
      return `(from ${selectedItem.parentTitle || "Phase"})`
    }
    return "(from Course)"
  }, [mode, selectedItem?.parentGateMode, selectedItem?.parentTitle])

  if (!selectedItem) return null

  const handleModeChange = (newMode: GateMode) => {
    setMode(newMode)
    setIsDirty(true)
  }

  const handlePctChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    if (raw === "") {
      setLocalPct("")
      setIsDirty(true)
      return
    }
    const parsed = parseInt(raw, 10)
    if (isNaN(parsed)) return
    const clamped = Math.max(0, Math.min(100, parsed))
    setLocalPct(clamped)
    setIsDirty(true)
  }

  const handlePctBlur = () => {
    if (localPct === "") {
      const fallback = selectedItem.previewPercentage ?? coursePreviewPercentage ?? 20
      setLocalPct(fallback)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const finalPct = mode === "preview"
        ? (typeof localPct === "number" ? localPct : parseInt(localPct as string, 10) || 20)
        : (mode === "locked" ? 0 : (mode === "free" ? 100 : null))

      await onSave({
        gateMode: mode,
        previewPercentage: finalPct,
      })
      setIsDirty(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSave()
    }
  }

  const TypeIcon = selectedItem.type === "chapter" ? BookOpen : FileText
  const typeLabel = selectedItem.type === "chapter" ? "Phase" : "Lesson"

  return (
    <div
      data-testid="selected-gate-toolbar"
      className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 p-2 px-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xs text-xs mb-3 overflow-x-auto min-w-0"
    >
      {/* Left: Selected item badge/name */}
      <div className="flex items-center gap-1.5 min-w-0 max-w-[200px] sm:max-w-[260px] shrink-0">
        <TypeIcon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
        <span className="text-[11px] uppercase tracking-wider font-extrabold text-gray-500 shrink-0">
          {typeLabel}:
        </span>
        <span
          className="font-bold text-gray-800 dark:text-gray-200 truncate"
          title={selectedItem.title}
        >
          {selectedItem.title}
        </span>
      </div>

      {/* Middle: Mode selector & % input & Effective badge */}
      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap min-w-0 flex-1">
        {/* Mode Selector */}
        <Select
          value={mode}
          onValueChange={(val) => handleModeChange(val as GateMode)}
          disabled={disabled || isSaving}
        >
          <SelectTrigger
            data-testid="item-gate-mode-select"
            className="h-7 text-xs w-[145px] shrink-0 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inherit">
              <span className="flex items-center gap-1.5 text-xs">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                Inherit
              </span>
            </SelectItem>
            <SelectItem value="free">
              <span className="flex items-center gap-1.5 text-xs">
                <Unlock className="w-3 h-3 text-emerald-500" />
                Free (100%)
              </span>
            </SelectItem>
            <SelectItem value="preview">
              <span className="flex items-center gap-1.5 text-xs">
                <Eye className="w-3 h-3 text-amber-500" />
                Preview %
              </span>
            </SelectItem>
            <SelectItem value="locked">
              <span className="flex items-center gap-1.5 text-xs">
                <Lock className="w-3 h-3 text-rose-500" />
                Fully locked (0%)
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* % Input (Visible only for preview mode) */}
        {mode === "preview" && (
          <div className="flex items-center gap-1 shrink-0 animate-in fade-in duration-150">
            <Input
              type="number"
              min={0}
              max={100}
              value={localPct}
              onChange={handlePctChange}
              onBlur={handlePctBlur}
              onKeyDown={handleKeyDown}
              disabled={disabled || isSaving}
              data-testid="item-gate-preview-input"
              className="h-7 w-16 text-xs text-center px-1 font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="%"
            />
            <span className="text-[11px] font-bold text-gray-500">%</span>
          </div>
        )}

        {/* Effective Badge */}
        <Badge
          data-testid="item-gate-mode-badge"
          variant="secondary"
          className="text-[10px] py-0.5 px-2 font-semibold shrink-0"
        >
          Effective for guests: {effectivePct}% {sourceLabel}
        </Badge>
      </div>

      {/* Right: Save Button & Helper text */}
      <div className="flex items-center gap-2 shrink-0 ml-auto">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={disabled || isSaving}
          data-testid="save-item-gate-btn"
          className={`h-7 px-3 text-xs font-bold gap-1 transition-all ${
            isDirty
              ? "bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
              : "bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          {isSaving ? (
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
          ) : (
            <Save className="w-3 h-3 mr-1" />
          )}
          Save
        </Button>

        <span className="text-[10px] text-gray-400 dark:text-gray-500 hidden xl:inline shrink-0">
          (100% = fully open, 0% = fully locked)
        </span>
      </div>
    </div>
  )
}
