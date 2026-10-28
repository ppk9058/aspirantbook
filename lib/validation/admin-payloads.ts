import { z } from "zod"

/**
 * A12: explicit allowlist schemas for admin writes that previously spread a
 * request body straight into Prisma. Unknown keys are stripped so a caller can
 * never mass-assign relations, ids, counters or audit columns.
 */

const courseStatus = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"])
const difficulty = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"])

export const courseDraftUpdateSchema = z
  .object({
    title: z.string().min(1).max(300).optional(),
    slug: z.string().min(1).max(300).optional(),
    description: z.string().max(50000).optional(),
    thumbnailUrl: z.string().max(2000).nullable().optional(),
    difficulty: difficulty.optional(),
    duration: z.coerce.number().int().min(0).max(1000000).optional(),
    technology: z.string().max(200).optional(),
    prerequisites: z.union([z.array(z.string().max(300)).max(100), z.string().max(5000)]).optional(),
    status: courseStatus.optional(),
    isPremium: z.boolean().optional(),
    isPublished: z.boolean().optional(),
    price: z.coerce.number().int().min(0).optional(),
    originalPrice: z.coerce.number().int().min(0).optional(),
    discountPercent: z.coerce.number().int().min(0).max(100).optional(),
    couponCode: z.string().max(60).optional(),
    couponDiscount: z.coerce.number().int().min(0).max(100).optional(),
    expiresAt: z.string().max(60).optional(),
    hasTrialLesson: z.boolean().optional(),
    metadataJson: z.string().max(200000).nullable().optional(),
    isGated: z.boolean().optional(),
    previewPercentage: z.coerce.number().int().min(0).max(100).optional(),
    seoMode: z.enum(["preview", "bot-full"]).optional(),
    gateTitle: z.string().max(300).nullable().optional(),
    gateSubtitle: z.string().max(500).nullable().optional(),
  })
  .strip()

export type CourseDraftUpdate = z.infer<typeof courseDraftUpdateSchema>

export const courseInlineUpdateSchema = courseDraftUpdateSchema.partial()

export const contentEngineQuestionPatchSchema = z
  .object({
    q: z.string().min(1).max(100000).optional(),
    options: z.any().optional(),
    answer: z.string().max(2000).optional(),
    answerIndex: z.coerce.number().int().min(-1).max(20).optional(),
    explanation: z.string().max(100000).nullable().optional(),
    sub: z.string().max(300).nullable().optional(),
    top: z.string().max(300).nullable().optional(),
    exam: z.string().max(300).nullable().optional(),
    year: z.string().max(20).nullable().optional(),
    sourceTag: z.string().max(300).nullable().optional(),
    sourceNo: z.coerce.number().int().nullable().optional(),
    status: z.enum(["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"]).optional(),
    isPublished: z.boolean().optional(),
    isVerified: z.boolean().optional(),
    isInferred: z.boolean().optional(),
    slug: z.string().max(300).nullable().optional(),
    publishedAt: z.coerce.date().nullable().optional(),
  })
  .strip()

export type ContentEngineQuestionPatch = z.infer<typeof contentEngineQuestionPatchSchema>

function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0]
  if (!issue) return "Invalid payload"
  const path = issue.path.join(".")
  return path ? `${path}: ${issue.message}` : issue.message
}

/** Parses and throws a readable error (server actions surface this message). */
export function parseOrThrow<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    throw new Error(`Invalid payload: ${firstIssue(parsed.error)}`)
  }
  return parsed.data
}
