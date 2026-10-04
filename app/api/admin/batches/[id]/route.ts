import { NextResponse } from "next/server";
import { getBatchById, updateBatch, deleteBatch } from "@/lib/batches-service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const batch = await getBatchById(id);
    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }
    return NextResponse.json(batch);
  } catch (error: any) {
    console.error("GET /api/admin/batches/[id] error:", error);
    return NextResponse.json({ error: "Failed to get batch" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await updateBatch(id, body);
    if (!updated) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT /api/admin/batches/[id] error:", error);
    return NextResponse.json({ error: "Failed to update batch" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await deleteBatch(id);
    if (!success) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Batch deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/admin/batches/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete batch" }, { status: 500 });
  }
}
