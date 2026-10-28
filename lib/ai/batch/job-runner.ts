import { z } from "zod"
import { prisma } from "../../prisma"
import { aiGateway, AiAllProvidersExhaustedError, AiDisabledError } from "../gateway"

export type BatchJobType =
  | "EXPLANATION_GEN"
  | "TRANSLATION"
  | "CURRENT_AFFAIRS_SUMMARY"
  | "QUIZ_GENERATION"

export interface CreateBatchJobParams {
  jobType: BatchJobType
  config?: any
  items: Array<{
    referenceId?: string
    input: any
  }>
}

// Schemas for structured batch jobs
const ExplanationOutputSchema = z.object({
  explanationEn: z.string().optional(),
  explanationHi: z.string().optional(),
  keyConcept: z.string().optional(),
})

const TranslationOutputSchema = z.object({
  questionHi: z.string(),
  optionAHi: z.string().optional(),
  optionBHi: z.string().optional(),
  optionCHi: z.string().optional(),
  optionDHi: z.string().optional(),
  explanationHi: z.string().optional(),
})

const CurrentAffairsSummarySchema = z.object({
  summaryEn: z.string(),
  summaryHi: z.string(),
  keyTakeaways: z.array(z.string()),
})

const QuizQuestionSchema = z.object({
  questionEn: z.string(),
  questionHi: z.string().optional(),
  optionAEn: z.string(),
  optionBEn: z.string(),
  optionCEn: z.string(),
  optionDEn: z.string(),
  correctOption: z.enum(["A", "B", "C", "D"]),
  explanationEn: z.string(),
  explanationHi: z.string().optional(),
})

const QuizGenerationSchema = z.object({
  quizTitle: z.string(),
  questions: z.array(QuizQuestionSchema),
})

export class AiBatchRunner {
  /**
   * Initializes a new batch job with its pending items.
   */
  public static async createJob(params: CreateBatchJobParams) {
    return prisma.$transaction(async (tx) => {
      const job = await tx.aiBatchJob.create({
        data: {
          jobType: params.jobType,
          status: "PENDING",
          totalItems: params.items.length,
          processedItems: 0,
          failedItems: 0,
          config: params.config ?? {},
          progress: 0.0,
        },
      })

      if (params.items.length > 0) {
        await tx.aiBatchItem.createMany({
          data: params.items.map((item) => ({
            jobId: job.id,
            referenceId: item.referenceId,
            status: "PENDING",
            input: item.input,
          })),
        })
      }

      return job
    })
  }

  /**
   * Processes the next pending items for a batch job.
   * Resumable and rate-limit aware: pauses gracefully if free tier quotas are exhausted.
   * AI output is ALWAYS saved as DRAFT and requires admin approval before student visibility.
   */
  public static async processNextBatch(
    jobId: string,
    batchSize = 5
  ): Promise<{
    status: string
    processedCount: number
    remainingCount: number
    pausedReason?: string
  }> {
    const job = await prisma.aiBatchJob.findUnique({
      where: { id: jobId },
      include: {
        items: {
          where: { status: "PENDING" },
          take: batchSize,
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!job) {
      throw new Error(`Job ${jobId} not found`)
    }

    if (job.status === "COMPLETED") {
      return { status: "COMPLETED", processedCount: job.processedItems, remainingCount: 0 }
    }

    // Mark job as PROCESSING
    await prisma.aiBatchJob.update({
      where: { id: jobId },
      data: { status: "PROCESSING", errorMessage: null },
    })

    let processedThisRun = 0
    let pausedReason: string | undefined

    for (const item of job.items) {
      const input = item.input as any
      try {
        let output: any = null

        if (job.jobType === "EXPLANATION_GEN") {
          const res = await aiGateway.generateJson(
            {
              task: "batch_explanation",
              promptVersion: "v1",
              language: input.language || "bilingual",
              prompt: `Generate clear, pedagogically sound explanations for the following multiple choice question in English and Hindi.
Question: ${input.questionText}
Option A: ${input.optionA || "N/A"}
Option B: ${input.optionB || "N/A"}
Option C: ${input.optionC || "N/A"}
Option D: ${input.optionD || "N/A"}
Correct Option: ${input.correctOption}
Subject: ${input.subject || "General Studies"}`,
            },
            ExplanationOutputSchema
          )
          output = res.data
        } else if (job.jobType === "TRANSLATION") {
          const res = await aiGateway.generateJson(
            {
              task: "batch_translation",
              promptVersion: "v1",
              language: "hi",
              prompt: `Translate the following English exam question and its options into high-quality, standard Hindi appropriate for competitive examinations (UPSC/BPSC/SSC):
Question (EN): ${input.questionEn}
Option A (EN): ${input.optionAEn || ""}
Option B (EN): ${input.optionBEn || ""}
Option C (EN): ${input.optionCEn || ""}
Option D (EN): ${input.optionDEn || ""}
Explanation (EN): ${input.explanationEn || ""}`,
            },
            TranslationOutputSchema
          )
          output = res.data
        } else if (job.jobType === "CURRENT_AFFAIRS_SUMMARY") {
          const res = await aiGateway.generateJson(
            {
              task: "batch_ca_summary",
              promptVersion: "v1",
              language: "bilingual",
              prompt: `Summarize the following current affairs article for competitive exam aspirants. Provide an English summary, a Hindi summary, and 3-5 key exam takeaways.
Article Title: ${input.title}
Article Content: ${input.content}`,
            },
            CurrentAffairsSummarySchema
          )
          output = res.data
        } else if (job.jobType === "QUIZ_GENERATION") {
          const res = await aiGateway.generateJson(
            {
              task: "batch_quiz_gen",
              promptVersion: "v1",
              language: "en",
              prompt: `Generate a quiz with ${input.questionCount || 5} multiple-choice questions based strictly on the provided article text. Each question must have 4 options (A, B, C, D), 1 correct answer, and an explanation.
Article:
${input.articleText}`,
            },
            QuizGenerationSchema
          )
          output = res.data
        }

        // Save strictly as DRAFT - never auto-publish!
        await prisma.aiBatchItem.update({
          where: { id: item.id },
          data: {
            status: "DRAFT",
            output,
            error: null,
          },
        })

        processedThisRun++
      } catch (err: any) {
        if (
          err instanceof AiAllProvidersExhaustedError ||
          err instanceof AiDisabledError ||
          err?.message?.includes("RPM") ||
          err?.message?.includes("quota")
        ) {
          // Free tier exhausted: pause the job gracefully to resume later
          pausedReason = `Quota or provider limit reached: ${err.message}`
          break
        }

        // Mark individual item as failed
        await prisma.aiBatchItem.update({
          where: { id: item.id },
          data: {
            status: "FAILED",
            error: err?.message || String(err),
          },
        })
      }
    }

    // Refresh counts
    const [totalPending, totalFailed, totalDraft, totalApproved] = await Promise.all([
      prisma.aiBatchItem.count({ where: { jobId, status: "PENDING" } }),
      prisma.aiBatchItem.count({ where: { jobId, status: "FAILED" } }),
      prisma.aiBatchItem.count({ where: { jobId, status: "DRAFT" } }),
      prisma.aiBatchItem.count({ where: { jobId, status: "APPROVED" } }),
    ])

    const processed = totalDraft + totalApproved
    const progress = job.totalItems > 0 ? (processed + totalFailed) / job.totalItems : 1.0

    let finalStatus = job.status
    if (pausedReason) {
      finalStatus = "PAUSED"
    } else if (totalPending === 0) {
      finalStatus = "COMPLETED"
    }

    await prisma.aiBatchJob.update({
      where: { id: jobId },
      data: {
        status: finalStatus,
        processedItems: processed,
        failedItems: totalFailed,
        progress: Math.min(1.0, progress),
        errorMessage: pausedReason ?? null,
      },
    })

    return {
      status: finalStatus,
      processedCount: processed,
      remainingCount: totalPending,
      pausedReason,
    }
  }

  /**
   * Approves a DRAFT batch item and writes changes to the real database entity.
   * AI output ONLY becomes visible to students after this manual admin approval step.
   */
  public static async approveItem(
    itemId: string,
    adminUserId: string,
    editedOutput?: any
  ) {
    const item = await prisma.aiBatchItem.findUnique({
      where: { id: itemId },
      include: { job: true },
    })

    if (!item) {
      throw new Error(`Item ${itemId} not found`)
    }

    if (item.status !== "DRAFT" && item.status !== "PENDING") {
      throw new Error(`Item cannot be approved from status ${item.status}`)
    }

    const payload = (editedOutput || item.output) as any
    const refId = item.referenceId

    // Write to production entity based on job type
    if (refId) {
      if (item.job.jobType === "EXPLANATION_GEN") {
        await prisma.examQuestion.updateMany({
          where: { id: refId },
          data: {
            explanationEn: payload.explanationEn,
            explanationHi: payload.explanationHi,
          },
        })
      } else if (item.job.jobType === "TRANSLATION") {
        await prisma.examQuestion.updateMany({
          where: { id: refId },
          data: {
            questionHi: payload.questionHi,
            optionAHi: payload.optionAHi,
            optionBHi: payload.optionBHi,
            optionCHi: payload.optionCHi,
            optionDHi: payload.optionDHi,
            explanationHi: payload.explanationHi,
          },
        })
      } else if (item.job.jobType === "CURRENT_AFFAIRS_SUMMARY") {
        if (payload.titleHi) {
          await prisma.currentAffairsPdf.updateMany({
            where: { id: refId },
            data: {
              titleHi: payload.titleHi,
            },
          })
        }
      }
    }

    return prisma.aiBatchItem.update({
      where: { id: itemId },
      data: {
        status: "APPROVED",
        editedOutput: editedOutput ? payload : undefined,
        approvedAt: new Date(),
        approvedBy: adminUserId,
      },
    })
  }

  /**
   * Rejects a batch item draft.
   */
  public static async rejectItem(itemId: string) {
    return prisma.aiBatchItem.update({
      where: { id: itemId },
      data: { status: "REJECTED" },
    })
  }
}
