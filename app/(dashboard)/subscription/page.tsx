import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Crown, Check, X, Calendar, CreditCard } from "lucide-react"
import Link from "next/link"

export default async function SubscriptionPage() {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    // Fetch user with subscription details
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
            subscriptions: {
                orderBy: { createdAt: "desc" },
                take: 1,
            },
            payments: {
                include: {
                    subscription: true,
                },
                orderBy: { createdAt: "desc" },
                take: 5,
            },
        },
    })

    if (!user) {
        redirect("/login")
    }

    // Check subscription status
    const activeSubscription = user.subscriptions?.[0]
    const hasActiveSubscription = Boolean(
        activeSubscription &&
        activeSubscription.status === "ACTIVE" &&
        new Date(activeSubscription.endDate) > new Date()
    )

    const currentPlan = hasActiveSubscription ? (activeSubscription?.plan || "PREMIUM") : "FREE"

    // Plan features
    const plans = [
        {
            name: "FREE",
            price: "₹0",
            period: "forever",
            features: [
                "Access to free courses",
                "Basic coding exercises",
                "Community support",
                "Limited assessments",
            ],
            limitations: [
                "No premium courses",
                "No certificates",
                "No priority support",
            ],
        },
        {
            name: "PREMIUM",
            price: "₹499",
            period: "per month",
            features: [
                "Access to all courses",
                "Unlimited coding exercises",
                "All assessments and tutorials",
                "Course completion certificates",
                "Priority support",
                "Downloadable resources",
                "Ad-free experience",
                "Early access to new content",
            ],
            limitations: [],
        },
    ]

    return (
        <div className="space-y-6 sm:space-y-8 pb-12">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    Subscription
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Manage your subscription and billing details
                </p>
            </div>

            {/* Current Subscription Status */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                <CardHeader className="pb-3 sm:pb-4">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        <Crown className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0" />
                        <span>Current Plan</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-2 min-w-0">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {currentPlan}
                                </h3>
                                <Badge
                                    className={
                                        hasActiveSubscription
                                            ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 font-bold"
                                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold"
                                    }
                                >
                                    {hasActiveSubscription ? "Active" : "Free Plan"}
                                </Badge>
                            </div>

                            {hasActiveSubscription && activeSubscription && (
                                <div className="space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
                                        <span>
                                            Renews on {new Date(activeSubscription.endDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
                                        <span>
                                            {activeSubscription.plan === "MONTHLY" ? "₹499/month" : "₹4,999/year"}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {hasActiveSubscription && (
                            <div className="pt-2 sm:pt-0 shrink-0">
                                <Button
                                    variant="outline"
                                    className="w-full sm:w-auto min-h-[44px] text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 font-bold text-xs sm:text-sm"
                                >
                                    Cancel Subscription
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Plans Comparison */}
            <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-4 sm:mb-6">
                    Choose Your Plan
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {plans.map((plan) => (
                        <Card
                            key={plan.name}
                            className={`relative bg-white dark:bg-slate-900 border rounded-2xl shadow-xs ${
                                plan.name === "PREMIUM"
                                    ? "border-purple-500 dark:border-purple-500 shadow-purple-500/5 ring-1 ring-purple-500/20"
                                    : "border-slate-200 dark:border-slate-800"
                            }`}
                        >
                            {plan.name === "PREMIUM" && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <Badge className="bg-purple-600 text-white font-extrabold px-3 py-0.5 text-xs shadow-xs">
                                        Most Popular
                                    </Badge>
                                </div>
                            )}

                            <CardHeader className="text-center pt-7 sm:pt-6">
                                <CardTitle className="text-center">
                                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-1">
                                        {plan.name}
                                    </div>
                                    <div className="text-3xl sm:text-4xl font-black text-purple-600 dark:text-purple-400 mb-1">
                                        {plan.price}
                                    </div>
                                    <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                                        {plan.period}
                                    </div>
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    {/* Features */}
                                    <div className="space-y-2.5">
                                        {plan.features.map((feature, index) => (
                                            <div key={index} className="flex items-start gap-2.5">
                                                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                                <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-snug">
                                                    {feature}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Limitations */}
                                    {plan.limitations.length > 0 && (
                                        <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                                            {plan.limitations.map((limitation, index) => (
                                                <div key={index} className="flex items-start gap-2.5">
                                                    <X className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                                                    <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-snug">
                                                        {limitation}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Action Button */}
                                <div className="pt-2">
                                    {currentPlan === plan.name ? (
                                        <Button
                                            disabled
                                            className="w-full min-h-[44px] bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold text-xs sm:text-sm cursor-not-allowed"
                                        >
                                            Current Plan
                                        </Button>
                                    ) : plan.name === "PREMIUM" ? (
                                        <Link href="/pricing" className="block w-full">
                                            <Button className="w-full min-h-[44px] bg-purple-600 hover:bg-purple-700 text-white font-black text-xs sm:text-sm shadow-md transition-all">
                                                Upgrade to Premium
                                            </Button>
                                        </Link>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            className="w-full min-h-[44px] border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 font-bold text-xs sm:text-sm cursor-not-allowed"
                                            disabled
                                        >
                                            Downgrade
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Payment History */}
            {user.payments.length > 0 && (
                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                    <CardHeader>
                        <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                            Payment History
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {user.payments.map((payment) => (
                                <div
                                    key={payment.id}
                                    className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0 gap-3"
                                >
                                    <div className="min-w-0">
                                        <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                            {payment.subscription?.plan || "Premium"} Subscription
                                        </p>
                                        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            {new Date(payment.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                                        <p className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                                            ₹{payment.amount}
                                        </p>
                                        <Badge
                                            className={
                                                payment.status === "COMPLETED"
                                                    ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold"
                                                    : payment.status === "PENDING"
                                                    ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold"
                                                    : "bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/30 text-[10px] font-bold"
                                            }
                                        >
                                            {payment.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
