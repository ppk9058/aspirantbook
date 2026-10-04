import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserContext, requirePermission } from "@/lib/auth/rbac"
import { FORM_DEFINITIONS, createFormSubmission, getFormSubmissions } from "@/lib/forms-service"
import { logAuditEvent } from "@/lib/audit/audit-logger"

export async function GET(request: NextRequest) {
  try {
    const userContext = await getCurrentUserContext()
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get("slug") || undefined

    if (userContext.role === "ADMIN") {
      const submissions = await getFormSubmissions({ formSlug: slug })
      return NextResponse.json({ success: true, submissions })
    }

    // Students only view their own
    const submissions = await getFormSubmissions({
      formSlug: slug,
      userId: userContext.userId,
    })
    return NextResponse.json({ success: true, submissions })
  } catch (error: any) {
    console.error("GET /api/forms error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch submissions" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userContext = await requirePermission("form.submit")
    const body = await request.json()
    const { formSlug, formData, attachmentUrl, attachmentName } = body

    if (!formSlug || !FORM_DEFINITIONS[formSlug]) {
      return NextResponse.json({ error: "Invalid form slug." }, { status: 400 })
    }

    const formDef = FORM_DEFINITIONS[formSlug]

    // Validate required fields
    for (const field of formDef.fields) {
      if (field.required && (!formData || !formData[field.name])) {
        return NextResponse.json(
          { error: `Field '${field.label}' is required.` },
          { status: 400 }
        )
      }
    }

    const submission = await createFormSubmission({
      formSlug,
      userId: userContext.userId || "anonymous",
      userName: userContext.name || formData.fullName || "Student",
      userEmail: userContext.email || formData.email || undefined,
      formData,
      attachmentUrl,
      attachmentName,
    })

    await logAuditEvent({
      userId: userContext.userId || "student",
      userName: userContext.name || "Student",
      userRole: userContext.role,
      action: "form.submit",
      target: submission.id,
      details: { formSlug, title: formDef.title },
    })

    return NextResponse.json({ success: true, submission }, { status: 201 })
  } catch (error: any) {
    console.error("POST /api/forms error:", error)
    return NextResponse.json({ error: error.message || "Failed to submit form" }, { status: 403 })
  }
}
