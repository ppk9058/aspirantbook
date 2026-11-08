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
  PYQ_PDF_READER_TEST_ID,
} from "@/lib/pyqs/pdf-reader"

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

test("PYQ action resolver: guest path sends to login, never opens reader directly", () => {
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

test("PYQ action resolver: unlocked/free paper opens the PDF reader directly", () => {
  assert.equal(
    resolvePyqPdfAction({ isAuthenticated: true, lockState: "unlocked" }),
    "pdf",
    "Authenticated user on unlocked paper must open the PDF reader"
  )
  assert.equal(
    resolvePyqPdfAction({ isAuthenticated: true, lockState: "free" }),
    "pdf",
    "Authenticated user on free paper must open the PDF reader"
  )
})

test("Post-payment access probe: opens reader page only on success, handles 403 pending and errors", () => {
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
  assert.equal(PYQ_PDF_READER_TEST_ID, "pyq-pdf-reader")
})

test("All former modal caller sites now use in-page reader links or navigation", () => {
  // 1. Books Orders links to /books/read/
  const ordersContent = read("app/(dashboard)/books/orders/page.tsx")
  assert.ok(ordersContent.includes("/books/read/"), "orders page must link to /books/read/")

  // 2. PyqStudentListingClient links to /pyqs/pdf-view
  const pyqListing = read("components/pyqs/PyqStudentListingClient.tsx")
  assert.ok(pyqListing.includes("/pyqs/pdf-view?paperId="), "PyqStudentListingClient must link to /pyqs/pdf-view?paperId=")

  // 3. CoursePlayerClient uses buildPdfReaderHref
  const coursePlayer = read("components/course/CoursePlayerClient.tsx")
  assert.ok(coursePlayer.includes("buildPdfReaderHref"), "CoursePlayerClient must use buildPdfReaderHref")

  // 4. LessonViewer uses buildPdfReaderHref
  const lessonViewer = read("components/learn/LessonViewer.tsx")
  assert.ok(lessonViewer.includes("buildPdfReaderHref"), "LessonViewer must use buildPdfReaderHref")

  // 5. Doubts uses buildPdfReaderHref
  const doubts = read("app/(dashboard)/doubts/page.tsx")
  assert.ok(doubts.includes("buildPdfReaderHref"), "doubts page must use buildPdfReaderHref")

  // 6. Teacher questions uses buildPdfReaderHref
  const teacherQuestions = read("app/(dashboard)/teacher/questions/page.tsx")
  assert.ok(teacherQuestions.includes("buildPdfReaderHref"), "teacher questions page must use buildPdfReaderHref")

  // 7. Admin PYQ papers list uses buildPdfReaderHref
  const adminPyqs = read("components/admin/pyqs/PyqPapersListClient.tsx")
  assert.ok(adminPyqs.includes("buildPdfReaderHref"), "PyqPapersListClient must use buildPdfReaderHref")

  // 8. Admin Current Affairs studio uses buildPdfReaderHref
  const caStudio = read("components/admin/current-affairs/CurrentAffairsStudioClient.tsx")
  assert.ok(caStudio.includes("buildPdfReaderHref"), "CurrentAffairsStudioClient must use buildPdfReaderHref")

  // 9. Admin Video Course Editor uses buildPdfReaderHref
  const videoCourseEditor = read("components/admin/courses/VideoCourseEditorClient.tsx")
  assert.ok(videoCourseEditor.includes("buildPdfReaderHref"), "VideoCourseEditorClient must use buildPdfReaderHref")

  // 10. Current Affairs Quizzes uses buildPdfReaderHref
  const caQuizzes = read("components/quizzes/CurrentAffairsQuizzesClient.tsx")
  assert.ok(caQuizzes.includes("buildPdfReaderHref"), "CurrentAffairsQuizzesClient must use buildPdfReaderHref")

  // 11. BookDetailsClient links to /books/read/
  const bookDetails = read("components/books/BookDetailsClient.tsx")
  assert.ok(bookDetails.includes("/books/read/"), "BookDetailsClient must link to /books/read/")

  // 12. CartDrawer and Cart page route to /books/read/
  const cartDrawer = read("components/books/CartDrawer.tsx")
  assert.ok(cartDrawer.includes("/books/read/"), "CartDrawer must route to /books/read/")
  const cartPage = read("app/(dashboard)/books/cart/page.tsx")
  assert.ok(cartPage.includes("/books/read/"), "cart page must route to /books/read/")
})
