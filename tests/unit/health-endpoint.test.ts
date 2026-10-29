import test, { describe } from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

import { GET } from "@/app/api/health/route";

describe("Task B12: Health Endpoint Verification", () => {
  test("1. Returns 200 with status ok, uptime, timestamp, commit SHA, and db latency in ms", async () => {
    const response = await GET();
    assert.equal(response.status, 200);

    const data = await response.json();
    assert.equal(data.status, "ok");
    assert.ok(data.timestamp, "Timestamp must be present");
    assert.ok(
      !Number.isNaN(Date.parse(data.timestamp)),
      "Timestamp must be valid ISO string"
    );

    assert.ok(typeof data.uptime === "number", "Uptime must be a number");
    assert.ok(data.commit, "Git commit SHA must be present");
    assert.equal(typeof data.commit, "string");

    assert.ok(data.database, "Database telemetry must be present");
    assert.equal(data.database.status, "healthy");
    assert.ok(
      typeof data.database.latencyMs === "number" && data.database.latencyMs >= 0,
      "DB latency must be a non-negative number in ms"
    );
  });

  test("2. Does not leak connection strings, passwords, or secrets in response body", async () => {
    const response = await GET();
    const rawText = JSON.stringify(await response.json());

    // Assert no database credentials leaked
    assert.ok(!rawText.includes("postgresql://"), "Must not leak Postgres connection string");
    assert.ok(!rawText.includes("postgres_password"), "Must not leak DB password");
    assert.ok(!rawText.includes("54340"), "Must not leak internal DB port");

    // Assert no payment secrets leaked
    assert.ok(!rawText.includes("rzp_"), "Must not leak Razorpay keys");
    assert.ok(!rawText.includes("sk_live"), "Must not leak Stripe keys");
    assert.ok(!rawText.includes("whsec_"), "Must not leak webhook secrets");

    // Assert no raw env leaked
    assert.ok(!rawText.includes("JWT_SECRET"), "Must not leak JWT secrets");
    assert.ok(!rawText.includes("NEXTAUTH_SECRET"), "Must not leak NextAuth secret");
  });
});
