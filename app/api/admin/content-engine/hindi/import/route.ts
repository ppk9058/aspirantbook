import { NextResponse } from "next/server"
import { requireContentEngineAdmin } from "@/lib/modules/content-engine/auth"
import { parseHindiImport } from "@/lib/modules/content-engine/assist-io"
import { importHindiTranslations } from "@/lib/modules/content-engine/db-service"

export async function POST(req: Request) {
  try {
    const { user, response } = await requireContentEngineAdmin()
    if (response) return response

    const json = await req.json()
    let items = []

    if (json.translations && Array.isArray(json.translations)) {
      items = json.translations
    } else if (json.rawInput && typeof json.rawInput === "string") {
      items = parseHindiImport(json.rawInput)
    } else {
      return NextResponse.json(
        { error: "Provide either rawInput (string) or translations (array)" },
        { status: 400 }
      )
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "No valid Hindi translations could be parsed from input" },
        { status: 400 }
      )
    }

    const result = await importHindiTranslations({
      translations: items,
      reviewedById: user?.userId,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error("POST /api/admin/content-engine/hindi/import error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to import Hindi translations" },
      { status: 500 }
    )
  }
}
