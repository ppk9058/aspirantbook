import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import yaml from "js-yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");
const RENDER_YAML = path.join(ROOT, "render.yaml");

describe("R16-2: Sentry env names in render.yaml", () => {
  const SENTRY_KEYS = ["SENTRY_DSN", "SENTRY_ENVIRONMENT", "SENTRY_RELEASE"];

  function getWebServiceEnvVars(): Array<{ key: string; sync?: boolean; value?: string }> {
    const content = fs.readFileSync(RENDER_YAML, "utf-8");
    const doc = yaml.load(content) as any;
    const webService = doc.services.find((s: any) => s.type === "web");
    assert.ok(webService, "render.yaml must have a web service");
    return webService.envVars ?? [];
  }

  for (const sentryKey of SENTRY_KEYS) {
    it(`${sentryKey} exists in render.yaml web service envVars with sync: false`, () => {
      const envVars = getWebServiceEnvVars();
      const entry = envVars.find((e) => e.key === sentryKey);
      assert.ok(entry, `${sentryKey} must exist in render.yaml envVars`);
      assert.equal(entry.sync, false, `${sentryKey} must have sync: false`);
    });
  }
});
