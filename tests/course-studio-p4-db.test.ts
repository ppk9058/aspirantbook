/**
 * P4 DB-backed checks: units, syllabus authoring and the public syllabus loader.
 * Runs against the Docker test DB (see course-studio-run/test-env.sh).
 */
import { describe, it, before, after } from "node:test"
import * as assert from "node:assert/strict"
import { prisma } from "../lib/prisma"
import { loadCourseSyllabus } from "../lib/courses/syllabus"

describe("Course Studio units & syllabus", () => {
  const runId = `${Date.now()}`
  let courseId = ""
  let chapterId = ""
  let unitId = ""
  let paperId = ""
  const questionIds: string[] = []
  const subject = `TEST-SUB-${runId}`

  before(async () => {
    const course = await prisma.course.create({
      data: {
        title: "Studio Units Course",
        slug: `studio-units-${runId}`,
        description: "fixture",
        difficulty: "BEGINNER",
        isPublished: true,
        price: 0,
        isPremium: false,
        chapters: { create: [{ title: "Chapter A", order: 1 }] },
      },
      include: { chapters: true },
    })
    courseId = course.id
    chapterId = course.chapters[0].id

    const unit = await prisma.courseUnit.create({
      data: { courseId, title: "Unit 1", titleHi: "इकाई 1", tags: ["GS"], order: 1 },
    })
    unitId = unit.id

    await prisma.chapter.update({ where: { id: chapterId }, data: { unitId } })

    const paper = await prisma.courseSyllabusPaper.create({
      data: {
        courseId,
        key: "PRELIMS-GS",
        title: "Prelims GS",
        order: 1,
        sections: {
          create: [
            {
              title: "Modern History",
              subtopics: ["1857", "Freedom movement"],
              unitId,
              chapterId,
              pyqSubject: subject,
              pyqTopic: "Modern",
              order: 1,
            },
          ],
        },
      },
      include: { sections: true },
    })
    paperId = paper.id

    // Real PYQ rows so the loader has counts to report.
    for (const [index, year] of ["2024", "2024", "2023"].entries()) {
      const question = await prisma.contentEngineQuestion.create({
        data: {
          shortId: `P4-${runId}-${index}`,
          textHash: `p4-hash-${runId}-${index}`,
          q: "Question?",
          options: ["a", "b", "c", "d"],
          answer: "a",
          sub: subject,
          top: "Modern",
          exam: "TEST",
          year,
          isPublished: true,
        },
      })
      questionIds.push(question.id)
    }
  })

  after(async () => {
    await prisma.contentEngineQuestion.deleteMany({ where: { id: { in: questionIds } } })
    await prisma.courseSyllabusPaper.deleteMany({ where: { id: paperId } })
    await prisma.courseSyllabusSection.deleteMany({ where: { title: "Modern History", paperId } })
    await prisma.chapter.deleteMany({ where: { courseId } })
    await prisma.courseUnit.deleteMany({ where: { courseId } })
    await prisma.course.deleteMany({ where: { id: courseId } })
  })

  it("links a chapter to a unit without touching its lessons", async () => {
    const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } })
    assert.equal(chapter?.unitId, unitId)
    assert.equal(chapter?.title, "Chapter A")
  })

  it("public syllabus loader reports real per-year PYQ counts", async () => {
    const view = await loadCourseSyllabus(courseId)
    assert.equal(view.hasSyllabus, true)
    assert.equal(view.papers.length, 1)

    const section = view.papers[0].sections[0]
    assert.equal(section.title, "Modern History")
    assert.equal(section.stats.totalQuestions, 3)
    assert.deepEqual(section.stats.byYear, [
      { year: 2024, count: 2 },
      { year: 2023, count: 1 },
    ])
    assert.equal(view.papers[0].mostAsked[0].id, section.id)
  })

  it("a course with no papers hides the syllabus (no empty section)", async () => {
    const other = await prisma.course.create({
      data: {
        title: "No Syllabus Course",
        slug: `no-syllabus-${runId}`,
        description: "fixture",
        difficulty: "BEGINNER",
        isPublished: true,
        price: 0,
        isPremium: false,
      },
    })
    const view = await loadCourseSyllabus(other.id)
    assert.equal(view.hasSyllabus, false)
    assert.deepEqual(view.papers, [])
    await prisma.course.delete({ where: { id: other.id } })
  })

  it("deleting a unit keeps chapters and unassigns them (ON DELETE SET NULL)", async () => {
    await prisma.courseUnit.delete({ where: { id: unitId } })
    const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } })
    assert.ok(chapter, "chapter must survive unit deletion")
    assert.equal(chapter?.unitId, null)

    const section = await prisma.courseSyllabusSection.findFirst({ where: { paperId } })
    assert.equal(section?.unitId, null)
  })
})
