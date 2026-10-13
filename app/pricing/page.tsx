import { auth } from "@/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, X, Crown } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import PricingPlanButton from "@/components/pricing/PricingPlanButton"

export default async function PricingPage() {
    const session = await auth()
    const user = session?.user

    // If user is already premium, redirect to subscription page
    if (user?.subscriptionStatus === "ACTIVE") {
        redirect("/subscription")
    }

    const plans = [
        {
            name: "FREE",
            price: "₹0",
            priceUSD: "$0",
            period: "forever",
            description: "Perfect for getting started",
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
            buttonText: user ? "Current Plan" : "Sign Up Free",
            buttonLink: user ? "/dashboard" : "/register",
            variant: "outline" as const,
        },
        {
            name: "PREMIUM",
            price: "₹499",
            priceUSD: "$19",
            period: "per month",
            description: "Everything you need to master coding",
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
            buttonText: "Get Pass",
            buttonLink: "/checkout?plan=monthly",
            variant: "default" as const,
        },
    ]

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        Simple, Transparent Pricing
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-slate-400 max-w-2xl mx-auto">
                        Start for free, upgrade when you're ready. No hidden fees.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
                    {plans.map((plan) => (
                        <Card
                            key={plan.name}
                            className={`relative bg-white dark:bg-slate-900 border-2 rounded-3xl transition-all duration-300 flex flex-col justify-between overflow-hidden ${
                                plan.name === "PREMIUM"
                                    ? "border-[#1448d8] dark:border-blue-500 shadow-xl shadow-blue-500/10 ring-2 ring-blue-500/20"
                                    : "border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700"
                            }`}
                        >
                            {plan.name === "PREMIUM" && (
                                <div className="absolute top-0 right-0 left-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 py-1.5 px-4 text-center">
                                    <span className="text-white font-black tracking-wider uppercase text-[11px] flex items-center justify-center gap-1.5">
                                        <Crown className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                                        Recommended • Complete All-Access Pass
                                    </span>
                                </div>
                            )}

                            <CardHeader className={`text-center pb-4 ${plan.name === "PREMIUM" ? "pt-9 sm:pt-10 bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-950/20" : "pt-7"}`}>
                                <CardTitle className="text-center">
                                    <div className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
                                        {plan.name === "PREMIUM" ? "Pro Learner" : "Starter"}
                                    </div>
                                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-2">
                                        {plan.name} PASS
                                    </div>
                                    <div className="flex items-baseline justify-center gap-1 mb-2">
                                        <span className={`text-4xl sm:text-5xl font-black tracking-tight ${plan.name === "PREMIUM" ? "text-blue-700 dark:text-blue-400" : "text-slate-900 dark:text-white"}`}>
                                            {plan.price}
                                        </span>
                                        <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold">
                                            /{plan.period}
                                        </span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-normal">
                                        {plan.description}
                                    </p>
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="space-y-6 flex-1 flex flex-col justify-between pt-2">
                                <div className="space-y-4">
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
                                </div>

                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <PricingPlanButton
                                        planName={plan.name}
                                        planPrice={plan.price}
                                        buttonText={plan.buttonText}
                                        buttonLink={plan.buttonLink}
                                        isCurrentUserPlan={plan.name === "FREE" && !!user}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="mt-12 text-center">
                    <p className="text-gray-600 dark:text-slate-400">
                        Have questions? <Link href="/contact" className="text-blue-600 hover:underline">Contact our support team</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
