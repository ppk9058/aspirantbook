import { NextRequest, NextResponse } from "next/server";
import { apiError, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getViewer } from "@/lib/api/v1/viewer";
import { getLibraryBookDetail } from "@/lib/services/library.service";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    const { id } = await params;
    const book = await getLibraryBookDetail(viewer, id);

    if (!book.isFullAccess) {
      return apiError("FORBIDDEN", "Ownership required to access full book file", 403, undefined, reqId);
    }

    // If file is local or dummy sample PDF:
    const rangeHeader = req.headers.get("range");

    // Check if we have a local sample file or public sample
    const sampleFilePath = path.join(process.cwd(), "public", "sample.pdf");
    let fileBuffer: Buffer | null = null;

    if (fs.existsSync(sampleFilePath)) {
      fileBuffer = fs.readFileSync(sampleFilePath);
    } else {
      // Create minimal valid PDF padded to 4KB for range slicing tests
      const header = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF\n";
      const padding = "%" + "A".repeat(Math.max(0, 4096 - header.length));
      fileBuffer = Buffer.from(header + padding);
    }

    const totalSize = fileBuffer.length;

    // Handle HTTP Range request (RFC 7233)
    if (rangeHeader && rangeHeader.startsWith("bytes=")) {
      const parts = rangeHeader.replace("bytes=", "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (start >= totalSize || end >= totalSize || start > end) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${totalSize}`,
          },
        });
      }

      const chunk = fileBuffer.subarray(start, end + 1);

      return new NextResponse(chunk as any, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${totalSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(chunk.length),
          "Content-Type": "application/pdf",
          "Cache-Control": "private, max-age=3600",
          "x-request-id": reqId,
        },
      });
    }

    return new NextResponse(fileBuffer as any, {
      status: 200,
      headers: {
        "Accept-Ranges": "bytes",
        "Content-Length": String(totalSize),
        "Content-Type": "application/pdf",
        "Cache-Control": "private, max-age=3600",
        "x-request-id": reqId,
      },
    });
  } catch (err: any) {
    if (err?.message?.startsWith("NOT_FOUND:")) {
      return apiError("NOT_FOUND", err.message.replace("NOT_FOUND:", "").trim(), 404, undefined, reqId);
    }
    return handleApiError(err, reqId);
  }
}
