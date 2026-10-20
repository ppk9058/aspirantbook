import { test, expect } from "@playwright/test";

test.describe("Mobile Reader App & Compliance Suite", () => {
  test.use({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
  });

  test("1. Privacy Policy page loads with data-deletion help section", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.locator("h1")).toContainText("Privacy Policy");
    await expect(page.getByText("User Data Deletion & Account Erasure")).toBeVisible();
    await expect(page.getByText("In-App Self-Service Deletion")).toBeVisible();
    await expect(page.locator("a[href='/settings']")).toBeVisible();
  });

  test("2. Terms and Conditions page loads with 13+ requirement", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.locator("h1")).toContainText("Terms & Conditions");
    await expect(page.getByText("1. Acceptance & Eligibility")).toBeVisible();
    await expect(page.getByText("at least 13 years old")).toBeVisible();
    await expect(page.getByText("Anti-Cheating")).toBeVisible();
  });

  test("3. Registration consent checkbox requires 13+ agreement", async ({ page }) => {
    await page.goto("/register");
    const consentBox = page.locator("[data-testid='register-consent-checkbox']");
    await expect(consentBox).toBeVisible();
    await expect(consentBox).toBeChecked();

    // Verify it links to terms and privacy
    await expect(page.locator("a[href='/terms']")).toBeVisible();
    await expect(page.locator("a[href='/privacy']")).toBeVisible();

    // Can be unchecked
    await consentBox.uncheck();
    await expect(consentBox).not.toBeChecked();

    // Can be rechecked
    await consentBox.check();
    await expect(consentBox).toBeChecked();
  });

  test("4. Normal web browser displays standard purchase buttons", async ({ page }) => {
    await page.goto("/pricing");
    const getPassBtn = page.locator("[data-testid='pricing-get-pass-btn']").first();
    await expect(getPassBtn).toBeVisible();
    await expect(page.locator("[data-testid='available-on-website-btn']")).toHaveCount(0);
  });

  test("5. Native app marker (?app=1) replaces purchase buttons with 'Available on our website'", async ({ page }) => {
    await page.goto("/pricing?app=1");
    const availableBtn = page.locator("[data-testid='available-on-website-btn']").first();
    await expect(availableBtn).toBeVisible();
    await expect(availableBtn).toContainText("Available on our website");
    await expect(page.locator("[data-testid='pricing-get-pass-btn']")).toHaveCount(0);
  });

  test("6. Book store hides Add to Cart & Buy Now in native app", async ({ page }) => {
    await page.goto("/books?app=1");
    // In native app mode, purchase buttons are replaced with Available on our website
    const availableBtn = page.locator("[data-testid='available-on-website-btn']").first();
    await expect(availableBtn).toBeVisible();
  });
});
