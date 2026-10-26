import { describe, it } from "node:test"
import assert from "node:assert/strict"
import path from "node:path"

import { ESLint } from "eslint"

/**
 * B-017 regression: these components shipped with `react-hooks/exhaustive-deps`
 * warnings, i.e. effects that read stale props/state. They must stay clean.
 *
 * Before the fix this suite reported 11 warnings across the nine files.
 */
const FILES = [
  "components/course/EnhancedVideoPlayer.tsx",
  "components/course/LiveDemoRoomClient.tsx",
  "components/editor/TutorialImportModal.tsx",
  "components/learn/LessonViewer.tsx",
  "app/(dashboard)/test-series/[id]/TestSeriesDetailClient.tsx",
  "app/(exam)/test-series/[id]/attempt/AttemptClient.tsx",
  "components/admin/authwall/SelectedGateToolbar.tsx",
  "components/admin/courses/CourseCouponsManager.tsx",
  "components/admin/courses/VideoCourseEditorClient.tsx",
]

describe("B-017: hook dependency arrays are exhaustive", () => {
  it("reports no react-hooks/exhaustive-deps warnings in the fixed components", async () => {
    const eslint = new ESLint({ cwd: process.cwd() })
    const results = await eslint.lintFiles(FILES.map((file) => path.join(process.cwd(), file)))

    const warnings = results.flatMap((result) =>
      result.messages
        .filter((message) => message.ruleId === "react-hooks/exhaustive-deps")
        .map((message) => `${path.relative(process.cwd(), result.filePath)}:${message.line} ${message.message}`)
    )

    assert.deepEqual(warnings, [], `stale hook dependencies:\n${warnings.join("\n")}`)
  })
})
