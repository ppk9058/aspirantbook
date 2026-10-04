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

// ─── INITIAL SEEDER (Bootstraps standard categories & sub-exams) ────────────
export async function ensureDefaultPyqData() {
  const existingCount = await prisma.pyqCategory.count()
  if (existingCount > 0) return

  // Seed BPSC
  const bpsc = await prisma.pyqCategory.create({
    data: {
      name: "BPSC",
      slug: "bpsc",
      fullName: "Bihar Public Service Commission",
      description: "Official Previous Year Papers for 70th, 69th, 68th, 67th CCE, CDPO, AEDO & TRE.",
      badgeColor: "#ea580c",
      order: 1,
      isPublished: true,
      subExams: {
        create: [
          { name: "BPSC CCE (Civil Services)", slug: "cce", order: 1 },
          { name: "BPSC CDPO (Child Development Officer)", slug: "cdpo", order: 2 },
          { name: "BPSC AEDO (Assistant Education Officer)", slug: "aedo", order: 3 },
          { name: "BPSC TRE (Teacher Recruitment Exam)", slug: "tre", order: 4 },
          { name: "BPSC Judicial Services", slug: "judicial", order: 5 },
        ],
      },
    },
  })

  // Seed UPSC
  await prisma.pyqCategory.create({
    data: {
      name: "UPSC",
      slug: "upsc",
      fullName: "Union Public Service Commission",
      description: "Civil Services (CSE) Prelims GS 1 & CSAT, Mains Optional and Essay Papers.",
      badgeColor: "#4f46e5",
      order: 2,
      isPublished: true,
      subExams: {
        create: [
          { name: "UPSC CSE Prelims (GS + CSAT)", slug: "cse-prelims", order: 1 },
          { name: "UPSC CSE Mains (GS 1-4 & Essay)", slug: "cse-mains", order: 2 },
          { name: "UPSC CDS", slug: "cds", order: 3 },
          { name: "UPSC NDA", slug: "nda", order: 4 },
        ],
      },
    },
  })

  // Seed UPPSC
  await prisma.pyqCategory.create({
    data: {
      name: "UPPSC",
      slug: "uppsc",
      fullName: "Uttar Pradesh Public Service Commission",
      description: "Combined State / Upper Subordinate Services (PCS), RO / ARO & BEO Papers.",
      badgeColor: "#0284c7",
      order: 3,
      isPublished: true,
      subExams: {
        create: [
          { name: "UPPSC Combined State PCS", slug: "pcs", order: 1 },
          { name: "UPPSC RO / ARO", slug: "ro-aro", order: 2 },
          { name: "UPPSC BEO (Block Education Officer)", slug: "beo", order: 3 },
        ],
      },
    },
  })

  // Seed sample papers for BPSC
  const cceSubExam = await prisma.pyqSubExam.findFirst({
    where: { categoryId: bpsc.id, slug: "cce" },
  })

  await prisma.pyqPaper.createMany({
    data: [
      {
        categoryId: bpsc.id,
        subExamId: cceSubExam?.id,
        title: "69th BPSC Prelims Official Question Paper (Re-Exam)",
        slug: "69th-bpsc-prelims-official-re-exam-2024",
        year: 2024,
        stage: "PRELIMS",
        shift: "Shift 1 (12:00 PM - 2:00 PM)",
        durationMin: 120,
        totalMarks: 150,
        totalQuestions: 150,
        languages: ["English", "Hindi"],
        paperPdfUrl: "/uploads/pyq/bpsc-69th-prelims-2024.pdf",
        solutionPdfUrl: "/uploads/pyq/bpsc-69th-solutions-2024.pdf",
        pdfFileSizeKb: 3450,
        pageCount: 32,
        accessType: "FREE",
        unlockPrice: 0,
        isPassIncluded: true,
        hasCbtMode: true,
        status: "PUBLISHED",
        downloadCount: 1420,
        attemptCount: 890,
      },
      {
        categoryId: bpsc.id,
        subExamId: cceSubExam?.id,
        title: "68th BPSC CCE Prelims Official Paper with Detailed Solutions",
        slug: "68th-bpsc-prelims-official-2023",
        year: 2023,
        stage: "PRELIMS",
        shift: "Morning Shift",
        durationMin: 120,
        totalMarks: 150,
        totalQuestions: 150,
        languages: ["English", "Hindi"],
        paperPdfUrl: "/uploads/pyq/bpsc-68th-prelims-2023.pdf",
        solutionPdfUrl: "/uploads/pyq/bpsc-68th-solutions-2023.pdf",
        pdfFileSizeKb: 2890,
        pageCount: 28,
        accessType: "PAID",
        unlockPrice: 49,
        isPassIncluded: true,
        hasCbtMode: true,
        status: "PUBLISHED",
        downloadCount: 980,
        attemptCount: 654,
      },
      {
        categoryId: bpsc.id,
        subExamId: cceSubExam?.id,
        title: "67th BPSC CCE Prelims Re-Exam Paper",
        slug: "67th-bpsc-prelims-official-2022",
        year: 2022,
        stage: "PRELIMS",
        shift: "Single Shift",
        durationMin: 120,
        totalMarks: 150,
        totalQuestions: 150,
        languages: ["English", "Hindi"],
        paperPdfUrl: "/uploads/pyq/bpsc-67th-prelims-2022.pdf",
        solutionPdfUrl: "/uploads/pyq/bpsc-67th-solutions-2022.pdf",
        pdfFileSizeKb: 3120,
        pageCount: 30,
        accessType: "PAID",
        unlockPrice: 49,
        isPassIncluded: true,
        hasCbtMode: true,
        status: "PUBLISHED",
        downloadCount: 2130,
        attemptCount: 1420,
      },
    ],
  })
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
}) {
  await ensureDefaultPyqData()
  const where: any = {}

  if (options?.categoryId) where.categoryId = options.categoryId
  if (options?.subExamId) where.subExamId = options.subExamId
  if (options?.year) where.year = options.year
  if (options?.stage) where.stage = options.stage
  if (options?.accessType) where.accessType = options.accessType

  if (!options?.includeAllStatuses) {
    where.status = "PUBLISHED"
  }

  return prisma.pyqPaper.findMany({
    where,
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    include: {
      category: { select: { name: true, slug: true, badgeColor: true } },
      subExam: { select: { name: true, slug: true } },
      _count: { select: { leads: true, unlocks: true } },
    },
  })
}

export async function getPaperById(id: string) {
  return prisma.pyqPaper.findUnique({
    where: { id },
    include: {
      category: true,
      subExam: true,
      _count: { select: { leads: true, unlocks: true } },
    },
  })
}

export async function createPaper(input: CreatePaperInput) {
  const user = await requireRole(["ADMIN", "TEACHER"])

  const baseSlug = input.slug ? slugify(input.slug) : slugify(input.title)
  const uniqueSlug = `${baseSlug}-${input.year}-${Date.now().toString().slice(-4)}`

  return prisma.pyqPaper.create({
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
      pdfFileSizeKb: input.pdfFileSizeKb || null,
      pageCount: input.pageCount || null,
      accessType: input.accessType || "FREE",
      unlockPrice: input.accessType === "PAID" ? Number(input.unlockPrice) || 49 : 0,
      isPassIncluded: input.isPassIncluded ?? true,
      cbtTestId: input.cbtTestId || null,
      hasCbtMode: input.hasCbtMode ?? false,
      status: input.status || "PUBLISHED",
    },
  })
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
  if (input.pdfFileSizeKb !== undefined) data.pdfFileSizeKb = input.pdfFileSizeKb || null
  if (input.pageCount !== undefined) data.pageCount = input.pageCount || null
  if (input.accessType !== undefined) {
    data.accessType = input.accessType
    data.unlockPrice = input.accessType === "PAID" ? Number(input.unlockPrice) || 49 : 0
  }
  if (input.isPassIncluded !== undefined) data.isPassIncluded = input.isPassIncluded
  if (input.cbtTestId !== undefined) data.cbtTestId = input.cbtTestId || null
  if (input.hasCbtMode !== undefined) data.hasCbtMode = input.hasCbtMode
  if (input.status !== undefined) data.status = input.status

  return prisma.pyqPaper.update({
    where: { id: input.id },
    data,
  })
}

export async function deletePaper(id: string) {
  await requireRole(["ADMIN", "TEACHER"])
  return prisma.pyqPaper.delete({
    where: { id },
  })
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

export async function getLeadsList() {
  await requireRole(["ADMIN", "TEACHER"])
  return prisma.pyqLeadCapture.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      paper: {
        select: {
          title: true,
          year: true,
          category: { select: { name: true } },
        },
      },
    },
  })
}
