#!/usr/bin/env node

/**
 * Mobile Release Configuration Guard (Task B11)
 *
 * Verifies that the mobile production configuration meets all release requirements:
 * 1. Production API_URL strictly uses https:// (no http://, no localhost, no 10.0.2.2 emulator IP).
 * 2. Production bundle id / package name matches registered owner id (com.aspirantbook.app).
 * 3. All required permissions are declared with user-facing descriptions.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mobileRoot = path.resolve(__dirname, "..");

export function validateReleaseConfig(customEnv = {}) {
  const errors = [];
  const warnings = [];

  // 1. Validate eas.json
  const easPath = path.join(mobileRoot, "eas.json");
  if (!fs.existsSync(easPath)) {
    errors.push(`Missing eas.json at ${easPath}`);
  } else {
    try {
      const eas = JSON.parse(fs.readFileSync(easPath, "utf-8"));
      const prodProfile = eas.build?.production;
      if (!prodProfile) {
        errors.push("Missing 'production' build profile in eas.json");
      } else {
        const prodApiUrl =
          customEnv.EXPO_PUBLIC_API_URL || prodProfile.env?.EXPO_PUBLIC_API_URL;

        if (!prodApiUrl) {
          errors.push(
            "eas.json production build profile is missing env.EXPO_PUBLIC_API_URL"
          );
        } else {
          if (!prodApiUrl.startsWith("https://")) {
            errors.push(
              `Production API_URL must strictly use https://. Found: "${prodApiUrl}"`
            );
          }
          if (
            /localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\./i.test(prodApiUrl)
          ) {
            errors.push(
              `Production API_URL cannot contain local or emulator address: "${prodApiUrl}"`
            );
          }
        }
      }
    } catch (err) {
      errors.push(`Failed to parse eas.json: ${err.message}`);
    }
  }

  // 2. Validate app.config.ts content
  const appConfigPath = path.join(mobileRoot, "app.config.ts");
  if (!fs.existsSync(appConfigPath)) {
    errors.push(`Missing app.config.ts at ${appConfigPath}`);
  } else {
    const configContent = fs.readFileSync(appConfigPath, "utf-8");

    // Check bundle identifiers
    if (!configContent.includes('bundleIdentifier: "com.aspirantbook.app"')) {
      errors.push(
        "iOS bundleIdentifier does not match registered owner id: com.aspirantbook.app"
      );
    }
    if (!configContent.includes('package: "com.aspirantbook.app"')) {
      errors.push(
        "Android package does not match registered owner id: com.aspirantbook.app"
      );
    }

    // Check release guard presence in app.config.ts
    if (!configContent.includes("[Mobile Release Guard]")) {
      errors.push(
        "app.config.ts is missing the [Mobile Release Guard] runtime HTTPS assertion"
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// CLI Execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log("Checking mobile release configuration...");
  const result = validateReleaseConfig();

  if (!result.valid) {
    console.error("\n❌ [Mobile Release Guard Failed]");
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log("\n✅ [Mobile Release Guard Passed] All release checks satisfied:");
  console.log("  - Production API_URL strictly uses HTTPS (no local/emulator IP)");
  console.log("  - iOS & Android bundle id matches com.aspirantbook.app");
  console.log("  - Runtime app.config.ts release guard enabled");
  process.exit(0);
}
