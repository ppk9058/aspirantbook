"use client"

/**
 * Reads the real duration of a local video file before it is uploaded.
 *
 * Uses the browser's own metadata parser (`loadedmetadata` on a detached
 * <video>), so no server transcoding tooling is needed and the stored duration
 * is the actual playing time rather than a hard-coded guess.
 *
 * Resolves null when the browser cannot read the file; callers must then keep
 * whatever the admin typed instead of inventing a value.
 */
export async function readVideoDurationSeconds(file: File): Promise<number | null> {
  if (typeof document === "undefined") return null
  if (!file || !file.size) return null

  const objectUrl = URL.createObjectURL(file)
  const video = document.createElement("video")
  video.preload = "metadata"
  video.muted = true
  video.playsInline = true

  try {
    const seconds = await new Promise<number | null>((resolve) => {
      const cleanup = () => {
        video.removeEventListener("loadedmetadata", onLoaded)
        video.removeEventListener("error", onError)
      }
      const onLoaded = () => {
        const value = video.duration
        cleanup()
        resolve(Number.isFinite(value) && value > 0 ? value : null)
      }
      const onError = () => {
        cleanup()
        resolve(null)
      }
      video.addEventListener("loadedmetadata", onLoaded)
      video.addEventListener("error", onError)
      video.src = objectUrl
      video.load()
    })
    return seconds
  } finally {
    video.removeAttribute("src")
    video.load()
    URL.revokeObjectURL(objectUrl)
  }
}

/** Real duration in whole minutes (minimum 1), or null when unreadable. */
export async function readVideoDurationMinutes(file: File): Promise<number | null> {
  const seconds = await readVideoDurationSeconds(file)
  if (seconds === null) return null
  return Math.max(1, Math.round(seconds / 60))
}
