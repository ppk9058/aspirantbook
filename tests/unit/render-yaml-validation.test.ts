import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import * as yaml from "js-yaml";

const ROOT = path.resolve(__dirname, "../..");
const RENDER_YAML = path.join(ROOT, "render.yaml");
const ENV_EXAMPLE = path.join(ROOT, ".env.example");

describe("R12-A: render.yaml validation", () => {
  let doc: any;

  it("A-R12-01: render.yaml exists and is valid YAML", () => {
    const content = fs.readFileSync(RENDER_YAML, "utf-8");
    doc = yaml.load(content);
    assert.ok(doc, "render.yaml must parse as valid YAML");
    assert.ok(doc.services, "render.yaml must have a services key");
  });

  it("A-R12-02: has exactly one web service", () => {
    const content = fs.readFileSync(RENDER_YAML, "utf-8");
    doc = yaml.load(content) as any;
    const webServices = doc.services.filter((s: any) => s.type === "web");
    assert.equal(webServices.length, 1, "must have exactly one web service");
  });

  it("A-R12-03: uses Docker runtime", () => {
    const content = fs.readFileSync(RENDER_YAML, "utf-8");
    doc = yaml.load(content) as any;
    const svc = doc.services[0];
    assert.equal(svc.runtime, "docker");
    assert.equal(svc.dockerfilePath, "./Dockerfile");
  });

  it("A-R12-04: healthCheckPath is /api/health", () => {
    const content = fs.readFileSync(RENDER_YAML, "utf-8");
    doc = yaml.load(content) as any;
    const svc = doc.services[0];
    assert.equal(svc.healthCheckPath, "/api/health");
  });

  it("A-R12-05: autoDeploy is off", () => {
    const content = fs.readFileSync(RENDER_YAML, "utf-8");
    doc = yaml.load(content) as any;
    const svc = doc.services[0];
    assert.equal(svc.autoDeploy, false);
  });

  it("A-R12-06: preDeployCommand runs migrate-deploy.sh", () => {
    const content = fs.readFileSync(RENDER_YAML, "utf-8");
    doc = yaml.load(content) as any;
    const svc = doc.services[0];
    assert.ok(
      svc.preDeployCommand && svc.preDeployCommand.includes("migrate-deploy.sh"),
      "preDeployCommand must reference migrate-deploy.sh"
    );
  });

  it("A-R12-07: NODE_ENV is production, PERSIST_BACKEND is db", () => {
    const content = fs.readFileSync(RENDER_YAML, "utf-8");
    doc = yaml.load(content) as any;
    const svc = doc.services[0];
    const envVars = svc.envVars;
    const nodeEnv = envVars.find((e: any) => e.key === "NODE_ENV");
    const persist = envVars.find((e: any) => e.key === "PERSIST_BACKEND");
    assert.equal(nodeEnv?.value, "production");
    assert.equal(persist?.value, "db");
  });

  it("A-R12-08: no secret-like values in render.yaml", () => {
    const content = fs.readFileSync(RENDER_YAML, "utf-8");
    // Check for patterns that look like actual secrets
    const secretPatterns = [
      /sk_live_/i, /sk_test_/i, /rk_live_/i, /rk_test_/i,
      /postgresql:\/\/[^{}\s]+:[^{}\s]+@/,  // actual DB connection strings
      /-----BEGIN/,  // PEM keys
      /[a-f0-9]{32,}/i  // long hex strings (but not the comment text)
    ];
    for (const pattern of secretPatterns) {
      // Skip matches in comments
      const lines = content.split("\n").filter(l => !l.trim().startsWith("#"));
      const nonCommentContent = lines.join("\n");
      assert.ok(
        !pattern.test(nonCommentContent),
        `render.yaml must not contain secret-like values matching ${pattern}`
      );
    }
  });

  it("A-R12-09: every env key exists in .env.example", () => {
    const content = fs.readFileSync(RENDER_YAML, "utf-8");
    doc = yaml.load(content) as any;
    const envExampleContent = fs.readFileSync(ENV_EXAMPLE, "utf-8");

    const svc = doc.services[0];
    const renderKeys = svc.envVars.map((e: any) => e.key);

    for (const key of renderKeys) {
      assert.ok(
        envExampleContent.includes(key),
        `env key "${key}" from render.yaml must exist in .env.example`
      );
    }
  });

  it("A-R12-10: DATABASE_URL and DIRECT_URL are sync:false (secrets)", () => {
    const content = fs.readFileSync(RENDER_YAML, "utf-8");
    doc = yaml.load(content) as any;
    const svc = doc.services[0];
    const dbUrl = svc.envVars.find((e: any) => e.key === "DATABASE_URL");
    const directUrl = svc.envVars.find((e: any) => e.key === "DIRECT_URL");
    assert.equal(dbUrl?.sync, false, "DATABASE_URL must be sync:false");
    assert.equal(directUrl?.sync, false, "DIRECT_URL must be sync:false");
    assert.ok(!dbUrl?.value, "DATABASE_URL must not have a value in the file");
    assert.ok(!directUrl?.value, "DIRECT_URL must not have a value in the file");
  });
});
