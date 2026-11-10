"use client"
import { useState } from "react"
import { ChevronDown } from "lucide-react"
import Link from "next/link"
const FAQS = [
    {
        q: "What is the aspirantBook Pass?",
        a: "The aspirantBook Pass is an annual subscription that gives you unlimited access to test series, CBT mock tests, previous year papers (PYQs), current affairs, quizzes and tutorials for all government exams on our platform.",
    },
    {
        q: "What is included in the Pass?",
        a: "The Pass includes: All test series and mock tests, PYQ papers with detailed solutions, current affairs and daily quizzes, and tutorial articles for all exam categories. Video courses, live batches and ePDF books are NOT included - they are priced separately.",
    },
    {
        q: "What is NOT included in the Pass?",
        a: "Video courses, live batches, and ePDF books are NOT part of the Pass. These premium products are sold separately at their individual prices and can be purchased from the respective sections.",
    },
    {
        q: "How long is the Pass valid?",
        a: "The Pass is valid for 365 days (one year) from the date of purchase. You'll have full access to all included content throughout this period.",
    },
    {
        q: "What happens when my Pass expires?",
        a: "After 365 days, your Pass will expire and you'll lose access to test series, PYQs, current affairs and tutorials. Any video courses, batches or books you purchased separately will remain accessible as per their terms.",
    },
    {
        q: "How do I renew my Pass?",
        a: "To renew, simply purchase the Pass again from this page. There is no auto-renewal - you'll need to buy it manually when it expires or before expiration to continue uninterrupted access.",
    },
    {
        q: "Does the Pass auto-renew?",
        a: "No. The aspirantBook Pass is a one-time payment and does NOT auto-renew. You have full control over whether and when to purchase again.",
    },
    {
        q: "Can I use the Pass on both website and mobile app?",
        a: "Yes! Your Pass works on both the aspirantBook website and the mobile app. However, if you're using the app, you'll need to complete payment through the website (we'll redirect you to the secure checkout page).",
    },
    {
        q: "Can I attempt the same test multiple times?",
        a: "Yes. With the Pass, you can reattempt any test or mock as many times as you want during your subscription period to track your improvement.",
    },
    {
        q: "Will I get access to solutions and detailed analysis?",
        a: "Absolutely. Every test includes detailed solutions, performance analysis, all-India rank, subject-wise breakdown, and time management insights.",
    },
    {
        q: "What payment methods do you accept?",
        a: "We use Razorpay for secure payments. You can pay via UPI, debit/credit cards, net banking, and popular wallets. All transactions are encrypted and secure.",
    },
    {
        q: "What if my payment failed but money was deducted?",
        a: "If money was deducted but you didn't receive the Pass, contact us immediately at our support page with your transaction ID. Failed payments are typically auto-refunded by your bank within 5-7 working days.",
    },
    {
        q: "What is your refund policy?",
        a: (
            <>
                Please read our full{" "}
                <Link href="/refund-policy" className="text-blue-600 dark:text-blue-400 underline hover:no-underline">
                    Refund Policy
                </Link>
                . In general, digital content access is non-refundable once activated. Contact support for exceptional circumstances.
            </>
        ),
    },
    {
        q: "Can I share my Pass account with others?",
        a: "No. Each Pass is for individual use only and is linked to your account. Account sharing violates our Terms of Service and may result in suspension.",
    },
    {
        q: "How do I contact support?",
        a: (
            <>
                Visit our{" "}
                <Link href="/contact" className="text-blue-600 dark:text-blue-400 underline hover:no-underline">
                    Contact page
                </Link>
                {" "}for support. Our team typically responds within 24 hours.
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
                        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden"
                    >
                        <button
                            onClick={() => toggle(index)}
                            aria-expanded={isOpen}
                            className="w-full flex items-start justify-between gap-3 p-5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                            <span className="flex-1 font-bold text-sm sm:text-base text-gray-900 dark:text-white leading-snug">
                                {index + 1}. {faq.q}
                            </span>
                            <ChevronDown
                                className={`h-5 w-5 text-gray-500 shrink-0 transition-transform ${
                                    isOpen ? "rotate-180" : ""
                                }`}
                            />
                        </button>
                        {isOpen && (
                            <div className="px-5 pb-5 pt-1 text-sm text-gray-700 dark:text-gray-300 leading-relaxed border-t border-gray-100 dark:border-gray-800">
                                {typeof faq.a === "string" ? faq.a : faq.a}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
