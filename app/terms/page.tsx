import React from "react"
import Link from "next/link"
import Image from "next/image"
import BrandLogo from "@/components/brand/BrandLogo"
import { ShieldCheck, ArrowLeft, BookOpen, AlertCircle, FileText } from "lucide-react"

export const metadata = {
  title: "Terms and Conditions | AspirantBook",
  description: "Terms and Conditions governing the use of AspirantBook learning platform, mock tests, and digital educational content.",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-8 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <BrandLogo size="sm" href="/" />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-10">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold mb-3">
              <FileText className="w-4 h-4" />
              <span>User Agreement &bull; Last updated: October 2026</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-950 dark:text-white tracking-tight">
              Terms &amp; Conditions
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              These Terms and Conditions govern your access to and use of aspirantbook (website, mobile applications, courses, mock exams, and digital library).
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              1. Acceptance &amp; Eligibility
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              By creating an account or accessing any part of our platform, you confirm that you are at least 13 years old and agree to be bound by these Terms and our{" "}
              <Link href="/privacy" className="text-indigo-600 dark:text-indigo-400 underline font-semibold">
                Privacy Policy
              </Link>
              . If you are under 18, you must have parental or legal guardian consent.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-500" />
              2. Intellectual Property &amp; Content Use
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              All question banks, CBT mock tests, video lessons, explanations, and digital eBooks provided on aspirantbook are proprietary educational materials protected by copyright law.
            </p>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1">
              <li>Content access is licensed solely for individual, non-commercial personal study.</li>
              <li>You may not reproduce, redistribute, record, scrape, or resell any part of our test series or course material.</li>
              <li>Attempting to circumvent DRM, digital watermarking, or secure PDF streaming protections is strictly prohibited.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              3. Mock Test Integrity &amp; Anti-Cheating
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              To provide fair and competitive All India Rankings (AIR), our CBT exam simulator includes anti-cheat monitoring. Repeatedly navigating away from live test screens, opening external aids, or submitting fraudulent attempts may result in test cancellation or leaderboard disqualification.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              4. Purchases &amp; Subscriptions
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Course enrollments, test passes, and digital book purchases provide instant access to digital goods. The All-Access Pass is ₹499 (yearly only), valid for 365 days from purchase, and is non-refundable once purchased except in the case of a technical failure where payment was captured but the Pass was not activated (see our <Link href="/refund" className="text-indigo-600 dark:text-indigo-400 underline font-semibold">Cancellation &amp; Refund Policy</Link>). Details regarding pricing, validity durations, and renewal terms for all offerings are indicated at checkout.
            </p>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <strong>Delivery of digital products:</strong> Digital access is granted in the user&apos;s account immediately after successful payment. Purchased ePDF books and study notes are available to read or download exclusively within the user&apos;s logged-in account on the website, mobile web, and app (under the sidebar &quot;Book&quot; section at <Link href="/books/orders" className="text-indigo-600 dark:text-indigo-400 underline font-semibold">/books/orders</Link> &mdash; &quot;My Orders &amp; Purchased eBooks&quot;); they are not delivered via email. Nothing is shipped physically, and no shipping or handling charges apply. All digital content is licensed strictly for the buyer&apos;s personal study and may not be shared, resold, or redistributed.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              5. Account Termination &amp; Data Rights
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              You may terminate your account at any time through our self-service portal in Settings or by contacting us. We reserve the right to suspend accounts that violate these terms, share credentials, or engage in abusive behavior.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              6. Contact Information
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              For inquiries regarding these Terms, contact our legal and support team at{" "}
              <a href="mailto:support@aspirantbook.com" className="font-bold text-sky-600 dark:text-sky-400 underline">
                support@aspirantbook.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
