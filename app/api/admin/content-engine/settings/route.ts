import { NextResponse } from "next/server"
import { requireContentEngineAdmin } from "@/lib/modules/content-engine/auth"
import { getSetting, setSetting } from "@/lib/modules/content-engine/db-service"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const { response } = await requireContentEngineAdmin()
    if (response) return response

    const { searchParams } = new URL(req.url)
    const key = searchParams.get("key")

    if (key) {
      const val = await getSetting(key, null)
      return NextResponse.json({ key, value: val })
    }

    const all = await prisma.contentEngineSetting.findMany()
    const map: Record<string, unknown> = {}
    for (const s of all) {
      map[s.key] = s.value
    }

    return NextResponse.json(map)
  } catch (error: any) {
    console.error("GET /api/admin/content-engine/settings error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch settings" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const { response } = await requireContentEngineAdmin()
    if (response) return response

    const json = await req.json()

    if (json.key && json.value !== undefined) {
      await setSetting(json.key, json.value)
      return NextResponse.json({ success: true, key: json.key, value: json.value })
    }

    // Support setting multiple keys at once
    if (typeof json === "object" && json !== null) {
      for (const [k, v] of Object.entries(json)) {
        await setSetting(k, v)
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: "Invalid payload: provide { key, value } or an object of key-value pairs" },
      { status: 400 }
    )
  } catch (error: any) {
    console.error("POST /api/admin/content-engine/settings error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update settings" },
      { status: 500 }
    )
  }
}
