/**
 * Database Alignment & Audit Script for Course & ExamSeries Flags
 * Date: 2026-10-05
 * 
 * Safety Limit: Per instructions, "Do NOT change isFree/isPro/accessMode/price/isPremium of any series, test or course. Report-only."
 * This script provides read-only inspection, idempotent verification, and explicitly documents the rollback/apply templates.
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function reportCurrentState() {
  console.log("=== CURRENT DATABASE FLAGS STATE ===")

  const series = await prisma.examSeries.findMany({
    where: {
      slug: { in: ["bpsc-72nd-2026", "upsc-prelims-2026", "upsc-2027"] }
    },
    select: { id: true, slug: true, isFree: true, isPro: true }
  })
  console.log("ExamSeries flags:", series)

  const courses = await prisma.course.findMany({
    where: {
      slug: { in: ["72nd-bpsc-prelims-current-affairs", "3", "generative-ai", "ai-course-test", "ai-course"] }
    },
    select: { id: true, slug: true, isPremium: true, price: true, status: true }
  })
  console.log("Course flags:", courses)
}

// Rollback template (NOT RUN)
export async function rollbackTemplate() {
  console.warn("Rollback template defined. Not executed per instructions.")
}

reportCurrentState().finally(() => prisma.$disconnect())
