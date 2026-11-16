import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import { writeDualAuditLog } from "@/lib/exam/audit-helper"
import { detectSolutionFormat, parseSolutionBatch } from "@/lib/pyq/solution-format"
import { parseRawMcqBatch } from "@/lib/pyq/mcq-parser"
import { detectExamFromTag } from "@/lib/pyq/exam-detector"
import {
  batchQuestionSchema,
  buildSolutionJson,
  classifyHints,
  contentHash,
  needsReview,
  normalizedQuestionKey,
  type BatchQuestionInput,
} from "@/lib/pyq/batch-import"
import {
  ANSWER_CHECK_EXPORT_KEY,
  GATE_ANSWER_MISMATCH,
  buildAnswerCheckExportText,
  parseAnswerCheckText,
  storedAnswerLetter,
} from "@/lib/pyq/answer-check"
import { REPETITION_THRESHOLD, additionalInfoText, repetitionScore } from "@/lib/pyq/repetition"
import { HINDI_EXPORT_KEY, buildHindiExportText, type HindiExportItem } from "@/lib/pyq/hindi-export"
import { evaluateHindiBlock, type HindiImportRow } from "@/lib/pyq/hindi-import"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const previewSchema = z.object({
  action: z.literal("preview"),
  text: z.string().min(1, "Paste some text first"),
  defaultSubject: z.string().nullable().optional(),
  defaultTopic: z.string().nullable().optional(),
  defaultExam: z.string().nullable().optional(),
  defaultYear: z.string().nullable().optional(),
})

const importSchema = z.object({
  action: z.literal("import"),
  questions: z.array(z.unknown()).min(1, "Nothing to import"),
  pastedText: z.string().default(""),
  defaultSubject: z.string().nullable().optional(),
  defaultTopic: z.string().nullable().optional(),
  defaultExam: z.string().nullable().optional(),
  defaultYear: z.string().nullable().optional(),
})

const answerCheckSchema = z.object({
  action: z.literal("import-answer-check"),
  text: z.string().min(1, "Paste the Gemini answer list first"),
})

const hindiImportSchema = z.object({
  action: z.literal("import-hindi"),
  text: z.string().min(1, "Paste the Gemini Hindi blocks first"),
})

interface SolutionShape {
  additionalInfo?: { heading: string; points: { text: string; sub: string[] }[] }[]
  concepts?: string[]
  status?: string
  warnings?: string[]
}

interface DbRefRow {
  key: string
  sub: string | null
  top: string | null
  infoText: string
}

async function adminGuard() {
  const user = await getCurrentUserContext()
  if (!user.isAuthenticated || user.role !== "ADMIN") {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: "Access Denied: Admin role required for Content Engine Studio" },
        { status: 403 },
      ),
    }
  }
  return { authorized: true as const, user }
}

/** Recent DB rows for duplicate + repetition reference pools (reads only). */
async function loadReferenceData() {
  const rows = await prisma.contentEngineQuestion.findMany({
    orderBy: { createdAt: "desc" },
    take: 1000,
    select: { id: true, shortId: true, q: true, options: true, sub: true, top: true, textHash: true, solution: true },
  })
  const keys = new Set<string>()
  const hashes = new Set<string>()
  const detail: {
    shortId: string
    sub: string | null
    top: string | null
    infoText: string
    concepts: string[]
  }[] = []
  for (const row of rows) {
    const opts = Array.isArray(row.options) ? (row.options as string[]) : []
    keys.add(normalizedQuestionKey(row.q, opts))
    hashes.add(row.textHash)
    const sol = (row.solution || null) as SolutionShape | null
    const infoText = additionalInfoText(sol?.additionalInfo ?? null)
    detail.push({
      shortId: row.shortId,
      sub: row.sub,
      top: row.top,
      infoText,
      concepts: sol?.concepts ?? [],
    })
  }
  return { keys, hashes, detail }
}

/** Best repetition match for a candidate among DB rows (same subject/topic preferred). */
function findRepetitionMatch(
  detail: { shortId: string; sub: string | null; top: string | null; infoText: string; concepts: string[] }[],
  candidateText: string,
  sub: string | null,
  top: string | null,
): { shortId: string; concepts: string[] } | null {
  const candidates = detail.filter((d) => d.infoText && (!sub || d.sub === sub || !top))
  let best: { shortId: string; concepts: string[]; score: number } | null = null
  for (const d of candidates) {
    const score = repetitionScore(candidateText, [d.infoText])
    if (score >= REPETITION_THRESHOLD && (!best || score > best.score)) {
      best = { shortId: d.shortId, concepts: d.concepts, score }
    }
  }
  return best ? { shortId: best.shortId, concepts: best.concepts } : null
}

function repetitionPool(
  detail: { sub: string | null; top: string | null; infoText: string }[],
  sub: string | null,
  top: string | null,
): string[] {
  const withInfo = detail.filter((d) => d.infoText)
  if (sub && top) {
    const exact = withInfo.filter((d) => d.sub === sub && d.top === top)
    if (exact.length) return exact.map((d) => d.infoText)
  }
  if (sub) return withInfo.filter((d) => d.sub === sub).map((d) => d.infoText)
  return withInfo.map((d) => d.infoText)
}

export async function GET(req: NextRequest) {
  const guard = await adminGuard()
  if (!guard.authorized) return guard.response
  try {
    const { searchParams } = new URL(req.url)
    if (searchParams.get("resource") === "covered-concepts") {
      const subject = searchParams.get("subject") || ""
      const topic = searchParams.get("topic") || ""
      const rows = await prisma.contentEngineQuestion.findMany({
        where: topic
          ? { sub: subject, top: { contains: topic } }
          : subject
            ? { sub: subject }
            : {},
        orderBy: { createdAt: "desc" },
        take: 300,
        select: { solution: true },
      })
      const seen = new Set<string>()
      const slugs: string[] = []
      for (const row of rows) {
        const sol = (row.solution || null) as SolutionShape | null
        for (const c of sol?.concepts || []) {
          if (c && !seen.has(c)) {
            seen.add(c)
            slugs.push(c)
            if (slugs.length >= 40) break
          }
        }
        if (slugs.length >= 40) break
      }
      return NextResponse.json({ concepts: slugs })
    }
    if (searchParams.get("resource") === "answer-check-export") {
      const subject = searchParams.get("subject") || ""
      const top = searchParams.get("top") || ""
      const exam = searchParams.get("exam") || ""
      const take = Math.min(Number.parseInt(searchParams.get("take") || "50", 10) || 50, 200)
      const where: Record<string, unknown> = { status: "DRAFT" }
      if (subject) where.sub = subject
      if (top) where.top = { contains: top }
      if (exam) where.exam = exam
      const rows = await prisma.contentEngineQuestion.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        select: { id: true, shortId: true, q: true, options: true },
      })
      const items = rows.map((r, i) => ({
        no: i + 1,
        shortId: r.shortId,
        q: r.q,
        options: Array.isArray(r.options) ? (r.options as string[]) : [],
      }))
      await prisma.contentEngineSetting.upsert({
        where: { key: ANSWER_CHECK_EXPORT_KEY },
        create: { key: ANSWER_CHECK_EXPORT_KEY, value: { ids: rows.map((r) => r.id), createdAt: new Date().toISOString() } },
        update: { value: { ids: rows.map((r) => r.id), createdAt: new Date().toISOString() } },
      })
      return NextResponse.json({ items, text: buildAnswerCheckExportText(items) })
    }
    if (searchParams.get("resource") === "hindi-export") {
      const subject = searchParams.get("subject") || ""
      const exam = searchParams.get("exam") || ""
      const take = Math.min(Number.parseInt(searchParams.get("take") || "50", 10) || 50, 200)
      const where: Record<string, unknown> = {
        status: "DRAFT",
        // Only questions with no Hindi translation yet (Phase 2.8).
        translations: { none: { lang: "hi" } },
      }
      if (subject) where.sub = subject
      if (exam) where.exam = exam
      const rows = await prisma.contentEngineQuestion.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        select: {
          id: true,
          shortId: true,
          q: true,
          options: true,
          answer: true,
          sub: true,
          top: true,
          exam: true,
          year: true,
          solution: true,
        },
      })
      const items: HindiExportItem[] = rows.map((r, i) => {
        const sol = (r.solution || null) as SolutionShape & {
          keyPoints?: string[]
          additionalInfo?: HindiExportItem["additionalInfo"]
          optionAnalysis?: HindiExportItem["optionAnalysis"]
          memoryTip?: string | null
          concepts?: string[]
        }
        return {
          no: i + 1,
          shortId: r.shortId,
          tag: [r.exam, r.year].filter(Boolean).join(" ") || null,
          subject: r.sub,
          topic: r.top,
          q: r.q,
          options: Array.isArray(r.options) ? (r.options as string[]) : [],
          answerLetter: storedAnswerLetter(r.answer),
          keyPoints: sol?.keyPoints,
          additionalInfo: sol?.additionalInfo,
          optionAnalysis: sol?.optionAnalysis,
          memoryTip: sol?.memoryTip,
          concepts: sol?.concepts,
        }
      })
      await prisma.contentEngineSetting.upsert({
        where: { key: HINDI_EXPORT_KEY },
        create: { key: HINDI_EXPORT_KEY, value: { ids: rows.map((r) => r.id), createdAt: new Date().toISOString() } },
        update: { value: { ids: rows.map((r) => r.id), createdAt: new Date().toISOString() } },
      })
      return NextResponse.json({ items, text: buildHindiExportText(items) })
    }
    return NextResponse.json({ error: "Unknown resource" }, { status: 400 })
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to load covered concepts", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  const guard = await adminGuard()
  if (!guard.authorized) return guard.response
  const user = guard.user

  const rawBody = await req.json().catch(() => null)
  const action = (rawBody as { action?: string } | null)?.action

  try {
    if (action === "preview") {
      const parsed = previewSchema.safeParse(rawBody)
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid preview payload", issues: parsed.error.issues }, { status: 400 })
      }
      const { text, defaultSubject, defaultTopic, defaultExam, defaultYear } = parsed.data
      const isSolution = detectSolutionFormat(text)
      const batch = isSolution ? parseSolutionBatch(text) : parseRawMcqBatch(text)

      const refs = await loadReferenceData()
      const batchInfoTexts: string[] = []

      const questions = batch.questions.map((q, index) => {
        const tag = "tag" in q ? q.tag : null
        const detected = detectExamFromTag(tag)
        const subjectHint = "subject" in q ? q.subject : null
        const topicHint = "topic" in q ? q.topic : null
        const classification = classifyHints(subjectHint, topicHint, defaultSubject, defaultTopic)
        const dupeKey = normalizedQuestionKey(q.q, q.options)
        const duplicate = refs.keys.has(dupeKey)
        const infoText = "additionalInfo" in q ? additionalInfoText(q.additionalInfo) : ""
        const pool = [...repetitionPool(refs.detail, classification.sub, classification.top), ...batchInfoTexts]
        const repetitionMax = repetitionScore(infoText, pool)
        const repetitionMatch = repetitionMax >= REPETITION_THRESHOLD
          ? findRepetitionMatch(refs.detail, infoText, classification.sub, classification.top)
          : null
        if (infoText) batchInfoTexts.push(infoText)
        const flags = [...q.flags, ...classification.classificationFlags]
        const repExceeds = repetitionMax >= REPETITION_THRESHOLD
        return {
          index,
          q: q.q,
          options: q.options,
          answer: q.answer,
          answerIndex: q.answerIndex,
          no: "no" in q ? q.no : null,
          sourceNo: "sourceNo" in q ? q.sourceNo : null,
          tag: tag ?? null,
          subject: subjectHint ?? null,
          topic: topicHint ?? null,
          keyPoints: "keyPoints" in q ? q.keyPoints : [],
          additionalInfo: "additionalInfo" in q ? q.additionalInfo : [],
          optionAnalysis: "optionAnalysis" in q ? q.optionAnalysis : [],
          memoryTip: "memoryTip" in q ? q.memoryTip : null,
          concepts: "concepts" in q ? q.concepts : [],
          check: "check" in q ? q.check : null,
          checkNote: "checkNote" in q ? q.checkNote : null,
          unsure: "unsure" in q ? q.unsure : null,
          detectedExam: defaultExam || detected.exam,
          detectedYear: defaultYear || detected.year,
          flags,
          duplicate,
          repetitionMax,
          repetitionExceeds: repExceeds,
          repetitionMatch,
          needsReview: needsReview({
            check: "check" in q ? q.check : null,
            unsure: "unsure" in q ? q.unsure : null,
            flags,
            duplicate,
            repetitionMax: repExceeds ? repetitionMax : 0,
          }),
        }
      })

      return NextResponse.json({
        format: batch.format,
        errorBlocks: batch.errorBlocks,
        ignoredLineCount: batch.ignoredLineCount,
        questions,
      })
    }

    if (action === "import-answer-check") {
      const parsed = answerCheckSchema.safeParse(rawBody)
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 })
      }
      const { text } = parsed.data

      const exportSetting = await prisma.contentEngineSetting
        .findUnique({ where: { key: ANSWER_CHECK_EXPORT_KEY } })
        .catch(() => null)
      const ids = (exportSetting?.value as { ids?: string[] } | null)?.ids
      if (!ids || ids.length === 0) {
        return NextResponse.json(
          { error: "No recent export snapshot found — run 'Export questions without answers' first" },
          { status: 409 },
        )
      }

      const ordered = await prisma.contentEngineQuestion.findMany({
        where: { id: { in: ids } },
        orderBy: { createdAt: "desc" },
        select: { id: true, shortId: true, answer: true, solution: true },
      })
      const positionMap = new Map(ordered.map((r, i) => [i + 1, r]))

      const { results, errors } = parseAnswerCheckText(text)
      const mismatches: { no: number; shortId: string; stored: string | null; gemini: string }[] = []
      const unmatched: number[] = []
      let ok = 0
      const updates: { id: string; solution: SolutionShape }[] = []
      for (const r of results) {
        const row = positionMap.get(r.no)
        if (!row) {
          unmatched.push(r.no)
          continue
        }
        const stored = storedAnswerLetter(row.answer)
        if (!stored) {
          mismatches.push({ no: r.no, shortId: row.shortId, stored: row.answer, gemini: r.letter })
          continue
        }
        if (stored === r.letter) {
          ok++
        } else {
          mismatches.push({ no: r.no, shortId: row.shortId, stored, gemini: r.letter })
          const sol = (row.solution || {}) as SolutionShape
          const warnings = Array.from(new Set([...(sol.warnings || []), GATE_ANSWER_MISMATCH]))
          updates.push({ id: row.id, solution: { ...sol, status: "NEEDS_REVIEW", warnings } })
        }
      }
      // Unmatched export rows (Gemini skipped a number) also gate.
      for (let n = 1; n <= ordered.length; n++) {
        if (!results.some((r) => r.no === n)) unmatched.push(n)
      }

      await prisma.$transaction(
        updates.map((u) =>
          prisma.contentEngineQuestion.update({
            where: { id: u.id },
            data: { solution: u.solution as unknown as Prisma.InputJsonValue },
          }),
        ),
      )

      await writeDualAuditLog({
        actorId: user.userId || "admin",
        action: "UPDATE",
        targetId: "answer-check",
        entityType: "ARTICLE",
        details: { checked: results.length, ok, mismatches: mismatches.length, unmatched: unmatched.length, gated: updates.length },
      })
      revalidatePath("/admin/content-engine")

      return NextResponse.json({
        checked: results.length,
        ok,
        mismatches,
        unmatched: Array.from(new Set(unmatched)),
        gated: updates.length,
        parseErrors: errors,
      })
    }

    if (action === "import-hindi") {
      const parsed = hindiImportSchema.safeParse(rawBody)
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 })
      }
      const { text } = parsed.data
      const batch = parseSolutionBatch(text)

      const refs = Array.from(new Set(batch.questions.map((q) => q.ref).filter((r): r is string => Boolean(r))))
      const parents = refs.length
        ? await prisma.contentEngineQuestion.findMany({
            where: { shortId: { in: refs } },
            select: { id: true, shortId: true, answer: true },
          })
        : []
      const byShortId = new Map(parents.map((p) => [p.shortId, p]))

      const rows: (HindiImportRow & { questionId: string })[] = []
      const skipped: { ref: string | null; no: string | null; reason: string }[] = []
      for (const q of batch.questions) {
        if (q.lang !== "hi") {
          skipped.push({ ref: q.ref, no: q.no, reason: "LANG is not hi — only Hindi blocks belong in this import" })
          continue
        }
        const parent = q.ref ? byShortId.get(q.ref) || null : null
        const evaluated = evaluateHindiBlock(q, parent)
        if (!evaluated.ok) {
          skipped.push({ ref: q.ref, no: q.no, reason: evaluated.reason })
          continue
        }
        rows.push({ ...evaluated.row, questionId: parent!.id })
      }

      let imported = 0
      if (rows.length > 0) {
        const res = await prisma.$transaction(
          rows.map((row) =>
            prisma.contentEngineTranslation.upsert({
              where: {
                questionId_lang: { questionId: row.questionId, lang: row.lang },
              },
              create: {
                questionId: row.questionId,
                lang: row.lang,
                q: row.q,
                options: row.options as unknown as Prisma.InputJsonValue,
                answer: row.answer,
                explanation: row.explanation,
                solution: row.solution as unknown as Prisma.InputJsonValue,
              },
              update: {
                q: row.q,
                options: row.options as unknown as Prisma.InputJsonValue,
                answer: row.answer,
                explanation: row.explanation,
                solution: row.solution as unknown as Prisma.InputJsonValue,
                // Re-import resets review state (spec: imports are drafts).
                isReviewed: false,
                reviewedById: null,
                reviewedAt: null,
              },
            }),
          ),
        )
        imported = res.length
      }

      const mismatches = rows.filter((r) => r.warnings.includes("answer-mismatch")).length
      await writeDualAuditLog({
        actorId: user.userId || "admin",
        action: "CREATE",
        targetId: "hindi-import",
        entityType: "ARTICLE",
        details: { parsed: batch.questions.length, imported, skipped: skipped.length, mismatches },
      })
      revalidatePath("/admin/content-engine")
      return NextResponse.json({
        parsed: batch.questions.length,
        imported,
        skipped,
        mismatches,
        errorBlocks: batch.errorBlocks.length,
      })
    }

    if (action === "import") {
      const parsed = importSchema.safeParse(rawBody)
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid import payload", issues: parsed.error.issues }, { status: 400 })
      }
      const { questions: rawQuestions, pastedText, defaultSubject, defaultTopic, defaultExam, defaultYear } = parsed.data

      const rows: BatchQuestionInput[] = []
      const rowErrors: { index: number; error: string }[] = []
      rawQuestions.forEach((item, index) => {
        const check = batchQuestionSchema.safeParse(item)
        if (check.success) rows.push(check.data)
        else
          rowErrors.push({
            index,
            error: check.error.issues.map((i) => `${i.path.join(".") || "row"}: ${i.message}`).join("; "),
          })
      })

      const refs = await loadReferenceData()
      const autoApproveSetting = await prisma.contentEngineSetting
        .findUnique({ where: { key: "AUTO_APPROVE_CLEAN" } })
        .catch(() => null)
      const autoApprove = autoApproveSetting?.value === true

      const usedHashes = new Set<string>(refs.hashes)
      const batchInfoTexts: string[] = []

      const toCreate = rows.map((q) => {
        const classification = classifyHints(q.subject, q.topic, defaultSubject, defaultTopic)
        const detected = detectExamFromTag(q.tag)
        const dupeKey = normalizedQuestionKey(q.q, q.options)
        const duplicate = refs.keys.has(dupeKey)
        const infoText = additionalInfoText(q.additionalInfo)
        const pool = [...repetitionPool(refs.detail, classification.sub, classification.top), ...batchInfoTexts]
        const repetitionMax = repetitionScore(infoText, pool)
        const repExceeds = repetitionMax >= REPETITION_THRESHOLD
        const flags = [...q.flags, ...classification.classificationFlags]
        if (duplicate) flags.push("duplicate-of-existing")
        if (repExceeds) flags.push("repetition>=0.5")

        const review = needsReview({ check: q.check, unsure: q.unsure, flags, duplicate, repetitionMax: repExceeds ? repetitionMax : 0 })
        const solutionStatus: "NEEDS_REVIEW" | "APPROVED" = autoApprove && !review ? "APPROVED" : "NEEDS_REVIEW"

        let hash = contentHash(q.q, q.options)
        if (usedHashes.has(hash)) {
          hash = `${hash}-d${rows.indexOf(q)}`
        }
        usedHashes.add(hash)
        if (infoText) batchInfoTexts.push(infoText)

        return {
          hash,
          data: {
            q: q.q,
            options: q.options,
            answer: q.answer,
            answerIndex: q.answerIndex,
            // buildSolutionJson contains nullable members; Prisma's Json input type
            // accepts them at runtime — cast through unknown at the boundary.
            solution: buildSolutionJson(q, { solutionStatus, warnings: flags }) as unknown as Prisma.InputJsonValue,
            solutionSource: "PASTED" as const,
            solutionVersion: 1,
            sub: classification.sub,
            top: classification.top,
            exam: q.exam || defaultExam || detected.exam || null,
            year: q.year || defaultYear || detected.year || null,
            sourceTag: q.tag || null,
            sourceNo: q.no ? (Number.parseInt(q.no, 10) || null) : null,
            status: "DRAFT" as const,
            isPublished: false,
          },
          meta: { duplicate, review },
        }
      })

      const batchRecord = await prisma.contentEngineBatch.create({
        data: {
          createdById: user.userId || null,
          pastedText: pastedText.slice(0, 100_000),
          defaultSubject: defaultSubject || null,
          defaultTopic: defaultTopic || null,
          defaultExam: defaultExam || null,
          defaultYear: defaultYear || null,
        },
      })

      const created = await prisma.$transaction(
        toCreate.map((row) =>
          prisma.contentEngineQuestion.create({
            data: { ...row.data, textHash: row.hash, shortId: `ceq-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}`, batchId: batchRecord.id },
          }),
        ),
      )

      await writeDualAuditLog({
        actorId: user.userId || "admin",
        action: "CREATE",
        targetId: batchRecord.id,
        entityType: "ARTICLE",
        details: {
          batchId: batchRecord.id,
          created: created.length,
          needsReview: toCreate.filter((r) => r.meta.review).length,
          duplicates: toCreate.filter((r) => r.meta.duplicate).length,
          rowErrors: rowErrors.length,
        },
      })

      revalidatePath("/admin/content-engine")
      return NextResponse.json({
        batchId: batchRecord.id,
        created: created.length,
        needsReview: toCreate.filter((r) => r.meta.review).length,
        duplicates: toCreate.filter((r) => r.meta.duplicate).length,
        rowErrors,
      })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (err) {
    return NextResponse.json(
      { error: "Batch operation failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
