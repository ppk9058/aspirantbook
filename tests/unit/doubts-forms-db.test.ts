import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs/promises"
import path from "node:path"

import { prisma } from "@/lib/prisma"
import {
  answerDoubt,
  createDoubt,
  getAllDoubts,
  getDoubtById,
  upvoteDoubt,
} from "@/lib/doubts-service"
import { createFormSubmission, getFormSubmissions } from "@/lib/forms-service"

/**
 * C2: student doubts and form submissions were stored in JSON files under
 * `data/`, written with `fs.writeFile`, and (for doubts) read through a
 * module-level cache seeded with three invented "demo" doubts. On serverless or
 * multi-instance hosting those files are read-only and per-instance: a doubt or
 * an admission form could vanish, and two concurrent writes clobbered each
 * other.
 *
 * These tests assert the rows are now in Postgres and that the services no
 * longer touch the filesystem.
 */

const nonce = `c2-${Date.now()}`
const ROOT = process.cwd()

describe("C2 doubts and form submissions live in the database", () => {
  let userId = ""

  before(async () => {
    await prisma.$connect()
    const user = await prisma.user.create({
      data: { email: `${nonce}@example.test`, name: "C2 Learner" },
      select: { id: true },
    })
    userId = user.id
  })

  after(async () => {
    await prisma.doubt.deleteMany({ where: { studentId: userId } })
    await prisma.formSubmission.deleteMany({ where: { userId } })
    await prisma.user.deleteMany({ where: { id: userId } })
    await prisma.$disconnect()
  })

  it("stores a new doubt as a Doubt row, not in data/doubts.json", async () => {
    const beforeStat = await fs
      .stat(path.join(ROOT, "data/doubts.json"))
      .then((s) => s.mtimeMs)
      .catch(() => null)

    const doubt = await createDoubt({
      studentId: userId,
      studentName: "C2 Learner",
      studentEmail: `${nonce}@example.test`,
      subject: `${nonce} Polity`,
      topic: "Fundamental Rights",
      questionText: `${nonce} Why is Article 32 called the heart and soul?`,
      attachment: { name: "notes.pdf", url: "/uploads/notes.pdf", type: "pdf", size: "12 KB" },
    })

    const row = await prisma.doubt.findUnique({ where: { id: doubt.id } })
    assert.ok(row, "the doubt must be a database row")
    assert.equal(row!.questionText, `${nonce} Why is Article 32 called the heart and soul?`)
    assert.equal(row!.studentId, userId)
    assert.equal(row!.status, "PENDING")
    assert.equal(row!.attachmentName, "notes.pdf")

    // The response shape the UI consumes is unchanged.
    assert.equal(doubt.status, "PENDING")
    assert.equal(doubt.attachment?.type, "pdf")
    assert.equal(doubt.upvotes, 0)
    assert.equal(typeof doubt.createdAt, "string")

    const afterStat = await fs
      .stat(path.join(ROOT, "data/doubts.json"))
      .then((s) => s.mtimeMs)
      .catch(() => null)
    assert.equal(afterStat, beforeStat, "the JSON file must not be written")
  })

  it("answers a doubt and only that row changes", async () => {
    const doubt = await createDoubt({
      studentId: userId,
      studentName: "C2 Learner",
      subject: `${nonce} History`,
      questionText: `${nonce} Who founded the Maurya empire?`,
    })

    const answered = await answerDoubt(doubt.id, "Faculty Mentor", "Chandragupta Maurya")
    assert.equal(answered?.status, "ANSWERED")
    assert.equal(answered?.teacherAnswer, "Chandragupta Maurya")
    assert.ok(answered?.answeredAt, "answeredAt must be recorded")

    const row = await prisma.doubt.findUnique({ where: { id: doubt.id } })
    assert.equal(row?.status, "ANSWERED")
    assert.equal(row?.teacherName, "Faculty Mentor")
  })

  it("counts concurrent upvotes without losing one", async () => {
    const doubt = await createDoubt({
      studentId: userId,
      studentName: "C2 Learner",
      subject: `${nonce} Economy`,
      questionText: `${nonce} Explain repo rate in one line.`,
    })

    await Promise.all([upvoteDoubt(doubt.id), upvoteDoubt(doubt.id), upvoteDoubt(doubt.id)])

    const row = await prisma.doubt.findUnique({ where: { id: doubt.id }, select: { upvotes: true } })
    assert.equal(row?.upvotes, 3, "three upvotes must be three rows-worth of increments")
  })

  it("returns null for an unknown doubt instead of inventing one", async () => {
    assert.equal(await getDoubtById(`${nonce}-missing`), null)
    assert.equal(await answerDoubt(`${nonce}-missing`, "Faculty", "n/a"), null)
    assert.equal(await upvoteDoubt(`${nonce}-missing`), null)
    // The seed "demo" doubts that used to be returned for every teacher are gone.
    const all = await getAllDoubts()
    assert.equal(
      all.some((d) => d.id.startsWith("doubt-") && (d.studentName === "Aman Verma" || d.studentName === "Priya Patel")),
      false,
      "the invented seed doubts must not be returned"
    )
  })

  it("filters doubts by student, status and subject", async () => {
    const mine = await getAllDoubts({ studentId: userId })
    assert.equal(mine.length >= 2, true)
    assert.equal(mine.every((d) => d.studentId === userId), true)

    const answered = await getAllDoubts({ studentId: userId, status: "ANSWERED" })
    assert.equal(answered.every((d) => d.status === "ANSWERED"), true)

    const subject = await getAllDoubts({ subject: `${nonce} Polity` })
    assert.equal(subject.length, 1)
  })

  it("stores a form submission as a FormSubmission row with JSON answers", async () => {
    const submission = await createFormSubmission({
      formSlug: "admission",
      userId,
      userName: "C2 Learner",
      userEmail: `${nonce}@example.test`,
      formData: { fullName: "C2 Learner", email: `${nonce}@example.test`, targetExam: "BPSC" },
      attachmentName: "marksheet.pdf",
      attachmentUrl: "/uploads/marksheet.pdf",
    })

    const row = await prisma.formSubmission.findUnique({ where: { id: submission.id } })
    assert.ok(row, "the submission must be a database row")
    assert.equal(row!.formSlug, "admission")
    assert.deepEqual(row!.formData, {
      fullName: "C2 Learner",
      email: `${nonce}@example.test`,
      targetExam: "BPSC",
    })
    assert.equal(submission.data.targetExam, "BPSC")
    assert.equal(submission.status, "SUBMITTED")

    const listed = await getFormSubmissions({ formSlug: "admission", userId })
    assert.equal(listed.some((s) => s.id === submission.id), true)
    assert.equal(
      listed.every((s) => s.userId === userId && s.formSlug === "admission"),
      true
    )
  })

  it("no longer writes either store to disk", async () => {
    for (const file of ["lib/doubts-service.ts", "lib/forms-service.ts"]) {
      const source = await fs.readFile(path.join(ROOT, file), "utf-8")
      assert.equal(/from\s+["'](node:)?fs(\/promises)?["']/.test(source), false, `${file} must not import fs`)
      assert.equal(/\b(writeFile|readFile|mkdir|appendFile)\s*\(/.test(source), false, `${file} must not write files`)
      assert.match(source, /prisma\./, `${file} must read and write Postgres`)
    }

    const gitignore = await fs.readFile(path.join(ROOT, ".gitignore"), "utf-8")
    assert.equal(gitignore.includes("data/doubts.json"), true)
  })
})
