import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Crown, Check, X, Calendar, CreditCard } from "lucide-react"
import Link from "next/link"
import { SHOW_PREMIUM_PLAN } from "@/lib/config/premium"

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

    const visiblePlans = SHOW_PREMIUM_PLAN
        ? plans
        : plans.filter((plan) => plan.name !== "PREMIUM")

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
                                <a
                                    href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "contact.aspirantbook@gmail.com"}?subject=${encodeURIComponent(`Plan help - ${activeSubscription.plan || "Pass"}`)}`}
                                    className="inline-flex items-center justify-center text-center w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Need to cancel or change your plan? Contact customer support
                                </a>
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
                <div className={`grid grid-cols-1 gap-6 items-stretch ${SHOW_PREMIUM_PLAN ? "md:grid-cols-2" : "max-w-md mx-auto"}`}>
                    {visiblePlans.map((plan) => (
                        <Card
                            key={plan.name}
                            className={`relative bg-white dark:bg-slate-900 border-2 rounded-3xl transition-all duration-300 flex flex-col justify-between overflow-hidden ${
                                plan.name === "PREMIUM"
                                    ? "border-teal-500/80 dark:border-teal-400 shadow-xl shadow-teal-500/10 ring-2 ring-teal-500/20"
                                    : "border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700"
                            }`}
                        >
                            {plan.name === "PREMIUM" && (
                                <div className="absolute top-0 right-0 left-0 bg-gradient-to-r from-teal-600 via-emerald-600 to-indigo-600 py-1.5 px-4 text-center">
                                    <span className="text-white font-black tracking-wider uppercase text-[11px] flex items-center justify-center gap-1.5">
                                        <Crown className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                                        Recommended • Complete All-Access Pass
                                    </span>
                                </div>
                            )}

                            <CardHeader className={`text-center pb-4 ${plan.name === "PREMIUM" ? "pt-9 sm:pt-10 bg-gradient-to-b from-teal-50/50 to-transparent dark:from-teal-950/20" : "pt-6"}`}>
                                <CardTitle className="text-center">
                                    <div className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
                                        {plan.name === "PREMIUM" ? "Pro Learner" : "Starter"}
                                    </div>
                                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-2">
                                        {plan.name} PASS
                                    </div>
                                    <div className="flex items-baseline justify-center gap-1">
                                        <span className={`text-4xl sm:text-5xl font-black tracking-tight ${plan.name === "PREMIUM" ? "text-teal-700 dark:text-teal-400" : "text-slate-900 dark:text-white"}`}>
                                            {plan.price}
                                        </span>
                                        <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold">
                                            /{plan.period}
                                        </span>
                                    </div>
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="space-y-6 flex-1 flex flex-col justify-between pt-2">
                                <div className="space-y-4">
                                    {/* Features */}
                                    <div className="space-y-2.5">
                                        {plan.features.map((feature, index) => (
                                            <div key={index} className="flex items-start gap-2.5">
                                                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                                                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                                                </div>
                                                <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-snug font-medium">
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
                                                    <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0 mt-0.5">
                                                        <X className="h-3.5 w-3.5 stroke-[2.5]" />
                                                    </div>
                                                    <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-snug font-medium">
                                                        {limitation}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Action Button */}
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                    {currentPlan === plan.name ? (
                                        <Button
                                            disabled
                                            className="w-full min-h-[48px] rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold text-sm cursor-not-allowed border border-slate-200 dark:border-slate-700"
                                        >
                                            Current Active Plan
                                        </Button>
                                    ) : plan.name === "PREMIUM" ? (
                                        <Link href="/pricing" className="block w-full">
                                            <Button className="w-full min-h-[48px] rounded-2xl bg-gradient-to-r from-teal-600 hover:from-teal-700 to-emerald-600 hover:to-emerald-700 text-white font-black text-sm shadow-lg shadow-teal-500/25 transition-all cursor-pointer">
                                                <Crown className="w-4 h-4 mr-2 fill-amber-300 text-amber-300" />
                                                Get Pass Now
                                            </Button>
                                        </Link>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            className="w-full min-h-[48px] rounded-2xl border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 font-bold text-sm cursor-not-allowed"
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
