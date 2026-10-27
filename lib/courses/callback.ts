/**
 * Callback-lead capture (shared by the public page and the v1 mobile API).
 *
 * Security/PII rules:
 *  - always answer with a generic success payload (no account/course enumeration,
 *    no "is this number already in our DB" oracle)
 *  - store only E.164 Indian mobile numbers
 *  - never log the full number
 *  - dedupe the same mobile+course inside 24h
 *  - rate limit per IP+mobile (3/hour) using the shared Postgres limiter
 */
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { checkRateLimit } from "@/lib/rate-limit"
import { normalizePhoneToE164, maskPhone } from "@/lib/courses/phone"

export const CALLBACK_RATE_LIMIT = 3
export const CALLBACK_RATE_WINDOW_SECONDS = 60 * 60
export const CALLBACK_DEDUPE_HOURS = 24

/**
 * `website` is the honeypot: real users never fill it in, bots usually do.
 */
export const callbackRequestSchema = z.object({
  name: z.string().trim().min(2).max(80),
  mobile: z.string().trim().min(6).max(20),
  note: z.string().trim().max(500).optional(),
  source: z.string().trim().max(40).optional(),
  utm: z.string().trim().max(200).optional(),
  // Decoy field: accepted by the schema so a filled value reaches the honeypot
  // check below instead of being reported as a validation error.
  website: z.string().max(200).optional(),
})

export type CallbackRequest = z.infer<typeof callbackRequestSchema>

export interface CallbackResult {
  ok: true
  created: boolean
  reason: "created" | "duplicate" | "invalid" | "honeypot" | "rate_limited"
}

const GENERIC: Omit<CallbackResult, "created" | "reason"> = { ok: true }

export async function captureCallbackLead(input: {
  courseIdOrSlug: string
  body: unknown
  ip: string
  source?: string
}): Promise<CallbackResult> {
  const parsed = callbackRequestSchema.safeParse(input.body)
  if (!parsed.success) {
    return { ...GENERIC, created: false, reason: "invalid" }
  }

  const data = parsed.data
  if (data.website && data.website.length > 0) {
    return { ...GENERIC, created: false, reason: "honeypot" }
  }

  const mobile = normalizePhoneToE164(data.mobile)
  if (!mobile) {
    return { ...GENERIC, created: false, reason: "invalid" }
  }

  const limit = await checkRateLimit(
    `course_callback:${input.ip}:${mobile}`,
    CALLBACK_RATE_LIMIT,
    CALLBACK_RATE_WINDOW_SECONDS
  )
  if (!limit.allowed) {
    return { ...GENERIC, created: false, reason: "rate_limited" }
  }

  const course = await prisma.course.findFirst({
    where: { OR: [{ id: input.courseIdOrSlug }, { slug: input.courseIdOrSlug }] },
    select: { id: true },
  })
  if (!course) {
    // Unknown course: generic response on purpose.
    return { ...GENERIC, created: false, reason: "invalid" }
  }

  const since = new Date(Date.now() - CALLBACK_DEDUPE_HOURS * 60 * 60 * 1000)
  const existing = await prisma.courseCallbackLead.findFirst({
    where: { courseId: course.id, mobile, createdAt: { gte: since } },
    select: { id: true },
  })
  if (existing) {
    return { ...GENERIC, created: false, reason: "duplicate" }
  }

  await prisma.courseCallbackLead.create({
    data: {
      courseId: course.id,
      name: data.name,
      mobile,
      note: data.note || null,
      source: input.source || data.source || "COURSE_DETAIL",
      utm: data.utm || null,
    },
  })

  console.info(`[course-callback] lead captured for course=${course.id} mobile=${maskPhone(mobile)}`)
  return { ...GENERIC, created: true, reason: "created" }
}

/** CSV for the studio export. Numbers are masked for anyone but the owning teacher/admin. */
export function leadsToCsv(
  leads: Array<{
    createdAt: Date | string
    name: string
    mobile: string
    status: string
    source: string
    utm: string | null
    note: string | null
  }>,
  options: { maskMobile: boolean }
): string {
  const header = ["created_at", "name", "mobile", "status", "source", "utm", "note"]
  const escape = (value: string) => `"${String(value).replace(/"/g, '""')}"`
  const rows = leads.map((lead) => {
    const mobile = options.maskMobile ? maskPhone(lead.mobile) : lead.mobile
    return [
      new Date(lead.createdAt).toISOString(),
      lead.name,
      mobile,
      lead.status,
      lead.source,
      lead.utm || "",
      lead.note || "",
    ]
      .map(escape)
      .join(",")
  })
  return [header.join(","), ...rows].join("\n") + "\n"
}
