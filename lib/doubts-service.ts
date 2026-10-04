import fs from "fs/promises"
import path from "path"

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

const DOUBTS_FILE_PATH = path.join(process.cwd(), "data", "doubts.json")

const SEED_DOUBTS: StudentDoubt[] = [
  {
    id: "doubt-1",
    studentId: "demo-student",
    studentName: "Aman Verma",
    studentEmail: "aman@example.com",
    subject: "Python & Data Science",
    topic: "NumPy Vectorization",
    questionText: "Why is vectorization faster than Python's native for-loops when operating on large arrays? How does SIMD hardware execution come into play here?",
    attachment: {
      name: "benchmark_comparison.png",
      url: "/batch-blue.svg",
      type: "image",
      size: "142 KB"
    },
    status: "ANSWERED",
    teacherAnswer: "NumPy arrays are stored in contiguous memory blocks with homogeneous types. Vectorized operations run compiled C loops directly utilizing CPU vector registers (SIMD - Single Instruction Multiple Data), avoiding Python's per-element type inspection, reference counting, and interpreter overhead!",
    teacherName: "Prof. Rajesh Sharma",
    answeredAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    upvotes: 6
  },
  {
    id: "doubt-2",
    studentId: "demo-student",
    studentName: "Priya Patel",
    studentEmail: "priya@example.com",
    subject: "Full-Stack Web Development",
    topic: "Next.js Server Components vs Client Components",
    questionText: "In Next.js App Router, if I pass a Server Component as children to a 'use client' component, does the child get rendered on the server or client?",
    status: "ANSWERED",
    teacherAnswer: "It gets rendered on the SERVER! When you pass a Server Component as a child (or prop) into a Client Component, Next.js executes the Server Component on the server first, serializes its output (RSC payload), and sends it to the client. The client component simply renders the received React tree without re-executing server code.",
    teacherName: "Dr. Ananya Roy",
    answeredAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    upvotes: 12
  },
  {
    id: "doubt-3",
    studentId: "demo-student",
    studentName: "Karan Johar",
    studentEmail: "karan@example.com",
    subject: "Data Structures & Algorithms",
    topic: "Dijkstra with Negative Weights",
    questionText: "Can we use Dijkstra's algorithm with negative edge weights if there are no negative cycles? See my graph diagram attached in the screenshot.",
    attachment: {
      name: "graph_dijkstra.png",
      url: "/batch-green.svg",
      type: "image",
      size: "210 KB"
    },
    status: "PENDING",
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    upvotes: 3
  }
]

let cachedDoubts: StudentDoubt[] | null = null
let lastReadTime = 0
const CACHE_TTL_MS = 2000

async function ensureDirectoryExists(filePath: string) {
  const dir = path.dirname(filePath)
  try {
    await fs.access(dir)
  } catch {
    await fs.mkdir(dir, { recursive: true })
  }
}

async function readDoubtsFile(): Promise<StudentDoubt[]> {
  const now = Date.now()
  if (cachedDoubts && now - lastReadTime < CACHE_TTL_MS) {
    return cachedDoubts
  }

  try {
    await ensureDirectoryExists(DOUBTS_FILE_PATH)
    const content = await fs.readFile(DOUBTS_FILE_PATH, "utf-8")
    cachedDoubts = JSON.parse(content)
    lastReadTime = now
    return cachedDoubts || []
  } catch {
    try {
      await fs.writeFile(DOUBTS_FILE_PATH, JSON.stringify(SEED_DOUBTS, null, 2), "utf-8")
      cachedDoubts = [...SEED_DOUBTS]
      lastReadTime = now
      return cachedDoubts
    } catch {
      return [...SEED_DOUBTS]
    }
  }
}

async function writeDoubtsFile(doubts: StudentDoubt[]): Promise<void> {
  await ensureDirectoryExists(DOUBTS_FILE_PATH)
  await fs.writeFile(DOUBTS_FILE_PATH, JSON.stringify(doubts, null, 2), "utf-8")
  cachedDoubts = doubts
  lastReadTime = Date.now()
}

export async function getAllDoubts(filter?: {
  studentId?: string
  status?: "PENDING" | "ANSWERED"
  subject?: string
}): Promise<StudentDoubt[]> {
  const doubts = await readDoubtsFile()
  return doubts.filter((d) => {
    if (filter?.studentId && d.studentId !== filter.studentId) return false
    if (filter?.status && d.status !== filter.status) return false
    if (filter?.subject && d.subject !== filter.subject) return false
    return true
  })
}

export async function getDoubtById(id: string): Promise<StudentDoubt | null> {
  const doubts = await readDoubtsFile()
  return doubts.find((d) => d.id === id) || null
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
  const doubts = await readDoubtsFile()
  const newDoubt: StudentDoubt = {
    id: `doubt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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

  doubts.unshift(newDoubt)
  await writeDoubtsFile(doubts)
  return newDoubt
}

export async function answerDoubt(
  id: string,
  teacherName: string,
  answerText: string
): Promise<StudentDoubt | null> {
  const doubts = await readDoubtsFile()
  const doubt = doubts.find((d) => d.id === id)
  if (!doubt) return null

  doubt.status = "ANSWERED"
  doubt.teacherName = teacherName
  doubt.teacherAnswer = answerText
  doubt.answeredAt = new Date().toISOString()

  await writeDoubtsFile(doubts)
  return doubt
}

export async function upvoteDoubt(id: string): Promise<StudentDoubt | null> {
  const doubts = await readDoubtsFile()
  const doubt = doubts.find((d) => d.id === id)
  if (!doubt) return null

  doubt.upvotes = (doubt.upvotes || 0) + 1
  await writeDoubtsFile(doubts)
  return doubt
}
