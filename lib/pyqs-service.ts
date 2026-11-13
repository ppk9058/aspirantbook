import { prisma } from "@/lib/prisma"
import { requireRole, getCurrentUserContext } from "@/lib/auth/rbac"

export interface CreateCategoryInput {
  name: string
  slug?: string
  fullName?: string
  description?: string
  iconUrl?: string
  badgeColor?: string
  order?: number
  isPublished?: boolean
}

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {
  id: string
}

export interface CreateSubExamInput {
  categoryId: string
  name: string
  slug?: string
  description?: string
  order?: number
  isPublished?: boolean
}

export interface UpdateSubExamInput extends Partial<CreateSubExamInput> {
  id: string
}

export interface CreatePaperInput {
  categoryId: string
  subExamId?: string
  title: string
  slug?: string
  year: number
  stage?: string
  shift?: string
  subject?: string
  examDate?: string
  durationMin?: number
  totalMarks?: number
  totalQuestions?: number
  languages?: string[]
  paperPdfUrl: string
  solutionPdfUrl?: string
  pdfFileSizeKb?: number
  pageCount?: number
  accessType?: "FREE" | "PAID" | "PASS_ONLY"
  unlockPrice?: number
  isPassIncluded?: boolean
  cbtTestId?: string
  hasCbtMode?: boolean
  status?: "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "ARCHIVED"
  isGated?: boolean
  previewPercentage?: number
  seoMode?: "preview" | "bot-full"
  gateTitle?: string | null
  gateSubtitle?: string | null
}

export interface UpdatePaperInput extends Partial<CreatePaperInput> {
  id: string
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// ─── INITIAL SEEDER (Bootstraps standard categories & sub-exams without fake papers) ────────────
let isDefaultPyqDataEnsured = false

export async function ensureDefaultPyqData() {
  if (isDefaultPyqDataEnsured) {
    return
  }
  const standardExamHeads = [
    {
      name: "BPSC TRE",
      slug: "bpsc-tre",
      fullName: "Bihar Teacher Recruitment Examination",
      description: "Official Previous Year Papers for TRE Primary, Middle, Secondary and Higher Secondary.",
      badgeColor: "#ea580c",
      order: 1,
      subExams: [
        { name: "TRE Primary (Class 1-5)", slug: "tre-prt", order: 1 },
        { name: "TRE Middle School (Class 6-8)", slug: "tre-tgt-mid", order: 2 },
        { name: "TRE Secondary (Class 9-10)", slug: "tre-tgt", order: 3 },
        { name: "TRE Higher Secondary (Class 11-12)", slug: "tre-pgt", order: 4 },
      ],
    },
    {
      name: "BPSC",
      slug: "bpsc",
      fullName: "Bihar Public Service Commission",
      description: "Official Previous Year Papers for 70th, 69th, 68th, 67th CCE, CDPO, AEDO & TRE.",
      badgeColor: "#f97316",
      order: 2,
      subExams: [
        { name: "BPSC CCE (Civil Services)", slug: "cce", order: 1 },
        { name: "BPSC CDPO (Child Development Officer)", slug: "cdpo", order: 2 },
        { name: "BPSC AEDO (Assistant Education Officer)", slug: "aedo", order: 3 },
        { name: "BPSC Judicial Services", slug: "judicial", order: 4 },
      ],
    },
    {
      name: "UPSC",
      slug: "upsc",
      fullName: "Union Public Service Commission",
      description: "Civil Services (CSE) Prelims GS 1 & CSAT, Mains Optional and Essay Papers.",
      badgeColor: "#4f46e5",
      order: 3,
      subExams: [
        { name: "UPSC CSE Prelims (GS + CSAT)", slug: "cse-prelims", order: 1 },
        { name: "UPSC CSE Mains (GS 1-4 & Essay)", slug: "cse-mains", order: 2 },
        { name: "UPSC CDS", slug: "cds", order: 3 },
        { name: "UPSC NDA", slug: "nda", order: 4 },
      ],
    },
    {
      name: "UPPSC",
      slug: "uppsc",
      fullName: "Uttar Pradesh Public Service Commission",
      description: "Combined State / Upper Subordinate Services (PCS), RO / ARO & BEO Papers.",
      badgeColor: "#0284c7",
      order: 4,
      subExams: [
        { name: "UPPSC Combined State PCS", slug: "pcs", order: 1 },
        { name: "UPPSC RO / ARO", slug: "ro-aro", order: 2 },
        { name: "UPPSC BEO (Block Education Officer)", slug: "beo", order: 3 },
      ],
    },
    {
      name: "CBSE / School Boards",
      slug: "cbse-school-boards",
      fullName: "CBSE and School Board Assessment Papers",
      description: "School and board exemplar and past assessment papers",
      badgeColor: "#10b981",
      order: 5,
      subExams: [
        { name: "Class 8", slug: "class-8", order: 1 },
        { name: "Class 9", slug: "class-9", order: 2 },
        { name: "Class 10", slug: "class-10", order: 3 },
        { name: "Class 11", slug: "class-11", order: 4 },
        { name: "Class 12", slug: "class-12", order: 5 },
      ],
    },
    {
      name: "CBSE",
      slug: "cbse",
      fullName: "Central Board of Secondary Education",
      description: "Official CBSE Board Exam Past 10 Years Question Papers with Marking Scheme.",
      badgeColor: "#06b6d4",
      order: 6,
      subExams: [
        { name: "Class 8", slug: "class-8", order: 1 },
        { name: "Class 9", slug: "class-9", order: 2 },
        { name: "Class 10", slug: "class-10", order: 3 },
        { name: "Class 11", slug: "class-11", order: 4 },
        { name: "Class 12", slug: "class-12", order: 5 },
      ],
    },
    {
      name: "Bihar Board",
      slug: "bihar-board",
      fullName: "Bihar School Examination Board (BSEB)",
      description: "Official BSEB Matric (10th) and Intermediate (12th) previous year question booklets.",
      badgeColor: "#8b5cf6",
      order: 7,
      subExams: [
        { name: "Class 8", slug: "class-8", order: 1 },
        { name: "Class 9", slug: "class-9", order: 2 },
        { name: "Class 10", slug: "class-10", order: 3 },
        { name: "Class 11", slug: "class-11", order: 4 },
        { name: "Class 12", slug: "class-12", order: 5 },
      ],
    },
  ]

  // Fast pre-check: batch fetch existing categories & their sub-exams in a single query
  const existingCategories = await prisma.pyqCategory.findMany({
    where: {
      OR: [
        { slug: { in: standardExamHeads.map((h) => h.slug) } },
        { name: { in: standardExamHeads.map((h) => h.name) } },
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      subExams: {
        select: { slug: true },
      },
    },
  })

  const catMap = new Map<string, { id: string; subExamSlugs: Set<string> }>()
  for (const cat of existingCategories) {
    const entry = {
      id: cat.id,
      subExamSlugs: new Set(cat.subExams.map((s) => s.slug)),
    }
    catMap.set(cat.slug, entry)
    catMap.set(cat.name, entry)
  }

  const allExist = standardExamHeads.every((head) => {
    const found = catMap.get(head.slug) || catMap.get(head.name)
    if (!found) return false
    return head.subExams.every((sub) => found.subExamSlugs.has(sub.slug))
  })

  if (allExist) {
    isDefaultPyqDataEnsured = true
    return
  }

  // Only create missing categories or sub-exams if any are absent
  for (const head of standardExamHeads) {
    let catEntry = catMap.get(head.slug) || catMap.get(head.name)
    let catId = catEntry?.id

    if (!catId) {
      const created = await prisma.pyqCategory.create({
        data: {
          name: head.name,
          slug: head.slug,
          fullName: head.fullName,
          description: head.description,
          badgeColor: head.badgeColor,
          order: head.order,
          isPublished: true,
        },
      })
      catId = created.id
      catEntry = { id: catId, subExamSlugs: new Set() }
      catMap.set(head.slug, catEntry)
      catMap.set(head.name, catEntry)
    }

    if (catId && catEntry) {
      for (const sub of head.subExams) {
        if (!catEntry.subExamSlugs.has(sub.slug)) {
          await prisma.pyqSubExam.create({
            data: {
              categoryId: catId,
              name: sub.name,
              slug: sub.slug,
              order: sub.order,
              isPublished: true,
            },
          })
          catEntry.subExamSlugs.add(sub.slug)
        }
      }
    }
  }

  isDefaultPyqDataEnsured = true
}

// ─── CATEGORY OPERATIONS (Teacher & Admin Read, Admin Create/Update/Delete) ───

export async function getAllCategories(includeUnpublished = false) {
  await ensureDefaultPyqData()
  return prisma.pyqCategory.findMany({
    where: includeUnpublished ? {} : { isPublished: true },
    orderBy: { order: "asc" },
    include: {
      subExams: {
        orderBy: { order: "asc" },
      },
      _count: {
        select: { papers: true, subExams: true },
      },
    },
  })
}

export async function getCategoryBySlug(slug: string) {
  await ensureDefaultPyqData()
  return prisma.pyqCategory.findUnique({
    where: { slug },
    include: {
      subExams: {
        orderBy: { order: "asc" },
      },
      papers: {
        where: { status: "PUBLISHED" },
        orderBy: [{ year: "desc" }, { createdAt: "desc" }],
      },
    },
  })
}

export async function createCategory(input: CreateCategoryInput) {
  // Enforce Teacher or Admin access
  await requireRole(["ADMIN", "TEACHER"])

  const slug = input.slug ? slugify(input.slug) : slugify(input.name)
  return prisma.pyqCategory.create({
    data: {
      name: input.name.trim(),
      slug,
      fullName: input.fullName?.trim() || null,
      description: input.description?.trim() || null,
      iconUrl: input.iconUrl || null,
      badgeColor: input.badgeColor || "#f97316",
      order: input.order ?? 0,
      isPublished: input.isPublished ?? true,
    },
  })
}

export async function updateCategory(input: UpdateCategoryInput) {
  await requireRole(["ADMIN", "TEACHER"])

  const data: any = {}
  if (input.name !== undefined) data.name = input.name.trim()
  if (input.slug !== undefined) data.slug = slugify(input.slug)
  if (input.fullName !== undefined) data.fullName = input.fullName?.trim() || null
  if (input.description !== undefined) data.description = input.description?.trim() || null
  if (input.iconUrl !== undefined) data.iconUrl = input.iconUrl || null
  if (input.badgeColor !== undefined) data.badgeColor = input.badgeColor
  if (input.order !== undefined) data.order = input.order
  if (input.isPublished !== undefined) data.isPublished = input.isPublished

  return prisma.pyqCategory.update({
    where: { id: input.id },
    data,
  })
}

export async function deleteCategory(id: string) {
  await requireRole(["ADMIN"]) // Deleting major exam is Admin only
  return prisma.pyqCategory.delete({
    where: { id },
  })
}

// ─── SUB-EXAM OPERATIONS ──────────────────────────────────────────────────

export async function createSubExam(input: CreateSubExamInput) {
  await requireRole(["ADMIN", "TEACHER"])

  const slug = input.slug ? slugify(input.slug) : slugify(input.name)
  return prisma.pyqSubExam.create({
    data: {
      categoryId: input.categoryId,
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || null,
      order: input.order ?? 0,
      isPublished: input.isPublished ?? true,
    },
  })
}

export async function updateSubExam(input: UpdateSubExamInput) {
  await requireRole(["ADMIN", "TEACHER"])

  const data: any = {}
  if (input.name !== undefined) data.name = input.name.trim()
  if (input.slug !== undefined) data.slug = slugify(input.slug)
  if (input.description !== undefined) data.description = input.description?.trim() || null
  if (input.order !== undefined) data.order = input.order
  if (input.isPublished !== undefined) data.isPublished = input.isPublished

  return prisma.pyqSubExam.update({
    where: { id: input.id },
    data,
  })
}

export async function deleteSubExam(id: string) {
  await requireRole(["ADMIN", "TEACHER"])
  return prisma.pyqSubExam.delete({
    where: { id },
  })
}

// ─── PYQ PAPER OPERATIONS ─────────────────────────────────────────────────

export async function getAllPapers(options?: {
  categoryId?: string
  subExamId?: string
  year?: number
  stage?: string
  accessType?: string
  includeAllStatuses?: boolean
  creatorId?: string
}) {
  await ensureDefaultPyqData()
  const where: any = {}

  if (options?.categoryId) where.categoryId = options.categoryId
  if (options?.subExamId) where.subExamId = options.subExamId
  if (options?.year) where.year = options.year
  if (options?.stage) where.stage = options.stage
  if (options?.accessType) where.accessType = options.accessType
  if (options?.creatorId) where.creatorId = options.creatorId

  if (!options?.includeAllStatuses) {
    where.status = "PUBLISHED"
  }

  const papers = await prisma.pyqPaper.findMany({
    where,
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    include: {
      category: { select: { name: true, slug: true, badgeColor: true } },
      subExam: { select: { name: true, slug: true } },
      _count: { select: { leads: true, unlocks: true } },
    },
  })

  return papers
}

export async function getPaperById(id: string) {
  const paper = await prisma.pyqPaper.findUnique({
    where: { id },
    include: {
      category: true,
      subExam: true,
      _count: { select: { leads: true, unlocks: true } },
    },
  })

  return paper
}

export async function createPaper(input: CreatePaperInput) {
  const user = await requireRole(["ADMIN", "TEACHER"])

  const baseSlug = input.slug ? slugify(input.slug) : slugify(input.title)
  const uniqueSlug = `${baseSlug}-${input.year}-${Date.now().toString().slice(-4)}`
  const subjectValue = input.subject?.trim() || null

  const paper = await prisma.pyqPaper.create({
    data: {
      categoryId: input.categoryId,
      subExamId: input.subExamId || null,
      creatorId: user.userId || "admin-system",
      title: input.title.trim(),
      slug: uniqueSlug,
      year: Number(input.year),
      stage: input.stage || "PRELIMS",
      shift: input.shift || null,
      examDate: input.examDate ? new Date(input.examDate) : null,
      durationMin: Number(input.durationMin) || 120,
      totalMarks: Number(input.totalMarks) || 150,
      totalQuestions: Number(input.totalQuestions) || 150,
      languages: input.languages || ["Hindi", "English"],
      paperPdfUrl: input.paperPdfUrl,
      solutionPdfUrl: input.solutionPdfUrl || null,
      pdfFileSizeKb: input.pdfFileSizeKb !== undefined && input.pdfFileSizeKb !== null ? Number(input.pdfFileSizeKb) : null,
      pageCount: input.pageCount || null,
      accessType: input.accessType || "FREE",
      unlockPrice: input.accessType === "PAID" ? Number(input.unlockPrice) || 49 : 0,
      isPassIncluded: input.isPassIncluded ?? true,
      cbtTestId: input.cbtTestId || null,
      hasCbtMode: input.hasCbtMode ?? false,
      status: input.status || "PUBLISHED",
      // B4: `subject` is a real Prisma column. The old code wrote it with a
      // raw UPDATE wrapped in a bare `catch {}`, so a failed subject write was
      // invisible and the response still claimed the new value.
      subject: subjectValue,
    },
  })

  return paper
}

export async function updatePaper(input: UpdatePaperInput) {
  await requireRole(["ADMIN", "TEACHER"])

  const data: any = {}
  if (input.categoryId !== undefined) data.categoryId = input.categoryId
  if (input.subExamId !== undefined) data.subExamId = input.subExamId || null
  if (input.title !== undefined) data.title = input.title.trim()
  if (input.year !== undefined) data.year = Number(input.year)
  if (input.stage !== undefined) data.stage = input.stage
  if (input.shift !== undefined) data.shift = input.shift || null
  if (input.examDate !== undefined) data.examDate = input.examDate ? new Date(input.examDate) : null
  if (input.durationMin !== undefined) data.durationMin = Number(input.durationMin)
  if (input.totalMarks !== undefined) data.totalMarks = Number(input.totalMarks)
  if (input.totalQuestions !== undefined) data.totalQuestions = Number(input.totalQuestions)
  if (input.languages !== undefined) data.languages = input.languages
  if (input.paperPdfUrl !== undefined) data.paperPdfUrl = input.paperPdfUrl
  if (input.solutionPdfUrl !== undefined) data.solutionPdfUrl = input.solutionPdfUrl || null
  if (input.pdfFileSizeKb !== undefined) data.pdfFileSizeKb = input.pdfFileSizeKb !== null ? Number(input.pdfFileSizeKb) : null
  if (input.pageCount !== undefined) data.pageCount = input.pageCount || null
  if (input.accessType !== undefined) {
    data.accessType = input.accessType
    data.unlockPrice = input.accessType === "PAID" ? Number(input.unlockPrice) || 49 : 0
  }
  if (input.isPassIncluded !== undefined) data.isPassIncluded = input.isPassIncluded
  if (input.cbtTestId !== undefined) data.cbtTestId = input.cbtTestId || null
  if (input.hasCbtMode !== undefined) data.hasCbtMode = input.hasCbtMode
  if (input.status !== undefined) data.status = input.status
  if (input.isGated !== undefined) data.isGated = input.isGated
  if (input.previewPercentage !== undefined) data.previewPercentage = Math.max(0, Math.min(100, Math.round(Number(input.previewPercentage))))
  if (input.seoMode !== undefined) data.seoMode = input.seoMode
  if (input.gateTitle !== undefined) data.gateTitle = input.gateTitle
  if (input.gateSubtitle !== undefined) data.gateSubtitle = input.gateSubtitle
  // B4: plain column write, so a failure surfaces instead of being swallowed.
  if (input.subject !== undefined) data.subject = input.subject?.trim() || null

  return prisma.pyqPaper.update({
    where: { id: input.id },
    data,
  })
}

/**
 * B4: deleting a paper used to hard-delete the row, and `onDelete: Cascade` took
 * every PyqUnlock (a paid entitlement) and PyqLeadCapture with it. A paper that
 * anyone bought must never be destroyed: it is archived instead, so the
 * purchase keeps working and the paper disappears from public listings.
 *
 * A paper with no unlocks and no captured leads is still deleted for real,
 * which is what an admin expects for a mistake uploaded minutes ago.
 */
export async function deletePaper(id: string): Promise<{ id: string; archived: boolean }> {
  await requireRole(["ADMIN", "TEACHER"])

  const paper = await prisma.pyqPaper.findUnique({
    where: { id },
    select: { _count: { select: { unlocks: true, leads: true } } },
  })
  if (!paper) throw new Error("Paper not found")

  const hasDependents = paper._count.unlocks > 0 || paper._count.leads > 0
  if (hasDependents) {
    await prisma.pyqPaper.update({
      where: { id },
      data: { status: "ARCHIVED" },
    })
    return { id, archived: true }
  }

  await prisma.pyqPaper.delete({ where: { id } })
  return { id, archived: false }
}

// ─── LEADS & UNLOCK ANALYTICS ─────────────────────────────────────────────

export async function recordPhoneLead(paperId: string, phoneNumber: string, userId?: string) {
  const cleanPhone = phoneNumber.trim().replace(/\D/g, "")
  if (cleanPhone.length < 10) throw new Error("Invalid phone number")

  // Increment download counter
  await prisma.pyqPaper.update({
    where: { id: paperId },
    data: { downloadCount: { increment: 1 } },
  })

  return prisma.pyqLeadCapture.create({
    data: {
      paperId,
      phoneNumber: cleanPhone,
      userId: userId || null,
      source: "PDF_DOWNLOAD",
    },
  })
}

export async function getLeadsList(creatorId?: string) {
  const user = await requireRole(["ADMIN", "TEACHER"])
  const filterCreatorId = creatorId || (user.role === "TEACHER" ? user.userId : undefined)

  return prisma.pyqLeadCapture.findMany({
    where: filterCreatorId
      ? {
          paper: {
            creatorId: filterCreatorId,
          },
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      paper: {
        select: {
          title: true,
          year: true,
          creatorId: true,
          category: { select: { name: true } },
        },
      },
    },
  })
}
