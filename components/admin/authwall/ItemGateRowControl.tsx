"use client"

import React from "react"
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
}

export function ItemGateRowControl({
  value,
  onChange,
  coursePreviewPercentage = 20,
  isCourseGated = false,
  disabled = false,
  compact = false,
}: ItemGateRowControlProps) {
  const currentMode = (value.gateMode || "inherit").toLowerCase() as
    | "inherit"
    | "free"
    | "preview"
    | "locked"

  const handleModeChange = (newMode: string) => {
    if (newMode === "preview") {
      onChange({
        gateMode: "preview",
        previewPercentage: value.previewPercentage ?? coursePreviewPercentage,
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

  const handlePercentageChange = (pct: number) => {
    onChange({
      gateMode: "preview",
      previewPercentage: Math.max(0, Math.min(100, pct)),
    })
  }

  // Visual status badge
  const renderBadge = () => {
    if (!isCourseGated) {
      return (
        <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-gray-500 border-gray-200">
          Ungated
        </Badge>
      )
    }

    switch (currentMode) {
      case "free":
        return (
          <Badge className="text-[10px] py-0 px-1.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300">
            Free (100%)
          </Badge>
        )
      case "locked":
        return (
          <Badge className="text-[10px] py-0 px-1.5 bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-300">
            Locked (0%)
          </Badge>
        )
      case "preview":
        return (
          <Badge className="text-[10px] py-0 px-1.5 bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-300">
            Preview {value.previewPercentage ?? coursePreviewPercentage}%
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-blue-700 bg-blue-50/50 dark:text-blue-300 border-blue-200">
            Inherit ({coursePreviewPercentage}%)
          </Badge>
        )
    }
  }

  return (
    <div className={`flex items-center gap-2 ${compact ? "scale-90 origin-right" : ""}`}>
      {renderBadge()}

      <Select
        value={currentMode}
        onValueChange={handleModeChange}
        disabled={disabled}
      >
        <SelectTrigger className="h-7 w-28 text-xs font-medium" data-testid="item-gate-mode-select">
          <SelectValue placeholder="Mode" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="inherit" className="text-xs">
            Inherit ({coursePreviewPercentage}%)
          </SelectItem>
          <SelectItem value="free" className="text-xs">
            100% Free
          </SelectItem>
          <SelectItem value="preview" className="text-xs">
            Preview %
          </SelectItem>
          <SelectItem value="locked" className="text-xs">
            Locked (0%)
          </SelectItem>
        </SelectContent>
      </Select>

      {currentMode === "preview" && (
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={0}
            max={100}
            value={value.previewPercentage ?? coursePreviewPercentage}
            onChange={(e) => {
              const num = parseInt(e.target.value, 10)
              if (!isNaN(num)) {
                handlePercentageChange(num)
              }
            }}
            disabled={disabled}
            className="h-7 w-14 text-xs text-center font-bold px-1"
            data-testid="item-gate-preview-input"
          />
          <span className="text-xs text-muted-foreground">%</span>
        </div>
      )}
    </div>
  )
}
