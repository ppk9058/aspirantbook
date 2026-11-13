"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import Link from "next/link"

interface FAQItem {
    q: string
    a: React.ReactNode
}

const FAQS: FAQItem[] = [
    {
        q: "What is the AspirantBook Pass?",
        a: "The AspirantBook Pass is an all-inclusive annual membership providing 365 days of unlimited access to comprehensive test series, computer-based mock tests (CBT), previous year question papers (PYQs), daily current affairs, quizzes, and curated reading tutorials across all exams hosted on AspirantBook.",
    },
    {
        q: "Which exams and study resources are covered under the Pass?",
        a: "Your Pass unlocks the entire examination catalog, including UPSC CSE, State PSCs (such as BPSC), SSC, Railways, Banking, and School Foundation exam test series, along with fully solved PYQ papers, timed speed drills, and reading tutorials. You do not need to buy separate test series for different exams.",
    },
    {
        q: "What is excluded from the AspirantBook Pass?",
        a: "Recorded video lecture courses, live interactive classroom batches, and downloadable ePDF books are independent premium offerings authored by educators and are not included in the Pass. They can be purchased separately from their respective sections.",
    },
    {
        q: "How much does the Pass cost and how long is it valid?",
        a: "The Pass is available for a one-time fee of ₹499 and remains active for exactly 365 days from the moment of purchase. There are zero hidden fees, maintenance charges, or recurring subscriptions.",
    },
    {
        q: "Does the subscription auto-renew or charge my card automatically?",
        a: "No. The AspirantBook Pass is strictly a single, upfront payment. It does not enroll you in automatic recurring billing. You retain full control over whether and when to renew upon expiration.",
    },
    {
        q: "Which payment options can I use at checkout?",
        a: "Transactions are processed through Razorpay's RBI-authorized secure payment gateway. We support UPI (Google Pay, PhonePe, Paytm, BHIM), all major Debit and Credit Cards (Visa, MasterCard, RuPay), Net Banking across 50+ banks, and supported digital wallets.",
    },
    {
        q: "Can I use my Pass across multiple devices?",
        a: "Yes. Your subscription is linked directly to your AspirantBook user profile. You can log in and practice seamlessly on desktop browsers, tablet screens, and our mobile web or native application.",
    },
    {
        q: "Can I reattempt mock tests and view comprehensive solutions?",
        a: "Yes. You have unlimited reattempts for all included test series throughout your 365-day membership. Every completed attempt includes complete step-by-step solutions, All-India rank benchmarking, sectional breakdowns, and time-management analytics.",
    },
    {
        q: "What happens if money was deducted but my Pass was not activated?",
        a: "If payment was debited from your bank account but access does not reflect within 10 minutes, contact our support desk immediately with your payment ID. Banking network drops are usually settled automatically, and any captured duplicate payment is refunded within 5 to 7 working days.",
    },
    {
        q: "What is the refund policy for the Pass?",
        a: (
            <>
                The Pass provides instant digital access upon purchase and is non-refundable once purchased, except in the case of a technical failure where payment was captured but the Pass was not activated on your account, or in the event of a duplicate payment deduction (refunded within 5-7 working days). Please read our full{" "}
                <Link href="/refund" className="text-blue-600 dark:text-blue-400 font-semibold underline hover:no-underline">
                    Cancellation &amp; Refund Policy
                </Link>
                .
            </>
        ),
    },
    {
        q: "Can I share my login credentials with others?",
        a: "No. Each Pass is licensed for single-user individual study only. Concurrent sessions across distinct locations or credential sharing violate our Terms of Service and may result in permanent account suspension.",
    },
    {
        q: "How can I contact student support?",
        a: (
            <>
                Visit our dedicated{" "}
                <Link href="/contact" className="text-blue-600 dark:text-blue-400 font-semibold underline hover:no-underline">
                    Contact page
                </Link>
                {" "}or email support@aspirantbook.com. All inquiries are acknowledged within 48 hours in accordance with our consumer protection and grievance policy.
            </>
        ),
    },
]

export default function PassFAQAccordion() {
    const [openIndex, setOpenIndex] = useState<number | null>(null)

    const toggle = (index: number) => {
        setOpenIndex(openIndex === index ? null : index)
    }

    return (
        <div className="space-y-3">
            {FAQS.map((faq, index) => {
                const isOpen = openIndex === index
                return (
                    <div
                        key={index}
                        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden transition-colors"
                    >
                        <button
                            onClick={() => toggle(index)}
                            aria-expanded={isOpen}
                            className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/50 cursor-pointer"
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950/70 text-[#1448d8] dark:text-blue-300 font-black text-xs shrink-0">
                                    {index + 1}
                                </span>
                                <span className="font-bold text-sm sm:text-base text-gray-900 dark:text-white leading-snug">
                                    {faq.q}
                                </span>
                            </div>
                            <ChevronDown
                                className={`h-5 w-5 text-gray-400 shrink-0 transition-transform duration-200 ${
                                    isOpen ? "rotate-180 text-blue-600 dark:text-blue-400" : ""
                                }`}
                            />
                        </button>
                        {isOpen && (
                            <div className="px-5 pb-5 pt-1 text-sm text-gray-700 dark:text-gray-300 leading-relaxed border-t border-gray-100 dark:border-gray-800/80">
                                {faq.a}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
