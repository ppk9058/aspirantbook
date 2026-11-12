import { auth } from "@/auth"
import { Check, Crown } from "lucide-react"
import PassBuyNowButton from "@/components/pricing/PassBuyNowButton"
import PassFAQAccordion from "@/components/pricing/PassFAQAccordion"
import { PASS_PRICE_INR } from "@/lib/payments/pass-plan"
import { PASS_INCLUDED_FEATURES } from "@/lib/payments/pass-marketing"
export const metadata = {
    title: "aspirantBook Pass - Unlock All Exams | aspirantBook",
    description: "Get unlimited access to test series, PYQs, current affairs, quizzes and tutorials for all exams with aspirantBook Pass at Rs 499/year",
}
export default async function PricingPage() {
    const session = await auth()
    const user = session?.user
    const isPremiumActive = user?.subscriptionStatus === "ACTIVE" || user?.role === "PREMIUM"
    return (
        <div className="min-h-dvh bg-white dark:bg-gray-950 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] lg:pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                {/* Main Heading - Full Width */}
                <div className="text-center mb-8 sm:mb-12">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white mb-3">
                        Get All Exams With <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-500">aspirantBook</span> Pass
                    </h1>
                    <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        One annual subscription for all your test prep needs
                    </p>
                </div>

                {/* Two-column layout at lg+ */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                    {/* Left Column: Benefits + FAQ */}
                    <div className="lg:col-span-7 space-y-8">
                        {/* Pass Benefits Checklist */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-2 border-blue-200 dark:border-blue-800 rounded-3xl p-6 sm:p-8">
                            <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                                <Crown className="h-6 w-6 text-amber-500" />
                                Pass Benefits
                            </h2>
                            <div className="grid gap-3 sm:gap-4">
                                {PASS_INCLUDED_FEATURES.map((feature, idx) => (
                                    <div key={idx} className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                                            <Check className="h-4 w-4 stroke-[3]" />
                                        </div>
                                        <span className="text-sm sm:text-base text-gray-800 dark:text-gray-200 font-medium leading-relaxed">
                                            {feature}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* FAQ Section */}
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-6">
                                Frequently Asked Questions
                            </h2>
                            <PassFAQAccordion />
                        </div>
                    </div>

                    {/* Right Column: Sticky Pass Card */}
                    <div className="lg:col-span-5">
                        <div className="lg:sticky lg:top-24">
                            {/* Pass Card (Radio-Style Selected) */}
                            <div className="relative bg-white dark:bg-gray-900 border-3 border-blue-600 dark:border-blue-500 rounded-3xl p-6 sm:p-8 mb-6 shadow-xl shadow-blue-600/10">
                                {/* Recommended Ribbon */}
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-lg">
                                    Recommended
                                </div>
                                <div className="flex items-start justify-between gap-4 mb-4 mt-2">
                                    <div className="flex-1">
                                        <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mb-1">
                                            Yearly aspirantBook Pass
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Valid for 365 days
                                        </p>
                                    </div>
                                    {/* Radio indicator */}
                                    <div className="w-6 h-6 rounded-full border-2 border-blue-600 dark:border-blue-500 flex items-center justify-center shrink-0">
                                        <div className="w-3.5 h-3.5 rounded-full bg-blue-600 dark:bg-blue-500" />
                                    </div>
                                </div>
                                <div className="flex items-baseline gap-2 mb-2">
                                    <span className="text-4xl sm:text-5xl font-black text-blue-700 dark:text-blue-400">
                                        ₹{PASS_PRICE_INR}
                                    </span>
                                    <span className="text-gray-500 dark:text-gray-400 text-sm">/year</span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-6">
                                    One-time payment, no auto-renew
                                </p>

                                {/* To Pay Row */}
                                <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5 mb-6">
                                    <div className="flex items-center justify-between">
                                        <span className="text-base font-bold text-gray-900 dark:text-white">
                                            To Pay
                                        </span>
                                        <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
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
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Bottom Buy Now Bar (Mobile Only - below lg) */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden"
                 style={{ paddingBottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}>
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
