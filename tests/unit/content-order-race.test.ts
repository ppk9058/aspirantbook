import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs/promises"
import path from "node:path"

import { prisma } from "@/lib/prisma"
import { withTransactionLock } from "@/lib/prisma-lock"
import { nextChapterOrder, nextLessonOrder } from "@/lib/utils/next-order"

/**
 * B8: content ordering was read-then-write.
 *
 * `createChapter` / `duplicateChapter` did `findFirst(order desc)` and then
 * `create(order + 1)` as two statements, and lessons did the same. Two creators
 * landing in between read the same maximum and produced tied positions, which
 * makes every later reorder ambiguous.
 *
 * Also covered: the two remaining course-slug writers mapped a unique-violation
 * race to a leaked 500 (or a raw Prisma message) instead of a conflict.
 *
 * Positions are allocated under `pg_advisory_xact_lock` now; the first test
 * proves the harness detects the race (the unlocked control duplicates) and the
 * second proves the locked path does not.
 */

const nonce = `b8-${Date.now()}`
const courseIds: string[] = []

describe("B8 content ordering and slug races", () => {
  let courseId = ""
  let chapterId = ""

  before(async () => {
    await prisma.$connect()
    const course = await prisma.course.create({
      data: {
        title: `B8 ordering ${nonce}`,
        slug: `b8-ordering-${nonce}`,
        description: "B8 fixture",
        difficulty: "BEGINNER",
        status: "DRAFT",
      },
      select: { id: true },
    })
    courseId = course.id
    courseIds.push(course.id)
  })

  after(async () => {
    await prisma.course.deleteMany({ where: { id: { in: courseIds } } })
    await prisma.$disconnect()
  })

  it("the unlocked read-then-insert pattern really does duplicate positions", async () => {
    // Deliberate pause between read and insert: every worker reads before any
    // insert lands, which is exactly what happens when two clicks arrive
    // together. This is the shape the production code used to have.
    const orders = await Promise.all(
      Array.from({ length: 5 }, async (_, i) => {
        return prisma.$transaction(async (tx) => {
          const max = await tx.chapter.findFirst({
            where: { courseId },
            orderBy: { order: "desc" },
            select: { order: true },
          })
          const order = (max?.order ?? -1) + 1
          await new Promise((resolve) => setTimeout(resolve, 40))
          const created = await tx.chapter.create({
            data: { title: `unlocked-${i}`, courseId, order },
            select: { order: true },
          })
          return created.order
        })
      })
    )

    // The control must actually collide, otherwise the next assertion proves
    // nothing about the lock.
    assert.equal(
      new Set(orders).size < orders.length,
      true,
      `expected the unlocked pattern to collide, got ${JSON.stringify(orders)}`
    )

    await prisma.chapter.deleteMany({ where: { courseId } })
  })

  it("allocates unique chapter positions under concurrency", async () => {
    const orders = await Promise.all(
      Array.from({ length: 6 }, async (_, i) =>
        withTransactionLock(`chapter-order:${courseId}`, async (tx) => {
          const order = await nextChapterOrder(tx, courseId)
          const created = await tx.chapter.create({
            data: { title: `locked-${i}`, courseId, order },
            select: { order: true },
          })
          return created.order
        })
      )
    )

    assert.deepEqual(
      [...orders].sort((a, b) => a - b),
      [0, 1, 2, 3, 4, 5],
      `positions must be unique and contiguous, got ${JSON.stringify(orders)}`
    )

    const chapter = await prisma.chapter.findFirstOrThrow({
      where: { courseId },
      select: { id: true },
    })
    chapterId = chapter.id
  })

  it("allocates unique lesson positions under concurrency", async () => {
    const orders = await Promise.all(
      Array.from({ length: 5 }, async (_, i) =>
        withTransactionLock(`lesson-order:${chapterId}`, async (tx) => {
          const order = await nextLessonOrder(tx, chapterId)
          const created = await tx.lesson.create({
            data: { title: `lesson-${i}`, type: "READING", chapterId, order },
            select: { order: true },
          })
          return created.order
        })
      )
    )

    assert.deepEqual(
      [...orders].sort((a, b) => a - b),
      [0, 1, 2, 3, 4],
      `lesson positions must be unique, got ${JSON.stringify(orders)}`
    )
  })

  it("keeps every remaining content create on the locked allocator", async () => {
    const root = process.cwd()
    const chapters = await fs.readFile(path.join(root, "lib/actions/admin/chapters.ts"), "utf-8")
    const lessons = await fs.readFile(path.join(root, "lib/actions/admin/lessons.ts"), "utf-8")

    // create + duplicate for each entity
    assert.equal((chapters.match(/nextChapterOrder\(tx,/g) || []).length >= 2, true)
    assert.equal((lessons.match(/nextLessonOrder\(tx,/g) || []).length >= 2, true)
    assert.equal(chapters.includes("maxOrder"), false, "chapters.ts still has an unlocked max-order read")
    assert.equal(lessons.includes("maxOrder"), false, "lessons.ts still has an unlocked max-order read")
  })

  it("maps a slug unique-violation to a conflict on every course create path", async () => {
    const root = process.cwd()
    const importRoute = await fs.readFile(
      path.join(root, "app/api/admin/tutorials/import/route.ts"),
      "utf-8"
    )
    const courseAction = await fs.readFile(path.join(root, "lib/actions/admin/courses.ts"), "utf-8")

    assert.match(importRoute, /error\?\.code === "P2002"[\s\S]{0,200}status: 409/)
    assert.match(courseAction, /error\?\.code === "P2002"[\s\S]{0,200}slug already exists/)
  })
})
