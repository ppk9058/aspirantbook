import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { GET as getAppConfig } from "../app/api/v1/config/route";
import { GET as getGoals } from "../app/api/v1/goals/route";
import { GET as getTests } from "../app/api/v1/tests/route";
import { GET as getTutorials } from "../app/api/v1/tutorials/route";
import { GET as getLibrary } from "../app/api/v1/library/route";
import { NextRequest } from "next/server";
import { prisma } from "../lib/prisma";

const TARGET_DB = "127.0.0.1:54329/trillionskill_test";

describe("API Budgets, Caching & Pagination Limits", () => {
  before(async () => {
    const rawRes = await prisma.$queryRawUnsafe<{ current_database: string }[]>("SELECT current_database()");
    const db = rawRes?.[0]?.current_database || "";
    assert.ok(db === "postgres" || db.endsWith("_test"), `Must run against Docker test DB! Got: ${db}`);
  });

  describe("ETag & 304 Not Modified Caching", () => {
    it("GET /api/v1/config returns ETag and responds 304 on matching If-None-Match", async () => {
      // 1. Initial request
      const req1 = new NextRequest("http://127.0.0.1:3045/api/v1/config");
      const res1 = await getAppConfig(req1);
      assert.equal(res1.status, 200);

      const etag = res1.headers.get("etag");
      assert.ok(etag, "Response must include an ETag header");

      const body1 = await res1.text();
      const sizeBytes = Buffer.byteLength(body1, "utf8");
      // Assert budget ceiling: config payload must be < 10KB
      assert.ok(sizeBytes < 10 * 1024, `Config payload size ${sizeBytes} exceeds 10KB budget`);

      // 2. Conditional request with matching If-None-Match
      const req2 = new NextRequest("http://127.0.0.1:3045/api/v1/config", {
        headers: { "if-none-match": etag },
      });
      const res2 = await getAppConfig(req2);
      assert.equal(res2.status, 304);
      assert.equal(res2.headers.get("etag"), etag);
    });

    it("GET /api/v1/goals returns ETag and responds 304 on matching If-None-Match", async () => {
      // 1. Initial request
      const req1 = new NextRequest("http://127.0.0.1:3045/api/v1/goals");
      const res1 = await getGoals(req1);
      assert.equal(res1.status, 200);

      const etag = res1.headers.get("etag");
      assert.ok(etag, "Response must include an ETag header");

      const body1 = await res1.text();
      const sizeBytes = Buffer.byteLength(body1, "utf8");
      // Assert budget ceiling: goals list must be < 10KB
      assert.ok(sizeBytes < 10 * 1024, `Goals payload size ${sizeBytes} exceeds 10KB budget`);

      // 2. Conditional request with matching If-None-Match
      const req2 = new NextRequest("http://127.0.0.1:3045/api/v1/goals", {
        headers: { "if-none-match": etag },
      });
      const res2 = await getGoals(req2);
      assert.equal(res2.status, 304);
      assert.equal(res2.headers.get("etag"), etag);
    });
  });

  describe("List Endpoints Pagination & Payload Ceilings", () => {
    it("GET /api/v1/tests enforces default 20, max 50 limit, and stays under 50KB", async () => {
      // Default limit
      const reqDefault = new NextRequest("http://127.0.0.1:3045/api/v1/tests");
      const resDefault = await getTests(reqDefault);
      assert.equal(resDefault.status, 200);
      const jsonDefault = await resDefault.json();
      assert.ok(jsonDefault.ok);
      assert.ok(jsonDefault.data.items.length <= 20, `Default limit exceeded: ${jsonDefault.data.items.length}`);

      const bodyDefault = JSON.stringify(jsonDefault);
      const sizeBytes = Buffer.byteLength(bodyDefault, "utf8");
      assert.ok(sizeBytes < 50 * 1024, `Tests payload size ${sizeBytes} exceeds 50KB ceiling`);

      // Max 50 clamp (requesting 100 should either clamp to 50 or fail validation)
      const reqExceed = new NextRequest("http://127.0.0.1:3045/api/v1/tests?limit=100");
      const resExceed = await getTests(reqExceed);
      const jsonExceed = await resExceed.json();
      // Should reject invalid limit > 50 with 400 or clamp to 50
      if (resExceed.status === 200) {
        assert.ok(jsonExceed.data.items.length <= 50);
      } else {
        assert.equal(resExceed.status, 400);
      }
    });

    it("GET /api/v1/tutorials respects 50 items ceiling and stays under 50KB", async () => {
      const req = new NextRequest("http://127.0.0.1:3045/api/v1/tutorials");
      const res = await getTutorials(req);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.ok(json.ok);
      assert.ok(json.data.length <= 50, `Tutorials count ${json.data.length} exceeds 50 ceiling`);

      const sizeBytes = Buffer.byteLength(JSON.stringify(json), "utf8");
      assert.ok(sizeBytes < 50 * 1024, `Tutorials payload size ${sizeBytes} exceeds 50KB ceiling`);
    });

    it("GET /api/v1/library respects 50 items ceiling and stays under 50KB", async () => {
      const req = new NextRequest("http://127.0.0.1:3045/api/v1/library");
      const res = await getLibrary(req);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.ok(json.ok);
      assert.ok(json.data.length <= 50, `Library count ${json.data.length} exceeds 50 ceiling`);

      const sizeBytes = Buffer.byteLength(JSON.stringify(json), "utf8");
      assert.ok(sizeBytes < 50 * 1024, `Library payload size ${sizeBytes} exceeds 50KB ceiling`);
    });
  });
});
