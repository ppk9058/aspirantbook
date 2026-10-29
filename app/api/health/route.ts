import { NextRequest, NextResponse } from "next/server";
import { getHealthPayload } from "@/lib/health/health-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse>;
export async function GET(): Promise<NextResponse>;
export async function GET(req?: NextRequest): Promise<NextResponse> {
  const payload = await getHealthPayload(req?.headers);
  return NextResponse.json(payload);
}
