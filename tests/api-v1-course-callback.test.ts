import { describe, it, before, after } from "node:test";
import * as assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { captureCallbackLead, leadsToCsv, CALLBACK_RATE_LIMIT } from "../lib/courses/callback";

/**
 * Callback leads (web + v1). Security rules verified here:
 *  - E.164 storage only
 *  - generic success for invalid input / honeypot / rate limit (no oracle)
 *  - dedupe inside 24h
 *  - rate limit per IP+mobile
 *  - CSV masking helper never leaks a full number when asked to mask
 */
describe("Course callback leads", () => {
  let courseId = "";
  const runId = `${Date.now()}`;

  before(async () => {
    const course = await prisma.course.create({
      data: {
        title: "Callback Coverage Course",
        slug: `callback-course-${runId}`,
        description: "fixture",
        difficulty: "BEGINNER",
        isPublished: true,
        price: 0,
        isPremium: false,
      },
      select: { id: true },
    });
    courseId = course.id;
  });

  after(async () => {
    await prisma.courseCallbackLead.deleteMany({ where: { courseId } });
    await prisma.course.deleteMany({ where: { id: courseId } });
  });

  it("stores a valid Indian mobile in E.164", async () => {
    const mobile = "9876500001";
    const result = await captureCallbackLead({
      courseIdOrSlug: courseId,
      body: { name: "Test Learner", mobile, note: "Evening call" },
      ip: `10.0.0.1-${runId}`,
    });
    assert.equal(result.ok, true);
    assert.equal(result.created, true);

    const lead = await prisma.courseCallbackLead.findFirst({ where: { courseId, mobile: "+919876500001" } });
    assert.ok(lead, "lead should exist with E.164 mobile");
    assert.equal(lead!.name, "Test Learner");
    assert.equal(lead!.status, "NEW");
  });

  it("dedupes the same mobile + course inside 24h", async () => {
    const result = await captureCallbackLead({
      courseIdOrSlug: courseId,
      body: { name: "Test Learner", mobile: "9876500001" },
      ip: `10.0.0.2-${runId}`,
    });
    assert.equal(result.created, false);
    assert.equal(result.reason, "duplicate");

    const count = await prisma.courseCallbackLead.count({ where: { courseId, mobile: "+919876500001" } });
    assert.equal(count, 1);
  });

  it("honeypot submissions return generic success and store nothing", async () => {
    const mobile = "9876500002";
    const result = await captureCallbackLead({
      courseIdOrSlug: courseId,
      body: { name: "Bot", mobile, website: "http://spam.example" },
      ip: `10.0.0.3-${runId}`,
    });
    assert.deepEqual(result, { ok: true, created: false, reason: "honeypot" });
    assert.equal(await prisma.courseCallbackLead.count({ where: { courseId, mobile: "+919876500002" } }), 0);
  });

  it("rejects invalid numbers with a generic response (no enumeration)", async () => {
    for (const mobile of ["12345", "abcdefghij", "+1 555 010 9999"]) {
      const result = await captureCallbackLead({
        courseIdOrSlug: courseId,
        body: { name: "Someone", mobile },
        ip: `10.0.0.4-${runId}`,
      });
      assert.equal(result.ok, true);
      assert.equal(result.created, false);
      assert.equal(result.reason, "invalid");
    }
  });

  it("unknown course also answers generically", async () => {
    const result = await captureCallbackLead({
      courseIdOrSlug: `missing-${runId}`,
      body: { name: "Someone", mobile: "9876500003" },
      ip: `10.0.0.5-${runId}`,
    });
    assert.equal(result.ok, true);
    assert.equal(result.created, false);
    assert.equal(result.reason, "invalid");
  });

  it(`rate limits to ${CALLBACK_RATE_LIMIT} requests per IP+mobile per hour`, async () => {
    const mobile = "9876500004";
    const ip = `10.0.0.6-${runId}`;
    const results = [];
    for (let i = 0; i < CALLBACK_RATE_LIMIT + 1; i++) {
      results.push(
        await captureCallbackLead({ courseIdOrSlug: courseId, body: { name: "Rate Tester", mobile }, ip })
      );
    }
    assert.equal(results[0].created, true);
    assert.equal(results[CALLBACK_RATE_LIMIT].reason, "rate_limited");
    assert.equal(results.every((r) => r.ok === true), true, "every response stays generic");
  });

  it("CSV export masks numbers when asked", async () => {
    const csv = leadsToCsv(
      [
        {
          createdAt: new Date("2026-01-01T00:00:00Z"),
          name: "A, B",
          mobile: "+919876500001",
          status: "NEW",
          source: "COURSE_DETAIL",
          utm: null,
          note: 'quote "here"',
        },
      ],
      { maskMobile: true }
    );
    assert.ok(csv.startsWith("created_at,name,mobile,status,source,utm,note"))
    assert.ok(csv.includes('"A, B"'))
    assert.ok(csv.includes('+91****01'))
    assert.ok(!csv.includes("+919876500001"))

    const full = leadsToCsv(
      [
        {
          createdAt: new Date("2026-01-01T00:00:00Z"),
          name: "A",
          mobile: "+919876500001",
          status: "NEW",
          source: "COURSE_DETAIL",
          utm: null,
          note: null,
        },
      ],
      { maskMobile: false }
    );
    assert.ok(full.includes("+919876500001"))
  });
});
