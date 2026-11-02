import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import yaml from "js-yaml";

/**
 * R16-1: Verify that every NEXT_PUBLIC_* env var defined in render.yaml
 * has a matching ARG in the Dockerfile builder stage, and that no ARG
 * name contains a secret-like keyword.
 */
describe("R16-1: Dockerfile builder stage NEXT_PUBLIC_* ARG declarations", () => {
  const dockerfilePath = path.resolve(process.cwd(), "Dockerfile");
  const renderYamlPath = path.resolve(process.cwd(), "render.yaml");

  function getBuilderStageContent(): string {
    const content = fs.readFileSync(dockerfilePath, "utf-8");
    const match = content.match(
      /^[ \t]*FROM\s+\S+\s+AS\s+builder\b([\s\S]*?)(?=^[ \t]*FROM\s+)/im
    );
    assert.ok(match, "Dockerfile must define a builder stage");
    return match[1];
  }

  function getBuilderARGs(): string[] {
    const builderContent = getBuilderStageContent();
    const args: string[] = [];
    for (const line of builderContent.split("\n")) {
      const m = line.match(/^\s*ARG\s+([A-Z_][A-Z0-9_]*)/);
      if (m) args.push(m[1]);
    }
    return args;
  }

  function getRenderYamlNextPublicKeys(): string[] {
    const raw = fs.readFileSync(renderYamlPath, "utf-8");
    const doc = yaml.load(raw) as Record<string, unknown>;
    const services = (doc as any).services ?? [];
    const keys: string[] = [];
    for (const svc of services) {
      const envVars = svc.envVars ?? [];
      for (const ev of envVars) {
        const key = ev.key as string;
        if (key.startsWith("NEXT_PUBLIC_")) {
          keys.push(key);
        }
      }
    }
    return [...new Set(keys)].sort();
  }

  it("every NEXT_PUBLIC_* in render.yaml has a matching ARG in the builder stage", () => {
    const renderKeys = getRenderYamlNextPublicKeys();
    assert.ok(renderKeys.length > 0, "render.yaml must contain at least one NEXT_PUBLIC_* env var");

    const builderArgs = new Set(getBuilderARGs());
    const missing = renderKeys.filter((k) => !builderArgs.has(k));

    assert.deepStrictEqual(
      missing,
      [],
      `Missing ARG declarations in Dockerfile builder stage: ${missing.join(", ")}`
    );
  });

  it("no ARG in the builder stage contains a secret-like keyword", () => {
    const FORBIDDEN_PATTERNS = ["SECRET", "KEY_SECRET", "TOKEN", "PASSWORD"];
    const builderArgs = getBuilderARGs();

    const violations = builderArgs.filter((arg) =>
      FORBIDDEN_PATTERNS.some((pattern) => arg.includes(pattern))
    );

    assert.deepStrictEqual(
      violations,
      [],
      `Builder stage ARGs must not contain secret-like names: ${violations.join(", ")}`
    );
  });
});
