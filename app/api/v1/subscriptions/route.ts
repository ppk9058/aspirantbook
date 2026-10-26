import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleApiError, getRequestId } from "@/lib/api/v1/response";
import { getViewer } from "@/lib/api/v1/viewer";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const reqId = getRequestId(req);
  try {
    const viewer = await getViewer(req);
    if (!viewer.userId) {
      return apiError("UNAUTHORIZED", "Authentication required to view subscriptions", 401, undefined, reqId);
    }

    const now = new Date();

    const [subscriptions, payments] = await Promise.all([
      prisma.subscription.findMany({
        where: { userId: viewer.userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.payment.findMany({
        where: { userId: viewer.userId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Active subscription check
    const activeSub = subscriptions.find(
      (s) => s.status === "ACTIVE" && new Date(s.endDate) > now
    );

    const daysRemaining = activeSub
      ? Math.max(0, Math.ceil((new Date(activeSub.endDate).getTime() - now.getTime()) / (1000 * 3600 * 24)))
      : 0;

    const history = [
      ...subscriptions.map((s) => ({
        id: s.id,
        type: "subscription" as const,
        description: `Pass Subscription (${s.plan})`,
        amount: 0,
        currency: "INR",
        status: s.status,
        createdAt: s.createdAt.toISOString(),
      })),
      ...payments.map((p) => ({
        id: p.id,
        type: "payment" as const,
        description: p.paymentMethod || "Subscription Payment",
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return apiSuccess(
      {
        hasActivePass: Boolean(activeSub),
        activeSubscription: activeSub
          ? {
              id: activeSub.id,
              plan: activeSub.plan,
              status: activeSub.status,
              startDate: activeSub.startDate.toISOString(),
              endDate: activeSub.endDate.toISOString(),
              daysRemaining,
            }
          : null,
        history,
      },
      200,
      {},
      reqId
    );
  } catch (err) {
    return handleApiError(err, reqId);
  }
}
