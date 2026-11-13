import { auth } from "@/auth"
import { Check, Crown, Lock, Sparkles, ShieldCheck } from "lucide-react"
import PassBuyNowButton from "@/components/pricing/PassBuyNowButton"
import PassFAQAccordion from "@/components/pricing/PassFAQAccordion"
import { PASS_PRICE_INR } from "@/lib/payments/pass-plan"
import { PASS_INCLUDED_FEATURES } from "@/lib/payments/pass-marketing"
import { hasActivePass } from "@/lib/auth/entitlements"

export const metadata = {
    title: "aspirantBook Pass - Unlock All Exams | aspirantBook",
    description: "Get unlimited access to test series, PYQs, current affairs, quizzes and tutorials for all exams with aspirantBook Pass at Rs 499/year",
}

export default async function PricingPage() {
    const session = await auth()
    const user = session?.user
    // Database-only Pass entitlement (single source: hasActivePass). The price
    // card stays visible; the button switches to "Go to Dashboard" for holders.
    const isPremiumActive = await hasActivePass(user?.id)

    return (
        <div className="min-h-dvh bg-white dark:bg-gray-950 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] lg:pb-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                {/* Main Heading */}
                <div className="text-center mb-8 sm:mb-10">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold mb-3 shadow-2xs">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        <span>All-Access Annual Pass</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">
                        Get All Exams With <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-500">aspirantBook</span> Pass
                    </h1>
                    <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-xl mx-auto">
                        One annual subscription for all your test prep needs across UPSC, State PSCs, SSC, and Foundation exams.
                    </p>
                </div>

                {/* Section Stack: Benefits -> Price Card -> FAQ */}
                <div className="space-y-8 sm:space-y-10">
                    {/* 1. Pass Benefits Checklist Card */}
                    <div data-testid="pricing-benefits-card" className="bg-gradient-to-br from-blue-50/80 via-indigo-50/50 to-white dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-gray-900 border border-blue-200/80 dark:border-blue-900/60 rounded-3xl p-6 sm:p-8 shadow-xs">
                        <div className="flex items-center justify-between gap-3 mb-5">
                            <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                                <Crown className="h-6 w-6 text-amber-500 shrink-0" />
                                <span>Pass Benefits</span>
                            </h2>
                            <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-100/70 dark:bg-blue-950/60 px-2.5 py-1 rounded-full">
                                Complete Access
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            {PASS_INCLUDED_FEATURES.map((feature, idx) => (
                                <div key={idx} className="flex items-start gap-3 bg-white/70 dark:bg-gray-900/70 border border-blue-100/60 dark:border-gray-800 rounded-2xl p-3.5 sm:p-4">
                                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                                    </div>
                                    <span className="text-sm text-gray-800 dark:text-gray-200 font-semibold leading-snug">
                                        {feature}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 2. Price Card (Directly BELOW Benefits Card) */}
                    <div data-testid="pricing-price-card" className="relative bg-gradient-to-br from-[#1448d8] via-[#0f37a8] to-[#07172B] border-2 border-blue-400/30 rounded-3xl p-6 sm:p-8 text-white shadow-2xl shadow-blue-950/30 overflow-hidden">
                        {/* Recommended Ribbon */}
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-5 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-lg">
                            Recommended
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mt-3 mb-6">
                            <div>
                                <h3 className="text-2xl sm:text-3xl font-black text-white mb-1 tracking-tight">
                                    Yearly aspirantBook Pass
                                </h3>
                                <p className="text-sm text-blue-200">
                                    Valid for 365 days from moment of activation
                                </p>
                            </div>
                            <div className="flex items-baseline gap-1.5 self-start sm:self-auto bg-white/10 backdrop-blur-xs px-4 py-2 rounded-2xl border border-white/10">
                                <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                                    ₹{PASS_PRICE_INR}
                                </span>
                                <span className="text-blue-200 text-xs font-semibold">/year</span>
                            </div>
                        </div>

                        {/* Feature Points Inside Card */}
                        <div className="space-y-2.5 mb-6 text-sm text-blue-100">
                            <div className="flex items-center gap-2.5">
                                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                                <span>Unlimited reattempts with All-India rank &amp; detailed solutions</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                                <span>Complete previous year questions (PYQs) &amp; full mock test series</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                                <span>One-time payment, no auto-renew</span>
                            </div>
                        </div>

                        {/* To Pay Row */}
                        <div className="bg-white/10 dark:bg-black/25 border border-white/15 rounded-2xl p-4 sm:p-5 mb-6 backdrop-blur-xs">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-base font-bold text-white block">
                                        To Pay
                                    </span>
                                    <span className="text-xs text-blue-200">
                                        All taxes and payment gateway fees included
                                    </span>
                                </div>
                                <span className="text-2xl sm:text-3xl font-black text-white">
                                    ₹{PASS_PRICE_INR}
                                </span>
                            </div>
                        </div>

                        {/* Desktop Buy Now Button (inside card at lg+) */}
                        <div className="hidden lg:block">
                            <PassBuyNowButton
                                isActive={isPremiumActive}
                                userId={user?.id}
                                userName={user?.name}
                                userEmail={user?.email}
                                userPhone={undefined}
                            />
                        </div>

                        {/* Trust Line */}
                        <div className="flex items-center justify-center gap-2 pt-4 text-xs text-blue-200 border-t border-white/10">
                            <Lock className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            <span>Secure payment powered by Razorpay • UPI, Cards &amp; Net Banking</span>
                        </div>
                    </div>

                    {/* 3. FAQ Section (Directly BELOW Price Card) */}
                    <div className="pt-2">
                        <div className="text-center sm:text-left mb-6">
                            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-2">
                                Frequently Asked Questions
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Clear answers about Pass access, payment security, policies, and device support.
                            </p>
                        </div>
                        <PassFAQAccordion />
                    </div>
                </div>
            </div>

            {/* Sticky Bottom Buy Now Bar (Mobile Only - below lg) */}
            <div
                className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden"
                style={{ paddingBottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}
            >
                <div className="px-4 py-3">
                    <PassBuyNowButton
                        isActive={isPremiumActive}
                        userId={user?.id}
                        userName={user?.name}
                        userEmail={user?.email}
                        userPhone={undefined}
                    />
                </div>
            </div>
        </div>
    )
}
