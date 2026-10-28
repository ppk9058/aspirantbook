import { test, expect } from "@playwright/test";

import {
  createActor,
  loginThroughUi,
  newNonce,
  prisma,
} from "./test-series-e2e-helpers";

/**
 * C1: the landing page used to call `auth()` on the server, which made the route
 * dynamic and turned its `revalidate = 60` into a no-op. The session read now
 * happens on the client, so `/` is a static/ISR route (see the build route
 * table) and the header has to resolve both states correctly on its own.
 *
 * This spec checks that the header renders the logged-out and logged-in states
 * at the three supported widths, and that the brand link points at the right
 * dashboard for the signed-in role.
 */

const VIEWPORTS = [
  { label: "desktop", width: 1440, height: 900 },
  { label: "tablet", width: 820, height: 1180 },
  { label: "phone", width: 390, height: 844 },
] as const;

test.describe("C1 landing header session states", () => {
  const createdUserIds: string[] = [];

  test.afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await prisma.$disconnect();
  });

  test("logged-out header, then a student header, at all three viewports", async ({ page }) => {
    test.setTimeout(240_000);
    await prisma.$connect();

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/");

      // Logged out: the login CTA is visible and there is no user menu.
      await expect(
        page.getByRole("link", { name: /^Login/ }).first(),
        `${viewport.label}: a visitor must see the Login CTA`
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "User menu" }),
        `${viewport.label}: a visitor must not see a user menu`
      ).toHaveCount(0);

      // The brand link points at the landing page for a visitor.
      const logo = page.getByRole("link", { name: /aspirantbook/ }).first();
      await expect(logo).toHaveAttribute("href", "/");

      // No horizontal page scroll at any width (the header is sticky).
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow, `${viewport.label}: page must not scroll horizontally`).toBeLessThanOrEqual(1);
    }

    // ── sign in as a student at the desktop width ────────────────────────────
    const nonce = newNonce();
    const student = await createActor(nonce, "FREE", "home-session");
    createdUserIds.push(student.id);

    await page.setViewportSize({ width: 1440, height: 900 });
    await loginThroughUi(page, student.email);

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/");

      // The header resolves the session on the client: user menu, no Login CTA.
      await expect(
        page.getByRole("button", { name: "User menu" }),
        `${viewport.label}: a signed-in learner must see the user menu`
      ).toBeVisible({ timeout: 20_000 });
      await expect(
        page.getByRole("link", { name: /^Login/ }),
        `${viewport.label}: the Login CTA must be gone`
      ).toHaveCount(0);

      // A student's brand link resolves to their dashboard.
      await expect(
        page.getByRole("link", { name: /aspirantbook/ }).first()
      ).toHaveAttribute("href", /^\/(dashboard)?$/, { timeout: 20_000 });
    }
  });

  test("an admin header links the brand to the admin cockpit", async ({ page }) => {
    test.setTimeout(180_000);
    await prisma.$connect();

    const nonce = newNonce();
    const admin = await createActor(nonce, "ADMIN", "home-session-admin");
    createdUserIds.push(admin.id);

    await page.setViewportSize({ width: 1440, height: 900 });
    await loginThroughUi(page, admin.email);
    await page.goto("/");

    await expect(page.getByRole("link", { name: /aspirantbook/ }).first()).toHaveAttribute(
      "href",
      "/teacher",
      { timeout: 20_000 }
    );
    await expect(page.getByRole("button", { name: "User menu" })).toBeVisible();
  });
});
