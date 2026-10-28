import { z } from "zod"
import { aiConfig } from "../../lib/ai/config"
import { stripPII, hashPrompt } from "../../lib/ai/pii"
import { circuitBreaker } from "../../lib/ai/circuit-breaker"
import { AiRateLimiter } from "../../lib/ai/rate-limiter"
import { computeCacheKey, AiCacheService } from "../../lib/ai/cache"
import { aiGateway, AiDisabledError, AiAllProvidersExhaustedError } from "../../lib/ai/gateway"
import { AiProviderAdapter, AiChatMessage } from "../../lib/ai/types"
import { AiBatchRunner } from "../../lib/ai/batch/job-runner"
import { StudentDoubtSolver } from "../../lib/ai/student/doubt-solver"
import { HybridSearchEngine } from "../../lib/ai/search/hybrid-search"
import { prisma } from "../../lib/prisma"

let testsPassed = 0
let testsFailed = 0

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`)
    testsPassed++
  } else {
    console.error(`  ✗ FAIL: ${message}`)
    testsFailed++
  }
}

// Mock test adapter to simulate provider behaviors (success, 429, 500, timeout)
class MockProviderAdapter implements AiProviderAdapter {
  public failWithStatus: number | null = null
  public delayMs = 0
  public callCount = 0

  constructor(public readonly name: any) {}

  public isConfigured(): boolean {
    return true
  }

  public async generate(options: {
    systemPrompt?: string
    prompt: string
    messages?: AiChatMessage[]
    temperature?: number
    maxTokens?: number
    timeoutMs?: number
    jsonMode?: boolean
  }): Promise<{ text: string; model: string }> {
    this.callCount++

    if (this.delayMs > 0) {
      await new Promise((res) => setTimeout(res, this.delayMs))
    }

    if (this.failWithStatus) {
      throw new Error(`Provider ${this.name} failed with status ${this.failWithStatus}`)
    }

    if (options.jsonMode) {
      return {
        text: JSON.stringify({
          explanationEn: "Detailed explanation in English",
          explanationHi: "हिंदी में विस्तृत व्याख्या",
          keyConcept: "Core Concept",
        }),
        model: `mock-${this.name}`,
      }
    }

    return {
      text: `Mock answer from ${this.name} for prompt`,
      model: `mock-${this.name}`,
    }
  }
}

async function runTests() {
  console.log("==================================================")
  console.log("AI LAYER TEST SUITE: FREE TIER, QUOTA, PII & FALLBACK")
  console.log("==================================================\n")

  // Ensure test environment flags
  process.env.TEST_DATABASE_URL = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test"
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL

  // TEST 1: PII STRIPPING
  console.log("--- 1. PII Stripping & Safe Hashing ---")
  {
    const inputWithPii =
      "Hello, I am Aman Verma (aman.verma@example.com). My mobile is +91 9876543210 and student id is c123456789012345678901234. How does Dijkstra work?"
    const result = stripPII(inputWithPii, ["Aman Verma"])

    assert(
      !result.sanitizedText.includes("aman.verma@example.com"),
      "Redacts student email"
    )
    assert(result.sanitizedText.includes("[EMAIL_REDACTED]"), "Inserts [EMAIL_REDACTED]")
    assert(
      !result.sanitizedText.includes("9876543210"),
      "Redacts student phone number"
    )
    assert(result.sanitizedText.includes("[PHONE_REDACTED]"), "Inserts [PHONE_REDACTED]")
    assert(
      !result.sanitizedText.includes("c123456789012345678901234"),
      "Redacts student CUID"
    )
    assert(result.sanitizedText.includes("[ID_REDACTED]"), "Inserts [ID_REDACTED]")
    assert(
      !result.sanitizedText.includes("Aman Verma"),
      "Redacts student name identity"
    )
    assert(result.piiDetected === true, "Flags piiDetected as true")

    const hash1 = hashPrompt("Hello world")
    const hash2 = hashPrompt("Hello world")
    assert(hash1 === hash2 && hash1.length === 64, "One-way SHA-256 hash generated safely")
  }

  // TEST 2: CACHE KEY COMPUTATION & CACHE HIT BEHAVIOR
  console.log("\n--- 2. Cache Key & Cache Hit Behavior ---")
  {
    const key1 = computeCacheKey({
      task: "question_explanation",
      input: "What is vectorization?",
      language: "en",
      promptVersion: "v1",
    })
    const key2 = computeCacheKey({
      task: "question_explanation",
      input: "What is vectorization?",
      language: "en",
      promptVersion: "v1",
    })
    assert(key1 === key2, "Cache key is deterministic for identical task/input/lang/version")

    // Save item in database cache
    const testInput = `Test prompt for cache ${Date.now()}`
    const testOutput = "Pre-computed cached explanation"
    await AiCacheService.set({
      task: "test_cache",
      input: testInput,
      language: "en",
      promptVersion: "v1",
      outputText: testOutput,
      modelUsed: "mock-model",
      provider: "gemini",
    })

    const cachedHit = await AiCacheService.get({
      task: "test_cache",
      input: testInput,
      language: "en",
      promptVersion: "v1",
    })

    assert(cachedHit !== null, "Cache hit successfully found in AiCache table")
    assert(cachedHit?.outputText === testOutput, "Cached output matches original generation")
  }

  // TEST 3: CIRCUIT BREAKER STATE MACHINE
  console.log("\n--- 3. Circuit Breaker Behavior ---")
  {
    circuitBreaker.reset()
    assert(circuitBreaker.canAttempt("gemini"), "New provider starts in CLOSED state (can attempt)")

    // Record failures up to threshold
    circuitBreaker.recordFailure("gemini")
    circuitBreaker.recordFailure("gemini")
    assert(circuitBreaker.canAttempt("gemini"), "Remains open below failure threshold")

    circuitBreaker.recordFailure("gemini") // 3rd failure trips circuit
    assert(!circuitBreaker.canAttempt("gemini"), "Trips to OPEN state when threshold reached")

    // Reset circuit
    circuitBreaker.recordSuccess("gemini")
    assert(circuitBreaker.canAttempt("gemini"), "Resets to CLOSED upon success")
  }

  // TEST 4: GATEWAY FALLBACK ORDER ON 429 / 5xx
  console.log("\n--- 4. Gateway Ordered Fallback Chain ---")
  {
    // Temporarily enable AI
    process.env.AI_ENABLED = "true"
    process.env.AI_KILL_SWITCH = "false"
    process.env.AI_PROVIDER_ORDER = "gemini,groq,cerebras"

    // Mock Gemini to fail with 429
    const mockGemini = new MockProviderAdapter("gemini")
    mockGemini.failWithStatus = 429

    // Mock Groq to succeed
    const mockGroq = new MockProviderAdapter("groq")

    aiGateway.registerAdapter(mockGemini)
    aiGateway.registerAdapter(mockGroq)
    circuitBreaker.reset()

    const result = await aiGateway.generateText({
      task: "fallback_test",
      prompt: "Explain Newton third law",
      skipCache: true,
    })

    assert(mockGemini.callCount === 1, "Attempted primary provider (Gemini)")
    assert(mockGroq.callCount === 1, "Cascaded automatically to fallback provider (Groq)")
    assert(result.provider === "groq", "Result provided by fallback provider Groq")
    assert(!result.cached, "Fresh response marked as non-cached")
  }

  // TEST 5: STRUCTURED JSON VALIDATION & RETRY
  console.log("\n--- 5. Structured JSON Output & Zod Validation ---")
  {
    const schema = z.object({
      explanationEn: z.string(),
      explanationHi: z.string(),
      keyConcept: z.string(),
    })

    const jsonRes = await aiGateway.generateJson(
      {
        task: "json_test",
        prompt: "Provide explanation for question",
        skipCache: true,
      },
      schema
    )

    assert(typeof jsonRes.data.explanationEn === "string", "Validates structured explanationEn")
    assert(typeof jsonRes.data.explanationHi === "string", "Validates structured explanationHi")
    assert(typeof jsonRes.data.keyConcept === "string", "Validates structured keyConcept")
  }

  // TEST 6: DRAFT-ONLY BATCH JOB PUBLISHING
  console.log("\n--- 6. DRAFT-Only Batch Job Safety ---")
  {
    // Create an exam question fixture to test batch job
    const section = await prisma.examSection.findFirst()
    if (section) {
      const q = await prisma.examQuestion.create({
        data: {
          sectionId: section.id,
          questionEn: "What is the capital of India?",
          optionAEn: "Mumbai",
          optionBEn: "New Delhi",
          optionCEn: "Kolkata",
          optionDEn: "Chennai",
          correctOption: "B",
          explanationEn: null,
          explanationHi: null,
        },
      })

      // Create batch job
      const job = await AiBatchRunner.createJob({
        jobType: "EXPLANATION_GEN",
        items: [
          {
            referenceId: q.id,
            input: {
              questionText: q.questionEn,
              optionA: q.optionAEn,
              optionB: q.optionBEn,
              optionC: q.optionCEn,
              optionD: q.optionDEn,
              correctOption: q.correctOption,
            },
          },
        ],
      })

      // Process batch
      await AiBatchRunner.processNextBatch(job.id, 1)

      // Verify item is saved as DRAFT
      const batchItem = await prisma.aiBatchItem.findFirst({
        where: { jobId: job.id, referenceId: q.id },
      })
      assert(batchItem?.status === "DRAFT", "Batch item output is saved strictly as DRAFT")

      // Verify exam question in DB was NOT modified before approval!
      const unapprovedQuestion = await prisma.examQuestion.findUnique({
        where: { id: q.id },
      })
      assert(
        unapprovedQuestion?.explanationEn === null,
        "Production question is UNTOUCHED while in DRAFT (Zero auto-publish)"
      )

      // Now simulate admin manual approval
      await AiBatchRunner.approveItem(batchItem!.id, "test-admin")

      const approvedQuestion = await prisma.examQuestion.findUnique({
        where: { id: q.id },
      })
      assert(
        approvedQuestion?.explanationEn !== null,
        "Production question updated ONLY AFTER explicit admin approval"
      )

      // Cleanup fixture
      await prisma.examQuestion.delete({ where: { id: q.id } })
      await prisma.aiBatchJob.delete({ where: { id: job.id } })
    } else {
      console.log("  (Skipped section-specific test: no sections in DB)")
    }
  }

  // TEST 7: STUDENT DOUBT SOLVING & QUOTA ENFORCEMENT
  console.log("\n--- 7. Student Doubt Solving & Quotas ---")
  {
    process.env.AI_ENABLED = "true"
    process.env.AI_STUDENT_DOUBTS_ENABLED = "true"
    process.env.AI_STUDENT_DAILY_QUOTA = "2"
    process.env.AI_STUDENT_MAX_QUESTION_LENGTH = "100"

    const testUserId = `test-user-${Date.now()}`

    // 1. Length limit enforcement
    const longQuestion = "A".repeat(150)
    const lengthResult = await StudentDoubtSolver.solve({
      userId: testUserId,
      subject: "Physics",
      questionText: longQuestion,
    })
    assert(lengthResult.solvedByAi === false, "Refuses questions exceeding length limit")
    assert(lengthResult.reason === "LENGTH_EXCEEDED", "Reports LENGTH_EXCEEDED reason")

    // 2. Normal question (within limit)
    const validResult1 = await StudentDoubtSolver.solve({
      userId: testUserId,
      subject: "Physics",
      questionText: "Why does light refract?",
    })
    assert(validResult1.solvedByAi === true, "Answers valid question within quota")

    // 3. Second question
    const validResult2 = await StudentDoubtSolver.solve({
      userId: testUserId,
      subject: "Physics",
      questionText: "What is total internal reflection?",
    })
    assert(validResult2.solvedByAi === true, "Answers 2nd question (quota limit is 2)")

    // 4. Third question (quota exhausted)
    const validResult3 = await StudentDoubtSolver.solve({
      userId: testUserId,
      subject: "Physics",
      questionText: "What is Snell law?",
    })
    assert(validResult3.solvedByAi === false, "Rejects 3rd question when daily quota of 2 reached")
    assert(validResult3.reason === "QUOTA_EXHAUSTED", "Reports QUOTA_EXHAUSTED reason")
    assert(Boolean(validResult3.message?.includes("daily quota")), "Provides clear fallback message")
  }

  // TEST 8: FLAG-OFF EQUIVALENCE (Rule 1)
  console.log("\n--- 8. Flag-Off Equivalence & Kill Switch ---")
  {
    // Test with AI disabled
    process.env.AI_ENABLED = "false"
    process.env.AI_KILL_SWITCH = "false"

    let caughtError: any = null
    try {
      await aiGateway.generateText({
        task: "disabled_test",
        prompt: "Should not execute",
      })
    } catch (err: any) {
      caughtError = err
    }

    assert(caughtError instanceof AiDisabledError, "Gateway immediately refuses when AI_ENABLED is false")

    const doubtResult = await StudentDoubtSolver.solve({
      userId: "u123",
      subject: "Math",
      questionText: "What is calculus?",
    })
    assert(doubtResult.solvedByAi === false, "Doubt solver disables AI when flag is off")
    assert(doubtResult.reason === "AI_DISABLED", "Returns AI_DISABLED reason")

    // Test search fallback
    const searchRes = await HybridSearchEngine.search({
      query: "bpsc",
      limit: 5,
    })
    assert(searchRes.usedSemanticSearch === false, "Search falls back cleanly to trigram database search")
  }

  console.log("\n==================================================")
  console.log(`TEST RESULTS: ${testsPassed} passed, ${testsFailed} failed`)
  console.log("==================================================")

  if (testsFailed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err)
  process.exit(1)
})
