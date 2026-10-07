import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAllBatches, createBatch } from "@/lib/batches-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN" && session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Forbidden: Admin or Teacher access required" }, { status: 403 });
    }

    const batches = await getAllBatches();
    return NextResponse.json(batches);
  } catch (error: any) {
    console.error("GET /api/admin/batches error:", error);
    return NextResponse.json({ error: "Failed to fetch batches" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN" && session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Forbidden: Admin or Teacher access required" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    const created = await createBatch(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/admin/batches error:", error);
    return NextResponse.json({ error: "Failed to create batch" }, { status: 500 });
  }
}

