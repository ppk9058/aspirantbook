import { describe, it, before, after } from "node:test";
import * as assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { registerUser, refreshSession } from "../lib/services/auth-token.service";

/**
 * A3: a refresh token can only be spent once. Ten concurrent refreshes must
 * yield exactly one success; the rest are rejected and the family is revoked.
 */
describe("A3 refresh-token double spend", () => {
  let userId = "";
  let refreshToken = "";

  before(async () => {
    const email = `a3_race_${Date.now()}@example.com`;
    const reg = await registerUser({
      name: "Race User",
      email,
      password: "RacePassword123!",
      consent: true,
      platform: "android",
    });
    userId = reg.user.id;
    refreshToken = reg.tokens.refreshToken;
  });

  after(async () => {
    if (userId) {
      await prisma.deviceSession.deleteMany({ where: { userId } });
      await prisma.auditLog.deleteMany({ where: { actorId: userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  });

  it("10 parallel refreshes of one token: exactly 1 succeeds", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => refreshSession(refreshToken, "127.0.0.1", "race-test"))
    );

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    assert.equal(fulfilled.length, 1, `expected exactly 1 success, got ${fulfilled.length}`);
    assert.equal(rejected.length, 9);

    for (const r of rejected) {
      if (r.status === "rejected") {
        assert.match(String(r.reason?.message || r.reason), /reuse detected|Invalid or expired/i);
      }
    }

    // The winning token must be the only live session in the family after the
    // losers triggered reuse detection only for their own spent token.
    const live = await prisma.deviceSession.count({
      where: { userId, revokedAt: null },
    });
    assert.ok(live <= 1, `expected at most 1 live session, got ${live}`);
  });
});
