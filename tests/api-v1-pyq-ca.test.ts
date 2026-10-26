import { describe, it, before, after } from "node:test";
import * as assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { NextRequest } from "next/server";
import { GET as getPyqExamsRoute } from "../app/api/v1/pyq/exams/route";
import { GET as getPyqPapersRoute } from "../app/api/v1/pyq/papers/route";
import { GET as getPyqPaperDetailRoute } from "../app/api/v1/pyq/papers/[id]/route";
import { GET as getCurrentAffairsRoute } from "../app/api/v1/current-affairs/route";
import { GET as getCurrentAffairsDetailRoute } from "../app/api/v1/current-affairs/[slug]/route";

describe("API v1: PYQ and Current Affairs Parity", () => {
  let categoryId: string;
  let paperId: string;
  let caId: string;

  before(async () => {
    // 1. Create a PYQ Category
    const cat = await prisma.pyqCategory.create({
      data: {
        name: "UPSC Civil Services PYQ",
        slug: `upsc-pyq-${Date.now()}`,
        description: "Official papers from 2015 to 2026",
        isPublished: true,
      },
    });
    categoryId = cat.id;

    // 2. Create a PYQ Paper
    const paper = await prisma.pyqPaper.create({
      data: {
        categoryId: cat.id,
        title: "UPSC Prelims 2026 GS Paper 1",
        slug: `upsc-prelims-2026-${Date.now()}`,
        year: 2026,
        shift: "Morning",
        status: "PUBLISHED",
        paperPdfUrl: "https://example.com/upsc-2026.pdf",
        totalQuestions: 100,
        accessType: "FREE",
      },
    });
    paperId = paper.id;

    // 3. Create a Current Affairs digest
    const ca = await prisma.currentAffairsPdf.create({
      data: {
        title: "October 2026 Monthly Round-up",
        month: 10,
        year: 2026,
        status: "PUBLISHED",
        pdfUrlEn: "https://example.com/ca-oct-2026.pdf",
      },
    });
    caId = ca.id;
  });

  after(async () => {
    if (paperId) {
      await prisma.pyqPaper.deleteMany({ where: { id: paperId } });
    }
    if (categoryId) {
      await prisma.pyqCategory.deleteMany({ where: { id: categoryId } });
    }
    if (caId) {
      await prisma.currentAffairsPdf.deleteMany({ where: { id: caId } });
    }
  });

  it("GET /api/v1/pyq/exams returns published exam categories", async () => {
    const req = new NextRequest("http://127.0.0.1:3046/api/v1/pyq/exams");
    const res = await getPyqExamsRoute(req);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.ok, true);
    assert.ok(Array.isArray(json.data));
    const found = json.data.find((c: any) => c.id === categoryId);
    assert.ok(found, "Created exam category must be present");
  });

  it("GET /api/v1/pyq/papers lists published papers filtered by examId", async () => {
    const req = new NextRequest(`http://127.0.0.1:3046/api/v1/pyq/papers?examId=${categoryId}`);
    const res = await getPyqPapersRoute(req);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.ok, true);
    assert.ok(Array.isArray(json.data));
    const found = json.data.find((p: any) => p.id === paperId);
    assert.ok(found, "Created paper must be present in category papers");
    assert.equal(found.year, 2026);
  });

  it("GET /api/v1/pyq/papers/[id] returns paper details and fileUrl for free paper", async () => {
    const req = new NextRequest(`http://127.0.0.1:3046/api/v1/pyq/papers/${paperId}`);
    const res = await getPyqPaperDetailRoute(req, {
      params: Promise.resolve({ id: paperId }),
    });
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.ok, true);
    assert.equal(json.data.id, paperId);
    assert.equal(json.data.hasFile, true);
    assert.ok(json.data.fileUrl);
  });

  it("GET /api/v1/pyq/papers/[id] returns 404 for nonexistent paper", async () => {
    const req = new NextRequest("http://127.0.0.1:3046/api/v1/pyq/papers/nonexistent-paper");
    const res = await getPyqPaperDetailRoute(req, {
      params: Promise.resolve({ id: "nonexistent-paper" }),
    });
    assert.equal(res.status, 404);
  });

  it("GET /api/v1/current-affairs returns list of published digests", async () => {
    const req = new NextRequest("http://127.0.0.1:3046/api/v1/current-affairs");
    const res = await getCurrentAffairsRoute(req);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.ok, true);
    assert.ok(Array.isArray(json.data));
    const found = json.data.find((item: any) => item.id === caId);
    assert.ok(found, "Created CA digest must be present in listing");
  });

  it("GET /api/v1/current-affairs/[slug] returns detail of digest", async () => {
    const req = new NextRequest(`http://127.0.0.1:3046/api/v1/current-affairs/${caId}`);
    const res = await getCurrentAffairsDetailRoute(req, {
      params: Promise.resolve({ slug: caId }),
    });
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.ok, true);
    assert.equal(json.data.id, caId);
    assert.equal(json.data.month, 10);
    assert.equal(json.data.year, 2026);
  });
});
