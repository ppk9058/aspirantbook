import { test, expect } from "@playwright/test";

import {
  createActor,
  loginThroughUi,
  newNonce,
  prisma,
} from "./test-series-e2e-helpers";

/**
 * C2: doubts were stored in data/doubts.json through fs.writeFile and seeded
 * with three invented questions ("Aman Verma", "Priya Patel", ...) that every
 * teacher saw as real. The file is read-only and per-instance on serverless, so
 * a posted doubt could vanish.
 *
 * This test posts a doubt as a real student, checks it comes back from the API
 * and renders on the doubts page, and that the invented seeds are gone.
 */

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3045";

test.describe("C2 doubts persist and are not seeded", () => {
  let studentId = "";
  let doubtId = "";

  test.afterAll(async () => {
    await prisma.doubt.deleteMany({ where: { questionText: { contains: "C2 doubt" } } });
    if (studentId) await prisma.user.deleteMany({ where: { id: studentId } });
    await prisma.$disconnect();
  });

  test("a posted doubt is stored and shown on the doubts page", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "same flow at every width");
    test.setTimeout(180_000);
    await prisma.$connect();

    const nonce = newNonce();
    const student = await createActor(nonce, "FREE", "doubts");
    studentId = student.id;

    await loginThroughUi(page, student.email);

    const question = `C2 doubt ${nonce}: why does a REPEATABLE READ transaction still see new rows?`;

    const res = await page.request.post(`${BASE_URL}/api/doubts`, {
      headers: { Origin: BASE_URL, "Content-Type": "application/json" },
      data: {
        subject: "PostgreSQL",
        topic: "Isolation levels",
        questionText: question,
      },
    });
    expect(res.status(), await res.text()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    doubtId = body.doubt.id;

    // The row is in Postgres, not in a JSON file.
    const row = await prisma.doubt.findUnique({ where: { id: doubtId } });
    expect(row?.questionText).toBe(question);
    expect(row?.status).toBe("PENDING");

    // And the API returns it to the list.
    const list = await page.request.get(`${BASE_URL}/api/doubts`);
    expect(list.status()).toBe(200);
    const listBody = await list.json();
    expect(
      (listBody.doubts as Array<{ id: string }>).some((d) => d.id === doubtId),
      "the new doubt must be listed"
    ).toBe(true);

    // The doubts page renders it.
    await page.goto("/doubts");
    await expect(page.getByText(question, { exact: false })).toBeVisible({ timeout: 30_000 });

    // The invented seed doubts must not appear anywhere.
    for (const seededName of ["Aman Verma", "Priya Patel", "Karan Johar"]) {
      await expect(page.getByText(seededName, { exact: false })).toHaveCount(0);
    }
    await expect(page.getByText("Why is vectorization faster than Python's native for-loops")).toHaveCount(0);
  });

  test("the doubt board requires a session and never exposes emails to learners", async ({
    page,
    request,
  }) => {
    test.setTimeout(180_000);
    await prisma.$connect();

    await prisma.doubt.deleteMany({ where: { questionText: { contains: "C2 privacy doubt" } } });

    // Phase D: the board used to be readable with no session at all.
    const anonymous = await request.get(`${BASE_URL}/api/doubts`);
    expect(anonymous.status(), "anonymous visitors must not read the board").toBe(401);

    const nonce = newNonce();
    const asker = await createActor(nonce, "FREE", "doubts-privacy");
    const viewer = await createActor(nonce, "FREE", "doubts-viewer");

    await prisma.doubt.create({
      data: {
        studentId: asker.id,
        studentName: "Privacy Fixture",
        studentEmail: asker.email,
        subject: "Privacy",
        questionText: `C2 privacy doubt ${nonce}`,
        status: "PENDING",
      },
    });

    await loginThroughUi(page, viewer.email);

    const res = await page.request.get(`${BASE_URL}/api/doubts`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const rows = body.doubts as Array<Record<string, unknown>>;
    expect(rows.length).toBeGreaterThan(0);
    expect(
      rows.some((row) => "studentEmail" in row),
      "a learner must not receive other learners' email addresses"
    ).toBe(false);

    // Cleanup for this test's rows and users.
    await prisma.doubt.deleteMany({ where: { questionText: { contains: "C2 privacy doubt" } } });
    await prisma.user.deleteMany({ where: { id: { in: [asker.id, viewer.id] } } });
  });
});
