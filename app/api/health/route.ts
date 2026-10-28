import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isStripeConfigured } from "@/lib/payments/stripe";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  let dbStatus = "healthy";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "unreachable";
  }

  const stripeOk = isStripeConfigured();
  const razorpayOk = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  const paymentsConfigured = stripeOk || razorpayOk;

  return NextResponse.json({
    status: dbStatus === "healthy" ? "ok" : "degraded",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: dbStatus,
    payments: paymentsConfigured ? "configured" : "not configured",
    latencyMs: Date.now() - start,
  });
}
