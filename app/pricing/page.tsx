import { auth } from "@/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, X, Crown, BookOpen, ClipboardList, Layers, FileText } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import PricingPlanButton from "@/components/pricing/PricingPlanButton"
import { SHOW_PREMIUM_PLAN } from "@/lib/config/premium"
import { hasRealBatchesAvailable } from "@/lib/home/has-real-batches"
import { resolveAnchorHref } from "@/lib/home/real-batches"

export default async function PricingPage() {
    const session = await auth()
    const user = session?.user
    const isPremiumActive = user?.subscriptionStatus === "ACTIVE" || user?.role === "PREMIUM"
    // Server-side check so the Live Batches link can fall back to /courses when
    // the homepage batch section renders nothing (same rule as app/page.tsx).
    const hasRealBatches = await hasRealBatchesAvailable()

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
            buttonText: user && !isPremiumActive ? "Current Plan" : "Sign Up Free",
            buttonLink: user ? "/dashboard" : "/register",
            variant: "outline" as const,
        },
        {
            name: "PREMIUM",
            price: "₹499",
            period: "per year",
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
            buttonText: isPremiumActive ? "Already active" : "Get Pass Now",
            buttonLink: "/checkout?plan=yearly",
            variant: "default" as const,
        },
    ]

    const visiblePlans = SHOW_PREMIUM_PLAN
        ? plans
        : plans.filter((plan) => plan.name !== "PREMIUM")

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        Simple, Transparent Pricing
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-slate-400 max-w-2xl mx-auto">
                        {SHOW_PREMIUM_PLAN
                            ? "Start for free, upgrade when you're ready. No hidden fees."
                            : "Start for free. Buy only the courses, test series, batches or books you need. No hidden fees."}
                    </p>
                </div>

                <div className={`grid grid-cols-1 gap-8 mx-auto items-stretch ${SHOW_PREMIUM_PLAN ? "md:grid-cols-2 max-w-4xl" : "max-w-md"}`}>
                    {visiblePlans.map((plan) => (
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
                                        {plan.name === "PREMIUM" ? `${plan.name} PASS` : plan.name}
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
                                        isCurrentUserPlan={plan.name === "FREE" ? !!user && !isPremiumActive : isPremiumActive}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {!SHOW_PREMIUM_PLAN && (
                    <section className="mt-12 sm:mt-16" aria-labelledby="pricing-by-product">
                        <div className="text-center mb-6 sm:mb-8">
                            <h2
                                id="pricing-by-product"
                                className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-2"
                            >
                                Pricing by product
                            </h2>
                            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                                Prices are set per product and may differ between products.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                            {[
                                {
                                    title: "Courses",
                                    line: "The price is shown in INR on the course page next to the Buy Now button.",
                                    href: "/courses",
                                    linkText: "Browse courses",
                                    icon: BookOpen,
                                },
                                {
                                    title: "Test Series",
                                    line: "Open a test series to see its details and enroll.",
                                    href: "/test-series",
                                    linkText: "Browse test series",
                                    icon: ClipboardList,
                                },
                                {
                                    title: "Live Batches",
                                    line: "Details and enrollment for each live batch are shown on its batch page.",
                                    href: resolveAnchorHref("/#all-courses-container", hasRealBatches),
                                    linkText: "Browse live batches",
                                    icon: Layers,
                                },
                                {
                                    title: "ePDF Books",
                                    line: "The price is shown in INR on the book page next to the Buy Now button.",
                                    href: "/books",
                                    linkText: "Browse books",
                                    icon: FileText,
                                },
                            ].map((product) => {
                                const ProductIcon = product.icon
                                return (
                                    <Card
                                        key={product.title}
                                        className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 flex flex-col justify-between overflow-hidden"
                                    >
                                        <CardContent className="p-5 sm:p-6 flex-1 flex flex-col justify-between gap-4">
                                            <div className="space-y-2">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                                                    <ProductIcon className="h-5 w-5" />
                                                </div>
                                                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                                                    {product.title}
                                                </h3>
                                                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-snug">
                                                    {product.line}
                                                </p>
                                            </div>
                                            <Link
                                                href={product.href}
                                                className="inline-flex items-center min-h-[44px] text-xs sm:text-sm font-bold text-blue-700 dark:text-blue-400 hover:underline"
                                            >
                                                {product.linkText} →
                                            </Link>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    </section>
                )}

                <div className="mt-12 text-center">
                    <p className="text-gray-600 dark:text-slate-400">
                        Have questions? <Link href="/contact" className="text-blue-600 hover:underline">Contact our support team</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
