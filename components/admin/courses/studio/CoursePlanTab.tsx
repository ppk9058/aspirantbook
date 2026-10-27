"use client"

import { useCallback, useEffect, useState } from "react"
import { Field, InlineError, InlineSuccess, StudioSection, TextInput } from "./fields"

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

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/units`, { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not load units")
      setUnits(data.units || [])
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

      <StudioSection title="Add a unit" description="Units are the groups shown on the public Course plan timeline.">
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
          className="mt-3 min-h-[44px] rounded-xl bg-orange-600 px-4 text-sm font-extrabold text-white disabled:opacity-50"
        >
          {busy ? "Creating…" : "Add unit"}
        </button>
      </StudioSection>

      <StudioSection title={`Units (${units.length})`} description="Rename inline. Changes save immediately.">
        {loading ? (
          <p className="text-xs text-gray-500">Loading units…</p>
        ) : units.length === 0 ? (
          <p className="text-xs text-gray-500">
            No units yet. Without units the public page groups chapters under “Course chapters”.
          </p>
        ) : (
          <ul className="space-y-3">
            {units.map((unit) => (
              <li key={unit.id} className="rounded-xl border border-gray-200 p-3">
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
                  <button
                    type="button"
                    onClick={() => deleteUnit(unit)}
                    className="ml-auto min-h-[36px] rounded-lg px-2 text-xs font-bold text-red-700 hover:bg-red-50"
                  >
                    Delete unit
                  </button>
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
                          className="shrink-0 text-[11px] font-bold text-gray-600 hover:underline"
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
