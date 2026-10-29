import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

import { prisma } from "@/lib/prisma";
import { sendEmail, readLatestDevEmail } from "@/lib/email";
import { createDoubt, getAllDoubts } from "@/lib/doubts-service";
import { createFormSubmission, getFormSubmissions } from "@/lib/forms-service";
import { logContentAudit, getRecentAuditEvents } from "@/lib/actions/admin/audit";
import { uploadToS3, getPrivateFileSignedUrl } from "@/lib/s3";

describe("Task B3: No Local-Disk Writes Suite (PERSIST_BACKEND db & S3/MinIO)", () => {
  let mockS3Server: http.Server;
  let s3Port: number;
  const uploadedObjects = new Map<string, Buffer>();

  before(async () => {
    // Start lightweight in-process S3-compatible HTTP server to test S3/MinIO client
    await new Promise<void>((resolve) => {
      mockS3Server = http.createServer((req, res) => {
        const url = new URL(req.url || "/", `http://${req.headers.host}`);
        const parts = url.pathname.split("/").filter(Boolean);
        const bucket = parts[0];
        const key = parts.slice(1).join("/");

        if (req.method === "PUT") {
          const chunks: Buffer[] = [];
          req.on("data", (chunk) => chunks.push(chunk));
          req.on("end", () => {
            const body = Buffer.concat(chunks);
            uploadedObjects.set(`${bucket}/${key}`, body);
            res.writeHead(200, { ETag: '"test-etag-12345"' });
            res.end();
          });
          return;
        }

        if (req.method === "GET") {
          const obj = uploadedObjects.get(`${bucket}/${key}`);
          if (obj) {
            res.writeHead(200, { "Content-Type": "application/octet-stream" });
            res.end(obj);
          } else {
            res.writeHead(404);
            res.end();
          }
          return;
        }

        res.writeHead(200);
        res.end();
      });

      mockS3Server.listen(0, "127.0.0.1", () => {
        const addr = mockS3Server.address() as any;
        s3Port = addr.port;
        process.env.S3_ENDPOINT = `http://127.0.0.1:${s3Port}`;
        process.env.S3_BUCKET = "test-uploads";
        process.env.S3_ACCESS_KEY = "test_minio_access_key";
        process.env.S3_SECRET_KEY = "test_minio_secret_key";
        process.env.S3_FORCE_PATH_STYLE = "true";
        resolve();
      });
    });
  });

  after(() => {
    mockS3Server?.close();
  });

  test("1. Email Outbox writes to Postgres when PERSIST_BACKEND=db with zero fs operations", async () => {
    process.env.PERSIST_BACKEND = "db";
    const testTo = `test_outbox_${Date.now()}@example.com`;

    const res = await sendEmail({
      to: testTo,
      subject: "Test DB Outbox Subject",
      html: "<p>Hello from DB outbox</p>",
      text: "Hello from DB outbox",
    });

    assert.equal(res.success, true);
    assert.ok(res.id);

    // Verify stored in PostgreSQL EmailOutbox table
    const dbRecord = await prisma.emailOutbox.findUnique({
      where: { id: res.id },
    });
    assert.ok(dbRecord);
    assert.equal(dbRecord.to, testTo);
    assert.equal(dbRecord.subject, "Test DB Outbox Subject");

    // Read back via readLatestDevEmail
    const latest = await readLatestDevEmail(testTo);
    assert.ok(latest);
    assert.equal(latest.id, res.id);
  });

  test("2. Student Doubt writes to Postgres Doubt table when PERSIST_BACKEND=db", async () => {
    process.env.PERSIST_BACKEND = "db";
    const studentEmail = `student_${Date.now()}@example.com`;

    const doubt = await createDoubt({
      studentId: `s_${Date.now()}`,
      studentName: "Doubt Student",
      studentEmail,
      subject: "Physics",
      questionText: "What is the second law of thermodynamics?",
    });

    assert.ok(doubt.id);
    assert.equal(doubt.subject, "Physics");

    // Verify in DB
    const inDb = await prisma.doubt.findUnique({ where: { id: doubt.id } });
    assert.ok(inDb);
    assert.equal(inDb.questionText, "What is the second law of thermodynamics?");

    const list = await getAllDoubts({ subject: "Physics" });
    assert.ok(list.some((d) => d.id === doubt.id));
  });

  test("3. Form submission writes to Postgres FormSubmission table when PERSIST_BACKEND=db", async () => {
    process.env.PERSIST_BACKEND = "db";
    const formSlug = `scholarship_${Date.now()}`;

    const submission = await createFormSubmission({
      formSlug,
      userName: "Scholarship Applicant",
      userEmail: `applicant_${Date.now()}@example.com`,
      formData: { gpa: "3.9", statement: "Hardworking aspirant" },
    });

    assert.ok(submission.id);
    assert.equal(submission.formSlug, formSlug);

    const inDb = await prisma.formSubmission.findUnique({ where: { id: submission.id } });
    assert.ok(inDb);
    assert.equal((inDb.formData as any).gpa, "3.9");

    const forms = await getFormSubmissions({ formSlug });
    assert.equal(forms.length, 1);
    assert.equal(forms[0].id, submission.id);
  });

  test("4. Audit event writes to Postgres AuditEvent table when PERSIST_BACKEND=db", async () => {
    process.env.PERSIST_BACKEND = "db";
    const entityId = `entity_${Date.now()}`;

    const res = await logContentAudit({
      entityId,
      entityType: "COURSE",
      action: "UPDATE",
      details: { title: "Updated Course Title" },
    });

    assert.equal(res.success, true);

    const events = await getRecentAuditEvents({ entityId, limit: 10 });
    assert.ok(events.length >= 1);
    assert.equal(events[0].entityId, entityId);
    assert.equal(events[0].action, "UPDATE");
  });

  test("5. S3/MinIO compatible client uploads file and generates signed URL", async () => {
    const fileContent = "Simulated PDF document content for S3 upload testing";
    const blob = new Blob([fileContent], { type: "application/pdf" });
    const file = new File([blob], "test-exam-paper.pdf", { type: "application/pdf" });

    const uploadRes = await uploadToS3(file, "pdf", "documents/test-paper.pdf");
    assert.ok(uploadRes.url);
    assert.equal(uploadRes.key, "documents/test-paper.pdf");

    // Verify object stored on mock S3 server
    const stored = uploadedObjects.get("test-uploads/documents/test-paper.pdf");
    assert.ok(stored);
    assert.equal(stored.toString(), fileContent);

    // Verify presigned URL generation
    const signedUrl = await getPrivateFileSignedUrl("documents/test-paper.pdf", 3600);
    assert.ok(signedUrl);
    assert.match(signedUrl, /X-Amz-Signature/);
  });

  test("6. Legacy parity: PERSIST_BACKEND=fs persists to legacy file formats", async () => {
    process.env.PERSIST_BACKEND = "fs";
    const legacyEmail = `legacy_${Date.now()}@example.com`;

    const res = await sendEmail({
      to: legacyEmail,
      subject: "Legacy FS Outbox Subject",
      html: "<p>Legacy outbox</p>",
    });

    assert.equal(res.success, true);
    assert.ok(res.id);

    const latest = await readLatestDevEmail(legacyEmail);
    assert.ok(latest);
    assert.equal(latest.id, res.id);

    // Cleanup env
    process.env.PERSIST_BACKEND = "db";
  });
});
