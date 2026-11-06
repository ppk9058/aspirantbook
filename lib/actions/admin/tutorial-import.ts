"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { logContentAudit } from "@/lib/actions/admin/audit"
import {
  TutorialPackageSchema,
  TutorialPackage,
  normalizeBlockWithBid,
} from "@/lib/validations/tutorial-schema"
import { validateOrMapCanonicalGoals } from "@/lib/tutorials-goal-categories"
import crypto from "crypto"

export interface ImportOptions {
  dryRun?: boolean
  publishImmediately?: boolean
  courseId?: string
  updateCourseMeta?: boolean
  archiveOrphans?: boolean
  /** A8/A9: creator recorded on a newly imported course. */
  createdById?: string
  creatorId?: string | null
}

export type LessonMergeStatus = "created" | "updated" | "unlocked" | "unchanged" | "conflict"

export interface DryRunChapterPreview {
  id: string
  title: string
  status: LessonMergeStatus
  details?: string
  isSoon?: boolean
}

export interface DryRunPhasePreview {
  id: string
  title: string
  isNew: boolean
  chapters: DryRunChapterPreview[]
}

export interface OrphanPreview {
  id: string
  title: string
  externalId?: string | null
  phaseId: string
  phaseTitle: string
}

export interface ImportTutorialResult {
  success: boolean
  dryRun: boolean
  courseId?: string
  slug?: string
  title: string
  summary: {
    phasesCount: number
    chaptersCount: number
    created: number
    updated: number
    unlocked: number
    unchanged: number
    conflicts: number
    orphansCount?: number
  }
  phases: DryRunPhasePreview[]
  orphans?: OrphanPreview[]
  warnings?: string[]
  error?: string
}

function canonicalizeObject(obj: any): any {
  if (!obj || typeof obj !== "object") return obj
  if (Array.isArray(obj)) return obj.map(canonicalizeObject)
  const sorted: Record<string, any> = {}
  for (const k of Object.keys(obj).sort()) {
    if (k === "bid") continue
    const val = obj[k]
    if (val !== undefined && val !== null && val !== "") {
      sorted[k] = canonicalizeObject(val)
    }
  }
  return sorted
}

function computeContentHash(blocks: any[]): string {
  if (!Array.isArray(blocks)) return ""
  const canonical = canonicalizeObject(blocks)
  return crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex")
}

/**
 * Attaches or preserves stable BIDs across imports.
 * First matches on (type + contentHash) so inserting a block in the middle
 * does NOT shift the BIDs of subsequent blocks. Falls back to positional match.
 */
function attachOrPreserveBids(incomingRawBlocks: any[], existingBlocks?: any[]): any[] {
  const existingList = Array.isArray(existingBlocks) ? existingBlocks : []

  // Index existing blocks by (type::contentHash)
  const existingByHash = new Map<string, any[]>()
  for (const ex of existingList) {
    if (!ex || !ex.bid) continue
    const t = String(ex.t || ex.type || "p").toLowerCase()
    const hash = computeContentHash([ex])
    const key = `${t}::${hash}`
    if (!existingByHash.has(key)) existingByHash.set(key, [])
    existingByHash.get(key)!.push(ex)
  }

  return incomingRawBlocks.map((raw, idx) => {
    const normalized = normalizeBlockWithBid(raw)
    if (raw.bid) return normalized

    // 1. Try matching existing block with same type and content hash
    const rawType = String(raw.t || raw.type || "p").toLowerCase()
    const rawHash = computeContentHash([normalized])
    const hashKey = `${rawType}::${rawHash}`
    const hashMatches = existingByHash.get(hashKey)
    if (hashMatches && hashMatches.length > 0) {
      const match = hashMatches.shift()!
      return { ...normalized, bid: match.bid }
    }

    // 2. Fall back to positional match if same type
    const positional = existingList[idx]
    if (
      positional &&
      positional.bid &&
      String(positional.t || positional.type || "").toLowerCase() === rawType
    ) {
      return { ...normalized, bid: positional.bid }
    }

    return normalized
  })
}

/**
 * Calculates a midpoint order between siblings so inserting a chapter/lesson
 * in the middle does not require renumbering existing items.
 */
function calculateMidpointOrder(
  prevOrder: number | null,
  nextOrder: number | null,
  fallbackOrder: number
): number {
  if (prevOrder !== null && nextOrder !== null) {
    const diff = Math.abs(nextOrder - prevOrder)
    if (diff > 0.0001) {
      return (prevOrder + nextOrder) / 2
    }
  }
  if (prevOrder !== null && nextOrder === null) {
    return prevOrder + 1000
  }
  if (prevOrder === null && nextOrder !== null) {
    return nextOrder / 2 > 0.0001 ? nextOrder / 2 : nextOrder - 500
  }
  return fallbackOrder
}

function parseDurationMinutes(val: any, stats?: any[]): number {
  if (typeof val === "number" && !isNaN(val)) {
    return val <= 50 ? Math.round(val * 60) : Math.round(val)
  }
  if (typeof val === "string") {
    const s = val.trim().toLowerCase()
    const hoursMatch = s.match(/([\d.]+)\s*(?:hours|hrs|hr|h)/)
    if (hoursMatch) return Math.round(parseFloat(hoursMatch[1]) * 60)
    const minsMatch = s.match(/([\d.]+)\s*(?:minutes|mins|min|m)/)
    if (minsMatch) return Math.round(parseFloat(minsMatch[1]))
    const num = parseFloat(s)
    if (!isNaN(num)) return num <= 50 ? Math.round(num * 60) : Math.round(num)
  }
  if (Array.isArray(stats)) {
    for (const item of stats) {
      if (Array.isArray(item) && item.length >= 2) {
        const [v, label] = item
        if (typeof label === "string" && label.toLowerCase().includes("duration")) {
          return parseDurationMinutes(v)
        }
      }
    }
  }
  return 0
}

function parsePrerequisites(raw: any, stats?: any[]): string[] {
  if (Array.isArray(raw)) {
    return raw.map((x: any) => String(x).trim()).filter(Boolean)
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw.split(",").map((s: string) => s.trim()).filter(Boolean)
  }
  if (Array.isArray(stats)) {
    for (const item of stats) {
      if (Array.isArray(item) && item.length >= 2) {
        const [val, label] = item
        if (typeof label === "string" && label.toLowerCase().includes("prereq")) {
          return String(val).split(",").map((s: string) => s.trim()).filter(Boolean)
        }
      }
    }
  }
  return []
}

function parseProjectCount(raw: any, stats?: any[], totalLessons?: number): number {
  if (typeof raw === "number" && !isNaN(raw)) return raw
  if (typeof raw === "string") {
    const m = raw.match(/\d+/)
    if (m) return parseInt(m[0], 10)
  }
  if (Array.isArray(stats)) {
    for (const item of stats) {
      if (Array.isArray(item) && item.length >= 2) {
        const [val, label] = item
        const combined = `${val} ${label}`.toLowerCase()
        if (combined.includes("project")) {
          const m = combined.match(/\d+/)
          if (m) return parseInt(m[0], 10)
        }
      }
    }
  }
  if (totalLessons && totalLessons > 0) {
    return Math.max(1, Math.round(totalLessons * 0.5))
  }
  return 0
}

function extractFeatures(meta: any): string[] {
  const direct = meta?.includes || meta?.features
  if (Array.isArray(direct) && direct.length > 0) {
    return direct.map((x: any) => String(x).trim()).filter(Boolean)
  }
  return []
}

function extractSkills(meta: any): string[] {
  const direct = meta?.skills
  if (Array.isArray(direct) && direct.length > 0) {
    return direct.map((x: any) => String(x).trim()).filter(Boolean)
  }
  return []
}

const DEFAULT_TUTORIAL_THEME = {
  colors: {
    bg: "#e4efff",
    card: "#f5f9ff",
    ink: "#1f2a6b",
    primary: "#3b2fd6",
    green: "#0e9f78",
    yellow: "#ffe066",
    soft: "#d3e3ff",
    code: "#26338a",
  },
  fonts: {
    head: "Space Grotesk",
    body: "Nunito",
    mono: "JetBrains Mono",
  },
}

function parseDifficulty(level: any, stats?: any[]): "BEGINNER" | "INTERMEDIATE" | "ADVANCED" {
  const check = (val: string) => {
    const s = val.toLowerCase()
    if (s.includes("adv")) return "ADVANCED"
    if (s.includes("intermed")) return "INTERMEDIATE"
    if (s.includes("begin") || s.includes("starter") || s.includes("zero") || s.includes("pro")) return "BEGINNER"
    return null
  }
  if (typeof level === "string") {
    const res = check(level)
    if (res) return res
  }
  if (Array.isArray(stats)) {
    for (const item of stats) {
      if (Array.isArray(item) && item.length >= 2) {
        const [val, label] = item
        const combined = `${val} ${label}`.toLowerCase()
        if (combined.includes("level") || combined.includes("difficulty") || combined.includes("skill")) {
          const res = check(String(val))
          if (res) return res
        }
      }
    }
  }
  return "BEGINNER"
}

function normalizeTitle(title?: string | null): string {
  if (!title) return ""
  return title.toLowerCase().replace(/[^a-z0-9]/g, "")
}

export async function importTutorialPackage(
  payload: any,
  options: ImportOptions = {}
): Promise<ImportTutorialResult> {
  const warnings: string[] = []

  try {
    let session = null
    try {
      session = await auth()
    } catch {
      // In CLI, test runner, or outside Next.js request context
    }

    const userRole = (session?.user as any)?.role
    const userId = session?.user?.id || "system"
    const isProduction = process.env.NODE_ENV === "production"

    // 1. Security Check: Real Role Guard
    // If a session exists, user MUST be ADMIN or TEACHER.
    // If no session exists, allow only in non-production (CLI test runners, local scripts).
    const isAuthorized = session
      ? userRole === "ADMIN" || userRole === "TEACHER"
      : !isProduction

    if (!isAuthorized) {
      return {
        success: false,
        dryRun: Boolean(options.dryRun),
        title: payload?.meta?.title || "Forbidden",
        summary: {
          phasesCount: 0,
          chaptersCount: 0,
          created: 0,
          updated: 0,
          unlocked: 0,
          unchanged: 0,
          conflicts: 0,
          orphansCount: 0,
        },
        phases: [],
        error: "Forbidden: Only Teachers and Admins can import tutorials",
      }
    }

    // 2. Validate payload leniently: package-level header must be valid
    const parsed = TutorialPackageSchema.safeParse(payload)
    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
      return {
        success: false,
        dryRun: Boolean(options.dryRun),
        title: payload?.meta?.title || "Unknown Tutorial",
        summary: {
          phasesCount: 0,
          chaptersCount: 0,
          created: 0,
          updated: 0,
          unlocked: 0,
          unchanged: 0,
          conflicts: 0,
          orphansCount: 0,
        },
        phases: [],
        error: `Validation Error: ${errorMsg}`,
      }
    }

    const pkg: TutorialPackage = parsed.data
    const dryRun = Boolean(options.dryRun)
    const publishImmediately = Boolean(options.publishImmediately)
    const updateCourseMeta = Boolean(options.updateCourseMeta)
    const archiveOrphans = Boolean(options.archiveOrphans)

    const meta = pkg.meta
    const metaId =
      meta.id ||
      meta.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    meta.id = metaId

    const incomingTheme = pkg.theme

    // Generalized metadata extraction (duration, prerequisites, features, skills, projects)
    const parsedDurationMinutes = parseDurationMinutes((meta as any).duration, meta.stats)
    const parsedPrerequisites = parsePrerequisites((meta as any).prerequisites, meta.stats)
    const parsedFeatures = extractFeatures(meta)
    const parsedSkills = extractSkills(meta)
    const totalPkgChapters = pkg.phases.reduce((acc, p) => acc + (p.chapters?.length || 0), 0)
    const parsedProjectCount = parseProjectCount(
      (meta as any).projectCount || (meta as any).projects,
      meta.stats,
      totalPkgChapters
    )

    // 3. Pre-flight course lookup (by explicit courseId, externalId, slug, or title)
    const courseInclude = {
      chapters: {
        include: {
          lessons: {
            include: {
              versions: {
                orderBy: { createdAt: "desc" as const },
              },
            },
          },
        },
        orderBy: { order: "asc" as const },
      },
    }

    let existingCourse: any = null
    // 1. Explicit courseId
    if (options.courseId) {
      existingCourse = await prisma.course.findUnique({
        where: { id: options.courseId },
        include: courseInclude,
      })
    }

    // 2. externalId = metaId
    if (!existingCourse) {
      existingCourse = await prisma.course.findFirst({
        where: { externalId: metaId },
        include: courseInclude,
      })
    }

    // 3. metadataJson.meta.id = metaId
    if (!existingCourse) {
      const candidates = await prisma.course.findMany({
        where: { metadataJson: { not: null } },
        include: courseInclude,
      })
      existingCourse = candidates.find((c) => {
        try {
          const parsed = JSON.parse(c.metadataJson || "{}")
          return parsed?.meta?.id === metaId
        } catch {
          return false
        }
      }) || null
    }

    // 4. Normalized title ONLY when matched course has no externalId
    if (!existingCourse) {
      const allCourses = await prisma.course.findMany({
        where: { externalId: null },
        include: courseInclude,
      })
      const targetNorm = normalizeTitle(meta.title)
      existingCourse = allCourses.find((c) => normalizeTitle(c.title) === targetNorm) || null
    }

    if (existingCourse && !updateCourseMeta) {
      if (existingCourse.title !== meta.title) {
        warnings.push(
          `Course title "${existingCourse.title}" preserved. Incoming title "${meta.title}" was not applied (updateCourseMeta is false).`
        )
      }
    }

    const phasePreviews: DryRunPhasePreview[] = []
    const summary = {
      phasesCount: pkg.phases.length,
      chaptersCount: 0,
      created: 0,
      updated: 0,
      unlocked: 0,
      unchanged: 0,
      conflicts: 0,
      orphansCount: 0,
    }

    // Prepare chapters lookup:
    // Match by externalId first. Title fallback ONLY for rows whose externalId is null (legacy).
    const existingChapterByExtId = new Map<string, any>()
    const existingChapterByTitle = new Map<string, any>()
    const ambiguousChapterTitles = new Set<string>()

    if (existingCourse) {
      for (const ch of existingCourse.chapters) {
        if (ch.externalId) {
          existingChapterByExtId.set(ch.externalId, ch)
        } else if (ch.title) {
          const normTitle = ch.title.toLowerCase().trim()
          if (existingChapterByTitle.has(normTitle)) {
            ambiguousChapterTitles.add(normTitle)
            existingChapterByTitle.delete(normTitle)
          } else {
            existingChapterByTitle.set(normTitle, ch)
          }
        }
      }
    }

    // 4. Dry-Run Phase Analysis
    for (const [pIdx, phase] of pkg.phases.entries()) {
      const normPhaseTitle = phase.title.toLowerCase().trim()
      const existingPhase =
        existingChapterByExtId.get(phase.id) ||
        (!ambiguousChapterTitles.has(normPhaseTitle)
          ? existingChapterByTitle.get(normPhaseTitle)
          : null)

      const phasePreview: DryRunPhasePreview = {
        id: phase.id,
        title: phase.title,
        isNew: !existingPhase,
        chapters: [],
      }

      // Lessons lookup within this phase
      const existingLessonsByExtId = new Map<string, any>()
      const existingLessonsByTitle = new Map<string, any>()
      const ambiguousLessonTitles = new Set<string>()

      if (existingPhase) {
        for (const l of existingPhase.lessons) {
          if (l.externalId) {
            existingLessonsByExtId.set(l.externalId, l)
          } else if (l.title) {
            const normTitle = l.title.toLowerCase().trim()
            if (existingLessonsByTitle.has(normTitle)) {
              ambiguousLessonTitles.add(normTitle)
              existingLessonsByTitle.delete(normTitle)
            } else {
              existingLessonsByTitle.set(normTitle, l)
            }
          }
        }
      }

      for (const [cIdx, chItem] of phase.chapters.entries()) {
        summary.chaptersCount++
        const normTitle = chItem.title.toLowerCase().trim()
        const existingLesson =
          existingLessonsByExtId.get(chItem.id) ||
          (!ambiguousLessonTitles.has(normTitle)
            ? existingLessonsByTitle.get(normTitle)
            : null)

        const isSoon = Boolean(chItem.soon)
        const versions = existingLesson?.versions || []
        const currentVersion =
          versions.find((v: any) => v.id === existingLesson?.currentPublishedVersionId) ||
          versions[0]
        const incomingBlocks = attachOrPreserveBids(chItem.blocks || [], currentVersion?.blocks)
        const incomingHash = computeContentHash(incomingBlocks)

        // BRANCH 1: PLACEHOLDER GUARD
        // If a chapter is 'soon' or has zero blocks, never touch existing lesson content/versions!
        if (isSoon || incomingBlocks.length === 0) {
          if (!existingLesson) {
            summary.created++
            phasePreview.chapters.push({
              id: chItem.id,
              title: chItem.title,
              status: "created",
              isSoon: true,
              details: "New roadmap placeholder topic",
            })
          } else {
            summary.unchanged++
            phasePreview.chapters.push({
              id: chItem.id,
              title: chItem.title,
              status: "unchanged",
              isSoon: true,
              details: "Placeholder entry; existing lesson preserved untouched",
            })
          }
          continue
        }

        if (!existingLesson) {
          summary.created++
          phasePreview.chapters.push({
            id: chItem.id,
            title: chItem.title,
            status: "created",
            isSoon: false,
            details: `New lesson with ${incomingBlocks.length} blocks`,
          })
        } else {
          // BRANCH 2: UNLOCK
          if (existingLesson.locked && !isSoon && incomingBlocks.length > 0) {
            summary.unlocked++
            phasePreview.chapters.push({
              id: chItem.id,
              title: chItem.title,
              status: "unlocked",
              isSoon: false,
              details: `Unlocked from placeholder with ${incomingBlocks.length} blocks`,
            })
          } else {
            // BRANCH 3: CONFLICT CHECK
            const versions = existingLesson.versions || []
            const lastImportVersion = versions.find((v: any) => v.source === "import")
            const newerEditorVersion = versions.find(
              (v: any) =>
                v.source === "editor" &&
                (!lastImportVersion || new Date(v.createdAt) > new Date(lastImportVersion.createdAt))
            )

            if (newerEditorVersion) {
              summary.conflicts++
              phasePreview.chapters.push({
                id: chItem.id,
                title: chItem.title,
                status: "conflict",
                isSoon: false,
                details: "Has manual editor changes since last import; will merge as a review draft",
              })
            } else {
              // BRANCH 4: IDEMPOTENT COMPARE
              let existingBlocksHash = ""
              if (currentVersion && currentVersion.blocks) {
                existingBlocksHash = computeContentHash(currentVersion.blocks)
              }

              if (existingBlocksHash === incomingHash) {
                summary.unchanged++
                phasePreview.chapters.push({
                  id: chItem.id,
                  title: chItem.title,
                  status: "unchanged",
                  isSoon: false,
                  details: "Content is identical to current version",
                })
              } else {
                summary.updated++
                phasePreview.chapters.push({
                  id: chItem.id,
                  title: chItem.title,
                  status: "updated",
                  isSoon: false,
                  details: `Updating with ${incomingBlocks.length} blocks`,
                })
              }
            }
          }
        }
      }

      phasePreviews.push(phasePreview)
    }

    // 5. Detect orphaned lessons (existing lessons in course/phase not in file)
    // NEVER DELETE: list as archive suggestions
    const incomingLessonIds = new Set<string>()
    for (const p of pkg.phases) {
      for (const c of p.chapters) {
        if (c.id) incomingLessonIds.add(c.id)
      }
    }

    const orphans: OrphanPreview[] = []
    if (existingCourse) {
      for (const ch of existingCourse.chapters) {
        for (const l of ch.lessons) {
          if (l.externalId && !incomingLessonIds.has(l.externalId) && !l.archivedAt) {
            orphans.push({
              id: l.id,
              title: l.title,
              externalId: l.externalId,
              phaseId: ch.id,
              phaseTitle: ch.title,
            })
          }
        }
      }
    }
    summary.orphansCount = orphans.length

    // If DRY RUN, return preview immediately without writing to DB
    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        courseId: existingCourse?.id,
        slug: existingCourse?.slug,
        title: meta.title,
        summary,
        phases: phasePreviews,
        orphans,
        warnings: warnings.length > 0 ? warnings : undefined,
      }
    }

    // 6. EXECUTE ATOMIC TRANSACTION WITH POSTGRES ADVISORY LOCK
    const course = await prisma.$transaction(
      async (tx) => {
        // Concurrency lock: Postgres advisory transaction-level lock
        try {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${metaId}))`
        } catch {
          // Non-fatal if DB does not support advisory lock in sub-context
        }

        // Re-read course state strictly inside the transaction
        let targetCourse: any = null
        let isLegacyTitleMatch = false

        // 1. Explicit courseId
        if (options.courseId) {
          targetCourse = await tx.course.findUnique({
            where: { id: options.courseId },
            include: courseInclude,
          })
        }

        // 2. externalId = metaId
        if (!targetCourse) {
          targetCourse = await tx.course.findFirst({
            where: { externalId: metaId },
            include: courseInclude,
          })
        }

        // 3. metadataJson.meta.id = metaId
        if (!targetCourse) {
          const candidates = await tx.course.findMany({
            where: { metadataJson: { not: null } },
            include: courseInclude,
          })
          targetCourse = candidates.find((c) => {
            try {
              const parsed = JSON.parse(c.metadataJson || "{}")
              return parsed?.meta?.id === metaId
            } catch {
              return false
            }
          }) || null
        }

        // 4. Normalized title ONLY when matched course has no externalId
        if (!targetCourse) {
          const allCourses = await tx.course.findMany({
            where: { externalId: null },
            include: courseInclude,
          })
          const targetNorm = normalizeTitle(meta.title)
          targetCourse = allCourses.find((c) => normalizeTitle(c.title) === targetNorm) || null
          if (targetCourse) {
            isLegacyTitleMatch = true
          }
        }

        const effectiveTheme = incomingTheme || DEFAULT_TUTORIAL_THEME
        const parsedDifficulty = parseDifficulty(meta.level, meta.stats)

        if (!targetCourse) {
          // Create unique slug
          let baseSlug = metaId
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")
          if (!baseSlug) baseSlug = `tutorial-${Date.now()}`

          let slug = baseSlug
          const existingSlug = await tx.course.findUnique({ where: { slug } })
          if (existingSlug) {
            slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`
          }

          // Validate meta.subject against canonical goal list
          const goalValidation = validateOrMapCanonicalGoals(meta.subject)
          let canonicalTechnology = ""
          let forceDraft = false
          if (!goalValidation.isValid) {
            forceDraft = true
            warnings.push(goalValidation.error || `Category required: subject '${meta.subject}' does not match any canonical goal. Imported as DRAFT.`)
          } else {
            canonicalTechnology = goalValidation.validSlugs.join(",")
          }

          const effectiveStatus = forceDraft ? "DRAFT" : (publishImmediately ? "PUBLISHED" : "DRAFT")
          const effectiveIsPublished = forceDraft ? false : Boolean(publishImmediately)

          // Rule 10: New course is published ONLY if publishImmediately is true and category is valid
          targetCourse = (await tx.course.create({
            data: {
              externalId: metaId,
              title: meta.title,
              slug,
              description: meta.intro || `Interactive tutorial: ${meta.title}`,
              technology: canonicalTechnology,
              difficulty: parsedDifficulty,
              duration: parsedDurationMinutes > 0 ? parsedDurationMinutes : 0,
              prerequisites: parsedPrerequisites,
              status: effectiveStatus,
              isPublished: effectiveIsPublished,
              createdById: options.createdById ?? options.creatorId ?? null,
              theme: effectiveTheme as any,
              metadataJson: JSON.stringify({
                format: "tutorial",
                theme: effectiveTheme,
                meta: meta || undefined,
                features: parsedFeatures.length > 0 ? parsedFeatures : undefined,
                skills: parsedSkills.length > 0 ? parsedSkills : undefined,
                projectCount: parsedProjectCount > 0 ? parsedProjectCount : undefined,
                duration: parsedDurationMinutes > 0 ? parsedDurationMinutes : undefined,
                prerequisites: parsedPrerequisites.length > 0 ? parsedPrerequisites : undefined,
                difficulty: parsedDifficulty,
              }),
              schemaVersion: pkg.schema || 1,
            },
          })) as any
        } else if (updateCourseMeta) {
          // Rule 5: Overwrite course title, description, and theme ONLY if updateCourseMeta is true
          const updateGoalValidation = validateOrMapCanonicalGoals(meta.subject)
          let updateCanonicalTech = targetCourse.technology
          if (meta.subject) {
            if (updateGoalValidation.isValid) {
              updateCanonicalTech = updateGoalValidation.validSlugs.join(",")
            } else {
              warnings.push(updateGoalValidation.error || `Category required: subject '${meta.subject}' does not match any canonical goal.`)
            }
          }

          const updateData: any = {
            title: meta.title,
            description: meta.intro || targetCourse.description,
            technology: updateCanonicalTech,
            difficulty: parsedDifficulty,
            theme: effectiveTheme as any,
            metadataJson: JSON.stringify({
              format: "tutorial",
              theme: effectiveTheme,
              meta: meta || undefined,
              features: parsedFeatures.length > 0 ? parsedFeatures : undefined,
              skills: parsedSkills.length > 0 ? parsedSkills : undefined,
              projectCount: parsedProjectCount > 0 ? parsedProjectCount : undefined,
              duration: parsedDurationMinutes > 0 ? parsedDurationMinutes : undefined,
              prerequisites: parsedPrerequisites.length > 0 ? parsedPrerequisites : undefined,
              difficulty: parsedDifficulty,
            }),
          }
          if (parsedDurationMinutes > 0) {
            updateData.duration = parsedDurationMinutes
          }
          if (parsedPrerequisites.length > 0) {
            updateData.prerequisites = parsedPrerequisites
          }
          targetCourse = (await tx.course.update({
            where: { id: targetCourse.id },
            data: updateData,
          })) as any
        } else if (isLegacyTitleMatch || !targetCourse.externalId) {
          // Stamp externalId = metaId on legacy course matched by title
          targetCourse = (await tx.course.update({
            where: { id: targetCourse.id },
            data: { externalId: metaId },
          })) as any
        }

        // Build transaction-local chapter maps
        const txChapterByExtId = new Map<string, any>()
        const txChapterByTitle = new Map<string, any>()
        const txAmbiguousChapters = new Set<string>()

        if (targetCourse?.chapters) {
          for (const ch of targetCourse.chapters) {
            if (ch.externalId) {
              txChapterByExtId.set(ch.externalId, ch)
            } else if (ch.title) {
              const norm = ch.title.toLowerCase().trim()
              if (txChapterByTitle.has(norm)) {
                txAmbiguousChapters.add(norm)
                txChapterByTitle.delete(norm)
              } else {
                txChapterByTitle.set(norm, ch)
              }
            }
          }
        }

        // Determine existing max phase order for fallback
        let maxExistingPhaseOrder = 0
        if (targetCourse?.chapters && targetCourse.chapters.length > 0) {
          maxExistingPhaseOrder = Math.max(
            ...targetCourse.chapters.map((c: any) => c.order || 0)
          )
        }

        // 7. Upsert Phases & Lessons
        for (const [pIdx, phase] of pkg.phases.entries()) {
          const normPhaseTitle = phase.title.toLowerCase().trim()
          const existingCh =
            txChapterByExtId.get(phase.id) ||
            (!txAmbiguousChapters.has(normPhaseTitle)
              ? txChapterByTitle.get(normPhaseTitle)
              : null)

          // Rule 6: Calculate phase order using midpoint between siblings if new
          let phaseOrder = typeof phase.order === "number" ? phase.order : existingCh?.order
          if (phaseOrder === undefined) {
            const prevPhase = pIdx > 0 ? pkg.phases[pIdx - 1] : null
            const nextPhase = pIdx + 1 < pkg.phases.length ? pkg.phases[pIdx + 1] : null
            const prevExisting = prevPhase ? txChapterByExtId.get(prevPhase.id) : null
            const nextExisting = nextPhase ? txChapterByExtId.get(nextPhase.id) : null

            phaseOrder = calculateMidpointOrder(
              prevExisting?.order ?? null,
              nextExisting?.order ?? null,
              maxExistingPhaseOrder + (pIdx + 1) * 1000
            )
          }

          let chapterId = existingCh?.id

          if (!existingCh) {
            const createdCh = await tx.chapter.create({
              data: {
                externalId: phase.id,
                courseId: targetCourse!.id,
                title: phase.title,
                order: phaseOrder,
              },
            })
            chapterId = createdCh.id
          } else {
            await tx.chapter.update({
              where: { id: existingCh.id },
              data: {
                // Rule 4: Stamp externalId on legacy rows that matched by title
                externalId: existingCh.externalId || phase.id,
                title: phase.title,
                order: phaseOrder,
              },
            })
          }

          // Build transaction-local lesson maps
          const existingLessons = existingCh?.lessons || []
          const txLessonByExtId = new Map<string, any>()
          const txLessonByTitle = new Map<string, any>()
          const txAmbiguousLessons = new Set<string>()

          for (const l of existingLessons) {
            if (l.externalId) {
              txLessonByExtId.set(l.externalId, l)
            } else if (l.title) {
              const norm = l.title.toLowerCase().trim()
              if (txLessonByTitle.has(norm)) {
                txAmbiguousLessons.add(norm)
                txLessonByTitle.delete(norm)
              } else {
                txLessonByTitle.set(norm, l)
              }
            }
          }

          let maxLessonOrder = 0
          if (existingLessons.length > 0) {
            maxLessonOrder = Math.max(...existingLessons.map((l: any) => l.order || 0))
          }

          for (const [cIdx, chItem] of phase.chapters.entries()) {
            const normLessonTitle = chItem.title.toLowerCase().trim()
            const existingLesson =
              txLessonByExtId.get(chItem.id) ||
              (!txAmbiguousLessons.has(normLessonTitle)
                ? txLessonByTitle.get(normLessonTitle)
                : null)

            const isSoon = Boolean(chItem.soon)
            const versions = existingLesson?.versions || []
            const currentVersion =
              versions.find((v: any) => v.id === existingLesson?.currentPublishedVersionId) ||
              versions[0]
            const incomingBlocks = attachOrPreserveBids(chItem.blocks || [], currentVersion?.blocks)
            const incomingHash = computeContentHash(incomingBlocks)

            // Calculate lesson order (midpoint or explicit)
            let lessonOrder =
              typeof chItem.order === "number" ? chItem.order : existingLesson?.order
            if (lessonOrder === undefined) {
              const prevCh = cIdx > 0 ? phase.chapters[cIdx - 1] : null
              const nextCh = cIdx + 1 < phase.chapters.length ? phase.chapters[cIdx + 1] : null
              const prevExistingL = prevCh ? txLessonByExtId.get(prevCh.id) : null
              const nextExistingL = nextCh ? txLessonByExtId.get(nextCh.id) : null

              lessonOrder = calculateMidpointOrder(
                prevExistingL?.order ?? null,
                nextExistingL?.order ?? null,
                maxLessonOrder + (cIdx + 1) * 1000
              )
            }

            // RULE 3: PLACEHOLDER GUARD
            // If incoming chapter is 'soon' or has 0 blocks, NEVER touch existing lesson!
            if (isSoon || incomingBlocks.length === 0) {
              if (!existingLesson) {
                await tx.lesson.create({
                  data: {
                    externalId: chItem.id,
                    chapterId: chapterId!,
                    title: chItem.title,
                    order: lessonOrder,
                    type: "READING",
                    locked: true,
                    schemaVersion: 1,
                  },
                })
              }
              // If existingLesson exists: DO NOT TOUCH content, locked, or versions!
              continue
            }

            if (!existingLesson) {
              // Create new Lesson
              const newLesson = await tx.lesson.create({
                data: {
                  externalId: chItem.id,
                  chapterId: chapterId!,
                  title: chItem.title,
                  order: lessonOrder,
                  type: "READING",
                  locked: false,
                  schemaVersion: 1,
                  blockCount: Array.isArray(incomingBlocks) ? incomingBlocks.length : 0,
                  contentHash: incomingHash,
                },
              })

              const version = await tx.lessonVersion.create({
                data: {
                  lessonId: newLesson.id,
                  status: publishImmediately ? "published" : "draft",
                  blocks: incomingBlocks as any,
                  schemaVersion: 1,
                  contentHash: incomingHash,
                  needsReview: false,
                  createdBy: userId,
                  note: `Initial package import (${incomingHash.slice(0, 8)})`,
                  source: "import",
                },
              })

              await tx.lesson.update({
                where: { id: newLesson.id },
                data: publishImmediately
                  ? {
                      currentPublishedVersionId: version.id,
                      content: JSON.stringify(incomingBlocks), // Dual-write
                    }
                  : { currentDraftVersionId: version.id },
              })
            } else {
              // Existing lesson found
              // Rule 4: Stamp externalId on legacy rows that matched by title
              const baseUpdateData: any = {
                title: chItem.title,
                externalId: existingLesson.externalId || chItem.id,
              }

              const versions = existingLesson.versions || []
              const lastImportVersion = versions.find((v: any) => v.source === "import")
              const newerEditorVersion = versions.find(
                (v: any) =>
                  v.source === "editor" &&
                  (!lastImportVersion || new Date(v.createdAt) > new Date(lastImportVersion.createdAt))
              )

              if (newerEditorVersion) {
                if (publishImmediately) {
                  const updatedVersion = await tx.lessonVersion.create({
                    data: {
                      lessonId: existingLesson.id,
                      status: "published",
                      blocks: incomingBlocks as any,
                      schemaVersion: 1,
                      contentHash: incomingHash,
                      needsReview: false,
                      createdBy: userId,
                      note: `Published via package import (${incomingHash.slice(0, 8)})`,
                      source: "import",
                    },
                  })

                  await tx.lesson.update({
                    where: { id: existingLesson.id },
                    data: {
                      ...baseUpdateData,
                      currentPublishedVersionId: updatedVersion.id,
                      currentDraftVersionId: null,
                      content: JSON.stringify(incomingBlocks),
                      locked: false,
                    },
                  })
                } else {
                  // Conflict: create draft flagged for review
                  const conflictVersion = await tx.lessonVersion.create({
                    data: {
                      lessonId: existingLesson.id,
                      status: "draft",
                      blocks: incomingBlocks as any,
                      schemaVersion: 1,
                      contentHash: incomingHash,
                      needsReview: true,
                      createdBy: userId,
                      note: "Conflict: Imported package (needs review)",
                      source: "import",
                    },
                  })

                  await tx.lesson.update({
                    where: { id: existingLesson.id },
                    data: {
                      ...baseUpdateData,
                      currentDraftVersionId: conflictVersion.id,
                    },
                  })
                }
              } else if (existingLesson.locked && !isSoon && incomingBlocks.length > 0) {
                // Placeholder replacement: unlock and save content
                const unlockedVersion = await tx.lessonVersion.create({
                  data: {
                    lessonId: existingLesson.id,
                    status: publishImmediately ? "published" : "draft",
                    blocks: incomingBlocks as any,
                    schemaVersion: 1,
                    contentHash: incomingHash,
                    needsReview: false,
                    createdBy: userId,
                    note: "Unlocked placeholder from package import",
                    source: "import",
                  },
                })

                await tx.lesson.update({
                  where: { id: existingLesson.id },
                  data: {
                    ...baseUpdateData,
                    locked: false,
                    ...(publishImmediately
                      ? {
                          currentPublishedVersionId: unlockedVersion.id,
                          content: JSON.stringify(incomingBlocks),
                        }
                      : { currentDraftVersionId: unlockedVersion.id }),
                  },
                })
              } else {
                // Idempotent compare
                let existingBlocksHash = ""
                if (currentVersion && currentVersion.blocks) {
                  existingBlocksHash = computeContentHash(currentVersion.blocks)
                }

                if (existingBlocksHash !== incomingHash && incomingBlocks.length > 0) {
                  // Content changed: create new version
                  const updatedVersion = await tx.lessonVersion.create({
                    data: {
                      lessonId: existingLesson.id,
                      status: publishImmediately ? "published" : "draft",
                      blocks: incomingBlocks as any,
                      schemaVersion: 1,
                      contentHash: incomingHash,
                      needsReview: false,
                      createdBy: userId,
                      note: `Updated from package import (${incomingHash.slice(0, 8)})`,
                      source: "import",
                    },
                  })

                  await tx.lesson.update({
                    where: { id: existingLesson.id },
                    data: {
                      ...baseUpdateData,
                      locked: false,
                      ...(publishImmediately
                        ? {
                            currentPublishedVersionId: updatedVersion.id,
                            currentDraftVersionId: null,
                            content: JSON.stringify(incomingBlocks),
                          }
                        : { currentDraftVersionId: updatedVersion.id }),
                    },
                  })
                } else {
                  // Content identical: ensure published if publishImmediately is requested
                  const updateData: any = { ...baseUpdateData }
                  if (
                    publishImmediately &&
                    (!existingLesson.currentPublishedVersionId ||
                      !existingLesson.content ||
                      existingLesson.locked)
                  ) {
                    const targetVerId = currentVersion?.id
                    if (targetVerId) {
                      await tx.lessonVersion.update({
                        where: { id: targetVerId },
                        data: { status: "published" },
                      })
                      updateData.currentPublishedVersionId = targetVerId
                      updateData.currentDraftVersionId = null
                      updateData.content = JSON.stringify(incomingBlocks)
                      updateData.locked = false
                    }
                  }
                  await tx.lesson.update({
                    where: { id: existingLesson.id },
                    data: updateData,
                  })
                }
              }
            }
          }
        }

        // Rule 2: NEVER DELETE ORPHANS!
        // If archiveOrphans option is explicitly requested, set archivedAt
        if (archiveOrphans && orphans.length > 0) {
          const orphanIds = orphans.map((o) => o.id)
          await tx.lesson.updateMany({
            where: { id: { in: orphanIds } },
            data: { archivedAt: new Date() },
          })
        }

        return targetCourse
      },
      { maxWait: 25000, timeout: 60000 }
    )

    // Note: custom metadata (features, skills, projectCount, stats) is stored directly in Course.metadataJson

    // 8. Content Audit Log: Wrapped in try/catch so logging failure never fails the import
    try {
      await logContentAudit({
        entityId: course!.id,
        entityType: "COURSE",
        action: existingCourse ? "UPDATE" : "CREATE",
        details: {
          source: "TUTORIAL_PACKAGE_IMPORT",
          title: course!.title,
          summary,
        },
      })
    } catch (auditErr) {
      console.warn("Non-fatal: Content audit logging failed:", auditErr)
    }

    return {
      success: true,
      dryRun: false,
      courseId: course.id,
      slug: course.slug,
      title: course.title,
      summary,
      phases: phasePreviews,
      orphans: orphans.length > 0 ? orphans : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  } catch (error: any) {
    console.error("importTutorialPackage fatal error:", error)
    return {
      success: false,
      dryRun: Boolean(options.dryRun),
      title: payload?.meta?.title || "Unknown Tutorial",
      summary: {
        phasesCount: 0,
        chaptersCount: 0,
        created: 0,
        updated: 0,
        unlocked: 0,
        unchanged: 0,
        conflicts: 0,
        orphansCount: 0,
      },
      phases: [],
      error: error.message || "Internal server error during package import",
    }
  }
}
