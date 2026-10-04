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
    const hasActiveSubscription = activeSubscription &&
        activeSubscription.status === "ACTIVE" &&
        new Date(activeSubscription.endDate) > new Date()

    const currentPlan = hasActiveSubscription ? activeSubscription.plan : "FREE"

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
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Subscription</h1>
                    <p className="text-gray-600 mt-1">Manage your subscription and billing</p>
                </div>

                {/* Current Subscription Status */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Crown className="h-5 w-5 text-purple-500" />
                            Current Plan
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-2xl font-bold text-gray-900">{currentPlan}</h3>
                                    <Badge className={hasActiveSubscription ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                                        {hasActiveSubscription ? "Active" : "Free Plan"}
                                    </Badge>
                                </div>

                                {hasActiveSubscription && activeSubscription && (
                                    <div className="space-y-1 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            <span>
                                                Renews on {new Date(activeSubscription.endDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <CreditCard className="h-4 w-4" />
                                            <span>
                                                {activeSubscription.plan === "MONTHLY" ? "₹499/month" : "₹4,999/year"}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {hasActiveSubscription && (
                                <Button variant="outline" className="text-red-600 hover:text-red-700">
                                    Cancel Subscription
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Plans Comparison */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Your Plan</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {plans.map((plan) => (
                            <Card
                                key={plan.name}
                                className={`relative ${plan.name === "PREMIUM" ? "border-purple-500 border-2" : ""}`}
                            >
                                {plan.name === "PREMIUM" && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <Badge className="bg-purple-600 text-white">Most Popular</Badge>
                                    </div>
                                )}

                                <CardHeader>
                                    <CardTitle className="text-center">
                                        <div className="text-2xl font-bold mb-2">{plan.name}</div>
                                        <div className="text-4xl font-bold text-purple-600 mb-1">
                                            {plan.price}
                                        </div>
                                        <div className="text-sm text-gray-600">{plan.period}</div>
                                    </CardTitle>
                                </CardHeader>

                                <CardContent>
                                    <div className="space-y-4">
                                        {/* Features */}
                                        <div className="space-y-2">
                                            {plan.features.map((feature, index) => (
                                                <div key={index} className="flex items-start gap-2">
                                                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                                    <span className="text-sm text-gray-700">{feature}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Limitations */}
                                        {plan.limitations.length > 0 && (
                                            <div className="space-y-2 pt-4 border-t">
                                                {plan.limitations.map((limitation, index) => (
                                                    <div key={index} className="flex items-start gap-2">
                                                        <X className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                                                        <span className="text-sm text-gray-500">{limitation}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Action Button */}
                                        <div className="pt-4">
                                            {currentPlan === plan.name ? (
                                                <Button disabled className="w-full">
                                                    Current Plan
                                                </Button>
                                            ) : plan.name === "PREMIUM" ? (
                                                <Link href="/pricing">
                                                    <Button className="w-full bg-purple-600 hover:bg-purple-700">
                                                        Upgrade to Premium
                                                    </Button>
                                                </Link>
                                            ) : (
                                                <Button variant="outline" className="w-full" disabled>
                                                    Downgrade
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Payment History */}
                {user.payments.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Payment History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {user.payments.map((payment) => (
                                    <div
                                        key={payment.id}
                                        className="flex items-center justify-between py-3 border-b last:border-0"
                                    >
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {payment.subscription?.plan || "Unknown"} Subscription
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                {new Date(payment.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-gray-900">
                                                ₹{payment.amount}
                                            </p>
                                            <Badge className={
                                                payment.status === "COMPLETED"
                                                    ? "bg-green-100 text-green-700"
                                                    : payment.status === "PENDING"
                                                        ? "bg-yellow-100 text-yellow-700"
                                                        : "bg-red-100 text-red-700"
                                            }>
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
        </div>
    )
}
