import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { submitContactForm } from "@/lib/actions/legal";

describe("Contact Form Email Integration", () => {
  const outboxPath = path.join(process.cwd(), "logs", "dev-email-outbox.jsonl");

  test("1. Rejects invalid email address", async () => {
    const formData = new FormData();
    formData.set("name", "Rohan Sharma");
    formData.set("email", "invalid-email");
    formData.set("subject", "Course access issue");
    formData.set("message", "I cannot access the video lectures on mobile.");

    const res = await submitContactForm(null, formData);
    assert.equal(res.success, false);
    assert.match(res.error!, /valid email/i);
  });

  test("2. Rejects message shorter than 10 characters", async () => {
    const formData = new FormData();
    formData.set("name", "Rohan Sharma");
    formData.set("email", "rohan@example.com");
    formData.set("subject", "Help");
    formData.set("message", "Hi");

    const res = await submitContactForm(null, formData);
    assert.equal(res.success, false);
    assert.match(res.error!, /at least 10 characters/i);
  });

  test("3. Successfully sends both admin alert to ppk9058@gmail.com and user confirmation", async () => {
    const testEmail = `candidate_${Date.now()}@testdomain.com`;
    const uniqueSubject = `Inquiry regarding BPSC Mock 72nd - ${Date.now()}`;
    const testMessage = "Could you please clarify the marking scheme for Section 2 questions?";

    const formData = new FormData();
    formData.set("name", "Candidate Kumar");
    formData.set("email", testEmail);
    formData.set("subject", uniqueSubject);
    formData.set("message", testMessage);

    const res = await submitContactForm(null, formData);
    assert.equal(res.success, true);
    assert.match(res.message!, /received/i);

    // Read the email outbox
    assert.ok(fs.existsSync(outboxPath), "dev-email-outbox.jsonl must exist");
    const lines = fs.readFileSync(outboxPath, "utf8").trim().split("\n");
    const emails = lines.map((l) => JSON.parse(l));

    // 1. Admin email
    const adminMail = emails.find(
      (e) => e.to === "ppk9058@gmail.com" && e.subject.includes(uniqueSubject)
    );
    assert.ok(adminMail, "Admin alert email must be sent to ppk9058@gmail.com");
    assert.match(adminMail.html, /Candidate Kumar/);
    assert.match(adminMail.html, new RegExp(testEmail));
    assert.match(adminMail.html, /Section 2 questions/);

    // 2. User acknowledgment email
    const userMail = emails.find(
      (e) => e.to === testEmail && e.subject.includes(uniqueSubject)
    );
    assert.ok(userMail, `User acknowledgment email must be sent to ${testEmail}`);
    assert.match(userMail.html, /Thank You for Contacting AspirantBook/);
    assert.match(userMail.html, /hello@aspirantbook.com/);
  });
});
