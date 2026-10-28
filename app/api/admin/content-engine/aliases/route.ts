import { NextResponse } from "next/server"
import { requireContentEngineAdmin } from "@/lib/modules/content-engine/auth"
import { ExamAliasSchema } from "@/lib/modules/content-engine/schemas"
import { ensureDefaultExamAliases } from "@/lib/modules/content-engine/db-service"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const { response } = await requireContentEngineAdmin()
    if (response) return response

    await ensureDefaultExamAliases()
    const aliases = await prisma.contentEngineExamAlias.findMany({
      orderBy: { name: "asc" },
    })

    return NextResponse.json(aliases)
  } catch (error: any) {
    console.error("GET /api/admin/content-engine/aliases error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch exam aliases" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const { response } = await requireContentEngineAdmin()
    if (response) return response

    const json = await req.json()
    const parsed = ExamAliasSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const alias = await prisma.contentEngineExamAlias.upsert({
      where: { name: parsed.data.name },
      create: {
        name: parsed.data.name,
        pattern: parsed.data.pattern || null,
        isEnabled: parsed.data.isEnabled ?? true,
      },
      update: {
        pattern: parsed.data.pattern || null,
        isEnabled: parsed.data.isEnabled ?? true,
      },
    })

    return NextResponse.json({ success: true, alias })
  } catch (error: any) {
    console.error("POST /api/admin/content-engine/aliases error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to save exam alias" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const { response } = await requireContentEngineAdmin()
    if (response) return response

    const { searchParams } = new URL(req.url)
    const name = searchParams.get("name")
    const id = searchParams.get("id")

    if (!name && !id) {
      return NextResponse.json(
        { error: "Alias name or ID is required" },
        { status: 400 }
      )
    }

    if (id) {
      await prisma.contentEngineExamAlias.delete({ where: { id } })
    } else if (name) {
      await prisma.contentEngineExamAlias.delete({ where: { name } })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("DELETE /api/admin/content-engine/aliases error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete exam alias" },
      { status: 500 }
    )
  }
}
