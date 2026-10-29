import test, { describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

import { prisma } from "@/lib/prisma";
import { setMockSessionProvider } from "@/auth";
import { NextRequest } from "next/server";

/**
 * R4 / G2 remediation proof.
 *
 * Route modules are imported dynamically so the fail-before run against the
 * pre-G2 commit fails on missing behaviour/route existence rather than on a
 * top-level module-resolution error.
 */
async function loadModule(specifier: string): Promise<any | null> {
  try {
    return await import(specifier);
  } catch {
    return null;
  }
}

function requireRoute(mod: any, exportName: string, label: string) {
  assert.ok(mod, `${label} module must exist`);
  assert.equal(typeof mod[exportName], "function", `${label} must export ${exportName}`);
}

async function listQueueRouteFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listQueueRouteFiles(full)));
    else if (entry.name === "route.ts") out.push(full);
  }
  return out;
}

describe("Task G2 remediation: deletion idempotency, audit trail, queue authorization", () => {
  let adminList: any;
  let adminItem: any;
  let userRoute: any;
  let adminId: string;
  let adminEmail: string;
  const createdUserIds: string[] = [];
  const createdEmails: string[] = [];

  async function createUser(prefix: string, role: "FREE" | "ADMIN" = "FREE") {
    const email = `g2r_${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}@example.com`;
    const user = await prisma.user.create({
      data: { email, name: `G2R ${prefix}`, role, isActive: true },
    });
    createdUserIds.push(user.id);
    createdEmails.push(email);
    return { id: user.id, email };
  }

  function asUser(id: string, email: string, role: string) {
    setMockSessionProvider(() => ({ user: { id, email, role } }));
  }

  function asAnonymous() {
    // Returning null from the mock avoids NextAuth touching next/headers
    // outside a request scope; it is exactly the "no session" state.
    setMockSessionProvider(() => null);
  }

  before(async () => {
    adminList = await loadModule("@/app/api/admin/data-deletion/route");
    adminItem = await loadModule("@/app/api/admin/data-deletion/[id]/route");
    userRoute = await loadModule("@/app/api/v1/data-deletion/route");
    const admin = await createUser("admin", "ADMIN");
    adminId = admin.id;
    adminEmail = admin.email;
  });

  after(async () => {
    setMockSessionProvider(null);
    if (createdUserIds.length) {
      await prisma.dataDeletionRequest.deleteMany({
        where: { OR: [{ userId: { in: createdUserIds } }, { email: { in: createdEmails } }] },
      });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
  });

  beforeEach(() => {
    setMockSessionProvider(() => null);
  });

  test("a) posting the same deletion request twice returns the SAME id and leaves exactly one active row", async () => {
    requireRoute(userRoute, "POST", "POST /api/v1/data-deletion");
    const user = await createUser("idem");
    asUser(user.id, user.email, "FREE");

    const post = () =>
      userRoute.POST(
        new NextRequest("http://127.0.0.1:3000/api/v1/data-deletion", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason: "Please delete my account" }),
        })
      );

    const first = await post();
    const firstJson = await first.json();
    assert.equal(first.status, 200);
    assert.equal(firstJson.ok, true);
    assert.equal(firstJson.data.isExisting, false);

    const second = await post();
    const secondJson = await second.json();
    assert.equal(second.status, 200, "Second call must succeed idempotently (200)");
    assert.equal(secondJson.ok, true);
    assert.equal(secondJson.data.id, firstJson.data.id, "Second call must return the existing request id");
    assert.equal(secondJson.data.isExisting, true);

    const active = await prisma.dataDeletionRequest.count({
      where: { userId: user.id, status: { in: ["PENDING", "IN_REVIEW"] } },
    });
    assert.equal(active, 1, "Exactly one active deletion row must exist");
  });

  test("b) idempotency does not leak across users (one user's pending request is not reused for another)", async () => {
    requireRoute(userRoute, "POST", "POST /api/v1/data-deletion");
    const userA = await createUser("leak_a");
    const userB = await createUser("leak_b");

    asUser(userA.id, userA.email, "FREE");
    const resA = await userRoute.POST(
      new NextRequest("http://127.0.0.1:3000/api/v1/data-deletion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "A leaves" }),
      })
    );
    const jsonA = await resA.json();

    asUser(userB.id, userB.email, "FREE");
    const resB = await userRoute.POST(
      new NextRequest("http://127.0.0.1:3000/api/v1/data-deletion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "B leaves" }),
      })
    );
    const jsonB = await resB.json();

    assert.equal(resB.status, 200);
    assert.notEqual(jsonB.data.id, jsonA.data.id, "User B must not receive user A's request id");
    assert.equal(jsonB.data.email, userB.email, "The returned request must belong to user B");
    assert.equal(jsonB.data.isExisting, false);

    assert.equal(await prisma.dataDeletionRequest.count({ where: { userId: userA.id } }), 1);
    assert.equal(await prisma.dataDeletionRequest.count({ where: { userId: userB.id } }), 1);
  });

  test("c) a COMPLETED request allows a new request (ASSUMPTION: only PENDING/IN_REVIEW are active)", async () => {
    requireRoute(userRoute, "POST", "POST /api/v1/data-deletion");
    const user = await createUser("terminal");
    const old = await prisma.dataDeletionRequest.create({
      data: {
        userId: user.id,
        email: user.email,
        status: "COMPLETED",
        processedAt: new Date(),
      },
    });

    asUser(user.id, user.email, "FREE");
    const res = await userRoute.POST(
      new NextRequest("http://127.0.0.1:3000/api/v1/data-deletion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "Second request after completion" }),
      })
    );
    const json = await res.json();

    assert.equal(res.status, 200);
    assert.notEqual(json.data.id, old.id, "A terminal request must not block a new one");
    assert.equal(json.data.status, "PENDING");
    assert.equal(json.data.isExisting, false);

    const active = await prisma.dataDeletionRequest.count({
      where: { userId: user.id, status: { in: ["PENDING", "IN_REVIEW"] } },
    });
    assert.equal(active, 1);
  });

  test("d) every admin transition writes exactly one AuditLog row; an invalid transition writes none", async () => {
    requireRoute(adminItem, "PATCH", "PATCH /api/admin/data-deletion/[id]");
    const user = await createUser("audit");
    const request = await prisma.dataDeletionRequest.create({
      data: { userId: user.id, email: user.email, status: "PENDING" },
    });
    asUser(adminId, adminEmail, "ADMIN");

    const patch = (status: string) =>
      adminItem.PATCH(
        new NextRequest(`http://127.0.0.1:3000/api/admin/data-deletion/${request.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status }),
        }),
        { params: Promise.resolve({ id: request.id }) }
      );

    const before = await prisma.auditLog.count({
      where: { action: "DATA_DELETION_STATUS_TRANSITION", targetId: request.id },
    });

    const toReview = await patch("IN_REVIEW");
    assert.equal(toReview.status, 200);
    const afterReview = await prisma.auditLog.findMany({
      where: { action: "DATA_DELETION_STATUS_TRANSITION", targetId: request.id },
      orderBy: { createdAt: "asc" },
    });
    assert.equal(afterReview.length, before + 1, "PENDING -> IN_REVIEW must write exactly one audit row");
    const entry = afterReview[afterReview.length - 1];
    assert.equal(entry.actorId, adminId, "Audit row must record the acting admin");
    assert.equal(entry.targetId, request.id, "Audit row must record the request id");
    assert.equal((entry.metadata as any)?.previousStatus, "PENDING");
    assert.equal((entry.metadata as any)?.newStatus, "IN_REVIEW");

    const toComplete = await patch("COMPLETED");
    assert.equal(toComplete.status, 200);
    const afterComplete = await prisma.auditLog.count({
      where: { action: "DATA_DELETION_STATUS_TRANSITION", targetId: request.id },
    });
    assert.equal(afterComplete, before + 2, "IN_REVIEW -> COMPLETED must write exactly one more audit row");

    // Invalid terminal transition must not write an audit row.
    const invalid = await patch("PENDING");
    assert.equal(invalid.status, 400);
    const afterInvalid = await prisma.auditLog.count({
      where: { action: "DATA_DELETION_STATUS_TRANSITION", targetId: request.id },
    });
    assert.equal(afterInvalid, afterComplete, "A rejected transition must not write an audit row");
  });

  test("e) every queue route returns 401 unauthenticated and 403 for non-admin (routes enumerated from disk)", async () => {
    const routeFiles = await listQueueRouteFiles(
      path.join(process.cwd(), "app/api/admin/data-deletion")
    );
    assert.ok(routeFiles.length >= 2, `Expected at least the list and [id] routes, found ${routeFiles.length}`);

    const nonAdmin = await createUser("nonadmin");
    const exportsByFile: Record<string, string[]> = {
      "route.ts": ["GET"],
      "[id]/route.ts": ["GET", "PATCH"],
    };

    for (const file of routeFiles) {
      const rel = path.relative(path.join(process.cwd(), "app/api/admin/data-deletion"), file);
      const exportsToCheck = exportsByFile[rel];
      assert.ok(exportsToCheck, `Unexpected queue route file on disk: ${rel}`);
      const dirRel = path.dirname(rel);
      const specifier =
        dirRel === "."
          ? "@/app/api/admin/data-deletion/route"
          : `@/app/api/admin/data-deletion/${dirRel}/route`;
      const mod = await loadModule(specifier);
      assert.ok(mod, `Route module for ${rel} must load`);

      const requestId = "g2r_nonexistent_id";
      const params = { params: Promise.resolve({ id: requestId }) };

      for (const exportName of exportsToCheck) {
        assert.equal(typeof mod[exportName], "function", `${rel} must export ${exportName}`);

        asAnonymous();
        const unauthRes = await mod[exportName](
          new NextRequest(`http://127.0.0.1:3000/api/admin/data-deletion/${rel === "route.ts" ? "" : requestId}`, {
            method: exportName,
            headers: { "content-type": "application/json" },
            body: exportName === "PATCH" ? JSON.stringify({ status: "IN_REVIEW" }) : undefined,
          }),
          params
        );
        assert.equal(unauthRes.status, 401, `${exportName} ${rel} must return 401 unauthenticated`);

        asUser(nonAdmin.id, nonAdmin.email, "FREE");
        const forbiddenRes = await mod[exportName](
          new NextRequest(`http://127.0.0.1:3000/api/admin/data-deletion/${rel === "route.ts" ? "" : requestId}`, {
            method: exportName,
            headers: { "content-type": "application/json" },
            body: exportName === "PATCH" ? JSON.stringify({ status: "IN_REVIEW" }) : undefined,
          }),
          params
        );
        assert.equal(forbiddenRes.status, 403, `${exportName} ${rel} must return 403 for non-admin`);
      }
    }
  });

  test("f) the authenticated status route returns 401 unauthenticated", async () => {
    requireRoute(userRoute, "GET", "GET /api/v1/data-deletion");
    asAnonymous();
    const res = await userRoute.GET(new NextRequest("http://127.0.0.1:3000/api/v1/data-deletion"));
    assert.equal(res.status, 401);
  });
});
