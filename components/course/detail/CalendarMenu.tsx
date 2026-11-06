"use client"

import { useEffect, useRef, useState } from "react"
import { CalendarPlus, Download, ExternalLink } from "lucide-react"
import { buildCourseIcs, buildGoogleCalendarUrl, icsFileName } from "@/lib/calendar/ics"

export interface CalendarLecture {
  uid: string
  title: string
  start: Date | string | null
  durationMinutes?: number | null
  description?: string | null
  url?: string | null
}

interface CalendarMenuProps {
  courseTitle: string
  courseUid: string
  lectures: CalendarLecture[]
  /** Optional single lecture; when omitted the whole course is exported. */
  single?: CalendarLecture | null
}

function toDate(value: Date | string | null): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * "Add to calendar" menu: .ics download (whole course or one lecture) and a
 * Google Calendar link. Clients only — no network calls.
 */
export function CalendarMenu({ courseTitle, courseUid, lectures, single }: CalendarMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const dated = (single ? [single] : lectures).filter((lecture) => toDate(lecture.start))

  const download = () => {
    const toIcs = (lecture: CalendarLecture) => ({
      uid: lecture.uid,
      title: lecture.title,
      description: lecture.description ?? null,
      start: toDate(lecture.start),
      durationMinutes: lecture.durationMinutes ?? null,
      url: lecture.url ?? null,
    })
    const ics = single
      ? buildCourseIcs({ courseTitle, courseUid, lectures: [toIcs(single)] })
      : buildCourseIcs({ courseTitle, courseUid, lectures: lectures.map(toIcs) })
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" })
    const href = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = href
    link.download = icsFileName(single ? single.title : courseTitle)
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(href)
    setOpen(false)
  }

  const first = dated[0]
  const firstDate = first ? toDate(first.start) : null
  const googleUrl =
    first && firstDate
      ? buildGoogleCalendarUrl({
          title: single ? first.title : courseTitle,
          details: first.description || undefined,
          start: firstDate,
          durationMinutes: first.durationMinutes ?? 60,
          location: "Online",
        })
      : null

  if (dated.length === 0) {
    return (
      <p className="text-xs text-gray-500">No scheduled classes yet — check back soon.</p>
    )
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-800 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <CalendarPlus className="h-4 w-4" aria-hidden="true" />
        Add to calendar
      </button>

      {open && (
        <div role="menu" className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <button
            type="button"
            role="menuitem"
            onClick={download}
            className="flex min-h-[44px] w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download .ics ({single ? "this class" : `${dated.length} classes`})
          </button>
          {googleUrl && (
            <a
              role="menuitem"
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex min-h-[44px] w-full items-center gap-2 border-t border-gray-100 px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Add first class to Google Calendar
            </a>
          )}
        </div>
      )}
    </div>
  )
}
