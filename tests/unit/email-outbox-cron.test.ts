import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import * as yaml from "js-yaml";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { POST as internalOutboxRoute } from "@/app/api/internal/email-outbox/route";

const ROOT = path.resolve(__dirname, "../..");
const RENDER_YAML = path.join(ROOT, "render.yaml");
const WORKFLOW_DISABLED = path.join(ROOT, ".github/workflows/email-outbox-cron.yml.disabled");
const RUNBOOK_RENDER = path.join(ROOT, "docs/runbooks/render-cloudflare.md");

describe("R12-F: Email outbox consumer and cron trigger", () => {
  let mockServer: http.Server;
  let mockPort: number;
  let brevoCalls = 0;
  const originalEnv = { ...process.env };
  const CRON_SECRET = "test_cron_secret_r12_f_token_54321";

  before(async () => {
    mockServer = http.createServer((req, res) => {
      let data = "";
      req.on("data", (chunk) => (data += chunk));
      req.on("end", () => {
        brevoCalls++;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ messageId: "msg_test_r12_f" }));
      });
    });

    await new Promise<void>((resolve) => {
      mockServer.listen(0, "127.0.0.1", () => {
        mockPort = (mockServer.address() as any).port;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => mockServer.close(() => resolve()));
    await prisma.emailOutbox.deleteMany({
      where: { to: { contains: "r12_f_test_" } },
    }).catch(() => {});
    process.env = { ...originalEnv };
  });

  beforeEach(async () => {
    brevoCalls = 0;
    process.env = { ...originalEnv };
    process.env.CRON_SECRET = CRON_SECRET;
    process.env.BREVO_API_KEY = "test_brevo_key";
    process.env.BREVO_API_URL = `http://127.0.0.1:${mockPort}/brevo`;
    await prisma.emailOutbox.deleteMany({
      where: { to: { contains: "r12_f_test_" } },
    }).catch(() => {});
  });

  it("F-R12-01: render.yaml contains a cron job for email outbox every 5 minutes", () => {
    const content = fs.readFileSync(RENDER_YAML, "utf-8");
    const doc = yaml.load(content) as any;
    assert.ok(doc?.services, "render.yaml must have services");
    const cronJob = doc.services.find((s: any) => s.type === "cron");
    assert.ok(cronJob, "render.yaml must have a cron job service");
    assert.equal(cronJob.schedule, "*/5 * * * *", "schedule must be every 5 minutes");
    assert.ok(cronJob.command.includes("/api/internal/email-outbox"), "command must call /api/internal/email-outbox");
    assert.ok(cronJob.command.includes("CRON_SECRET"), "command must pass CRON_SECRET");

    const cronSecretVar = cronJob.envVars?.find((e: any) => e.key === "CRON_SECRET");
    assert.ok(cronSecretVar, "CRON_SECRET must be in cron job envVars");
    assert.equal(cronSecretVar.sync, false, "CRON_SECRET must be sync: false (secret via env)");
  });

  it("F-R12-02: GitHub Actions alternative exists and is left disabled", () => {
    assert.ok(fs.existsSync(WORKFLOW_DISABLED), "disabled workflow stub must exist");
    const activeWorkflow = path.join(ROOT, ".github/workflows/email-outbox-cron.yml");
    assert.equal(fs.existsSync(activeWorkflow), false, "active workflow must not exist");
  });

  it("F-R12-03: Route rejects missing CRON_SECRET with 401", async () => {
    const req = new NextRequest("http://127.0.0.1:3000/api/internal/email-outbox", {
      method: "POST",
    });
    const res = await internalOutboxRoute(req);
    assert.equal(res.status, 401);
  });

  it("F-R12-04: Route rejects wrong CRON_SECRET with 401", async () => {
    const req = new NextRequest("http://127.0.0.1:3000/api/internal/email-outbox", {
      method: "POST",
      headers: { "x-cron-secret": "wrong_cron_secret_of_different_length" },
    });
    const res = await internalOutboxRoute(req);
    assert.equal(res.status, 401);
  });

  it("F-R12-05: Route accepts valid CRON_SECRET and processes a pending outbox row", async () => {
    const row = await prisma.emailOutbox.create({
      data: {
        to: `r12_f_test_${Date.now()}@example.com`,
        subject: "R12-F Outbox Cron Test",
        html: "<p>cron test</p>",
        status: "PENDING",
        attempts: 0,
      },
    });

    const req = new NextRequest("http://127.0.0.1:3000/api/internal/email-outbox", {
      method: "POST",
      headers: { "x-cron-secret": CRON_SECRET },
    });

    const res = await internalOutboxRoute(req);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.stats.sent >= 1, "at least 1 email must be sent");

    const updated = await prisma.emailOutbox.findUnique({ where: { id: row.id } });
    assert.equal(updated?.status, "SENT");
    assert.equal(updated?.attempts, 1);
    assert.ok(updated?.sentAt);
  });

  it("F-R12-06: docs/runbooks/ documents the email outbox cron worker", () => {
    const runbook = fs.readFileSync(RUNBOOK_RENDER, "utf-8");
    assert.ok(runbook.includes("email-outbox") || runbook.includes("Email Outbox"), "runbook must document email outbox");
  });
});
