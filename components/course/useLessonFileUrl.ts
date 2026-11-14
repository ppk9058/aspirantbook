"use client"

import { useEffect, useState } from "react"

export type LessonFileKind = "attachment" | "video"

export interface LessonFileUrls {
  /** URL to show in the reader / video element (null until resolved). */
  view: string | null
  /** URL that forces a download (attachment only). */
  download: string | null
  loading: boolean
  /** Visible, human-readable failure reason. Never silently empty. */
  error: string | null
  /** True when the stored value is an external link (article, live, CDN). */
  isExternal: boolean
}

const EMPTY: LessonFileUrls = {
  view: null,
  download: null,
  loading: false,
  error: null,
  isExternal: false,
}

async function requestFileUrl(
  lessonId: string,
  kind: LessonFileKind,
  disposition: "inline" | "attachment"
): Promise<{ url: string | null; signed: boolean; error?: string }> {
  const params = new URLSearchParams({ lessonId, kind, disposition })
  // Same-origin request: session cookie only. No Authorization header is ever sent,
  // and the signed URL this returns is fetched by the browser with no credentials.
  const res = await fetch(`/api/courses/lesson-file?${params.toString()}`, {
    cache: "no-store",
  })
  const data = (await res.json().catch(() => null)) as
    | { url?: unknown; signed?: unknown; error?: unknown }
    | null

  if (!res.ok) {
    const message =
      data && typeof data.error === "string"
        ? data.error
        : "Could not prepare a secure link for this file."
    return { url: null, signed: false, error: message }
  }

  return {
    url: data && typeof data.url === "string" ? data.url : null,
    signed: data?.signed === true,
  }
}

/**
 * Resolves the playable / downloadable URL for a lesson file through the server
 * route, so a private bucket URL never reaches the page.
 *
 * `enabled` is false when the lesson has no stored file (or the DTO stripped it),
 * which is also the case for every locked lesson.
 */
export function useLessonFileUrls(
  lessonId: string | null | undefined,
  kind: LessonFileKind,
  enabled: boolean
): LessonFileUrls {
  const [state, setState] = useState<LessonFileUrls>(EMPTY)

  useEffect(() => {
    if (!enabled || !lessonId) {
      setState(EMPTY)
      return
    }

    let mounted = true
    setState({ ...EMPTY, loading: true })

    const run = async () => {
      try {
        const view = await requestFileUrl(lessonId, kind, "inline")
        if (!view.url) {
          if (mounted) {
            setState({
              ...EMPTY,
              error: view.error || "Could not prepare a secure link for this file.",
            })
          }
          return
        }

        let download: string | null = null
        if (kind === "attachment" && view.signed) {
          const dl = await requestFileUrl(lessonId, kind, "attachment")
          download = dl.url
        }

        if (mounted) {
          setState({
            view: view.url,
            download,
            loading: false,
            error: null,
            isExternal: !view.signed,
          })
        }
      } catch (err: any) {
        if (mounted) {
          setState({
            ...EMPTY,
            error: err?.message || "Could not prepare a secure link for this file.",
          })
        }
      }
    }

    run()

    return () => {
      mounted = false
    }
  }, [lessonId, kind, enabled])

  return state
}

/** True when the value is a video URL that the secure route must resolve. */
export function needsSignedVideoUrl(videoUrl: string | null | undefined): boolean {
  if (!videoUrl) return false
  const url = videoUrl.trim()
  if (!url) return false
  if (url.startsWith("/uploads/")) return false
  if (url.startsWith("blob:")) return false
  // YouTube is embedded directly (public platform URL, never a private object)
  if (url.includes("youtube.com") || url.includes("youtu.be")) return false
  return /^https?:\/\//i.test(url)
}
