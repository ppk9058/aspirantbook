import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserContext } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userContext = await getCurrentUserContext();
    if (userContext.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Requires ADMIN role" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 50)));
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [requests, total] = await Promise.all([
      prisma.dataDeletionRequest.findMany({
        where,
        orderBy: { requestedAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.dataDeletionRequest.count({ where }),
    ]);

    return NextResponse.json({ success: true, requests, total, page, limit });
  } catch (error: any) {
    console.error("GET /api/admin/data-deletion error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch deletion requests" }, { status: 500 });
  }
}
