import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserContext } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/api/v1/audit";
import { getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = ["PENDING", "IN_REVIEW", "COMPLETED", "REJECTED"] as const;
type DeletionStatus = (typeof ALLOWED_STATUSES)[number];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userContext = await getCurrentUserContext();
    if (!userContext.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized: Authentication required" }, { status: 401 });
    }
    if (userContext.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Requires ADMIN role" }, { status: 403 });
    }

    const { id } = await params;
    const request = await prisma.dataDeletionRequest.findUnique({
      where: { id },
    });

    if (!request) {
      return NextResponse.json({ error: "Data deletion request not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, request });
  } catch (error: any) {
    console.error("GET /api/admin/data-deletion/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch deletion request" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userContext = await getCurrentUserContext();
    if (!userContext.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized: Authentication required" }, { status: 401 });
    }
    if (userContext.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Requires ADMIN role" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { status: newStatus, adminNotes } = body;

    const existing = await prisma.dataDeletionRequest.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Data deletion request not found" }, { status: 404 });
    }

    // Status transition validation
    if (newStatus !== undefined) {
      if (!ALLOWED_STATUSES.includes(newStatus as DeletionStatus)) {
        return NextResponse.json(
          { error: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(", ")}` },
          { status: 400 }
        );
      }

      // Check terminal states
      if (existing.status === "COMPLETED" && newStatus !== "COMPLETED") {
        return NextResponse.json(
          { error: "Cannot transition from terminal status COMPLETED" },
          { status: 400 }
        );
      }
      if (existing.status === "REJECTED" && newStatus !== "REJECTED") {
        return NextResponse.json(
          { error: "Cannot transition from terminal status REJECTED" },
          { status: 400 }
        );
      }

      // Valid state flow:
      // PENDING -> IN_REVIEW | COMPLETED | REJECTED
      // IN_REVIEW -> COMPLETED | REJECTED
      if (existing.status === "IN_REVIEW" && newStatus === "PENDING") {
        return NextResponse.json(
          { error: "Cannot revert status from IN_REVIEW back to PENDING" },
          { status: 400 }
        );
      }
    }

    // Determine updates
    const updateData: any = {};
    if (newStatus !== undefined) {
      updateData.status = newStatus;
      if (newStatus === "COMPLETED" || newStatus === "REJECTED") {
        updateData.processedAt = new Date();
      }
    }
    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }

    const updated = await prisma.dataDeletionRequest.update({
      where: { id },
      data: updateData,
    });

    // Write audit log entry per transition
    if (newStatus !== undefined && newStatus !== existing.status) {
      await logAuditEvent({
        actorId: userContext.userId || "ADMIN",
        action: "DATA_DELETION_STATUS_TRANSITION",
        targetId: id,
        details: {
          previousStatus: existing.status,
          newStatus: updated.status,
          adminNotes: updated.adminNotes,
          userEmail: existing.email,
          userId: existing.userId,
        },
        ip: getClientIp(req),
      });
    }

    return NextResponse.json({ success: true, request: updated });
  } catch (error: any) {
    console.error("PATCH /api/admin/data-deletion/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to update deletion request" }, { status: 500 });
  }
}
