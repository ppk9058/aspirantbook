import test, { describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

import { prisma } from "@/lib/prisma";
import { GET as adminListRoute } from "@/app/api/admin/data-deletion/route";
import { GET as adminGetRoute, PATCH as adminPatchRoute } from "@/app/api/admin/data-deletion/[id]/route";
import { GET as userStatusRoute, POST as userRequestRoute } from "@/app/api/v1/data-deletion/route";
import { NextRequest } from "next/server";
import { setMockSessionProvider } from "@/auth";

describe("Task G2: Data Deletion Queue & Admin Transitions", () => {
  let testUserId: string;
  let testUserEmail: string;
  let testAdminId: string;
  let testAdminEmail: string;
  let sampleRequestId: string;

  before(async () => {
    testUserEmail = `g2_student_${Date.now()}@example.com`;
    const user = await prisma.user.create({
      data: {
        email: testUserEmail,
        name: "G2 Student",
        role: "FREE",
        isActive: true,
      },
    });
    testUserId = user.id;

    testAdminEmail = `g2_admin_${Date.now()}@example.com`;
    const admin = await prisma.user.create({
      data: {
        email: testAdminEmail,
        name: "G2 Admin",
        role: "ADMIN",
        isActive: true,
      },
    });
    testAdminId = admin.id;

    // Create an initial sample deletion request
    const reqRecord = await prisma.dataDeletionRequest.create({
      data: {
        userId: testUserId,
        email: testUserEmail,
        reason: "Graduated college, no longer studying",
        status: "PENDING",
      },
    });
    sampleRequestId = reqRecord.id;
  });

  after(async () => {
    setMockSessionProvider(null);
    await prisma.dataDeletionRequest.deleteMany({
      where: { email: { in: [testUserEmail, testAdminEmail] } },
    });
    await prisma.auditLog.deleteMany({
      where: { action: "DATA_DELETION_STATUS_TRANSITION" },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [testUserId, testAdminId] } },
    });
  });

  describe("1. Security: Role Checks (Non-Admin 403)", () => {
    test("Non-admin (student) gets 403 on admin list route", async () => {
      setMockSessionProvider(() => ({
        user: { id: testUserId, email: testUserEmail, role: "FREE" },
      }));

      const req = new NextRequest("http://127.0.0.1:3000/api/admin/data-deletion", {
        headers: { cookie: "" },
      });
      const res = await adminListRoute(req);
      assert.equal(res.status, 403);
    });

    test("Non-admin (student) gets 403 on admin single get route", async () => {
      setMockSessionProvider(() => ({
        user: { id: testUserId, email: testUserEmail, role: "FREE" },
      }));

      const req = new NextRequest(`http://127.0.0.1:3000/api/admin/data-deletion/${sampleRequestId}`);
      const res = await adminGetRoute(req, { params: Promise.resolve({ id: sampleRequestId }) } as any);
      assert.equal(res.status, 403);
    });

    test("Non-admin (student) gets 403 on admin transition patch route", async () => {
      setMockSessionProvider(() => ({
        user: { id: testUserId, email: testUserEmail, role: "FREE" },
      }));

      const req = new NextRequest(`http://127.0.0.1:3000/api/admin/data-deletion/${sampleRequestId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "IN_REVIEW" }),
      });
      const res = await adminPatchRoute(req, { params: Promise.resolve({ id: sampleRequestId }) } as any);
      assert.equal(res.status, 403);
    });
  });

  describe("2. Admin Queue Listing & Transitions", () => {
    beforeEach(() => {
      setMockSessionProvider(() => ({
        user: { id: testAdminId, email: testAdminEmail, role: "ADMIN" },
      }));
    });

    test("Admin can list deletion requests", async () => {
      const req = new NextRequest("http://127.0.0.1:3000/api/admin/data-deletion");
      const res = await adminListRoute(req);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.requests));
      const found = json.requests.find((r: any) => r.id === sampleRequestId);
      assert.ok(found);
      assert.equal(found.status, "PENDING");
    });

    test("Admin can transition PENDING -> IN_REVIEW with notes and audit log entry", async () => {
      const req = new NextRequest(`http://127.0.0.1:3000/api/admin/data-deletion/${sampleRequestId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: "IN_REVIEW",
          adminNotes: "Under governance review",
        }),
      });

      const res = await adminPatchRoute(req, { params: Promise.resolve({ id: sampleRequestId }) } as any);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.request.status, "IN_REVIEW");
      assert.equal(json.request.adminNotes, "Under governance review");

      // Verify Audit Log entry was written
      const auditEntry = await prisma.auditLog.findFirst({
        where: {
          action: "DATA_DELETION_STATUS_TRANSITION",
          targetId: sampleRequestId,
        },
        orderBy: { createdAt: "desc" },
      });
      assert.ok(auditEntry, "Audit log entry must be created");
      assert.equal(auditEntry.actorId, testAdminId);
      assert.equal((auditEntry.metadata as any)?.newStatus, "IN_REVIEW");
      assert.equal((auditEntry.metadata as any)?.previousStatus, "PENDING");
    });

    test("Admin can transition IN_REVIEW -> COMPLETED, setting processedAt timestamp", async () => {
      const req = new NextRequest(`http://127.0.0.1:3000/api/admin/data-deletion/${sampleRequestId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED",
          adminNotes: "Account data anonymized per statutory procedure",
        }),
      });

      const res = await adminPatchRoute(req, { params: Promise.resolve({ id: sampleRequestId }) } as any);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.request.status, "COMPLETED");
      assert.ok(json.request.processedAt, "processedAt must be set on completion");
    });

    test("Transition validation rejects COMPLETED -> PENDING (terminal state violation)", async () => {
      const req = new NextRequest(`http://127.0.0.1:3000/api/admin/data-deletion/${sampleRequestId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "PENDING" }),
      });

      const res = await adminPatchRoute(req, { params: Promise.resolve({ id: sampleRequestId }) } as any);
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.match(json.error, /Cannot transition from terminal status COMPLETED/i);

      // Verify DB record remained COMPLETED
      const record = await prisma.dataDeletionRequest.findUnique({
        where: { id: sampleRequestId },
      });
      assert.equal(record?.status, "COMPLETED");
    });
  });

  describe("3. Authenticated User Deletion Request & Idempotency", () => {
    test("Authenticated student request creates initial record", async () => {
      // Create a fresh student with no previous deletion requests
      const freshEmail = `g2_fresh_${Date.now()}@example.com`;
      const freshUser = await prisma.user.create({
        data: {
          email: freshEmail,
          name: "Fresh Student",
          role: "FREE",
          isActive: true,
        },
      });

      setMockSessionProvider(() => ({
        user: { id: freshUser.id, email: freshUser.email, role: "FREE" },
      }));

      const req1 = new NextRequest("http://127.0.0.1:3000/api/v1/data-deletion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "Closing account permanently" }),
      });

      const res1 = await userRequestRoute(req1);
      assert.equal(res1.status, 200);
      const json1 = await res1.json();
      assert.equal(json1.ok, true);
      assert.equal(json1.data.status, "PENDING");
      const firstRequestId = json1.data.id;
      assert.ok(firstRequestId);

      // Idempotency: Second identical request MUST return the existing one, not create a duplicate
      const req2 = new NextRequest("http://127.0.0.1:3000/api/v1/data-deletion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "Duplicate tap or retry" }),
      });

      const res2 = await userRequestRoute(req2);
      assert.equal(res2.status, 200);
      const json2 = await res2.json();
      assert.equal(json2.ok, true);
      assert.equal(json2.data.id, firstRequestId, "Idempotency violated: second request created duplicate record!");
      assert.equal(json2.data.isExisting, true);

      // Status check route returns current status
      const getStatusReq = new NextRequest("http://127.0.0.1:3000/api/v1/data-deletion");
      const statusRes = await userStatusRoute(getStatusReq);
      assert.equal(statusRes.status, 200);
      const statusJson = await statusRes.json();
      assert.equal(statusJson.ok, true);
      assert.equal(statusJson.data.request.id, firstRequestId);
      assert.equal(statusJson.data.request.status, "PENDING");

      // Cleanup
      await prisma.dataDeletionRequest.deleteMany({ where: { userId: freshUser.id } });
      await prisma.user.delete({ where: { id: freshUser.id } });
    });
  });
});
