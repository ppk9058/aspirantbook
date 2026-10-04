import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = (session.user as any).role
    if (role !== "TEACHER" && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Teacher or Admin role required" },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { tests } = body

    if (!Array.isArray(tests) || tests.length === 0) {
      return NextResponse.json(
        { error: "No tests provided in request" },
        { status: 400 }
      )
    }

    let syncedCount = 0

    for (const t of tests) {
      if (!t.id || typeof t.id !== "string") {
        return NextResponse.json(
          { error: "Test ID is required and must be an exact string" },
          { status: 400 }
        )
      }

      if (!t.seriesId || typeof t.seriesId !== "string") {
        return NextResponse.json(
          { error: "Series ID is required and must be an exact string" },
          { status: 400 }
        )
      }

      if (!t.title || !Array.isArray(t.questionsList) || t.questionsList.length === 0) {
        return NextResponse.json(
          { error: `Test '${t.id}' must have a title and non-empty questionsList` },
          { status: 400 }
        )
      }

      // Exact series lookup only - no inference from title or category
      const targetSeries = await prisma.examSeries.findUnique({
        where: { id: t.seriesId },
        select: { id: true },
      })

      if (!targetSeries) {
        return NextResponse.json(
          { error: `Series not found with exact ID: ${t.seriesId}` },
          { status: 404 }
        )
      }

      // Check if test exists by EXACT id only
      const existing = await prisma.examTest.findUnique({
        where: { id: t.id },
        include: { sections: { include: { questions: true } } },
      })

      if (existing) {
        // Must belong to the exact same series
        if (existing.seriesId !== t.seriesId) {
          return NextResponse.json(
            { error: `Test '${t.id}' already exists under a different series: ${existing.seriesId}` },
            { status: 400 }
          )
        }

        // Update existing test metadata
        await prisma.examTest.update({
          where: { id: t.id },
          data: {
            title: t.title,
            totalQuestions: t.questionsList.length,
            totalMarks: t.marks || t.questionsList.length,
            durationMinutes: t.durationMinutes || existing.durationMinutes,
          },
        })

        // Ensure at least one section exists
        let section = existing.sections[0]
        if (!section) {
          section = await prisma.examSection.create({
            data: {
              testId: existing.id,
              title: "Section 1",
              order: 1,
              positiveMarks: 1.0,
              negativeMarks: 0.25,
            },
            include: { questions: true },
          })
        }

        // Update or insert questions strictly by index order for this exact test
        for (let i = 0; i < t.questionsList.length; i++) {
          const q = t.questionsList[i]
          const existingQ = section.questions[i]
          const correctOption =
            typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex <= 3
              ? (["A", "B", "C", "D"][q.correctIndex] as "A" | "B" | "C" | "D")
              : (q.correctOption || "A")

          const questionData = {
            questionEn: q.text || q.questionEn || "",
            questionHi: q.textHi || q.questionHi || null,
            optionAEn: q.options?.[0] || q.optionAEn || "Option A",
            optionBEn: q.options?.[1] || q.optionBEn || "Option B",
            optionCEn: q.options?.[2] || q.optionCEn || "Option C",
            optionDEn: q.options?.[3] || q.optionDEn || "Option D",
            optionAHi: q.optionsHi?.[0] || q.optionAHi || null,
            optionBHi: q.optionsHi?.[1] || q.optionBHi || null,
            optionCHi: q.optionsHi?.[2] || q.optionCHi || null,
            optionDHi: q.optionsHi?.[3] || q.optionDHi || null,
            correctOption,
            explanationEn: q.explanation || q.explanationEn || null,
            explanationHi: q.explanationHi || null,
            subject: q.subject || "General Studies",
            order: i + 1,
          }

          if (existingQ) {
            await prisma.examQuestion.update({
              where: { id: existingQ.id },
              data: questionData,
            })
          } else {
            await prisma.examQuestion.create({
              data: {
                sectionId: section.id,
                questionType: "MCQ",
                ...questionData,
              },
            })
          }
        }
        syncedCount++
      } else {
        // Create new test under exact series
        const createdTest = await prisma.examTest.create({
          data: {
            id: t.id,
            seriesId: t.seriesId,
            createdById: session.user.id,
            title: t.title,
            testType: "SECTIONAL_TEST",
            accessMode: t.isFree ? "FREE" : "PRO",
            durationMinutes: t.durationMinutes || 120,
            totalQuestions: t.questionsList.length,
            totalMarks: t.marks || t.questionsList.length,
            positiveMarks: 1.0,
            negativeMarks: 0.25,
            isPublished: true,
          },
        })

        const section = await prisma.examSection.create({
          data: {
            testId: createdTest.id,
            title: "Section 1",
            order: 1,
            positiveMarks: 1.0,
            negativeMarks: 0.25,
          },
        })

        for (let i = 0; i < t.questionsList.length; i++) {
          const q = t.questionsList[i]
          const correctOption =
            typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex <= 3
              ? (["A", "B", "C", "D"][q.correctIndex] as "A" | "B" | "C" | "D")
              : (q.correctOption || "A")

          await prisma.examQuestion.create({
            data: {
              sectionId: section.id,
              questionType: "MCQ",
              questionEn: q.text || q.questionEn || "",
              questionHi: q.textHi || q.questionHi || null,
              optionAEn: q.options?.[0] || q.optionAEn || "Option A",
              optionBEn: q.options?.[1] || q.optionBEn || "Option B",
              optionCEn: q.options?.[2] || q.optionCEn || "Option C",
              optionDEn: q.options?.[3] || q.optionDEn || "Option D",
              optionAHi: q.optionsHi?.[0] || q.optionAHi || null,
              optionBHi: q.optionsHi?.[1] || q.optionBHi || null,
              optionCHi: q.optionsHi?.[2] || q.optionCHi || null,
              optionDHi: q.optionsHi?.[3] || q.optionDHi || null,
              correctOption,
              explanationEn: q.explanation || q.explanationEn || null,
              explanationHi: q.explanationHi || null,
              subject: q.subject || "General Studies",
              order: i + 1,
            },
          })
        }
        syncedCount++
      }
    }

    return NextResponse.json({ success: true, syncedCount })
  } catch (err: any) {
    console.error("[POST /api/exam/test/sync-local]", err)
    return NextResponse.json({ error: err.message || "Sync failed" }, { status: 500 })
  }
}
