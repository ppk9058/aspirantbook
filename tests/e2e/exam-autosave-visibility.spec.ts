import { test, expect } from "@playwright/test";
import {
  cleanupNonce,
  createActor,
  loginThroughUi,
  newNonce,
  prisma,
  seedSeriesWithTest,
} from "./test-series-e2e-helpers";

/**
 * B-010 regression: a failure to persist the exam locally must be visible to the
 * student instead of being swallowed by an empty catch.
 *
 * Before the fix, `saveExamState(...).catch(() => {})` hid IndexedDB failures
 * completely: the student kept answering with no local backup and no warning.
 * After the fix the arena shows a "Local backup unavailable" alert.
 */
test.describe("Exam attempt: local autosave failures are visible", () => {
  test("shows the local-backup warning when IndexedDB writes fail", async ({ page }) => {
    test.setTimeout(120_000);
    await prisma.$connect();
    const nonce = newNonce();
    const teacher = await createActor(nonce, "TEACHER", "teacher-author");
    const student = await createActor(nonce, "FREE", "student-owner");

    try {
      const { series, test: testRow } = await seedSeriesWithTest({
        nonce,
        ownerId: teacher.id,
        questionCount: 2,
        durationMinutes: 30,
      });

      await loginThroughUi(page, student.email);

      // Break IndexedDB for this document only, simulating a blocked/quota-full
      // browser store. Server autosave keeps working; only the local backup dies.
      await page.addInitScript(() => {
        try {
          (window.indexedDB as IDBFactory & { open: unknown }).open = function brokenIndexedDbOpen() {
            throw new Error("IndexedDB blocked by test");
          };
        } catch {
          /* the assertion below will fail if the override did not apply */
        }
      });

      await page.goto(`/test-series/${series.slug}/attempt?testId=${testRow.id}&lang=English`);
      await expect(page.getByText("Q.1")).toBeVisible({ timeout: 30_000 });

      // Answer the first question: this schedules the 2s debounced local save.
      await page
        .locator("label")
        .filter({ hasText: `${nonce} 1 option A` })
        .first()
        .click();

      // The warning must surface instead of disappearing into a silent catch.
      await expect(page.getByTestId("cbt-local-save-warning")).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId("cbt-local-save-warning")).toContainText(/local backup unavailable/i);
    } finally {
      await cleanupNonce(nonce);
    }
  });
});
