import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";

describe("Phase 8: Login and Register Parity", () => {
  const authRoot = path.join(__dirname, "../src/app/(auth)");

  it("all Phase 8 auth screens exist on disk", () => {
    const screens = ["login.tsx", "register.tsx", "forgot-password.tsx"];
    for (const screen of screens) {
      assert.equal(
        fs.existsSync(path.join(authRoot, screen)),
        true,
        `Missing auth screen: ${screen}`
      );
    }
  });

  it("Auth compliance: Google sign-in is completely eliminated from login screen", () => {
    const loginContent = fs.readFileSync(path.join(authRoot, "login.tsx"), "utf8");
    assert.equal(
      loginContent.includes("Sign In with Google"),
      false,
      "Violation: Google sign-in stub must not exist"
    );
    assert.equal(
      loginContent.includes("Google Sign-In"),
      false,
      "Violation: Google Sign-In text must not exist"
    );
  });

  it("registration screen enforces 13+ consent check and links to legal policies", () => {
    const regContent = fs.readFileSync(path.join(authRoot, "register.tsx"), "utf8");
    assert.equal(
      regContent.includes("consent"),
      true,
      "Register screen must track consent state"
    );
    assert.equal(
      regContent.includes("13+"),
      true,
      "Register screen must explicitly state 13+ age requirement"
    );
    assert.equal(
      regContent.includes("terms"),
      true,
      "Register screen must link to Terms of Service"
    );
    assert.equal(
      regContent.includes("privacy"),
      true,
      "Register screen must link to Privacy Policy"
    );
  });

  it("forgot password screen uses typed client without hardcoded hostnames", () => {
    const fpContent = fs.readFileSync(path.join(authRoot, "forgot-password.tsx"), "utf8");
    assert.equal(
      fpContent.includes("api.forgotPassword"),
      true,
      "Forgot password screen must call api.forgotPassword"
    );
    assert.equal(
      fpContent.includes("10.0.2.2"),
      false,
      "Hardcoded IP 10.0.2.2 must be removed"
    );
    assert.equal(
      fpContent.includes("3045"),
      false,
      "Hardcoded port 3045 must be removed"
    );
  });
});
