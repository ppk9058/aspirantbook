import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isStripeConfigured } from "@/lib/payments/stripe";

export const dynamic = "force-dynamic";

function getGitCommitSha(): string {
  if (process.env.GIT_COMMIT) return process.env.GIT_COMMIT.trim();
  if (process.env.NEXT_PUBLIC_GIT_COMMIT) return process.env.NEXT_PUBLIC_GIT_COMMIT.trim();
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.trim();
  try {
    const { execSync } = require("child_process");
    return execSync("git rev-parse HEAD", { encoding: "utf-8", timeout: 1000 }).trim();
  } catch {
    return "unknown";
  }
}

export async function GET() {
  const start = Date.now();
  let dbStatus = "healthy";
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
  } catch {
    dbStatus = "unreachable";
  }

  const stripeOk = isStripeConfigured();
  const razorpayOk = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  const paymentsConfigured = stripeOk || razorpayOk;
  const commit = getGitCommitSha();

  return NextResponse.json({
    status: dbStatus === "healthy" ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    commit,
    uptime: Math.round(process.uptime()),
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
    },
    payments: paymentsConfigured ? "configured" : "not configured",
    totalLatencyMs: Date.now() - start,
  });
}
