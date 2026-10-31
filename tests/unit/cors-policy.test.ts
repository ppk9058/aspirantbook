import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { GET as getConfig } from "../../app/api/v1/config/route";

const root = process.cwd();

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

describe("R9-S3: /api/v1 CORS policy", () => {
  test("no /api/v1 route, middleware or next.config emits Access-Control-Allow-Origin", () => {
    const files = [
      ...walk(path.join(root, "app/api/v1")),
      path.join(root, "middleware.ts"),
      path.join(root, "next.config.js"),
      path.join(root, "next.config.ts"),
      path.join(root, "next.config.mjs"),
    ].filter((f) => fs.existsSync(f));

    assert.ok(files.length > 0, "expected /api/v1 route files");

    const offenders = files.filter((file) =>
      /access-control-allow-origin/i.test(fs.readFileSync(file, "utf-8"))
    );

    assert.deepEqual(
      offenders.map((f) => path.relative(root, f)),
      [],
      "same-origin web + native mobile: /api/v1 must not emit CORS headers"
    );
  });

  test("a live /api/v1 response never returns a wildcard CORS header", async () => {
    const res = await getConfig(new NextRequest("http://127.0.0.1:3045/api/v1/config"));

    assert.equal(
      res.headers.get("access-control-allow-origin"),
      null,
      "Access-Control-Allow-Origin must be absent"
    );
    assert.notEqual(res.headers.get("access-control-allow-origin"), "*");
  });

  test("Expo app targets native platforms only (no web origin)", () => {
    const config = fs.readFileSync(path.join(root, "apps/mobile/app.config.ts"), "utf-8");
    const platforms = config.match(/platforms:\s*\[([^\]]*)\]/);
    assert.ok(platforms, "app.config.ts must declare platforms");
    assert.ok(
      !platforms[1].includes('"web"') && !platforms[1].includes("'web'"),
      "a web platform would introduce a browser origin and require an explicit allowlist"
    );
  });
});
