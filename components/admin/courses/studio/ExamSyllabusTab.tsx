"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronDown } from "lucide-react"
import { Field, InlineError, InlineSuccess, Select, StudioSection, TextInput } from "./fields"

interface Section {
  id: string
  title: string
  titleHi: string | null
  subtopics: string[]
  subtopicsHi: string[]
  unitId: string | null
  chapterId: string | null
  pyqSubject: string | null
  pyqTopic: string | null
  unit?: { id: string; title: string } | null
}

interface Paper {
  id: string
  key: string
  title: string
  titleHi: string | null
  marks: number | null
  durationMinutes: number | null
  introText: string | null
  introTextHi: string | null
  sections: Section[]
}

interface ExamSyllabusTabProps {
  courseId: string
  chapters: Array<{ id: string; title: string }>
}

/**
 * "Exam syllabus" tab. Optional: a course with no papers simply hides the
 * syllabus section on the public page. Question counts are never entered here —
 * they come from the PYQ table via pyqSubject/pyqTopic.
 */
export function ExamSyllabusTab({ courseId, chapters }: ExamSyllabusTabProps) {
  const [papers, setPapers] = useState<Paper[]>([])
  const [units, setUnits] = useState<Array<{ id: string; title: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [openPaperId, setOpenPaperId] = useState<string | null>(null)

  const [newPaper, setNewPaper] = useState({ key: "", title: "", titleHi: "", marks: "", durationMinutes: "" })
  const [sectionDraft, setSectionDraft] = useState({
    paperId: "",
    title: "",
    titleHi: "",
    subtopics: "",
    subtopicsHi: "",
    unitId: "",
    chapterId: "",
    pyqSubject: "",
    pyqTopic: "",
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/syllabus`, { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not load the syllabus")
      setPapers(data.papers || [])
    } catch (err: any) {
      setError(err.message || "Could not load the syllabus")
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    void load()
  }, [load])

  // Units power the optional "this section belongs to unit X" link.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/admin/courses/${courseId}/units`, { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setUnits(data.units || [])
      } catch {
        // Units are optional here; the section can be saved without one.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [courseId])

  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => setSuccess(null), 3000)
    return () => clearTimeout(timer)
  }, [success])

  const createPaper = async () => {
    if (busy) return
    if (!newPaper.key.trim() || !newPaper.title.trim()) {
      setError("Paper key and title are required")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/syllabus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "paper",
          key: newPaper.key,
          title: newPaper.title,
          titleHi: newPaper.titleHi,
          marks: newPaper.marks,
          durationMinutes: newPaper.durationMinutes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not add the paper")
      setPapers((prev) => [...prev, { ...data, sections: [] }])
      setNewPaper({ key: "", title: "", titleHi: "", marks: "", durationMinutes: "" })
      setSuccess("Paper added")
    } catch (err: any) {
      setError(err.message || "Could not add the paper")
    } finally {
      setBusy(false)
    }
  }

  const createSection = async () => {
    if (busy) return
    if (!sectionDraft.paperId || !sectionDraft.title.trim()) {
      setError("Choose a paper and add a section title")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/syllabus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "section",
          paperId: sectionDraft.paperId,
          title: sectionDraft.title,
          titleHi: sectionDraft.titleHi,
          subtopics: sectionDraft.subtopics.split(",").map((s) => s.trim()).filter(Boolean),
          subtopicsHi: sectionDraft.subtopicsHi.split(",").map((s) => s.trim()).filter(Boolean),
          unitId: sectionDraft.unitId || null,
          chapterId: sectionDraft.chapterId || null,
          pyqSubject: sectionDraft.pyqSubject || null,
          pyqTopic: sectionDraft.pyqTopic || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not add the section")
      setPapers((prev) =>
        prev.map((paper) =>
          paper.id === sectionDraft.paperId
            ? { ...paper, sections: [...paper.sections, { ...data, unit: units.find((u) => u.id === data.unitId) || null }] }
            : paper
        )
      )
      setSectionDraft({
        paperId: sectionDraft.paperId,
        title: "",
        titleHi: "",
        subtopics: "",
        subtopicsHi: "",
        unitId: "",
        chapterId: "",
        pyqSubject: "",
        pyqTopic: "",
      })
      setSuccess("Section added")
    } catch (err: any) {
      setError(err.message || "Could not add the section")
    } finally {
      setBusy(false)
    }
  }

  const deletePaper = async (paper: Paper) => {
    if (!window.confirm(`Delete paper "${paper.title}" and all its sections?`)) return
    setError(null)
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/syllabus?paperId=${encodeURIComponent(paper.id)}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not delete the paper")
      setPapers((prev) => prev.filter((entry) => entry.id !== paper.id))
      setSuccess("Paper deleted")
    } catch (err: any) {
      setError(err.message || "Could not delete the paper")
    }
  }

  const deleteSection = async (section: Section) => {
    if (!window.confirm(`Delete section "${section.title}"?`)) return
    setError(null)
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/syllabus?sectionId=${encodeURIComponent(section.id)}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not delete the section")
      setPapers((prev) =>
        prev.map((paper) => ({ ...paper, sections: paper.sections.filter((entry) => entry.id !== section.id) }))
      )
      setSuccess("Section deleted")
    } catch (err: any) {
      setError(err.message || "Could not delete the section")
    }
  }

  return (
    <div className="space-y-4">
      {error && <InlineError message={error} />}
      {success && <InlineSuccess message={success} />}

      <StudioSection
        title="Add a paper"
        description="Papers are optional. A course with no papers hides the whole syllabus section."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Paper key" htmlFor="paper-key" required hint="Stable id, e.g. PRELIMS-GS">
            <TextInput id="paper-key" value={newPaper.key} onChange={(v) => setNewPaper((p) => ({ ...p, key: v }))} maxLength={60} />
          </Field>
          <Field label="Paper title (English)" htmlFor="paper-title" required>
            <TextInput id="paper-title" value={newPaper.title} onChange={(v) => setNewPaper((p) => ({ ...p, title: v }))} maxLength={120} />
          </Field>
          <Field label="Paper title (Hindi)" htmlFor="paper-title-hi">
            <TextInput id="paper-title-hi" value={newPaper.titleHi} onChange={(v) => setNewPaper((p) => ({ ...p, titleHi: v }))} maxLength={120} lang="hi" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Marks" htmlFor="paper-marks">
              <TextInput id="paper-marks" value={newPaper.marks} onChange={(v) => setNewPaper((p) => ({ ...p, marks: v }))} type="number" />
            </Field>
            <Field label="Minutes" htmlFor="paper-minutes">
              <TextInput
                id="paper-minutes"
                value={newPaper.durationMinutes}
                onChange={(v) => setNewPaper((p) => ({ ...p, durationMinutes: v }))}
                type="number"
              />
            </Field>
          </div>
        </div>
        <button
          type="button"
          onClick={createPaper}
          disabled={busy}
          className="mt-3 min-h-[44px] rounded-xl bg-orange-600 px-4 text-sm font-extrabold text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Add paper"}
        </button>
      </StudioSection>

      <StudioSection title={`Papers (${papers.length})`} description="Expand a paper to see and edit its sections.">
        {loading ? (
          <p className="text-xs text-gray-500">Loading syllabus…</p>
        ) : papers.length === 0 ? (
          <p className="text-xs text-gray-500">No papers yet — the syllabus section will not appear on the course page.</p>
        ) : (
          <ul className="space-y-2">
            {papers.map((paper) => {
              const open = openPaperId === paper.id
              return (
                <li key={paper.id} className="rounded-xl border border-gray-200">
                  <div className="flex items-stretch">
                    <button
                      type="button"
                      onClick={() => setOpenPaperId(open ? null : paper.id)}
                      aria-expanded={open}
                      className="flex min-h-[52px] flex-1 items-center justify-between gap-2 px-3 text-left"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-extrabold text-gray-900">{paper.title}</span>
                        <span className="text-[11px] text-gray-500">
                          {paper.key} • {paper.sections.length} sections
                          {paper.marks ? ` • ${paper.marks} marks` : ""}
                        </span>
                      </span>
                      <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePaper(paper)}
                      className="shrink-0 px-3 text-xs font-bold text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>

                  {open && (
                    <div className="border-t border-gray-100 p-3">
                      {paper.sections.length === 0 ? (
                        <p className="text-[11px] text-gray-500">No sections yet.</p>
                      ) : (
                        <ul className="divide-y divide-gray-100">
                          {paper.sections.map((section) => (
                            <li key={section.id} className="flex items-start justify-between gap-2 py-2">
                              <span className="min-w-0">
                                <span className="block text-xs font-bold text-gray-900">{section.title}</span>
                                <span className="text-[11px] text-gray-500">
                                  {section.unit?.title ? `${section.unit.title} • ` : ""}
                                  {section.pyqSubject
                                    ? `PYQ: ${section.pyqSubject}${section.pyqTopic ? ` / ${section.pyqTopic}` : ""}`
                                    : "No PYQ link (no counts shown)"}
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={() => deleteSection(section)}
                                className="shrink-0 text-[11px] font-bold text-red-700 hover:underline"
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </StudioSection>

      <StudioSection title="Add a section" description="Link a section to a unit and to the real PYQ subject/topic to show question counts.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Paper" htmlFor="section-paper" required>
            <Select
              id="section-paper"
              value={sectionDraft.paperId}
              onChange={(v) => setSectionDraft((p) => ({ ...p, paperId: v }))}
              options={papers.map((paper) => ({ value: paper.id, label: paper.title }))}
              placeholder="Choose a paper"
            />
          </Field>
          <Field label="Section title (English)" htmlFor="section-title" required>
            <TextInput id="section-title" value={sectionDraft.title} onChange={(v) => setSectionDraft((p) => ({ ...p, title: v }))} maxLength={160} />
          </Field>
          <Field label="Section title (Hindi)" htmlFor="section-title-hi">
            <TextInput id="section-title-hi" value={sectionDraft.titleHi} onChange={(v) => setSectionDraft((p) => ({ ...p, titleHi: v }))} maxLength={160} lang="hi" />
          </Field>
          <Field label="Subtopics (English)" htmlFor="section-subtopics" hint="Comma separated">
            <TextInput id="section-subtopics" value={sectionDraft.subtopics} onChange={(v) => setSectionDraft((p) => ({ ...p, subtopics: v }))} />
          </Field>
          <Field label="Subtopics (Hindi)" htmlFor="section-subtopics-hi" hint="Comma separated">
            <TextInput id="section-subtopics-hi" value={sectionDraft.subtopicsHi} onChange={(v) => setSectionDraft((p) => ({ ...p, subtopicsHi: v }))} lang="hi" />
          </Field>
          <Field label="Unit (optional)" htmlFor="section-unit">
            <Select
              id="section-unit"
              value={sectionDraft.unitId}
              onChange={(v) => setSectionDraft((p) => ({ ...p, unitId: v }))}
              options={units.map((unit) => ({ value: unit.id, label: unit.title }))}
              placeholder="No unit"
            />
          </Field>
          <Field label="Chapter (optional)" htmlFor="section-chapter">
            <Select
              id="section-chapter"
              value={sectionDraft.chapterId}
              onChange={(v) => setSectionDraft((p) => ({ ...p, chapterId: v }))}
              options={chapters.map((chapter) => ({ value: chapter.id, label: chapter.title }))}
              placeholder="No chapter"
            />
          </Field>
          <Field label="PYQ subject" htmlFor="section-pyq-subject" hint="Matches ContentEngineQuestion.sub exactly">
            <TextInput id="section-pyq-subject" value={sectionDraft.pyqSubject} onChange={(v) => setSectionDraft((p) => ({ ...p, pyqSubject: v }))} maxLength={120} />
          </Field>
          <Field label="PYQ topic" htmlFor="section-pyq-topic" hint="Optional — leave blank to count the whole subject">
            <TextInput id="section-pyq-topic" value={sectionDraft.pyqTopic} onChange={(v) => setSectionDraft((p) => ({ ...p, pyqTopic: v }))} maxLength={120} />
          </Field>
        </div>
        <button
          type="button"
          onClick={createSection}
          disabled={busy}
          className="mt-3 min-h-[44px] rounded-xl bg-orange-600 px-4 text-sm font-extrabold text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Add section"}
        </button>
      </StudioSection>
    </div>
  )
}
