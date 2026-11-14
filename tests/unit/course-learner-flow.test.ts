import test, { describe } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

import { toSafeLessonDto } from "@/lib/courses/course-dto"
import { evaluateLessonAccess, isFreeCourseForAccess } from "@/lib/courses/lesson-access"
import {
  formatDurationMinutes,
  isDocumentLesson,
  lessonDurationLabel,
  parseDurationTextToMinutes,
} from "@/lib/courses/lesson-duration"
import { deriveStoredObjectKey } from "@/lib/storage/stored-object-key"
import { isAllowedReaderSrc } from "@/lib/pdf/reader-src"

/**
 * Regression tests for the course learner flow:
 *  1. /courses/[slug]/learn exists and resumes the last-watched lesson.
 *  2. Document lessons never render the video player.
 *  3. The trial flag unlocks in the DTO; paid lessons stay locked.
 *  4. The signed-URL route checks access before signing and only signs keys
 *     under the lesson-media prefixes.
 *  5. /pdf/view never receives a raw private bucket URL.
 *  6. Durations come from the stored value, and documents show none.
 */

const ROOT = path.resolve(__dirname, "../..")
const read = (relative: string) => fs.readFileSync(path.join(ROOT, relative), "utf8")

const PLAYER = "components/course/CoursePlayerClient.tsx"
const ROUTE = "app/api/courses/lesson-file/route.ts"
const LEARN_INDEX = "app/(dashboard)/courses/[slug]/learn/page.tsx"

function between(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker)
  assert.ok(start > -1, `marker ${startMarker} not found`)
  const end = source.indexOf(endMarker, start)
  assert.ok(end > start, `marker ${endMarker} not found after ${startMarker}`)
  return source.slice(start, end)
}

describe("1. /learn entry point", () => {
  test("the /courses/[slug]/learn page exists", () => {
    assert.ok(fs.existsSync(path.join(ROOT, LEARN_INDEX)), `${LEARN_INDEX} must exist`)
    const source = read(LEARN_INDEX)
    assert.ok(source.includes("redirect("), "the page must redirect to a lesson")
    assert.ok(
      /orderBy:\s*\{\s*lastAccessed:\s*"desc"\s*\}/.test(source),
      "the page must resume the last-watched lesson (progress.lastAccessed desc)"
    )
    assert.ok(
      source.includes("lessons[0]"),
      "the page must fall back to the first lesson"
    )
    assert.ok(
      source.includes("evaluateLessonAccess"),
      "the page must reuse the shared lesson access helper"
    )
    assert.ok(
      source.includes("?locked=true"),
      "non-enrolled users must still hit the access redirect"
    )
  })

  test("the enrolled course page card links to the /learn entry point", () => {
    const sticky = read("components/course/detail/StickyCard.tsx")
    assert.ok(
      sticky.includes("/courses/${course.slug}/learn"),
      "the enrolled buy card must link to /courses/<slug>/learn"
    )
    assert.ok(
      sticky.includes("Start learning"),
      "the enrolled buy card must show a Start learning label"
    )
    const bundle = read("components/course/CourseBundleView.tsx")
    assert.ok(
      !bundle.includes("/learn/start"),
      "the dead /learn/start URL must be gone"
    )
  })
})

describe("2. document lessons never render the video player", () => {
  test("a document lesson is not a video lesson", () => {
    assert.equal(isDocumentLesson({ type: "READING" }), true)
    assert.equal(isDocumentLesson({ type: "VIDEO" }), false)
    assert.equal(isDocumentLesson({ type: "READING", videoUrl: "https://cdn/x.mp4" }), false)
  })

  test("the player renders a document stage instead of poster/play", () => {
    const source = read(PLAYER)
    assert.ok(source.includes('data-testid="document-lesson-stage"'))
    assert.ok(
      source.includes("isDocument ?") || source.includes("isDocument &&"),
      "the stage must branch on isDocumentLesson"
    )

    // The document branch is rendered before the video/poster branch and does not
    // contain the poster play button.
    const unlocked = between(source, "{isUnlocked ? (", ") : (\n              /* Paywall when course is locked */")
    const docIndex = unlocked.indexOf('data-testid="document-lesson-stage"')
    const posterIndex = unlocked.indexOf("Play {activeLesson.title}")
    assert.ok(docIndex > -1, "document stage missing from the unlocked branch")
    assert.ok(posterIndex > docIndex, "the poster must be rendered after the document branch")
  })
})

describe("3. trial lessons unlock, paid lessons stay locked", () => {
  const course = { isPremium: true, price: 4999 }

  test("the DTO keeps trial media and strips paid media for a non-enrolled viewer", () => {
    const trial = toSafeLessonDto(
      {
        id: "trial-1",
        title: "Free preview",
        type: "VIDEO",
        isTrial: true,
        videoUrl: "https://bucket.example/courses/trial.mp4",
        attachmentUrl: "https://bucket.example/courses/trial.pdf",
        content: "preview body",
      },
      false,
      true
    )
    assert.equal(trial.videoUrl, "https://bucket.example/courses/trial.mp4")
    assert.equal(trial.attachmentUrl, "https://bucket.example/courses/trial.pdf")

    const paid = toSafeLessonDto(
      {
        id: "paid-1",
        title: "Paid lesson",
        type: "VIDEO",
        isTrial: false,
        videoUrl: "https://bucket.example/courses/paid.mp4",
        attachmentUrl: "https://bucket.example/courses/paid.pdf",
        content: "paid body",
      },
      false,
      true
    )
    assert.equal(paid.videoUrl, null)
    assert.equal(paid.attachmentUrl, null)
    assert.equal(paid.content, null)
  })

  test("access evaluation unlocks trial lessons only for non-enrolled viewers", () => {
    const trial = evaluateLessonAccess({
      lesson: { isTrial: true },
      course,
      role: "STUDENT",
      isEnrolled: false,
    })
    assert.deepEqual(trial, { allowed: true, reason: "trial" })

    const paid = evaluateLessonAccess({
      lesson: { isTrial: false },
      course,
      role: "STUDENT",
      isEnrolled: false,
    })
    assert.deepEqual(paid, { allowed: false, reason: "locked" })

    const enrolled = evaluateLessonAccess({
      lesson: { isTrial: false },
      course,
      role: "STUDENT",
      isEnrolled: true,
    })
    assert.deepEqual(enrolled, { allowed: true, reason: "enrolled" })

    assert.equal(isFreeCourseForAccess({ isPremium: false, price: 0 }), true)
    assert.equal(isFreeCourseForAccess(course), false)
  })

  test("the course detail page passes trial media through to non-enrolled viewers", () => {
    const source = read("app/(dashboard)/courses/[slug]/page.tsx")
    assert.ok(
      source.includes("toSafeCourseDto(course, hasAccess, true)"),
      "trial media must stay available on the course page (allowTrialMedia = true)"
    )
    const lectures = read("components/course/detail/LecturesSection.tsx")
    assert.ok(
      lectures.includes("isEnrolled || Boolean(lesson.isTrial)"),
      "trial lectures must show the play button, not the lock"
    )
  })
})

describe("4. signed-URL route", () => {
  test("it re-checks access before signing", () => {
    const source = read(ROUTE)
    assert.ok(source.includes("prisma.enrollment.findUnique"), "must read the enrollment")
    assert.ok(source.includes("evaluateLessonAccess"), "must reuse the shared access helper")

    const accessIndex = source.indexOf("if (!access.allowed)")
    const signIndex = source.indexOf("getPrivateFileSignedUrl(")
    assert.ok(accessIndex > -1, "missing the access gate")
    assert.ok(signIndex > -1, "missing the signing call")
    assert.ok(accessIndex < signIndex, "access must be checked before signing")
    assert.ok(source.includes("403"), "locked lessons must return 403")
    assert.ok(source.includes("SIGNED_URL_TTL_SECONDS = 600"), "the signed URL must live 5-10 minutes")
  })

  test("it only signs keys under the lesson-media prefixes", (t) => {
    const saved = {
      bucket: process.env.AWS_S3_BUCKET_NAME,
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.AWS_REGION,
    }
    process.env.AWS_S3_BUCKET_NAME = "aspirantbook-files"
    process.env.S3_ENDPOINT = "https://account123.r2.cloudflarestorage.com"
    process.env.AWS_REGION = "auto"

    t.after(() => {
      if (saved.bucket === undefined) delete process.env.AWS_S3_BUCKET_NAME
      else process.env.AWS_S3_BUCKET_NAME = saved.bucket
      if (saved.endpoint === undefined) delete process.env.S3_ENDPOINT
      else process.env.S3_ENDPOINT = saved.endpoint
      if (saved.region === undefined) delete process.env.AWS_REGION
      else process.env.AWS_REGION = saved.region
    })

    const host = "https://aspirantbook-files.account123.r2.cloudflarestorage.com"

    assert.equal(deriveStoredObjectKey(`${host}/courses/abc.pdf`), "courses/abc.pdf")
    assert.equal(deriveStoredObjectKey(`${host}/course-videos/abc.mp4`), "course-videos/abc.mp4")
    assert.equal(
      deriveStoredObjectKey(`${host}/courses/abc.pdf?X-Amz-Signature=deadbeef`),
      "courses/abc.pdf"
    )

    // Outside the allowed prefixes: never signable.
    assert.equal(deriveStoredObjectKey(`${host}/secrets/payroll.pdf`), null)
    assert.equal(deriveStoredObjectKey(`${host}/users/1/private.pdf`), null)
    // Traversal and foreign hosts are rejected too.
    assert.equal(deriveStoredObjectKey(`${host}/courses/../secrets/x.pdf`), null)
    assert.equal(deriveStoredObjectKey("https://evil.example.com/courses/abc.pdf"), null)
    assert.equal(deriveStoredObjectKey(null), null)
  })
})

describe("5. /pdf/view never receives the raw private bucket URL", () => {
  test("the resources tab builds the reader link from the signed URL", () => {
    const source = read(PLAYER)
    const resources = between(source, "{/* Tab 3: Resources (PDF attachments) */}", "{/* Tab 4:")
    assert.ok(resources.includes("buildPdfReaderHref"), "View must reuse the shared PDF reader")
    assert.ok(resources.includes("src: attachmentViewUrl"), "the reader src must be the signed URL")
    assert.ok(
      !resources.includes("src: attachmentUrl"),
      "the raw stored bucket URL must never reach /pdf/view"
    )
    assert.ok(
      resources.includes("attachmentDownloadUrl"),
      "Download must use the signed download URL"
    )
    assert.ok(resources.includes("<span>View</span>"), "a View control must remain")
    assert.ok(resources.includes("<span>Download</span>"), "a Download control must remain")
  })

  test("the player only ever exposes signed or external lesson files", () => {
    const source = read(PLAYER)
    assert.ok(
      source.includes("useLessonFileUrls(activeLesson.id"),
      "lesson files must be resolved through the server route"
    )
    assert.ok(
      source.includes("playableVideoUrl"),
      "the video element must use the resolved (signed) URL"
    )
    assert.ok(
      !source.includes("<video\n                    src={activeLesson.videoUrl"),
      "the video element must not use the raw stored videoUrl"
    )
  })

  test("a presigned storage URL stays readable in the shared reader", (t) => {
    const saved = {
      bucket: process.env.AWS_S3_BUCKET_NAME,
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.AWS_REGION,
    }
    process.env.AWS_S3_BUCKET_NAME = "aspirantbook-files"
    process.env.S3_ENDPOINT = "https://account123.r2.cloudflarestorage.com"
    process.env.AWS_REGION = "auto"
    t.after(() => {
      if (saved.bucket === undefined) delete process.env.AWS_S3_BUCKET_NAME
      else process.env.AWS_S3_BUCKET_NAME = saved.bucket
      if (saved.endpoint === undefined) delete process.env.S3_ENDPOINT
      else process.env.S3_ENDPOINT = saved.endpoint
      if (saved.region === undefined) delete process.env.AWS_REGION
      else process.env.AWS_REGION = saved.region
    })

    const signed =
      "https://aspirantbook-files.account123.r2.cloudflarestorage.com/courses/abc.pdf" +
      "?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=KEY%2F20261115%2Fauto%2Fs3%2Faws4_request" +
      "&X-Amz-Date=20261115T101010Z&X-Amz-Expires=600&X-Amz-Signature=deadbeef&X-Amz-SignedHeaders=host"
    assert.equal(isAllowedReaderSrc(signed), true)
  })
})

describe("6. durations", () => {
  test("real durations format identically everywhere", () => {
    assert.equal(formatDurationMinutes(105), "1h 45m")
    assert.equal(formatDurationMinutes(45), "45m")
    assert.equal(formatDurationMinutes(120), "2h")
    assert.equal(formatDurationMinutes(null), null)
  })

  test("legacy duration text parses into minutes", () => {
    assert.equal(parseDurationTextToMinutes("1h 45m 00s"), 105)
    assert.equal(parseDurationTextToMinutes("1:45:00"), 105)
    assert.equal(parseDurationTextToMinutes("45 min"), 45)
    assert.equal(parseDurationTextToMinutes(""), null)
  })

  test("the stored duration wins and document lessons show none", () => {
    assert.equal(lessonDurationLabel({ type: "VIDEO", duration: 105 }), "1h 45m")
    assert.equal(lessonDurationLabel({ type: "VIDEO", duration: 105, durationText: "9h" }), "1h 45m")
    assert.equal(lessonDurationLabel({ type: "READING", duration: 60, durationText: "1h" }), null)
    assert.equal(lessonDurationLabel({ type: "READING", attachmentUrl: "x.pdf" }), null)
  })

  test("legacy seed rows that stored seconds do not display as 42h", () => {
    // scripts/seed-12-category-courses.ts used to write seconds into the minutes column.
    assert.equal(
      lessonDurationLabel({ type: "VIDEO", duration: 2520, durationText: "42 mins" }),
      "42m"
    )
  })

  test("the admin upload flow reads the real video length", () => {
    const editor = read("components/admin/courses/VideoCourseEditorClient.tsx")
    assert.ok(
      editor.includes("readVideoDurationMinutes"),
      "the upload flow must read the real duration from the video metadata"
    )
    assert.ok(
      /duration:\s*lessonType === "VIDEO" \? lessonDuration : null/.test(editor),
      "the real duration must be sent for video lessons only"
    )
    assert.ok(!editor.includes('"1h 45m 00s"'), "the hard-coded default duration must be gone")
    assert.ok(!editor.includes('"1h 30m 00s"'), "the hard-coded add-lesson duration must be gone")
  })
})
