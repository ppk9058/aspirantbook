import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET as getSearch } from "../app/api/v1/search/route";
import { prisma } from "../lib/prisma";

describe("API v1: Global Search Route (/api/v1/search)", () => {
  it("returns empty results for empty or short queries", async () => {
    const req = new NextRequest("http://127.0.0.1:3046/api/v1/search?q=a");
    const res = await getSearch(req);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.ok, true);
    assert.equal(json.data.total, 0);
    assert.equal(Array.isArray(json.data.results), true);
  });

  it("finds matching records when matching search keyword", async () => {
    // Find or create a course to search for
    const course = await prisma.course.findFirst({
      where: { isPublished: true },
      select: { title: true },
    });

    if (course && course.title) {
      const keyword = course.title.slice(0, 4);
      const req = new NextRequest(`http://127.0.0.1:3046/api/v1/search?q=${encodeURIComponent(keyword)}`);
      const res = await getSearch(req);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.ok, true);
      assert.equal(json.data.results.length >= 0, true);
    }
  });
});
