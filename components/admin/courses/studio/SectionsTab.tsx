"use client"

import { useEffect, useMemo, useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { hindiCompletenessForList, hindiBadgeLabel } from "@/lib/i18n/localized"
import { DEFAULT_SECTION_FLAGS, SECTION_KEYS, type SectionFlags } from "@/lib/courses/metadata-schema"
import { InlineSuccess, StudioSection } from "./fields"

interface SectionsTabProps {
  flags: SectionFlags
  onFlagsChange: (flags: SectionFlags) => void
  metadata: any
  heroFields: Record<string, unknown>
}

const LABELS: Record<keyof SectionFlags, { title: string; description: string }> = {
  about: { title: "About this course", description: "Description, highlights, how it works, what you get." },
  plan: { title: "Course plan", description: "Unit timeline with chapters and date ranges." },
  syllabus: { title: "Exam syllabus", description: "Only appears when at least one paper exists." },
  teachers: { title: "Teachers", description: "Faculty cards with Hindi twins." },
  questions: { title: "Ratings & FAQs", description: "Stars need real reviews; FAQs need questions." },
  lectures: { title: "Lectures", description: "Chapter/lecture list with recordings and calendar." },
  callback: { title: "Callback form", description: "Lead form (hidden once the learner is enrolled)." },
}

/**
 * Section visibility + a Hindi completeness summary. Toggles only hide a
 * section; they never delete content.
 */
export function SectionsTab({ flags, onFlagsChange, metadata, heroFields }: SectionsTabProps) {
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    if (!saved) return
    const timer = setTimeout(() => setSaved(null), 2500)
    return () => clearTimeout(timer)
  }, [saved])

  const completeness = useMemo(() => {
    const courseFields = hindiCompletenessForList([{ ...metadata, ...heroFields }], [
      "subtitle",
      "description",
      "scheduleText",
      "validityText",
      "validityNote",
      "enrollDisclaimer",
      "lateJoinerTemplate",
      "thumbnailBadge",
    ])
    const teacherFields = hindiCompletenessForList(metadata?.teachers || [], [
      "name",
      "role",
      "qualification",
      "bio",
    ])
    const teacherCredentials = hindiCompletenessForList(metadata?.teachers || [], ["credentials"])
    const faqFields = hindiCompletenessForList(metadata?.faqs || [], ["question", "answer"])
    const highlights = hindiCompletenessForList(
      [{ items: (metadata?.aboutHighlights || []).join(" ") }],
      ["items"]
    )

    const total = courseFields.total + teacherFields.total + teacherCredentials.total + faqFields.total
    const missing = courseFields.missing + teacherFields.missing + teacherCredentials.missing + faqFields.missing
    return {
      total,
      missing,
      details: [
        { label: "Course text", ...courseFields },
        { label: "Teachers", ...teacherFields },
        { label: "Teacher credentials", ...teacherCredentials },
        { label: "FAQs", ...faqFields },
        { label: "About highlights", ...highlights },
      ].filter((entry) => entry.total > 0),
    }
  }, [metadata, heroFields])

  const toggle = (key: keyof SectionFlags) => {
    const next = { ...flags, [key]: !flags[key] }
    onFlagsChange(next)
    setSaved("Section visibility updated — remember to save the course.")
  }

  const reset = () => {
    onFlagsChange({ ...DEFAULT_SECTION_FLAGS })
    setSaved("All sections visible again — remember to save the course.")
  }

  return (
    <div className="space-y-4">
      {saved && <InlineSuccess message={saved} />}

      <StudioSection
        title="Sections shown on the course page"
        description="Hidden sections keep their content; they are only skipped when rendering."
        actions={
          <button
            type="button"
            onClick={reset}
            className="min-h-[36px] rounded-lg border border-gray-300 px-3 text-xs font-bold text-gray-800"
          >
            Show all
          </button>
        }
      >
        <ul className="space-y-2">
          {SECTION_KEYS.map((key) => {
            const enabled = flags[key]
            return (
              <li key={key} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3">
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-gray-900">{LABELS[key].title}</p>
                  <p className="text-[11px] text-gray-500">{LABELS[key].description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label={`${enabled ? "Hide" : "Show"} ${LABELS[key].title}`}
                  onClick={() => toggle(key)}
                  className={`inline-flex h-9 w-16 shrink-0 items-center rounded-full px-1 transition ${
                    enabled ? "bg-emerald-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full bg-white shadow transition-transform ${
                      enabled ? "translate-x-7" : "translate-x-0"
                    }`}
                  >
                    {enabled ? (
                      <Eye className="h-3.5 w-3.5 text-emerald-700" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 text-gray-500" />
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </StudioSection>

      <StudioSection
        title="Hindi completeness"
        description={hindiBadgeLabel(completeness.missing)}
      >
        {completeness.total === 0 ? (
          <p className="text-xs text-gray-500">Add English content first — Hindi coverage is measured against it.</p>
        ) : (
          <>
            <div className="mb-2 h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-emerald-600"
                style={{
                  width: `${Math.round(((completeness.total - completeness.missing) / completeness.total) * 100)}%`,
                }}
              />
            </div>
            <ul className="space-y-1">
              {completeness.details.map((entry) => (
                <li key={entry.label} className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-gray-700">{entry.label}</span>
                  <span className={entry.missing > 0 ? "font-bold text-amber-700" : "font-bold text-emerald-700"}>
                    {entry.missing > 0 ? `${entry.missing} missing of ${entry.total}` : "complete"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-gray-500">
              Empty Hindi fields fall back to English on the public page, so this is a quality badge, not a blocker.
            </p>
          </>
        )}
      </StudioSection>
    </div>
  )
}
