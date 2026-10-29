import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

import { prisma } from "@/lib/prisma";
import { submitDataDeletionRequest, submitContactForm } from "@/lib/actions/legal";
import { getFormSubmissions } from "@/lib/forms-service";

describe("Task B6: Legal Pages, Contact Form & Data Deletion", () => {
  let testUserId: string;
  const testEmail = `test_delete_${Date.now()}@example.com`;

  before(async () => {
    // Create a temporary test user
    const hashed = await bcrypt.hash("ValidPass123!", 10);
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: "Deletion Test Candidate",
        password: hashed,
        role: "FREE",
        isActive: true,
      },
    });
    testUserId = user.id;
  });

  after(async () => {
    // Clean up
    await prisma.dataDeletionRequest.deleteMany({
      where: { email: { contains: "test_delete_" } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: "test_delete_" } },
    });
  });

  describe("Public Data Deletion Form", () => {
    test("1. Rejects missing or invalid email address", async () => {
      const formData = new FormData();
      formData.set("email", "invalid-email");
      formData.set("confirmText", "DELETE");

      const res = await submitDataDeletionRequest(null, formData);
      assert.equal(res.success, false);
      assert.match(res.error!, /valid email/i);
    });

    test("2. Rejects request without typing DELETE confirmation", async () => {
      const formData = new FormData();
      formData.set("email", "valid@example.com");
      formData.set("confirmText", "yes");

      const res = await submitDataDeletionRequest(null, formData);
      assert.equal(res.success, false);
      assert.match(res.error!, /DELETE/i);
    });

    test("3. Successfully records data deletion request in DB and links userId if user exists", async () => {
      const formData = new FormData();
      formData.set("email", testEmail);
      formData.set("reason", "Finished exam preparation");
      formData.set("confirmText", "DELETE");

      const res = await submitDataDeletionRequest(null, formData);
      assert.equal(res.success, true);
      assert.match(res.message!, /submitted successfully/i);

      // Verify in DB
      const record = await prisma.dataDeletionRequest.findFirst({
        where: { email: testEmail },
      });
      assert.ok(record, "Record must exist in DataDeletionRequest table");
      assert.equal(record.userId, testUserId);
      assert.equal(record.status, "PENDING");
      assert.equal(record.reason, "Finished exam preparation");
    });
  });

  describe("Contact Form Submission", () => {
    test("4. Rejects incomplete contact form fields", async () => {
      const formData = new FormData();
      formData.set("name", "A"); // too short
      formData.set("email", "notanemail");
      formData.set("subject", "Hi"); // too short
      formData.set("message", "short"); // too short

      const res = await submitContactForm(null, formData);
      assert.equal(res.success, false);
      assert.ok(res.error);
    });

    test("5. Successfully records contact message in form submission storage", async () => {
      const formData = new FormData();
      formData.set("name", "Student Candidate");
      formData.set("email", "student.query@example.com");
      formData.set("subject", "Question regarding CBT Mock Test 4");
      formData.set("message", "I noticed question 42 may have had a typo in option C. Could your academic team review it?");

      const res = await submitContactForm(null, formData);
      assert.equal(res.success, true);
      assert.match(res.message!, /Thank you for reaching out/i);

      // Verify recorded
      const submissions = await getFormSubmissions({ formSlug: "contact-us" });
      const match = submissions.find((s) => s.userEmail === "student.query@example.com");
      assert.ok(match, "Contact submission should be recorded");
      assert.equal(match.data.subject, "Question regarding CBT Mock Test 4");
    });
  });
});
