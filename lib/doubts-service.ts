import { prisma } from "@/lib/prisma"

export interface DoubtAttachment {
  name: string
  url: string
  type: "image" | "pdf"
  size?: string
}

export interface StudentDoubt {
  id: string
  studentId: string
  studentName: string
  studentEmail?: string
  subject: string
  topic?: string
  questionText: string
  attachment?: DoubtAttachment
  status: "PENDING" | "ANSWERED"
  teacherAnswer?: string
  teacherName?: string
  answeredAt?: string
  createdAt: string
  upvotes?: number
}

/**
 * C2: doubts used to live in `data/doubts.json`, read into a module-level cache
 * and written with `fs.writeFile`. On a serverless or multi-instance deployment
 * that file is per-instance and read-only, so a doubt a student posted was lost
 * (or visible on only one instance), and the file shipped with three invented
 * "demo" doubts that every teacher saw as real student questions.
 *
 * The rows are now in Postgres (`Doubt`), with no seed data and no cache.
 */

type DoubtRow = {
  id: string
  studentId: string | null
  studentName: string
  studentEmail: string | null
  subject: string
  topic: string | null
  questionText: string
  attachmentName: string | null
  attachmentUrl: string | null
  attachmentType: string | null
  attachmentSize: string | null
  status: string
  teacherAnswer: string | null
  teacherName: string | null
  answeredAt: Date | null
  upvotes: number
  createdAt: Date
}

function toStudentDoubt(row: DoubtRow): StudentDoubt {
  const attachment: DoubtAttachment | undefined =
    row.attachmentUrl && row.attachmentName
      ? {
          name: row.attachmentName,
          url: row.attachmentUrl,
          type: row.attachmentType === "pdf" ? "pdf" : "image",
          size: row.attachmentSize ?? undefined,
        }
      : undefined

  return {
    id: row.id,
    studentId: row.studentId ?? "",
    studentName: row.studentName,
    studentEmail: row.studentEmail ?? undefined,
    subject: row.subject,
    topic: row.topic ?? undefined,
    questionText: row.questionText,
    attachment,
    status: row.status === "ANSWERED" ? "ANSWERED" : "PENDING",
    teacherAnswer: row.teacherAnswer ?? undefined,
    teacherName: row.teacherName ?? undefined,
    answeredAt: row.answeredAt ? row.answeredAt.toISOString() : undefined,
    createdAt: row.createdAt.toISOString(),
    upvotes: row.upvotes,
  }
}

export async function getAllDoubts(filter?: {
  studentId?: string
  status?: "PENDING" | "ANSWERED"
  subject?: string
}): Promise<StudentDoubt[]> {
  const rows = await prisma.doubt.findMany({
    where: {
      ...(filter?.studentId ? { studentId: filter.studentId } : {}),
      ...(filter?.status ? { status: filter.status } : {}),
      ...(filter?.subject ? { subject: filter.subject } : {}),
    },
    orderBy: { createdAt: "desc" },
  })

  return rows.map(toStudentDoubt)
}

export async function getDoubtById(id: string): Promise<StudentDoubt | null> {
  const row = await prisma.doubt.findUnique({ where: { id } })
  return row ? toStudentDoubt(row) : null
}

export async function createDoubt(data: {
  studentId: string
  studentName: string
  studentEmail?: string
  subject: string
  topic?: string
  questionText: string
  attachment?: DoubtAttachment
}): Promise<StudentDoubt> {
  // The client sends whatever id is in its session; store the row even when that
  // user no longer exists rather than failing the question outright.
  const student = data.studentId
    ? await prisma.user.findUnique({ where: { id: data.studentId }, select: { id: true } })
    : null

  const row = await prisma.doubt.create({
    data: {
      studentId: student?.id ?? null,
      studentName: data.studentName,
      studentEmail: data.studentEmail ?? null,
      subject: data.subject,
      topic: data.topic ?? null,
      questionText: data.questionText,
      attachmentName: data.attachment?.name ?? null,
      attachmentUrl: data.attachment?.url ?? null,
      attachmentType: data.attachment?.type ?? null,
      attachmentSize: data.attachment?.size ?? null,
      status: "PENDING",
      upvotes: 0,
    },
  })

  return toStudentDoubt(row)
}

export async function answerDoubt(
  id: string,
  teacherName: string,
  answerText: string
): Promise<StudentDoubt | null> {
  const existing = await prisma.doubt.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return null

  const row = await prisma.doubt.update({
    where: { id },
    data: {
      status: "ANSWERED",
      teacherName,
      teacherAnswer: answerText,
      answeredAt: new Date(),
    },
  })

  return toStudentDoubt(row)
}

export async function upvoteDoubt(id: string): Promise<StudentDoubt | null> {
  const existing = await prisma.doubt.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return null

  // Increment in the database so two concurrent upvotes both count.
  const row = await prisma.doubt.update({
    where: { id },
    data: { upvotes: { increment: 1 } },
  })

  return toStudentDoubt(row)
}
