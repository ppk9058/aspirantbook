import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it, beforeEach, afterEach } from "node:test";
import { validateBootSecurity } from "../../lib/boot-guard";

describe("R15-1: Dockerfile builder stage database environment variables guard", () => {
  const savedEnv: Record<string, string | undefined> = {};
  const envKeys = [
    "NODE_ENV", "DATABASE_URL", "DIRECT_URL", "PERSIST_BACKEND",
    "APP_ENV", "ALLOW_DEV_MOBILE_LOGIN", "FAST2SMS_API_KEY",
    "TWILIO_AUTH_TOKEN", "MSG91_AUTH_KEY"
  ];

  beforeEach(() => {
    for (const k of envKeys) {
      savedEnv[k] = process.env[k];
    }
  });

  afterEach(() => {
    for (const k of envKeys) {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    }
  });

  function parseDockerfileBuilderEnv(): { databaseUrl: string; directUrl: string } {
    const dockerfilePath = path.resolve(process.cwd(), "Dockerfile");
    const content = fs.readFileSync(dockerfilePath, "utf-8");

    const builderStageMatch = content.match(/^[ \t]*FROM\s+\S+\s+AS\s+builder\b([\s\S]*?)(?=^[ \t]*FROM\s+)/im);
    assert.ok(builderStageMatch, "Dockerfile must define a builder stage");
    const builderContent = builderStageMatch[1];

    const dbMatch = builderContent.match(/^\s*ENV\s+DATABASE_URL=["']?([^"'\r\n]+)["']?/m);
    const directMatch = builderContent.match(/^\s*ENV\s+DIRECT_URL=["']?([^"'\r\n]+)["']?/m);

    assert.ok(dbMatch && dbMatch[1], "Dockerfile builder stage must set DATABASE_URL");
    assert.ok(directMatch && directMatch[1], "Dockerfile builder stage must set DIRECT_URL");

    return {
      databaseUrl: dbMatch[1].trim(),
      directUrl: directMatch[1].trim(),
    };
  }

  it("Dockerfile builder stage DATABASE_URL and DIRECT_URL pass boot security guard in production", () => {
    const { databaseUrl, directUrl } = parseDockerfileBuilderEnv();

    (process.env as any).NODE_ENV = "production";
    process.env.PERSIST_BACKEND = "db";
    process.env.DATABASE_URL = databaseUrl;
    process.env.DIRECT_URL = directUrl;
    delete process.env.APP_ENV;
    delete process.env.ALLOW_DEV_MOBILE_LOGIN;

    assert.doesNotThrow(
      () => validateBootSecurity(),
      "Dockerfile builder-stage database placeholders must pass validateBootSecurity in production mode"
    );
  });

  it("runner stage does not bake in builder-stage database credentials", () => {
    const dockerfilePath = path.resolve(process.cwd(), "Dockerfile");
    const content = fs.readFileSync(dockerfilePath, "utf-8");

    const runnerStageMatch = content.match(/^[ \t]*FROM\s+\S+\s+AS\s+runner\b([\s\S]*)$/im);
    assert.ok(runnerStageMatch, "Dockerfile must define a runner stage");
    const runnerContent = runnerStageMatch[1];

    assert.ok(!runnerContent.includes("DATABASE_URL="), "Runner stage must not define default DATABASE_URL");
    assert.ok(!runnerContent.includes("DIRECT_URL="), "Runner stage must not define default DIRECT_URL");
  });
});
