import { test, expect, type Request } from "@playwright/test";

/**
 * OTP web regression check (mobile viewport).
 *
 * Proves the web modal performs the real two-step flow:
 *  1. A phone number only requests a code (no code, no sign-in).
 *  2. The code step sends the verificationId returned by step 1.
 *  3. The removed "any 6 digits" copy never comes back.
 *
 * The OTP provider is mocked at the HTTP boundary, so no SMS is sent and no
 * real provider is called.
 */

const PHONE = "9876543210";
const VERIFICATION_ID = "vid-e2e-otp-123";
const PROOF = "proof-e2e-otp-123";

test("web mobile OTP modal requests a code, then verifies with the returned verificationId", async ({
  page,
}) => {
  const sendBodies: any[] = [];
  const verifyBodies: any[] = [];

  // NextAuth's client-side signIn() fetches a CSRF token and posts the proof.
  // Intercept it so this check stays focused on the OTP contract.
  await page.route("**/api/auth/csrf", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ csrfToken: "otp-e2e-csrf" }),
    });
  });
  await page.route("**/api/auth/callback/mobile", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ url: "/my-learning" }),
    });
  });

  await page.route("**/api/auth/mobile-login", async (route) => {
    const request: Request = route.request();
    const body = request.postDataJSON();
    if (body.code) {
      verifyBodies.push(body);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          proof: PROOF,
          email: `mobile_${PHONE}@aspirantbook.local`,
          userId: "e2e-otp-user",
          name: "E2E Student",
          goalPersisted: true,
        }),
      });
      return;
    }
    sendBodies.push(body);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        step: "otp",
        verificationId: VERIFICATION_ID,
        expiresIn: 120,
        resendAfter: 30,
        devBypass: false,
      }),
    });
  });

  await page.goto("/login");

  const otpLoginButton = page.getByRole("button", {
    name: /Continue with Mobile OTP/i,
  });
  await expect(otpLoginButton).toBeVisible();
  await otpLoginButton.click();

  const modal = page.getByTestId("mobile-auth-modal");
  await expect(modal).toBeVisible();

  const phoneInput = modal.locator('input[type="tel"]').first();
  await expect(phoneInput).toBeVisible();
  await phoneInput.fill(PHONE);

  await modal.getByRole("button", { name: /Get OTP/i }).click();

  // Step 2 is rendered and carries the real provider copy.
  await expect(modal.getByText(/Enter 6-digit OTP/i).first()).toBeVisible();
  const otpInputs = modal.locator('input[type="tel"][maxlength="1"]');
  await expect(otpInputs).toHaveCount(6);

  // The old false promise must not return.
  await expect(page.getByText(/Any 6 digits/i)).toHaveCount(0);
  await expect(modal.getByText(/We'll verify the code sent to your mobile number/i)).toBeVisible();

  // No error banner is shown after a successful send.
  await expect(modal.getByText(/could not send the verification code/i)).toHaveCount(0);

  // Fill the six digits; the modal auto-verifies on the sixth.
  for (let i = 0; i < 6; i += 1) {
    await otpInputs.nth(i).fill(String(i + 1));
  }

  await expect
    .poll(() => verifyBodies.length, { timeout: 15_000 })
    .toBe(1);

  expect(sendBodies).toHaveLength(1);
  expect(sendBodies[0]).toEqual({ phoneNumber: PHONE });
  expect(sendBodies[0].code).toBeUndefined();
  expect(verifyBodies[0]).toMatchObject({
    phoneNumber: PHONE,
    code: "123456",
    verificationId: VERIFICATION_ID,
  });
});
