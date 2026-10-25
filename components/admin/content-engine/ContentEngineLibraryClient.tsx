"use client"

import { useState, useMemo } from "react"
import { QuestionCard, ContentEngineCardItem } from "./QuestionCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Layers,
  FileCheck2,
  Languages,
  UserCheck,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react"
import { toast } from "sonner"
import { T } from "@/lib/modules/content-engine/taxonomy"

interface LibraryClientProps {
  initialItems: ContentEngineCardItem[]
  stats: {
    total: number
    published: number
    hindi: number
    reviewed: number
    uncategorized: number
  }
  topicWarnings: Array<{ topic: string; count: number }>
}

export function ContentEngineLibraryClient({
  initialItems,
  stats: initialStats,
  topicWarnings: initialWarnings,
}: LibraryClientProps) {
  const [items, setItems] = useState<ContentEngineCardItem[]>(initialItems)
  const [stats, setStats] = useState(initialStats)
  const [topicWarnings, setTopicWarnings] = useState(initialWarnings)
  const [search, setSearch] = useState("")
  const [subjectFilter, setSubjectFilter] = useState("ALL")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [isRecategorising, setIsRecategorising] = useState(false)

  // Subject list from taxonomy
  const subjectList = useMemo(() => {
    const set = new Set(T.map((r) => r[0]))
    return Array.from(set).sort()
  }, [])

  // Handle re-categorise all
  async function handleRecategorise() {
    setIsRecategorising(true)
    try {
      const res = await fetch("/api/admin/content-engine/recategorise", {
        method: "POST",
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`Re-categorisation complete! Updated ${data.updatedCount} questions.`)
        // Refresh question list
        const qRes = await fetch("/api/admin/content-engine/questions?pageSize=50")
        const qData = await qRes.json()
        if (qData.items) {
          setItems(qData.items)
        }
      } else {
        toast.error(data.error || "Failed to re-categorise")
      }
    } catch (err: any) {
      toast.error(err.message || "Network error")
    } finally {
      setIsRecategorising(false)
    }
  }

  // Handle verify toggle
  async function handleVerifyToggle(id: string, current: boolean) {
    try {
      const res = await fetch("/api/admin/content-engine/questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isVerified: !current }),
      })
      if (res.ok) {
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, isVerified: !current } : i))
        )
        toast.success(!current ? "Marked question as verified" : "Removed verification")
      } else {
        toast.error("Failed to update status")
      }
    } catch {
      toast.error("Network error")
    }
  }

  // Handle delete
  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this question?")) return
    try {
      const res = await fetch(`/api/admin/content-engine/questions?id=${id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id))
        setStats((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }))
        toast.success("Question deleted")
      } else {
        toast.error("Failed to delete question")
      }
    } catch {
      toast.error("Network error")
    }
  }

  // Client-side filtering
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (subjectFilter !== "ALL" && item.sub !== subjectFilter) {
        return false
      }
      if (statusFilter === "PUBLISHED" && !item.isPublished) return false
      if (statusFilter === "DRAFT" && item.isPublished) return false
      if (statusFilter === "UNCATEGORIZED" && item.sub !== "Uncategorized" && item.top !== "General") {
        return false
      }
      if (search.trim()) {
        const query = search.toLowerCase()
        const matchQ = item.q.toLowerCase().includes(query)
        const matchExp = (item.explanation || "").toLowerCase().includes(query)
        const matchTop = (item.top || "").toLowerCase().includes(query)
        const matchExam = (item.exam || "").toLowerCase().includes(query)
        if (!matchQ && !matchExp && !matchTop && !matchExam) return false
      }
      return true
    })
  }, [items, subjectFilter, statusFilter, search])

  return (
    <div className="space-y-6">
      {/* 5 Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Total Questions</span>
            <Layers className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-foreground">{stats.total}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Published</span>
            <FileCheck2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {stats.published}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Hindi Translated</span>
            <Languages className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-foreground">{stats.hindi}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Human Reviewed</span>
            <UserCheck className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-foreground">{stats.reviewed}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Uncategorized</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
            {stats.uncategorized}
          </p>
        </div>
      </div>

      {/* 3+ Questions Same Topic Warning Banner */}
      {topicWarnings.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>Uncategorized Topics Detected</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {topicWarnings.map((w) => (
              <Badge key={w.topic} variant="outline" className="border-amber-500/50 text-foreground bg-background/50">
                {w.topic}: {w.count} questions need subject assignment
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Controls Bar: Search, Filters & Action Button */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions, topics, exams..."
              className="pl-9 min-h-[44px]"
            />
          </div>

          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-md border border-input bg-background min-h-[44px] text-foreground"
          >
            <option value="ALL">All Subjects</option>
            {subjectList.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-md border border-input bg-background min-h-[44px] text-foreground"
          >
            <option value="ALL">All Status</option>
            <option value="PUBLISHED">Published Only</option>
            <option value="DRAFT">Draft Only</option>
            <option value="UNCATEGORIZED">Uncategorized</option>
          </select>
        </div>

        <Button
          onClick={handleRecategorise}
          disabled={isRecategorising}
          variant="outline"
          className="min-h-[44px] gap-2 shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isRecategorising ? "animate-spin" : ""}`} />
          <span>{isRecategorising ? "Processing..." : "Re-categorise All"}</span>
        </Button>
      </div>

      {/* Question Cards List */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-2">
            <Filter className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="text-base font-medium text-foreground">No questions found</p>
            <p className="text-xs text-muted-foreground">
              Try adjusting your search query or subject/status filter.
            </p>
          </div>
        ) : (
          filteredItems.map((item, index) => (
            <QuestionCard
              key={item.id}
              item={item}
              index={index}
              onVerifyToggle={handleVerifyToggle}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  )
}
