/**
 * Database Persistence Service for Content Engine
 * Safe for Supabase pooler: short transactions, chunks <= 500.
 */

import { prisma } from "@/lib/prisma"
import { createHash } from "node:crypto"
import { parse, parseWithDiagnostics, ParsedQuestion } from "./parser"
import { nz, classify, inferRuns } from "./classifier"
import { DEFAULT_EXAM_LIST } from "./exam-detector"
import { evaluateQualityGates, GateResult } from "./quality-gates"
import { makeQuestionSlug, qaPath } from "./paths"
import { T } from "./taxonomy"
import { revalidateTag, revalidatePath, unstable_cache } from "next/cache"

const questionQueryCache = new Map<string, { data: any; expiresAt: number }>()

export function clearQuestionCache() {
  questionQueryCache.clear()
}

export function getQuestionCacheSize(): number {
  return questionQueryCache.size
}

export function safeRevalidateTag(tag: string) {
  clearQuestionCache()
  try {
    revalidateTag(tag)
  } catch {
    // Outside Next.js request lifecycle (e.g. background job, CLI or tests)
  }
}

export function safeRevalidatePath(path: string, type?: "page" | "layout") {
  clearQuestionCache()
  try {
    if (type) {
      revalidatePath(path, type)
    } else {
      revalidatePath(path)
    }
  } catch {
    // Outside Next.js request lifecycle (e.g. background job, CLI or tests)
  }
}

/**
 * Revalidates all Content Engine public and hub routes across English and Hindi.
 * Uses exact route pattern + "page" type for Next.js App Router ISR invalidation.
 */
export function revalidateContentEngineRoutes() {
  safeRevalidateTag("content-engine")
  safeRevalidatePath("/question-answer", "page")
  safeRevalidatePath("/hi/question-answer", "page")
  safeRevalidatePath("/question-answer/[exam]", "page")
  safeRevalidatePath("/question-answer/[exam]/[subject]", "page")
  safeRevalidatePath("/question-answer/[exam]/[subject]/[slug]", "page")
  safeRevalidatePath("/hi/question-answer/[exam]", "page")
  safeRevalidatePath("/hi/question-answer/[exam]/[subject]", "page")
  safeRevalidatePath("/hi/question-answer/[exam]/[subject]/[slug]", "page")
  safeRevalidatePath("/question-answer/sitemap.xml")
  safeRevalidatePath("/hi/question-answer/sitemap.xml")
}

/**
 * Computes SHA-256 of nz-normalized, whitespace-collapsed question text.
 */
export function hashQuestionText(text: string): string {
  const norm = nz(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
  return createHash("sha256").update(norm).digest("hex")
}

/**
 * Derives an exact 8-character alphanumeric short ID from a cuid or hash.
 */
export function deriveShortId(id: string): string {
  const hash = createHash("sha256").update(id).digest("hex")
  return hash.slice(0, 8)
}

/**
 * Ensures default exam aliases exist in the database (idempotent).
 */
export async function ensureDefaultExamAliases(): Promise<void> {
  const count = await prisma.contentEngineExamAlias.count()
  if (count > 0) return

  const data = DEFAULT_EXAM_LIST.map((name) => ({
    name,
    isEnabled: true,
  }))

  await prisma.contentEngineExamAlias.createMany({
    data,
    skipDuplicates: true,
  })
}

/**
 * Retrieves all active exam alias names from the database.
 */
export async function getActiveExamAliases(): Promise<string[]> {
  try {
    const rows = await prisma.contentEngineExamAlias.findMany({
      where: { isEnabled: true },
      select: { name: true },
    })
    if (rows.length === 0) {
      return DEFAULT_EXAM_LIST
    }
    return rows.map((r) => r.name)
  } catch {
    return DEFAULT_EXAM_LIST
  }
}

export interface AddBatchParams {
  pastedText: string
  createdById?: string
  defaultSubject?: string
  defaultTopic?: string
  defaultExam?: string
  defaultYear?: string
}

export interface AddBatchResult {
  batchId: string
  totalParsed: number
  addedCount: number
  duplicateCount: number
  skipped?: {
    count: number
    snippets: string[]
  }
}

/**
 * Adds a new batch of questions from raw text with deduplication and manual defaults.
 */
export async function addBatch(params: AddBatchParams): Promise<AddBatchResult> {
  await ensureDefaultExamAliases()
  const aliases = await getActiveExamAliases()

  const { questions: parsedItems, skipped } = parseWithDiagnostics(params.pastedText, aliases)
  const mcqs = parsedItems.filter((i) => i.type === "MCQ")

  // Create Batch record
  const batch = await prisma.contentEngineBatch.create({
    data: {
      pastedText: params.pastedText,
      createdById: params.createdById,
      defaultSubject: params.defaultSubject || null,
      defaultTopic: params.defaultTopic || null,
      defaultExam: params.defaultExam || null,
      defaultYear: params.defaultYear || null,
    },
  })

  if (mcqs.length === 0) {
    return {
      batchId: batch.id,
      totalParsed: 0,
      addedCount: 0,
      duplicateCount: 0,
      skipped: {
        count: skipped.length,
        snippets: skipped.slice(0, 5),
      },
    }
  }

  // Pre-calculate hashes and check for existing questions
  const prepared = mcqs.map((item, idx) => {
    const textHash = hashQuestionText(item.q)
    return { item, idx, textHash }
  })

  const hashes = prepared.map((p) => p.textHash)
  const existingRecords = await prisma.contentEngineQuestion.findMany({
    where: { textHash: { in: hashes } },
    select: { textHash: true },
  })
  const existingSet = new Set(existingRecords.map((r) => r.textHash))

  const toInsert = prepared.filter((p) => !existingSet.has(p.textHash))
  const duplicateCount = prepared.length - toInsert.length

  // Process subject and topic overrides based on picker logic:
  // - Subject chosen + topic Auto -> topic auto-detected within subject
  // - Subject Auto + topic chosen -> subject inferred from keyword table row
  // - Both Auto -> no override
  let resolvedDefaultSub = params.defaultSubject?.trim() || ""
  let resolvedDefaultTop = params.defaultTopic?.trim() || ""

  if (!resolvedDefaultSub && resolvedDefaultTop) {
    const row = T.find((r) => r[1] === resolvedDefaultTop)
    if (row) resolvedDefaultSub = row[0]
  }

  const rowsData = toInsert.map(({ item, textHash }) => {
    let sub = item.sub
    let top = item.top

    if (resolvedDefaultSub && resolvedDefaultTop) {
      sub = resolvedDefaultSub
      top = resolvedDefaultTop
    } else if (resolvedDefaultSub && !resolvedDefaultTop) {
      sub = resolvedDefaultSub
      const c = classify(`${item.q} ${item.o.join(" ")} ${item.exp || ""}`, resolvedDefaultSub)
      top = c[1]
    } else if (!resolvedDefaultSub && resolvedDefaultTop) {
      sub = resolvedDefaultSub || item.sub
      top = resolvedDefaultTop
    }

    const exam = item.exam || params.defaultExam?.trim() || ""
    const year = item.year || params.defaultYear?.trim() || ""

    // Derive a unique 8-char short ID
    const shortId = textHash.slice(0, 8)

    return {
      shortId,
      textHash,
      q: item.q,
      options: item.o as any,
      answer: item.ans,
      answerIndex: item.a,
      explanation: item.exp || null,
      sub: sub || "Uncategorized",
      top: top || "General",
      exam: exam || null,
      year: year || null,
      sourceTag: item.src || null,
      sourceNo: item.no ? Number(item.no) : null,
      batchId: batch.id,
      status: "DRAFT",
      isPublished: false,
      isInferred: false,
      isVerified: false,
    }
  })

  // Insert in chunks of <= 500 for Supabase pooler safety
  const CHUNK_SIZE = 500
  for (let i = 0; i < rowsData.length; i += CHUNK_SIZE) {
    const chunk = rowsData.slice(i, i + CHUNK_SIZE)
    await prisma.contentEngineQuestion.createMany({
      data: chunk,
      skipDuplicates: true,
    })
  }

  return {
    batchId: batch.id,
    totalParsed: mcqs.length,
    addedCount: toInsert.length,
    duplicateCount,
    skipped: {
      count: skipped.length,
      snippets: skipped.slice(0, 5),
    },
  }
}

export interface GetQuestionsParams {
  batchId?: string
  uncategorizedOnly?: boolean
  subject?: string
  topic?: string
  exam?: string
  year?: string
  search?: string
  isPublished?: boolean
  page?: number
  pageSize?: number
}

/**
 * Retrieves paginated questions with filtering.
 */
export async function getQuestions(params: GetQuestionsParams) {
  const page = Math.max(1, params.page || 1)
  const pageSize = Math.min(300, Math.max(1, params.pageSize || 100))
  const skip = (page - 1) * pageSize

  const where: any = {}

  if (params.batchId) {
    where.batchId = params.batchId
  }

  if (params.uncategorizedOnly) {
    where.OR = [{ sub: "Uncategorized" }, { top: "General" }]
  }

  if (params.subject) {
    where.sub = params.subject
  }

  if (params.topic) {
    where.top = params.topic
  }

  if (params.exam) {
    where.exam = params.exam
  }

  if (params.year) {
    where.year = params.year
  }

  if (params.isPublished !== undefined) {
    where.isPublished = params.isPublished
  }

  if (params.search) {
    where.OR = [
      { q: { contains: params.search, mode: "insensitive" } },
      { explanation: { contains: params.search, mode: "insensitive" } },
    ]
  }

  const [total, items] = await Promise.all([
    prisma.contentEngineQuestion.count({ where }),
    prisma.contentEngineQuestion.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        translations: true,
        override: true,
      },
    }),
  ])

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export interface BulkAssignParams {
  questionIds: string[]
  subject: string
  topic: string
  subjectHindi?: string
  topicHindi?: string
  exam?: string
  year?: string
}

/**
 * Bulk assigns subject/topic/exam/year with manual override protection.
 */
export async function bulkAssignQuestions(params: BulkAssignParams): Promise<number> {
  const { questionIds, subject, topic, subjectHindi, topicHindi, exam, year } = params

  for (const qid of questionIds) {
    // Upsert CategoryOverride
    await prisma.contentEngineCategoryOverride.upsert({
      where: { questionId: qid },
      create: {
        questionId: qid,
        sub: subject,
        top: topic,
        subHi: subjectHindi || null,
        topHi: topicHindi || null,
        exam: exam || null,
        year: year || null,
        isManual: true,
      },
      update: {
        sub: subject,
        top: topic,
        subHi: subjectHindi || null,
        topHi: topicHindi || null,
        exam: exam || null,
        year: year || null,
        isManual: true,
      },
    })

    // Update question row
    const updateData: any = {
      sub: subject,
      top: topic,
    }
    if (exam) updateData.exam = exam
    if (year) updateData.year = year

    await prisma.contentEngineQuestion.update({
      where: { id: qid },
      data: updateData,
    })
  }

  revalidateContentEngineRoutes()
  return questionIds.length
}

/**
 * Re-categorises all questions that do not have manual overrides.
 */
export async function reCategoriseAllQuestions(): Promise<{ updatedCount: number }> {
  const questions = await prisma.contentEngineQuestion.findMany({
    where: {
      override: null, // No manual override
    },
    select: {
      id: true,
      q: true,
      options: true,
      explanation: true,
      sub: true,
      top: true,
    },
  })

  const classifiable = questions.map((q) => ({
    id: q.id,
    q: q.q,
    o: q.options as string[],
    exp: q.explanation || "",
    sub: q.sub || "",
    top: q.top || "",
  }))

  const recategorized = inferRuns(
    classifiable.map((item) => {
      const text = `${item.q} ${item.o.join(" ")} ${item.exp || ""}`
      const [sub, top] = classify(text, "")
      return {
        ...item,
        sub,
        top,
        inferred: false,
      }
    })
  )

  let updatedCount = 0
  for (const item of recategorized) {
    await prisma.contentEngineQuestion.update({
      where: { id: String(item.id) },
      data: {
        sub: item.sub,
        top: item.top,
        isInferred: Boolean(item.inferred),
      },
    })
    updatedCount++
  }

  return { updatedCount }
}

export interface ImportHindiParams {
  translations: Array<{
    en?: string
    q: string
    o: string[]
    exp?: string
    top?: string
    rev?: boolean
  }>
  reviewedById?: string
}

/**
 * Imports Hindi translations matched by English question text.
 */
export async function importHindiTranslations(params: ImportHindiParams) {
  let matched = 0
  let skipped = 0

  for (const item of params.translations) {
    if (!item.q || !Array.isArray(item.o)) {
      skipped++
      continue
    }

    let targetQuestion = null

    if (item.en) {
      const hash = hashQuestionText(item.en)
      targetQuestion = await prisma.contentEngineQuestion.findUnique({
        where: { textHash: hash },
      })
    }

    if (!targetQuestion) {
      // Try finding by question text start
      targetQuestion = await prisma.contentEngineQuestion.findFirst({
        where: {
          q: { startsWith: item.en ? item.en.slice(0, 40) : item.q.slice(0, 40) },
        },
      })
    }

    if (!targetQuestion) {
      skipped++
      continue
    }

    const targetOptions = targetQuestion.options as string[]
    if (targetOptions.length !== item.o.length) {
      skipped++
      continue
    }

    await prisma.contentEngineTranslation.upsert({
      where: {
        questionId_lang: {
          questionId: targetQuestion.id,
          lang: "hi",
        },
      },
      create: {
        questionId: targetQuestion.id,
        lang: "hi",
        q: item.q,
        options: item.o as any,
        explanation: item.exp || null,
        top: item.top || null,
        isReviewed: Boolean(item.rev),
        reviewedById: item.rev ? params.reviewedById : null,
        reviewedAt: item.rev ? new Date() : null,
      },
      update: {
        q: item.q,
        options: item.o as any,
        explanation: item.exp || null,
        top: item.top || null,
        isReviewed: Boolean(item.rev),
        reviewedById: item.rev ? params.reviewedById : null,
        reviewedAt: item.rev ? new Date() : null,
      },
    })

    matched++
  }

  revalidateContentEngineRoutes()
  return { matched, skipped }
}

/**
 * Toggles human review status on a translation.
 */
export async function toggleTranslationReview(
  questionId: string,
  isReviewed: boolean,
  reviewedById?: string
) {
  const updated = await prisma.contentEngineTranslation.updateMany({
    where: { questionId, lang: "hi" },
    data: {
      isReviewed,
      reviewedById: isReviewed ? reviewedById || null : null,
      reviewedAt: isReviewed ? new Date() : null,
    },
  })

  revalidateContentEngineRoutes()
  return updated
}

/**
 * Publishes or unpublishes questions.
 * Enforces Quality Gates before publishing: only questions passing all gates are published.
 */
export async function setQuestionPublishStatus(
  questionIds: string[],
  isPublished: boolean
): Promise<{ successCount: number; rejectedCount: number; errors: Record<string, string[]> }> {
  if (!isPublished) {
    // Unpublishing is always allowed
    await prisma.contentEngineQuestion.updateMany({
      where: { id: { in: questionIds } },
      data: {
        isPublished: false,
        status: "DRAFT",
      },
    })
    revalidateContentEngineRoutes()
    return { successCount: questionIds.length, rejectedCount: 0, errors: {} }
  }

  // Publishing: fetch questions and evaluate gates
  const questions = await prisma.contentEngineQuestion.findMany({
    where: { id: { in: questionIds } },
  })

  const gateInputs = questions.map((q) => ({
    id: q.id,
    q: q.q,
    o: q.options as string[],
    a: q.answerIndex,
    exp: q.explanation || "",
    resolvedExp: q.explanation || "",
    src: q.sourceTag || q.exam || "",
    sub: q.sub || "",
    top: q.top || "",
    isVerified: q.isVerified,
  }))

  const gateResults = evaluateQualityGates(gateInputs)

  let successCount = 0
  let rejectedCount = 0
  const errors: Record<string, string[]> = {}

  for (const q of questions) {
    const gate = gateResults.get(q.id)
    if (!gate?.passed) {
      rejectedCount++
      errors[q.id] = gate?.failures || []
      continue
    }

    // Generate slug ONCE if not already set
    let slug = q.slug
    if (!slug) {
      slug = makeQuestionSlug(q.shortId, q.q)
    }

    await prisma.contentEngineQuestion.update({
      where: { id: q.id },
      data: {
        isPublished: true,
        status: "PUBLISHED",
        slug,
        publishedAt: q.publishedAt || new Date(),
      },
    })
    successCount++
  }

  revalidateContentEngineRoutes()
  return { successCount, rejectedCount, errors }
}

/**
 * Setting read/write functions.
 */
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const record = await prisma.contentEngineSetting.findUnique({
      where: { key },
    })
    return record ? (record.value as T) : defaultValue
  } catch {
    return defaultValue
  }
}

export async function setSetting(key: string, value: unknown) {
  return prisma.contentEngineSetting.upsert({
    where: { key },
    create: { key, value: value as any },
    update: { value: value as any },
  })
}

async function fetchPublicQuestionBySlugDirect(shortId: string) {
  return prisma.contentEngineQuestion.findFirst({
    where: {
      shortId,
      isPublished: true,
      status: "PUBLISHED",
    },
    select: {
      id: true,
      shortId: true,
      slug: true,
      isPublished: true,
      q: true,
      options: true,
      answer: true,
      answerIndex: true,
      explanation: true,
      sub: true,
      top: true,
      exam: true,
      year: true,
      sourceTag: true,
      publishedAt: true,
      updatedAt: true,
      translations: {
        where: { lang: "hi" },
        select: {
          q: true,
          options: true,
          explanation: true,
          top: true,
          isReviewed: true,
        },
      },
    },
  })
}

const cachedPublicQuestionBySlug = unstable_cache(
  fetchPublicQuestionBySlugDirect,
  ["content-engine-public-question"],
  {
    revalidate: 3600,
    tags: ["content-engine"],
  }
)

/**
 * Public read-only query service with strict allow-list and on-demand caching.
 * Never selects or exposes pastedText, createdById, reviewedById, batchId, isInferred.
 */
export async function getPublicQuestionBySlug(slugOrShortId: string) {
  // Extract 8-char short ID
  const m = slugOrShortId.match(/(?:^|q-)?([a-z0-9]{8})(?:-.*)?$/i)
  if (!m) return null
  const shortId = m[1].toLowerCase()

  const isProd = process.env.NODE_ENV === "production"

  // In test/dev only: in-memory fallback cache for when running outside Next.js runtime
  if (!isProd) {
    const cached = questionQueryCache.get(shortId)
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data
    }
  }

  let result: any = null
  try {
    result = await cachedPublicQuestionBySlug(shortId)
  } catch (e: any) {
    if (e.message?.includes("incrementalCache") || e.message?.includes("unstable_cache")) {
      result = await fetchPublicQuestionBySlugDirect(shortId)
    } else {
      throw e
    }
  }

  if (result && !isProd) {
    questionQueryCache.set(shortId, { data: result, expiresAt: Date.now() + 3600 * 1000 })
  }
  return result
}
