import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

/**
 * Regression test for the course lesson player:
 *  1. No page links to the non-existent `/courses/<slug>/learn?lesson=<id>` route.
 *     The real route is app/(dashboard)/courses/[slug]/learn/[lessonId]/page.tsx.
 *  2. The Lectures section opens `/courses/<slug>/learn/<lessonId>`.
 *  3. The Resources tab attachment row offers View + Download when a link exists,
 *     and an honest "not uploaded" message when the lesson has no stored file.
 */

const ROOT = path.resolve(__dirname, "../..")
const SOURCE_DIRS = ["app", "components", "lib"]
const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/
const read = (relative: string) => fs.readFileSync(path.join(ROOT, relative), "utf8")

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const relative = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(relative, out)
    } else if (SOURCE_EXT.test(entry.name)) {
      out.push(relative)
    }
  }
  return out
}

test("no source file links to the non-existent learn?lesson= route", () => {
  const offenders: string[] = []
  for (const dir of SOURCE_DIRS) {
    for (const file of walk(dir)) {
      const source = read(file)
      if (source.includes("learn?lesson=") || source.includes("learn/?lesson=")) {
        offenders.push(file)
      }
    }
  }
  assert.deepEqual(offenders, [], `learn?lesson= links must be removed: ${offenders.join(", ")}`)
})

test("CourseDetailV2 lectures section opens the path-segment learn route", () => {
  const source = read("components/course/detail/CourseDetailV2.tsx")
  assert.ok(
    /\/courses\/\$\{course\.slug\}\/learn\/\$\{lessonId\}/.test(source),
    "CourseDetailV2 must build /courses/${course.slug}/learn/${lessonId}"
  )
  assert.ok(
    !source.includes("onOpenLesson") || source.includes("window.location.href"),
    "onOpenLesson must still navigate"
  )
})

test("the player route the link targets exists and reads lessonId from params", () => {
  const routePath = "app/(dashboard)/courses/[slug]/learn/[lessonId]/page.tsx"
  assert.ok(fs.existsSync(path.join(ROOT, routePath)), `${routePath} must exist`)
  const route = read(routePath)
  assert.ok(route.includes("lessonId"), "route must read the lessonId path param")
})

test("resources attachment row offers View and Download controls", () => {
  const source = read("components/course/CoursePlayerClient.tsx")
  const start = source.indexOf("{/* Tab 3: Resources (PDF attachments) */}")
  assert.ok(start > -1, "resources tab marker not found")
  const end = source.indexOf("{/* Tab 4:", start)
  assert.ok(end > start, "resources tab block could not be delimited")
  const block = source.slice(start, end)

  assert.ok(block.includes("buildPdfReaderHref"), "View must reuse the shared in-app PDF reader")
  assert.ok(/<span>View<\/span>/.test(block), "attachment row must render a View control")
  assert.ok(/<span>Download<\/span>/.test(block), "attachment row must render a Download control")
  assert.ok(block.includes("download={"), "Download must use the download attribute")
  assert.ok(
    block.includes("File not uploaded correctly.") && block.includes("Please contact support."),
    "missing files must show the honest not-uploaded message"
  )
  assert.ok(
    !block.includes(">Unavailable<"),
    "the resources row must no longer show a dead Unavailable button"
  )
})
