import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { validateReleaseConfig } from "../scripts/check-release-config.mjs";

describe("Task B11: Mobile Release Config Guard", () => {
  test("1. Passes cleanly on standard production release configuration", () => {
    const result = validateReleaseConfig();
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  test("2. Fails when production API_URL uses insecure http://", () => {
    const result = validateReleaseConfig({
      EXPO_PUBLIC_API_URL: "http://api.aspirantbook.com",
    });
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some((err) => /must strictly use https:\/\//i.test(err)),
      "Should report HTTPS requirement error"
    );
  });

  test("3. Fails when production API_URL points to localhost", () => {
    const result = validateReleaseConfig({
      EXPO_PUBLIC_API_URL: "https://localhost:3000",
    });
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some((err) => /cannot contain local or emulator address/i.test(err)),
      "Should report localhost rejection"
    );
  });

  test("4. Fails when production API_URL points to emulator IP 10.0.2.2", () => {
    const result = validateReleaseConfig({
      EXPO_PUBLIC_API_URL: "http://10.0.2.2:3045",
    });
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some((err) => /cannot contain local or emulator address/i.test(err)),
      "Should report 10.0.2.2 rejection"
    );
  });

  test("5. App config release guard throws at runtime when production build has insecure URL", async () => {
    const origEnv = process.env.EXPO_PUBLIC_APP_ENV;
    const origUrl = process.env.EXPO_PUBLIC_API_URL;

    try {
      process.env.EXPO_PUBLIC_APP_ENV = "production";
      process.env.EXPO_PUBLIC_API_URL = "http://insecure.aspirantbook.com";

      // Dynamically load app.config.ts with invalid env
      await assert.rejects(
        async () => {
          // Re-evaluate app.config
          const { default: configFactory } = await import(
            `../app.config?t=${Date.now()}`
          );
          configFactory({ config: {} });
        },
        (err: any) => {
          assert.match(err.message, /Mobile Release Guard/);
          assert.match(err.message, /Production builds must use HTTPS/);
          return true;
        }
      );
    } finally {
      process.env.EXPO_PUBLIC_APP_ENV = origEnv;
      process.env.EXPO_PUBLIC_API_URL = origUrl;
    }
  });
});
