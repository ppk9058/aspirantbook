import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  if (process.env.APP_ENV !== "test" || process.env.NODE_ENV === "production") {
    return new NextResponse("Not Found", { status: 404 })
  }

  try {
    const res = await prisma.$queryRawUnsafe<{ db: string }[]>("SELECT current_database() as db")
    const dbName = res?.[0]?.db || "unknown"
    const userCount = await prisma.user.count()
    return NextResponse.json({
      ok: true,
      database: dbName,
      isTestDb: dbName.endsWith("_test"),
      userCount,
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Database health check failed" },
      { status: 500 }
    )
  }
}
