import { test, expect, type Page } from "@playwright/test";

/**
 * C4 (B-022): the book catalogue, book cards, cart, order history and the
 * course/teacher thumbnails used a raw <img>, so the browser downloaded the
 * full-size asset on every viewport. They now render through next/image.
 *
 * Only sources the app already allows are converted: local /public assets and
 * any https host (next.config.js allows `https://**`). `data:`/`blob:` previews
 * use `unoptimized`. A raw <img> is still expected for the gated e-book page
 * canvas, the shared tutorial renderer and the user-entered URL preview; those
 * are recorded as OWNER-ACTION in the report.
 *
 * This test asserts, at the three consumer widths, that the catalogue and the
 * book detail gallery serve covers through /_next/image and that nothing
 * scrolls horizontally.
 */

const VIEWPORTS = [
  { label: "desktop", width: 1440, height: 900 },
  { label: "tablet", width: 820, height: 1180 },
  { label: "phone", width: 390, height: 844 },
] as const;

const BOOK_SLUG = "cbse-class-9th-exemplar-solutions-maths-science";

async function noHorizontalScroll(page: Page, label: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow, `${label}: no horizontal page scroll`).toBeLessThanOrEqual(1);
}

test.describe("C4 book imagery is served through next/image", () => {
  test("catalogue and gallery at desktop, tablet and phone", async ({ page }) => {
    test.setTimeout(180_000);

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      // ── catalogue ────────────────────────────────────────────────────────
      await page.goto("/books");
      const cover = page.locator('img[src*="/_next/image"]').first();
      await expect(cover, `${viewport.label}: a book cover must be optimized`).toBeVisible({
        timeout: 30_000,
      });

      const optimized = await page.locator('img[src*="/_next/image"]').count();
      expect(optimized, `${viewport.label}: the catalogue shows optimized covers`).toBeGreaterThan(3);

      // No catalogue cover may still point at the raw asset path.
      const rawLocalCovers = await page
        .locator('img[src^="/images/books/"]')
        .count();
      expect(rawLocalCovers, `${viewport.label}: no raw local cover <img> remains`).toBe(0);

      await noHorizontalScroll(page, `${viewport.label} /books`);

      // ── detail gallery ───────────────────────────────────────────────────
      await page.goto(`/books/${BOOK_SLUG}`);
      const gallery = page.locator('img[src*="/_next/image"]').first();
      await expect(gallery, `${viewport.label}: the gallery image must be optimized`).toBeVisible({
        timeout: 30_000,
      });
      expect(
        await page.locator('img[src*="/_next/image"]').count(),
        `${viewport.label}: the gallery and its thumbnails are optimized`
      ).toBeGreaterThan(0);
      await noHorizontalScroll(page, `${viewport.label} /books/[slug]`);
    }
  });
});
