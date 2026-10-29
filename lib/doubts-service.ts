import { prisma } from "@/lib/prisma"
import { isDbPersist } from "@/lib/storage/persist-backend"
import fs from "fs"
import path from "path"

const DOUBTS_FILE = path.join(process.cwd(), "data", "doubts.json")

function readDoubtsFs(): StudentDoubt[] {
  try {
    if (!fs.existsSync(DOUBTS_FILE)) return []
    const content = fs.readFileSync(DOUBTS_FILE, "utf-8")
    return JSON.parse(content)
  } catch {
    return []
  }
}

function writeDoubtsFs(doubts: StudentDoubt[]): void {
  const dir = path.dirname(DOUBTS_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(DOUBTS_FILE, JSON.stringify(doubts, null, 2), "utf-8")
}

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
  if (!isDbPersist()) {
    let list = readDoubtsFs()
    if (filter?.studentId) list = list.filter((d) => d.studentId === filter.studentId)
    if (filter?.status) list = list.filter((d) => d.status === filter.status)
    if (filter?.subject) list = list.filter((d) => d.subject === filter.subject)
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

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
  if (!isDbPersist()) {
    const list = readDoubtsFs()
    return list.find((d) => d.id === id) || null
  }
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
  if (!isDbPersist()) {
    const list = readDoubtsFs()
    const newDoubt: StudentDoubt = {
      id: `doubt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      studentId: data.studentId,
      studentName: data.studentName,
      studentEmail: data.studentEmail,
      subject: data.subject,
      topic: data.topic,
      questionText: data.questionText,
      attachment: data.attachment,
      status: "PENDING",
      createdAt: new Date().toISOString(),
      upvotes: 0,
    }
    list.unshift(newDoubt)
    writeDoubtsFs(list)
    return newDoubt
  }

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
  if (!isDbPersist()) {
    const list = readDoubtsFs()
    const doubt = list.find((d) => d.id === id)
    if (!doubt) return null
    doubt.status = "ANSWERED"
    doubt.teacherName = teacherName
    doubt.teacherAnswer = answerText
    doubt.answeredAt = new Date().toISOString()
    writeDoubtsFs(list)
    return doubt
  }

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
  if (!isDbPersist()) {
    const list = readDoubtsFs()
    const doubt = list.find((d) => d.id === id)
    if (!doubt) return null
    doubt.upvotes = (doubt.upvotes || 0) + 1
    writeDoubtsFs(list)
    return doubt
  }

  const existing = await prisma.doubt.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return null

  // Increment in the database so two concurrent upvotes both count.
  const row = await prisma.doubt.update({
    where: { id },
    data: { upvotes: { increment: 1 } },
  })

  return toStudentDoubt(row)
}
