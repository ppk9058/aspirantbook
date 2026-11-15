import { NextRequest, NextResponse } from "next/server";
import { getHealthPayload } from "@/lib/health/health-service";
import { revalidatePublicCatalogues } from "@/lib/cache/public-catalogue-cache";

export const dynamic = "force-dynamic";

/**
 * The public catalogues are prerendered by `next build`, which runs without a
 * database in Docker. Revalidate them once per healthy transition: the first
 * health check that can reach the DB is seconds after boot, which replaces the
 * build-time shell with real content long before the 1h ISR window expires.
 *
 * Bounded on purpose: it fires on a transition (unreachable -> healthy) or once
 * per process, never on every poll.
 */
let revalidatedSinceHealthy = false;

export async function GET(req: NextRequest): Promise<NextResponse>;
export async function GET(): Promise<NextResponse>;
export async function GET(req?: NextRequest): Promise<NextResponse> {
  const payload = await getHealthPayload(req?.headers);

  if (payload?.database?.status === "healthy") {
    if (!revalidatedSinceHealthy) {
      revalidatedSinceHealthy = true;
      const revalidated = revalidatePublicCatalogues("health: database healthy");
      if (revalidated.length > 0) {
        console.info("[health] revalidated public catalogues", revalidated);
      }
    }
  } else {
    revalidatedSinceHealthy = false;
  }

  return NextResponse.json(payload);
}
