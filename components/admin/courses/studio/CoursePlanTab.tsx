"use client"

import { useCallback, useEffect, useState } from "react"
import { ArrowDown, ArrowUp, FileText, Plus, Upload } from "lucide-react"
import { Field, InlineError, InlineSuccess, StudioSection, TextInput, TextArea } from "./fields"

interface Unit {
  id: string
  title: string
  titleHi: string | null
  tags: string[]
  order: number
  _count?: { chapters: number }
}

interface ChapterSummary {
  id: string
  title: string
  unitId?: string | null
}

interface CoursePlanTabProps {
  courseId: string
  chapters: ChapterSummary[]
  onChaptersChanged?: () => void
}

/**
 * "Course plan" tab: units are real rows, chapters are assigned to them.
 * Deleting a unit never deletes chapters (FK is ON DELETE SET NULL).
 * Includes Reordering (Move Up / Down), Bulk Add, and JSON/CSV import.
 */
export function CoursePlanTab({ courseId, chapters, onChaptersChanged }: CoursePlanTabProps) {
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState("")
  const [newTitleHi, setNewTitleHi] = useState("")
  const [newTags, setNewTags] = useState("")
  const [busy, setBusy] = useState(false)

  // Bulk add state
  const [showBulkAdd, setShowBulkAdd] = useState(false)
  const [bulkText, setBulkText] = useState("")

  // Import state
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState("")
  const [importFormat, setImportFormat] = useState<"json" | "csv">("json")
  const [importErrors, setImportErrors] = useState<string[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/units`, { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not load units")
      setUnits((data.units || []).sort((a: Unit, b: Unit) => (a.order ?? 0) - (b.order ?? 0)))
    } catch (err: any) {
      setError(err.message || "Could not load units")
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => setSuccess(null), 3000)
    return () => clearTimeout(timer)
  }, [success])

  const createUnit = async () => {
    if (!newTitle.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/units`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          titleHi: newTitleHi,
          tags: newTags.split(",").map((tag) => tag.trim()).filter(Boolean),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not create unit")
      setUnits((prev) => [...prev, data])
      setNewTitle("")
      setNewTitleHi("")
      setNewTags("")
      setSuccess("Unit created")
    } catch (err: any) {
      setError(err.message || "Could not create unit")
    } finally {
      setBusy(false)
    }
  }

  const handleBulkAdd = async () => {
    const lines = bulkText.split("\n").map((l) => l.trim()).filter(Boolean)
    if (lines.length === 0 || busy) return
    setBusy(true)
    setError(null)
    let addedCount = 0
    try {
      for (const line of lines) {
        const parts = line.split("|").map((p) => p.trim())
        const title = parts[0]
        const titleHi = parts[1] || ""
        const tags = parts[2] ? parts[2].split(",").map((t) => t.trim()).filter(Boolean) : []
        if (!title) continue

        const res = await fetch(`/api/admin/courses/${courseId}/units`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, titleHi, tags }),
        })
        if (res.ok) addedCount++
      }
      setBulkText("")
      setShowBulkAdd(false)
      setSuccess(`Added ${addedCount} units successfully`)
      await load()
    } catch (err: any) {
      setError(err.message || "Bulk add failed")
    } finally {
      setBusy(false)
    }
  }

  const handleImport = async () => {
    setImportErrors([])
    if (!importText.trim() || busy) return
    setBusy(true)
    const errs: string[] = []
    const parsedUnits: Array<{ title: string; titleHi?: string; tags?: string[] }> = []

    try {
      if (importFormat === "json") {
        const json = JSON.parse(importText)
        if (!Array.isArray(json)) {
          errs.push("JSON root must be an array of objects [{ title, titleHi, tags }]")
        } else {
          json.forEach((item, idx) => {
            if (!item.title || typeof item.title !== "string") {
              errs.push(`Row ${idx + 1}: missing or invalid 'title' string`)
            } else {
              parsedUnits.push({
                title: item.title,
                titleHi: item.titleHi || "",
                tags: Array.isArray(item.tags) ? item.tags : [],
              })
            }
          })
        }
      } else {
        // CSV: title, titleHi, tags (tags separated by semicolons)
        const lines = importText.split("\n").map((l) => l.trim()).filter(Boolean)
        lines.forEach((line, idx) => {
          if (idx === 0 && line.toLowerCase().includes("title")) return // header
          const cols = line.split(",").map((c) => c.trim())
          if (!cols[0]) {
            errs.push(`Row ${idx + 1}: empty title`)
          } else {
            parsedUnits.push({
              title: cols[0],
              titleHi: cols[1] || "",
              tags: cols[2] ? cols[2].split(";").map((t) => t.trim()).filter(Boolean) : [],
            })
          }
        })
      }

      if (errs.length > 0) {
        setImportErrors(errs)
        setBusy(false)
        return
      }

      let created = 0
      for (const u of parsedUnits) {
        const res = await fetch(`/api/admin/courses/${courseId}/units`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(u),
        })
        if (res.ok) created++
      }

      setImportText("")
      setShowImport(false)
      setSuccess(`Imported ${created} units successfully`)
      await load()
    } catch (err: any) {
      setImportErrors([err.message || "Failed to parse import content"])
    } finally {
      setBusy(false)
    }
  }

  const updateUnit = async (unit: Unit, patch: Partial<Unit>) => {
    setError(null)
    const optimistic = { ...unit, ...patch }
    setUnits((prev) => prev.map((entry) => (entry.id === unit.id ? optimistic : entry)))
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/units`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId: unit.id, ...patch }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not update unit")
      setSuccess("Unit saved")
    } catch (err: any) {
      setUnits((prev) => prev.map((entry) => (entry.id === unit.id ? unit : entry)))
      setError(err.message || "Could not update unit")
    }
  }

  const moveUnit = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= units.length) return
    const newUnits = [...units]
    const temp = newUnits[index]
    newUnits[index] = newUnits[targetIndex]
    newUnits[targetIndex] = temp

    // Update orders
    const updated = newUnits.map((u, idx) => ({ ...u, order: idx + 1 }))
    setUnits(updated)

    // Persist both order changes
    try {
      await Promise.all([
        fetch(`/api/admin/courses/${courseId}/units`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unitId: updated[index].id, order: updated[index].order }),
        }),
        fetch(`/api/admin/courses/${courseId}/units`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unitId: updated[targetIndex].id, order: updated[targetIndex].order }),
        }),
      ])
      setSuccess("Unit order updated")
    } catch (err: any) {
      setError(err.message || "Could not update unit order")
    }
  }

  const deleteUnit = async (unit: Unit) => {
    if (!window.confirm(`Delete unit "${unit.title}"? Chapters stay, they just become unassigned.`)) return
    setError(null)
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/units?unitId=${encodeURIComponent(unit.id)}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not delete unit")
      setUnits((prev) => prev.filter((entry) => entry.id !== unit.id))
      setSuccess("Unit deleted — its chapters are now unassigned")
      onChaptersChanged?.()
    } catch (err: any) {
      setError(err.message || "Could not delete unit")
    }
  }

  const assignChapter = async (chapterId: string, unitId: string) => {
    setError(null)
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/chapters`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId, unitId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not move chapter")
      setSuccess("Chapter moved")
      onChaptersChanged?.()
    } catch (err: any) {
      setError(err.message || "Could not move chapter")
    }
  }

  const unassigned = chapters.filter((chapter) => !units.some((unit) => unit.id === chapter.unitId))

  return (
    <div className="space-y-4">
      {error && <InlineError message={error} />}
      {success && <InlineSuccess message={success} />}

      <StudioSection
        title="Add a unit"
        description="Units are the groups shown on the public Course plan timeline."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBulkAdd(!showBulkAdd)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Bulk Add</span>
            </button>
            <button
              type="button"
              onClick={() => setShowImport(!showImport)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Import JSON/CSV</span>
            </button>
          </div>
        }
      >
        {/* Single Unit Form */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Unit title (English)" htmlFor="unit-title" required>
            <TextInput id="unit-title" value={newTitle} onChange={setNewTitle} maxLength={120} placeholder="Unit 1 — Foundation" />
          </Field>
          <Field label="Unit title (Hindi)" htmlFor="unit-title-hi">
            <TextInput id="unit-title-hi" value={newTitleHi} onChange={setNewTitleHi} maxLength={120} lang="hi" />
          </Field>
          <Field label="Tags" htmlFor="unit-tags" hint="Comma separated (max 8)">
            <TextInput id="unit-tags" value={newTags} onChange={setNewTags} placeholder="GS, Prelims" />
          </Field>
        </div>
        <button
          type="button"
          onClick={createUnit}
          disabled={busy || !newTitle.trim()}
          className="mt-3 min-h-[44px] rounded-xl bg-orange-600 px-4 text-sm font-extrabold text-white disabled:opacity-50 cursor-pointer"
        >
          {busy ? "Creating…" : "Add unit"}
        </button>

        {/* Bulk Add Drawer */}
        {showBulkAdd && (
          <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50/50 p-4">
            <h4 className="text-xs font-extrabold text-orange-950 uppercase tracking-wider mb-1">
              Bulk Add Units
            </h4>
            <p className="text-xs text-orange-800 mb-3">
              One per line. Format: <code className="bg-orange-100 px-1 rounded">Title | Title (Hindi) | Tag1, Tag2</code>
            </p>
            <TextArea
              value={bulkText}
              onChange={setBulkText}
              rows={4}
              placeholder={"Foundations | आधार | Core\nDeep Dive | गहन अध्ययन | Advanced\nPractice & Revision | अभ्यास एवं पुनरावृत्ति | Revision"}
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleBulkAdd}
                disabled={busy || !bulkText.trim()}
                className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50 cursor-pointer"
              >
                Add Units
              </button>
              <button
                type="button"
                onClick={() => setShowBulkAdd(false)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* JSON / CSV Import Drawer */}
        {showImport && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-extrabold text-blue-950 uppercase tracking-wider">
                Import from JSON / CSV
              </h4>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-blue-900 flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="importFormat"
                    checked={importFormat === "json"}
                    onChange={() => setImportFormat("json")}
                  />
                  <span>JSON</span>
                </label>
                <label className="text-xs font-bold text-blue-900 flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="importFormat"
                    checked={importFormat === "csv"}
                    onChange={() => setImportFormat("csv")}
                  />
                  <span>CSV</span>
                </label>
              </div>
            </div>

            {importErrors.length > 0 && (
              <div className="mb-3 rounded-lg bg-red-100 p-2.5 text-xs text-red-800 space-y-1">
                {importErrors.map((err, i) => (
                  <p key={i}>• {err}</p>
                ))}
              </div>
            )}

            <TextArea
              value={importText}
              onChange={setImportText}
              rows={5}
              placeholder={
                importFormat === "json"
                  ? `[\n  { "title": "Module 1", "titleHi": "मॉड्यूल 1", "tags": ["Core"] },\n  { "title": "Module 2", "titleHi": "मॉड्यूल 2", "tags": ["Advanced"] }\n]`
                  : "title,titleHi,tags\nModule 1,मॉड्यूल 1,Core\nModule 2,मॉड्यूल 2,Advanced"
              }
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleImport}
                disabled={busy || !importText.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50 cursor-pointer"
              >
                Validate & Import
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowImport(false)
                  setImportErrors([])
                }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </StudioSection>

      <StudioSection title={`Units (${units.length})`} description="Reorder units using Up/Down buttons. Rename inline. Changes save immediately.">
        {loading ? (
          <p className="text-xs text-gray-500">Loading units…</p>
        ) : units.length === 0 ? (
          <p className="text-xs text-gray-500">
            No units yet. Without units the public page groups chapters under “Course chapters”.
          </p>
        ) : (
          <ul className="space-y-3">
            {units.map((unit, index) => (
              <li key={unit.id} className="rounded-xl border border-gray-200 p-3 bg-white shadow-2xs">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveUnit(index, "up")}
                      aria-label="Move unit up"
                      className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === units.length - 1}
                      onClick={() => moveUnit(index, "down")}
                      aria-label="Move unit down"
                      className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-700">
                    #{index + 1}
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => deleteUnit(unit)}
                      className="rounded-lg px-2 py-1 text-xs font-bold text-red-700 hover:bg-red-50 cursor-pointer"
                    >
                      Delete unit
                    </button>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label="Title (English)">
                    <TextInput value={unit.title} onChange={(value) => updateUnit(unit, { title: value })} maxLength={120} />
                  </Field>
                  <Field label="Title (Hindi)">
                    <TextInput
                      value={unit.titleHi || ""}
                      onChange={(value) => updateUnit(unit, { titleHi: value })}
                      maxLength={120}
                      lang="hi"
                    />
                  </Field>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {unit.tags.map((tag) => (
                    <span key={tag} className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-700">
                      {tag}
                    </span>
                  ))}
                  <span className="text-[11px] text-gray-500">
                    {unit._count?.chapters ?? chapters.filter((chapter) => chapter.unitId === unit.id).length} chapters
                  </span>
                </div>

                <ul className="mt-2 divide-y divide-gray-100">
                  {chapters
                    .filter((chapter) => chapter.unitId === unit.id)
                    .map((chapter) => (
                      <li key={chapter.id} className="flex items-center justify-between gap-2 py-1.5">
                        <span className="min-w-0 truncate text-xs font-semibold text-gray-800">{chapter.title}</span>
                        <button
                          type="button"
                          onClick={() => assignChapter(chapter.id, "")}
                          className="shrink-0 text-[11px] font-bold text-gray-600 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </StudioSection>

      <StudioSection title={`Unassigned chapters (${unassigned.length})`} description="Move a chapter into a unit to show it on the timeline.">
        {unassigned.length === 0 ? (
          <p className="text-xs text-gray-500">Every chapter belongs to a unit.</p>
        ) : (
          <ul className="space-y-2">
            {unassigned.map((chapter) => (
              <li key={chapter.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 p-2">
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-800">{chapter.title}</span>
                <select
                  aria-label={`Assign ${chapter.title} to a unit`}
                  defaultValue=""
                  onChange={(event) => {
                    if (event.target.value) void assignChapter(chapter.id, event.target.value)
                  }}
                  className="min-h-[36px] rounded-lg border border-gray-300 px-2 text-xs"
                >
                  <option value="">Move to unit…</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.title}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        )}
      </StudioSection>
    </div>
  )
}
