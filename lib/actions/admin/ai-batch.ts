"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth/rbac"
import { AiBatchRunner } from "@/lib/ai/batch/job-runner"

/**
 * Creates an explanation generation batch job for questions in a given exam section.
 */
export async function createExplanationBatchJobAction(sectionId: string) {
  const user = await requireRole("ADMIN")

  const questions = await prisma.examQuestion.findMany({
    where: { sectionId },
    orderBy: { order: "asc" },
  })

  if (questions.length === 0) {
    throw new Error("No questions found in this section")
  }

  const items = questions.map((q) => ({
    referenceId: q.id,
    input: {
      questionText: q.questionEn,
      optionA: q.optionAEn,
      optionB: q.optionBEn,
      optionC: q.optionCEn,
      optionD: q.optionDEn,
      correctOption: q.correctOption,
      subject: q.subject,
    },
  }))

  const job = await AiBatchRunner.createJob({
    jobType: "EXPLANATION_GEN",
    config: { sectionId, createdBy: user.userId },
    items,
  })

  revalidatePath("/admin/ai-batch")
  return { success: true, jobId: job.id }
}

/**
 * Creates a Hindi translation batch job for exam questions.
 */
export async function createTranslationBatchJobAction(sectionId: string) {
  const user = await requireRole("ADMIN")

  const questions = await prisma.examQuestion.findMany({
    where: { sectionId },
    orderBy: { order: "asc" },
  })

  if (questions.length === 0) {
    throw new Error("No questions found in this section")
  }

  const items = questions.map((q) => ({
    referenceId: q.id,
    input: {
      questionEn: q.questionEn,
      optionAEn: q.optionAEn,
      optionBEn: q.optionBEn,
      optionCEn: q.optionCEn,
      optionDEn: q.optionDEn,
      explanationEn: q.explanationEn,
    },
  }))

  const job = await AiBatchRunner.createJob({
    jobType: "TRANSLATION",
    config: { sectionId, createdBy: user.userId },
    items,
  })

  revalidatePath("/admin/ai-batch")
  return { success: true, jobId: job.id }
}

/**
 * Creates a current affairs summary batch job.
 */
export async function createCurrentAffairsBatchJobAction(limit = 10) {
  const user = await requireRole("ADMIN")

  const pdfs = await prisma.currentAffairsPdf.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
  })

  if (pdfs.length === 0) {
    throw new Error("No current affairs PDFs found")
  }

  const items = pdfs.map((pdf) => ({
    referenceId: pdf.id,
    input: {
      title: pdf.title,
      content: `${pdf.title} - Current Affairs ${pdf.month}/${pdf.year}`,
    },
  }))

  const job = await AiBatchRunner.createJob({
    jobType: "CURRENT_AFFAIRS_SUMMARY",
    config: { limit, createdBy: user.userId },
    items,
  })

  revalidatePath("/admin/ai-batch")
  return { success: true, jobId: job.id }
}

/**
 * Creates a quiz generation batch job from a pasted article.
 */
export async function createQuizFromArticleAction(articleText: string, questionCount = 5) {
  const user = await requireRole("ADMIN")

  if (!articleText || articleText.trim().length < 50) {
    throw new Error("Article text must be at least 50 characters")
  }

  const job = await AiBatchRunner.createJob({
    jobType: "QUIZ_GENERATION",
    config: { questionCount, createdBy: user.userId },
    items: [
      {
        input: {
          articleText: articleText.trim(),
          questionCount,
        },
      },
    ],
  })

  revalidatePath("/admin/ai-batch")
  return { success: true, jobId: job.id }
}

/**
 * Processes the next slice of items for a batch job.
 */
export async function processBatchJobAction(jobId: string, batchSize = 5) {
  await requireRole("ADMIN")
  const result = await AiBatchRunner.processNextBatch(jobId, batchSize)
  revalidatePath("/admin/ai-batch")
  return { success: true, ...result }
}

/**
 * Approves a single item DRAFT and writes it to the production entity.
 */
export async function approveBatchItemAction(itemId: string, editedOutput?: any) {
  const user = await requireRole("ADMIN")
  const updated = await AiBatchRunner.approveItem(itemId, user.userId || "admin", editedOutput)
  revalidatePath("/admin/ai-batch")
  return { success: true, item: updated }
}

/**
 * Rejects a batch item draft.
 */
export async function rejectBatchItemAction(itemId: string) {
  await requireRole("ADMIN")
  const updated = await AiBatchRunner.rejectItem(itemId)
  revalidatePath("/admin/ai-batch")
  return { success: true, item: updated }
}

/**
 * Bulk approves all DRAFT items in a batch job.
 */
export async function bulkApproveBatchItemsAction(jobId: string) {
  const user = await requireRole("ADMIN")

  const drafts = await prisma.aiBatchItem.findMany({
    where: { jobId, status: "DRAFT" },
  })

  for (const draft of drafts) {
    await AiBatchRunner.approveItem(draft.id, user.userId || "admin")
  }

  revalidatePath("/admin/ai-batch")
  return { success: true, approvedCount: drafts.length }
}
