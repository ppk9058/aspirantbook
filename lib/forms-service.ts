import { Prisma } from "@prisma/client"
import path from "path"

import { prisma } from "@/lib/prisma"
import { isDbPersist } from "@/lib/storage/persist-backend"
import { readJsonArray, writeJsonArray } from "@/lib/storage/legacy-json-store"
import { FormField, FormDefinition, FormSubmission, FORM_DEFINITIONS } from "./forms-config"

const FORMS_FILE = path.join(process.cwd(), "data", "form-submissions.json")

function readFormsFs(): FormSubmission[] {
  return readJsonArray<FormSubmission>(FORMS_FILE)
}

function writeFormsFs(submissions: FormSubmission[]): void {
  writeJsonArray(FORMS_FILE, submissions)
}

export type { FormField, FormDefinition, FormSubmission }
export { FORM_DEFINITIONS }

/**
 * C2: submissions were stored in `data/form-submissions.json` with
 * `fs.writeFile` after reading the whole file back. That file is per-instance
 * and read-only on serverless, so a submitted admission or scholarship form
 * could silently disappear, and two concurrent submissions overwrote each
 * other.
 *
 * Rows now live in Postgres (`FormSubmission`) with a JSON column for the
 * answers; the read/write shape is unchanged for callers.
 */

export async function getFormSubmissions(filter?: {
  formSlug?: string
  userId?: string
}): Promise<FormSubmission[]> {
  if (!isDbPersist()) {
    let list = readFormsFs()
    if (filter?.formSlug) list = list.filter((s) => s.formSlug === filter.formSlug)
    if (filter?.userId) list = list.filter((s) => s.userId === filter.userId)
    return list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
  }

  const rows = await prisma.formSubmission.findMany({
    where: {
      ...(filter?.formSlug ? { formSlug: filter.formSlug } : {}),
      ...(filter?.userId ? { userId: filter.userId } : {}),
    },
    orderBy: { submittedAt: "desc" },
  })

  return rows.map((row) => ({
    id: row.id,
    formSlug: row.formSlug,
    userId: row.userId ?? undefined,
    userName: row.userName ?? undefined,
    userEmail: row.userEmail ?? undefined,
    data: (row.formData ?? {}) as Record<string, any>,
    attachmentUrl: row.attachmentUrl ?? undefined,
    attachmentName: row.attachmentName ?? undefined,
    status: row.status as FormSubmission["status"],
    adminNotes: row.adminNotes ?? undefined,
    submittedAt: row.submittedAt.toISOString(),
  }))
}

export async function createFormSubmission(data: {
  formSlug: string
  userId?: string
  userName?: string
  userEmail?: string
  formData: Record<string, any>
  attachmentUrl?: string
  attachmentName?: string
}): Promise<FormSubmission> {
  if (!isDbPersist()) {
    const list = readFormsFs()
    const submission: FormSubmission = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      formSlug: data.formSlug,
      userId: data.userId,
      userName: data.userName,
      userEmail: data.userEmail,
      data: data.formData ?? {},
      attachmentUrl: data.attachmentUrl,
      attachmentName: data.attachmentName,
      status: "SUBMITTED",
      submittedAt: new Date().toISOString(),
    }
    list.unshift(submission)
    writeFormsFs(list)
    return submission
  }

  const user = data.userId
    ? await prisma.user.findUnique({ where: { id: data.userId }, select: { id: true } })
    : null

  const row = await prisma.formSubmission.create({
    data: {
      formSlug: data.formSlug,
      userId: user?.id ?? null,
      userName: data.userName ?? null,
      userEmail: data.userEmail ?? null,
      formData: (data.formData ?? {}) as Prisma.InputJsonValue,
      attachmentUrl: data.attachmentUrl ?? null,
      attachmentName: data.attachmentName ?? null,
      status: "SUBMITTED",
    },
  })

  return {
    id: row.id,
    formSlug: row.formSlug,
    userId: row.userId ?? undefined,
    userName: row.userName ?? undefined,
    userEmail: row.userEmail ?? undefined,
    data: (row.formData ?? {}) as Record<string, any>,
    attachmentUrl: row.attachmentUrl ?? undefined,
    attachmentName: row.attachmentName ?? undefined,
    status: row.status as FormSubmission["status"],
    adminNotes: row.adminNotes ?? undefined,
    submittedAt: row.submittedAt.toISOString(),
  }
}
