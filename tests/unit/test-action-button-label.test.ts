import { describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relPath), "utf-8")
}

describe("Test Action Button Label Verification", () => {
  it("TestActionButton renders 'Start Test' and never 'Start Free Sample'", () => {
    const actionBtnContent = readRepoFile("components/test-series/TestActionButton.tsx")

    // Must not contain "Start Free Sample" or "Start Free Sample Test"
    assert.doesNotMatch(
      actionBtnContent,
      /Start Free Sample/i,
      "TestActionButton must not render 'Start Free Sample' button label"
    )

    // Must contain "Start Test"
    assert.match(
      actionBtnContent,
      /<span>Start Test<\/span>/,
      "TestActionButton must render 'Start Test' as its action label"
    )
  })

  it("Preserves 'Free sample' pill badges in TestSeriesDetailClient and StudentDashboardClient", () => {
    const seriesDetail = readRepoFile("app/(dashboard)/test-series/[id]/TestSeriesDetailClient.tsx")
    const studentDashboard = readRepoFile("components/dashboard/StudentDashboardClient.tsx")

    assert.match(
      seriesDetail,
      /Free sample/,
      "TestSeriesDetailClient must preserve 'Free sample' pill badge"
    )
    assert.match(
      studentDashboard,
      /Free sample/,
      "StudentDashboardClient must preserve 'Free sample' pill badge"
    )
  })

  it("Ensures no webapp components or pages render 'Start Free Sample' or 'Start Free Sample Test'", () => {
    const scanPaths = [
      "app/(dashboard)/test-series/[id]/TestSeriesDetailClient.tsx",
      "components/test-series/TestActionButton.tsx",
      "components/exam/PackageDetailView.tsx",
      "components/dashboard/StudentDashboardClient.tsx",
      "components/quizzes/CurrentAffairsQuizzesClient.tsx",
    ]

    for (const relPath of scanPaths) {
      const content = readRepoFile(relPath)
      assert.doesNotMatch(
        content,
        /Start Free Sample/i,
        `${relPath} should not contain 'Start Free Sample'`
      )
    }
  })
})
