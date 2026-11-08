import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import {
  buildPyqPdfSource,
  buildPyqPdfDownloadUrl,
  resolvePyqPdfAction,
  resolvePostPaymentPdfAction,
  PYQ_UNLOCK_PENDING_MESSAGE,
  PYQ_PDF_BADGE_LABEL,
  PYQ_PDF_MODAL_TEST_ID,
} from "@/lib/pyqs/pdf-modal"

const ROOT = path.resolve(__dirname, "../..")
const read = (relative: string) => fs.readFileSync(path.join(ROOT, relative), "utf8")

test("PYQ PDF src and download URL builders encode ids and set download query", () => {
  assert.equal(buildPyqPdfSource("paper_123"), "/api/pyqs/file/paper_123")
  assert.equal(buildPyqPdfDownloadUrl("paper_123"), "/api/pyqs/file/paper_123?download=1")

  // Special characters must be URI encoded
  const trickyId = "bpsc/2024 Prelims#1"
  assert.equal(
    buildPyqPdfSource(trickyId),
    `/api/pyqs/file/${encodeURIComponent(trickyId)}`
  )
  assert.equal(
    buildPyqPdfDownloadUrl(trickyId),
    `/api/pyqs/file/${encodeURIComponent(trickyId)}?download=1`
  )
})

test("PYQ action resolver: guest path sends to login, never opens modal", () => {
  assert.equal(
    resolvePyqPdfAction({ isAuthenticated: false, lockState: "locked" }),
    "login",
    "Unauthenticated user on locked paper must be routed to login"
  )
  assert.equal(
    resolvePyqPdfAction({ isAuthenticated: false, lockState: "unlocked" }),
    "login",
    "Unauthenticated user on unlocked paper must be routed to login"
  )
  assert.equal(
    resolvePyqPdfAction({ isAuthenticated: false, lockState: "free" }),
    "login",
    "Unauthenticated user on free paper must be routed to login"
  )
})

test("PYQ action resolver: locked paper opens the Pass popup", () => {
  assert.equal(
    resolvePyqPdfAction({ isAuthenticated: true, lockState: "locked" }),
    "pass",
    "Authenticated user on locked paper must trigger the pass popup"
  )
})

test("PYQ action resolver: unlocked/free paper opens the PDF modal directly", () => {
  assert.equal(
    resolvePyqPdfAction({ isAuthenticated: true, lockState: "unlocked" }),
    "pdf",
    "Authenticated user on unlocked paper must open the PDF modal"
  )
  assert.equal(
    resolvePyqPdfAction({ isAuthenticated: true, lockState: "free" }),
    "pdf",
    "Authenticated user on free paper must open the PDF modal"
  )
})

test("Post-payment access probe: opens modal only on success, handles 403 pending and errors", () => {
  // 200 OK -> open
  assert.equal(resolvePostPaymentPdfAction(200), "open")
  // 0 / opaque redirect -> open (fetch with redirect: "manual" returns status 0 or 302/307)
  assert.equal(resolvePostPaymentPdfAction(0), "open")
  assert.equal(resolvePostPaymentPdfAction(302), "open")

  // 403 Forbidden -> pending (webhook / fulfilment may still be writing Pass)
  assert.equal(resolvePostPaymentPdfAction(403), "pending")
  assert.ok(
    PYQ_UNLOCK_PENDING_MESSAGE.includes("Payment received, unlocking"),
    "Pending message must inform user payment was received"
  )

  // 400, 404, 500 -> error
  assert.equal(resolvePostPaymentPdfAction(400), "error")
  assert.equal(resolvePostPaymentPdfAction(404), "error")
  assert.equal(resolvePostPaymentPdfAction(500), "error")
  assert.equal(resolvePostPaymentPdfAction(502), "error")
})

test("Constants: badge labels and test ids are present", () => {
  assert.equal(PYQ_PDF_BADGE_LABEL, "Official PYQ Paper")
  assert.equal(PYQ_PDF_MODAL_TEST_ID, "pyq-pdf-modal")
})

test("Shared modal usage across all required pages", () => {
  const filesToCheck = [
    "app/(dashboard)/books/orders/page.tsx",
    "components/course/CoursePlayerClient.tsx",
    "components/learn/LessonViewer.tsx",
    "components/pyqs/PyqStudentListingClient.tsx",
    "app/(dashboard)/doubts/page.tsx",
    "app/(dashboard)/teacher/questions/page.tsx",
    "components/admin/pyqs/PyqPapersListClient.tsx",
    "components/admin/current-affairs/CurrentAffairsStudioClient.tsx",
    "components/admin/courses/VideoCourseEditorClient.tsx",
  ]

  for (const file of filesToCheck) {
    const content = read(file)
    assert.ok(
      content.includes("usePdfModal"),
      `${file} must use usePdfModal hook`
    )
    assert.ok(
      content.includes("<PdfModal"),
      `${file} must render <PdfModal />`
    )
  }
})
