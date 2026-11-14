import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getPrivateFileSignedUrl, isPrivateStorageConfigured } from "@/lib/s3"
import { deriveStoredObjectKey, isExternalMediaUrl } from "@/lib/storage/stored-object-key"
import { evaluateLessonAccess } from "@/lib/courses/lesson-access"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Short-lived signed GET URL. Kept inside the 5-10 minute window. */
export const SIGNED_URL_TTL_SECONDS = 600

type FileKind = "attachment" | "video"

function sanitizeFileName(value: string | null | undefined, fallback: string): string {
  const raw = (value || "").trim() || fallback
  // Header-safe file name: no quotes, no path separators, no control characters.
  const safe = raw
    .replace(/[\r\n\x00-\x1f\x7f"]/g, "")
    .replace(/[\\/]/g, "-")
    .slice(0, 120)
    .trim()
  return safe || fallback
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } }
  )
}

/**
 * GET /api/courses/lesson-file?lessonId=<id>&kind=attachment|video&disposition=inline|attachment
 *
 * Returns a short-lived presigned GET URL for the lesson's stored file, after the
 * same access check the learn page performs (staff / free course / trial lesson /
 * enrolled). The client never sends a bucket URL: the object key is derived on the
 * server from the lesson row and must live under an allowed lesson-media prefix.
 */
export async function GET(req: NextRequest) {
  const lessonId = req.nextUrl.searchParams.get("lessonId")
  const kindParam = req.nextUrl.searchParams.get("kind")
  const kind: FileKind = kindParam === "video" ? "video" : "attachment"
  const wantsDownload = req.nextUrl.searchParams.get("disposition") === "attachment"

  if (!lessonId) {
    return jsonError("A lessonId is required.", 400)
  }

  try {
    const session = await auth()
    const userId = session?.user?.id || null
    const role = session?.user?.role || null

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        isTrial: true,
        videoUrl: true,
        attachmentUrl: true,
        attachmentName: true,
        attachmentType: true,
        chapter: {
          select: {
            course: {
              select: { id: true, isPremium: true, price: true },
            },
          },
        },
      },
    })

    if (!lesson) {
      return jsonError("Lesson not found.", 404)
    }

    const course = lesson.chapter?.course
    if (!course) {
      return jsonError("Lesson not found.", 404)
    }

    const enrollment = userId
      ? await prisma.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId,
              courseId: course.id,
            },
          },
          select: { id: true },
        })
      : null

    // Identical decision to the learn page: staff / free course / trial lesson /
    // enrolled. Anonymous visitors are allowed only through the trial/free branch.
    const access = evaluateLessonAccess({
      lesson,
      course,
      role,
      isEnrolled: Boolean(enrollment),
    })

    if (!access.allowed) {
      return jsonError("You do not have access to this file.", 403)
    }

    const storedUrl = kind === "video" ? lesson.videoUrl : lesson.attachmentUrl
    if (!storedUrl) {
      return jsonError("No file is stored for this lesson.", 404)
    }

    const fileName = sanitizeFileName(
      lesson.attachmentName,
      kind === "video" ? "lesson-video" : "lesson-document.pdf"
    )

    // Article / live links and any external CDN URL are not private bucket
    // objects: they are returned untouched (and clearly marked unsigned).
    const isExternalLink =
      kind === "attachment" &&
      (lesson.attachmentType === "ARTICLE" || lesson.attachmentType === "LIVE")

    if (isExternalLink || isExternalMediaUrl(storedUrl)) {
      return NextResponse.json(
        { url: storedUrl, signed: false, kind, name: fileName, expiresIn: null },
        { headers: { "Cache-Control": "no-store" } }
      )
    }

    // Non-prod local fallback (/uploads/...): a same-origin path the browser can
    // already fetch. Nothing to sign.
    if (storedUrl.startsWith("/")) {
      return NextResponse.json(
        { url: storedUrl, signed: false, kind, name: fileName, expiresIn: null },
        { headers: { "Cache-Control": "no-store" } }
      )
    }

    const key = deriveStoredObjectKey(storedUrl)
    if (!key) {
      // Our bucket, but the object is outside the lesson-media folders.
      return jsonError("This file is stored outside the allowed course folders.", 400)
    }

    if (!isPrivateStorageConfigured()) {
      return jsonError("File storage is not configured.", 503)
    }

    const url = await getPrivateFileSignedUrl(key, SIGNED_URL_TTL_SECONDS, {
      contentDisposition: `${wantsDownload ? "attachment" : "inline"}; filename="${fileName}"`,
    })

    return NextResponse.json(
      {
        url,
        signed: true,
        kind,
        name: fileName,
        expiresIn: SIGNED_URL_TTL_SECONDS,
      },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (err: any) {
    console.error("GET /api/courses/lesson-file error:", err)
    return jsonError("Could not prepare a secure link for this file.", 500)
  }
}
