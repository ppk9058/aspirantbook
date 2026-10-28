import { aiConfig } from "../config"
import { stripPII } from "../pii"
import { AiRateLimiter } from "../rate-limiter"
import { aiGateway } from "../gateway"

export interface SolveDoubtParams {
  userId: string
  subject: string
  topic?: string
  questionText: string
}

export interface SolveDoubtResult {
  solvedByAi: boolean
  answer?: string
  cached?: boolean
  model?: string
  reason?: "AI_DISABLED" | "LENGTH_EXCEEDED" | "QUOTA_EXHAUSTED" | "PROVIDERS_EXHAUSTED"
  message?: string
  quotaRemaining?: number
}

export class StudentDoubtSolver {
  /**
   * Solves a student doubt using free-tier AI models, protected by:
   * 1. Global kill switch / enabled flag
   * 2. Per-user daily quota limit
   * 3. Max question length limit
   * 4. PII stripping before external dispatch
   * 5. Deduplication & caching of identical questions
   * 6. Graceful fallback messages when quota/providers are exhausted
   */
  public static async solve(params: SolveDoubtParams): Promise<SolveDoubtResult> {
    // 1. Check feature flag & kill switch
    if (!aiConfig.isEnabled || !aiConfig.studentDoubtsEnabled || aiConfig.isKillSwitchActive) {
      return {
        solvedByAi: false,
        reason: "AI_DISABLED",
        message: "AI doubt assistant is currently disabled. A human faculty mentor will review your question.",
      }
    }

    // 2. Enforce question length limit
    const maxLength = aiConfig.studentMaxQuestionLength
    if (params.questionText.length > maxLength) {
      return {
        solvedByAi: false,
        reason: "LENGTH_EXCEEDED",
        message: `Your question (${params.questionText.length} chars) exceeds the ${maxLength} character limit for instant AI assistance. A faculty mentor will review it manually.`,
      }
    }

    // 3. Enforce student daily quota from configuration
    const quotaCheck = await AiRateLimiter.checkStudentDailyQuota(params.userId)
    if (!quotaCheck.allowed) {
      return {
        solvedByAi: false,
        reason: "QUOTA_EXHAUSTED",
        quotaRemaining: 0,
        message: `You have reached your daily quota of ${quotaCheck.quota} instant AI explanations for today. Your question has been forwarded to teachers for manual review.`,
      }
    }

    // 4. Sanitize and strip student PII
    const { sanitizedText } = stripPII(params.questionText)

    // 5. Invoke Gateway with caching
    try {
      const result = await aiGateway.generateText({
        task: "student_doubt",
        promptVersion: "v1",
        language: "en",
        prompt: `You are an expert exam mentor. Provide a concise, step-by-step conceptual answer to this student doubt:
Subject: ${params.subject}
Topic: ${params.topic || "General Concept"}
Student Doubt:
${sanitizedText}`,
        userId: params.userId,
      })

      // Increment daily quota on successful response
      await AiRateLimiter.incrementStudentDailyQuota(params.userId)

      return {
        solvedByAi: true,
        answer: result.text,
        cached: result.cached,
        model: result.model,
        quotaRemaining: Math.max(0, quotaCheck.remaining - 1),
      }
    } catch (err: any) {
      // Graceful fallback on provider failure or timeouts
      return {
        solvedByAi: false,
        reason: "PROVIDERS_EXHAUSTED",
        quotaRemaining: quotaCheck.remaining,
        message: "AI faculty assistant is temporarily unavailable due to high demand. Your doubt has been submitted to teachers for review.",
      }
    }
  }
}
