"use client"

import { useState, useEffect } from "react"
import { ContentEngineHeader } from "@/components/admin/content-engine/ContentEngineHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Bookmark, Plus, Trash2, RefreshCw, Check } from "lucide-react"
import { toast } from "sonner"

interface AliasItem {
  id: string
  name: string
  pattern?: string | null
  isEnabled: boolean
}

export default function ContentEngineAliasesPage() {
  const [aliases, setAliases] = useState<AliasItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState("")
  const [newPattern, setNewPattern] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function loadAliases() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/content-engine/aliases")
      const data = await res.json()
      if (Array.isArray(data)) {
        setAliases(data)
      }
    } catch {
      toast.error("Failed to load aliases")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAliases()
  }, [])

  async function handleAddAlias(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) {
      toast.error("Alias name is required")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/admin/content-engine/aliases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          pattern: newPattern.trim() || undefined,
          isEnabled: true,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`Exam alias "${newName}" saved!`)
        setNewName("")
        setNewPattern("")
        loadAliases()
      } else {
        toast.error(data.error || "Failed to save alias")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(name: string) {
    if (!confirm(`Delete exam alias "${name}"?`)) return
    try {
      const res = await fetch(`/api/admin/content-engine/aliases?name=${encodeURIComponent(name)}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setAliases((prev) => prev.filter((a) => a.name !== name))
        toast.success("Exam alias removed")
      } else {
        toast.error("Failed to delete alias")
      }
    } catch {
      toast.error("Network error")
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
      <ContentEngineHeader
        title="Exam Aliases & Detection Rules"
        description="Configure known competitive exam acronyms and custom regex patterns used during batch bracket-tag parsing."
      />

      {/* Add New Alias Card */}
      <form onSubmit={handleAddAlias} className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" />
          <span>Add New Exam Alias</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Exam Name / Acronym *
            </label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. WBPSC, DSSSB, KVS"
              className="min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Custom Match Pattern (Optional Regex)
            </label>
            <Input
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              placeholder="e.g. DSSSB(?:\\s+PRT|\\s+TGT)?"
              className="min-h-[44px]"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || !newName.trim()}
          className="min-h-[44px] text-xs font-semibold gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isSubmitting ? "Saving..." : "Add Exam Alias"}</span>
        </Button>
      </form>

      {/* Existing Aliases Table */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-primary" />
            <span>Active Exam Aliases</span>
          </h2>
          <Badge variant="secondary" className="text-xs">
            {aliases.length} Aliases
          </Badge>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            <span className="text-sm">Loading aliases...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[500px] overflow-y-auto pr-1">
            {aliases.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background hover:border-border/80 transition-colors text-xs"
              >
                <div className="truncate mr-2">
                  <span className="font-semibold text-foreground block truncate">{a.name}</span>
                  {a.pattern && (
                    <span className="text-[10px] text-muted-foreground font-mono block truncate">
                      {a.pattern}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(a.name)}
                  className="text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors"
                  title="Delete alias"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
