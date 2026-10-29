import { NextRequest, NextResponse } from "next/server";
import { processEmailOutbox } from "@/lib/email/outbox-worker";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function isAuthorizedCron(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const headerSecret =
    req.headers.get("x-cron-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!headerSecret) return false;

  const a = Buffer.from(cronSecret);
  const b = Buffer.from(headerSecret);

  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorizedCron(req)) {
      return NextResponse.json({ error: "Unauthorized: Invalid or missing CRON_SECRET" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const batchSize = searchParams.get("batchSize")
      ? Number(searchParams.get("batchSize"))
      : undefined;

    const stats = await processEmailOutbox({ batchSize });
    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    console.error("POST /api/internal/email-outbox error:", error);
    return NextResponse.json({ error: error.message || "Failed to process email outbox" }, { status: 500 });
  }
}
