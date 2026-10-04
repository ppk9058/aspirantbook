import fs from "fs/promises"
import path from "path"
import { FormField, FormDefinition, FormSubmission, FORM_DEFINITIONS } from "./forms-config"

export type { FormField, FormDefinition, FormSubmission }
export { FORM_DEFINITIONS }

const SUBMISSIONS_FILE = path.join(process.cwd(), "data", "form-submissions.json")

async function ensureDir(filePath: string) {
  const dir = path.dirname(filePath)
  try {
    await fs.access(dir)
  } catch {
    await fs.mkdir(dir, { recursive: true })
  }
}

export async function getFormSubmissions(filter?: {
  formSlug?: string
  userId?: string
}): Promise<FormSubmission[]> {
  try {
    await ensureDir(SUBMISSIONS_FILE)
    const content = await fs.readFile(SUBMISSIONS_FILE, "utf-8")
    const list: FormSubmission[] = JSON.parse(content)
    return list.filter((s) => {
      if (filter?.formSlug && s.formSlug !== filter.formSlug) return false
      if (filter?.userId && s.userId !== filter.userId) return false
      return true
    })
  } catch {
    return []
  }
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
  const all = await getFormSubmissions()
  const newSubmission: FormSubmission = {
    id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    formSlug: data.formSlug,
    userId: data.userId,
    userName: data.userName,
    userEmail: data.userEmail,
    data: data.formData,
    attachmentUrl: data.attachmentUrl,
    attachmentName: data.attachmentName,
    status: "SUBMITTED",
    submittedAt: new Date().toISOString(),
  }

  all.unshift(newSubmission)
  await ensureDir(SUBMISSIONS_FILE)
  await fs.writeFile(SUBMISSIONS_FILE, JSON.stringify(all, null, 2), "utf-8")
  return newSubmission
}
