import { prisma } from "@/lib/prisma"
import { hasActivePass } from "@/lib/auth/entitlements"

export interface ActivePassData {
  status: "Pass Active"
  planLabel: string
  validUntil: string
  amountPaid?: number | null
  formattedAmount?: string | null
}

export interface RawSubscriptionData {
  status?: string | null
  plan?: string | null
  endDate?: Date | string | null
  payments?: Array<{
    amount?: number | null
    amountMinor?: number | null
  }>
}

/**
 * Pure data mapper for YourPassCard.
 * Returns null if user is not active pass holder.
 * Formats validUntil, maps amount ONLY if present in DB records.
 * Never invents or hardcodes amounts or renewal dates.
 */
export function mapActivePassCardData(params: {
  subscription?: RawSubscriptionData | null
  isAdmin?: boolean
  hasActive?: boolean
}): ActivePassData | null {
  const { subscription, isAdmin = false, hasActive = false } = params

  if (!hasActive && !isAdmin && !subscription) {
    return null
  }

  // If subscription row exists, verify ACTIVE status
  if (subscription) {
    if (subscription.status !== "ACTIVE" && !isAdmin) {
      return null
    }

    const endDate =
      subscription.endDate instanceof Date
        ? subscription.endDate
        : subscription.endDate
        ? new Date(subscription.endDate)
        : null

    const validUntil =
      endDate && !Number.isNaN(endDate.getTime())
        ? new Intl.DateTimeFormat("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }).format(endDate)
        : "Active Access"

    const planUpper = (subscription.plan || "").toUpperCase()
    const planLabel =
      planUpper === "YEARLY"
        ? "Yearly Pass"
        : planUpper === "MONTHLY"
        ? "Monthly Pass"
        : planUpper
        ? `${subscription.plan} Pass`
        : "AspirantBook Pass"

    // Amount paid ONLY if recorded in DB
    const latestPayment = subscription.payments?.[0]
    let amountPaid: number | null = null
    let formattedAmount: string | null = null

    if (latestPayment) {
      if (typeof latestPayment.amount === "number" && !Number.isNaN(latestPayment.amount)) {
        amountPaid = latestPayment.amount
      } else if (
        typeof latestPayment.amountMinor === "number" &&
        !Number.isNaN(latestPayment.amountMinor)
      ) {
        amountPaid = latestPayment.amountMinor / 100
      }
    }

    if (amountPaid !== null) {
      formattedAmount = `₹${amountPaid.toFixed(0)}`
    }

    return {
      status: "Pass Active",
      planLabel,
      validUntil,
      amountPaid,
      formattedAmount,
    }
  }

  // Admin override without dedicated subscription row
  if (isAdmin) {
    return {
      status: "Pass Active",
      planLabel: "Admin All-Access Pass",
      validUntil: "Permanent (Admin Override)",
      amountPaid: null,
      formattedAmount: null,
    }
  }

  return null
}

/**
 * Server-side loader for active pass card details.
 * Database backed via hasActivePass and Subscription table.
 */
export async function getActivePassCardData(
  userId?: string | null
): Promise<ActivePassData | null> {
  if (!userId) return null

  const isPassHolder = await hasActivePass(userId)
  if (!isPassHolder) return null

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    const isAdmin = user?.role === "ADMIN"

    const now = new Date()
    const sub = await prisma.subscription.findFirst({
      where: {
        userId,
        status: "ACTIVE",
        endDate: { gt: now },
        plan: { not: "FREE" },
      },
      orderBy: { endDate: "desc" },
      include: {
        payments: {
          where: { status: "COMPLETED" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            amount: true,
            amountMinor: true,
          },
        },
      },
    })

    return mapActivePassCardData({
      subscription: sub,
      isAdmin,
      hasActive: isPassHolder,
    })
  } catch (err) {
    console.error("[getActivePassCardData error]:", err)
    return null
  }
}
