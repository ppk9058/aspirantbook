import { describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { execFileSync } from "node:child_process"

import { pluralize } from "@/lib/utils"

/**
 * UI polish 2 — follow-up pass.
 *
 * The owner confirmed on the live site that the floating AI button
 * (components/layout/Chatbot.tsx, fixed bottom-right, z-40) covered card content
 * at phone width on /dashboard. The fix is shared, not per page: one safe-area
 * aware bottom clearance in components/layout/DashboardShell.tsx, plus mobile
 * full-width footer buttons where a small CTA was the right-most element.
 *
 * Everything here is a source-level audit: these tests cannot see a browser, so
 * every claim they make is code reading only.
 */

const ROOT = process.cwd()

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relPath), "utf-8")
}

/** The same file as it exists on app/main, or null when git history is unavailable. */
function readFromMain(relPath: string): string | null {
  try {
    return execFileSync("git", ["show", `app/main:${relPath}`], {
      cwd: ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    })
  } catch {
    return null
  }
}

// The focus rules exactly as they exist on app/main. Used as a fallback when the
// test runner has no git history (e.g. a source tarball).
const MAIN_FOCUS_BLOCK = `/* Focus styles */
*:focus-visible {
  outline: 2px solid #1448d8;
  outline-offset: 2px;
}`

function readMainGlobalsCss(): string {
  return readFromMain("app/globals.css") ?? MAIN_FOCUS_BLOCK
}

// Every rule/line that mentions focus, in file order, normalised for comparison.
function focusRules(css: string): string[] {
  const rules: string[] = []
  const lines = css.split(/\r?\n/)
  lines.forEach((line, index) => {
    if (/focus-visible|focus:not/i.test(line)) {
      rules.push(line.trim())
      for (let i = index + 1; i < lines.length; i++) {
        const next = lines[i].trim()
        if (next === "}") break
        if (next.length > 0) rules.push(next)
      }
    }
  })
  return rules
}

describe("UI polish 2 — one shared clearance for the floating AI button", () => {
  it("DashboardShell defines a single safe-area aware bottom clearance used by every main branch", () => {
    const shell = readRepoFile("components/layout/DashboardShell.tsx")

    // One constant: 9rem on phones (launcher + tab bar), 8.5rem at sm, 96px on lg.
    assert.match(shell, /const bottomClearance =/)
    assert.match(
      shell,
      /"pb-\[calc\(9rem\+env\(safe-area-inset-bottom,0px\)\)\] sm:pb-\[calc\(8\.5rem\+env\(safe-area-inset-bottom,0px\)\)\] lg:pb-24"/
    )

    // Applied to all six branches: books / tutorials / default × collapsed / expanded.
    assert.equal(
      (shell.match(/\$\{bottomClearance\}/g) ?? []).length,
      6,
      "every <main> class branch must use the shared bottom clearance"
    )

    // The video watch page keeps its full-bleed layout (player owns the viewport).
    assert.match(shell, /isVideoWatchPage\s*\n?\s*\?\s*"lg:ml-0 p-0"/)
  })

  it("pages that had their own bottom padding no longer duplicate it", () => {
    const testSeries = readRepoFile("app/(dashboard)/test-series/page.tsx")
    const books = readRepoFile("app/(dashboard)/books/page.tsx")

    assert.doesNotMatch(testSeries, /\bpb-36\b|\bpb-32\b|\bpb-28\b|\bpb-24\b/)
    assert.match(testSeries, /<div className="space-y-4 sm:space-y-5">/)

    assert.doesNotMatch(books, /\bpb-28\b|\bpb-24\b/)
    assert.match(
      books,
      /className="space-y-6 font-sans"/
    )
    assert.match(books, /data-testid="books-page-root"/)

    // The old launcher clearance (pb-32 sm:pb-24 lg:pb-12) must be gone from the
    // pages that carried it. Pages with their own fixed bottom bar keep their
    // own spacing (teacher test-series editor, test-series detail).
    const clearedPages = [
      "app/(dashboard)/settings/SettingsClient.tsx",
      "app/(dashboard)/tracks/page.tsx",
      "app/(dashboard)/search/page.tsx",
      "app/(dashboard)/profile/page.tsx",
    ]
    for (const rel of clearedPages) {
      assert.doesNotMatch(
        readRepoFile(rel),
        /pb-32 sm:pb-24 lg:pb-12/,
        `${rel} still duplicates the shared bottom clearance`
      )
    }

    // A page with its own fixed action bar must keep its clearance for that bar.
    assert.match(
      readRepoFile("app/(dashboard)/teacher/test-series/[testId]/edit/page.tsx"),
      /pb-28 sm:pb-20/
    )
    assert.match(
      readRepoFile("app/(dashboard)/test-series/[id]/TestSeriesDetailClient.tsx"),
      /pb-32 lg:pb-12/
    )
  })
})

describe("UI polish 2 — no small right-most CTA under the launcher on phones", () => {
  it("book card actions stack one per row and stay full width on phones", () => {
    const card = readRepoFile("components/books/BookCard.tsx")

    assert.match(card, /grid grid-cols-1 sm:grid-cols-2 gap-2/)
    assert.match(card, /data-testid="book-card-add-to-cart-btn"[\s\S]*?className="w-full min-h-\[44px\]/)
    assert.match(card, /data-testid="book-card-buy-now-btn"[\s\S]*?className="w-full min-h-\[44px\]/)
  })

  it("tutorial Start Tutorial is full width below sm and unchanged from sm up", () => {
    const view = readRepoFile("app/(dashboard)/tutorials/TutorialsClientView.tsx")

    assert.match(view, /className="shrink-0 w-full sm:w-auto sm:ml-auto"/)
    assert.match(view, /px-3 w-full sm:w-auto/)
  })

  it("current affairs quiz footer stacks on phones and the CTA is full width", () => {
    const client = readRepoFile("components/quizzes/CurrentAffairsQuizzesClient.tsx")

    assert.match(
      client,
      /mt-5 pt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3/
    )
    assert.match(client, /className="w-full sm:w-auto"\s*\/>/)
    // The action still passes its own className through TestActionButton.
    assert.match(client, /<TestActionButton[\s\S]*?className="w-full sm:w-auto"/)
  })

  it("footers that already used a full-width CTA keep it (no regression)", () => {
    const myTests = readRepoFile("components/test-series/MyTestsHubClient.tsx")
    const myLearning = readRepoFile("components/learning/MyLearningClient.tsx")
    const courseCard = readRepoFile("components/courses/CourseCard.tsx")

    assert.match(myTests, /<Link href=\{item\.url\} className="w-full inline-flex/)
    assert.match(myLearning, /className="w-full py-2\.5 rounded-xl bg-\[#5B47FB\]/)
    assert.match(courseCard, /className=\{`w-full py-2\.5 px-3 min-h-\[44px\]/)
  })
})

describe("UI polish 2 — plural counts on web match Expo", () => {
  it("formats singular and plural chapter counts", () => {
    assert.equal(pluralize(1, "Chapter"), "1 Chapter")
    assert.equal(pluralize(2, "Chapter"), "2 Chapters")
    assert.equal(pluralize(1, "Text Lesson"), "1 Text Lesson")
    assert.equal(pluralize(2, "Text Lesson"), "2 Text Lessons")
  })

  it("tutorial and course views use the shared helper instead of hard-coded plurals", () => {
    const tutorials = readRepoFile("app/(dashboard)/tutorials/TutorialsClientView.tsx")
    assert.doesNotMatch(tutorials, /chapters\?\.length \|\| 0\} Chapters/)
    assert.match(tutorials, /pluralize\(tutorial\.chapters\?\.length \|\| 0, "Chapter"\)/)
    assert.match(tutorials, /pluralize\(totalLessons, "Text Lesson"\)/)
    assert.match(tutorials, /pluralize\(tutorial\.chapters\.length, "Chapter"\)/)
    assert.match(tutorials, /pluralize\(totalLessons, "Lesson"\)/)

    const bundle = readRepoFile("components/course/CourseBundleView.tsx")
    assert.doesNotMatch(bundle, /course\.chapters\.length\} Chapters/)
    assert.match(bundle, /pluralize\(course\.chapters\.length, "Chapter"\)/)
    assert.match(bundle, /pluralize\(totalLessons, "lesson"\)/)
  })
})

describe("UI polish 2 — protected surfaces stay identical to app/main", () => {
  it("the floating AI launcher is not hidden, shrunk, moved, or re-layered", () => {
    const chat = readRepoFile("components/layout/Chatbot.tsx")

    assert.match(
      chat,
      /fixed bottom-\[calc\(4\.25rem\+env\(safe-area-inset-bottom,0px\)\)\] lg:bottom-6 right-3 sm:right-5 z-40 h-10 w-10 sm:h-12 sm:w-12/
    )

    const main = readFromMain("components/layout/Chatbot.tsx")
    if (main !== null) {
      assert.equal(chat, main, "Chatbot.tsx must be byte-identical to app/main")
    }
  })

  it("LeftSidebar.tsx is unchanged compared with app/main", () => {
    const current = readRepoFile("components/layout/LeftSidebar.tsx")
    const main = readFromMain("components/layout/LeftSidebar.tsx")

    if (main === null) {
      // No git history: at least prove the file is the real sidebar.
      assert.ok(current.includes("LeftSidebar"))
      return
    }

    assert.equal(current, main, "components/layout/LeftSidebar.tsx must not change")
  })

  it("keeps the global *:focus-visible rule and adds no scoped variant", () => {
    const content = readRepoFile("app/globals.css")

    assert.match(
      content,
      /\/\* Focus styles \*\/\n\*:focus-visible \{\n {2}outline: 2px solid #1448d8;\n {2}outline-offset: 2px;\n\}/
    )
    assert.doesNotMatch(content, /main\s*\*?:focus/)
    assert.doesNotMatch(content, /focus:not\(:focus-visible\)/)
  })

  it("has focus-related rules identical to app/main", () => {
    const current = readRepoFile("app/globals.css")
    const main = readMainGlobalsCss()

    assert.deepEqual(
      focusRules(current),
      focusRules(main),
      "focus-related rules in app/globals.css differ from app/main"
    )
    assert.ok(focusRules(current).length >= 3)
  })
})
