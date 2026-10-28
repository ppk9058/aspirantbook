import { NextRequest, NextResponse } from "next/server";
import { generateOpenApiDocument } from "@/lib/api/v1/openapi";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const doc = generateOpenApiDocument();
  return NextResponse.json(doc, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
