import React from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, RefreshCw, AlertCircle, FileText, HelpCircle, Mail, Clock } from "lucide-react"

export const metadata = {
  title: "Cancellation & Refund Policy | AspirantBook",
  description: "Read the official cancellation and refund policy for AspirantBook courses, test series, and study materials.",
}

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-8 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/aspirant-logo-square.jpg"
              alt="AspirantBook"
              width={32}
              height={32}
              className="rounded-lg object-cover"
            />
            <span className="font-extrabold text-base tracking-tight text-slate-950 dark:text-white">
              AspirantBook
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 min-h-[44px] px-3 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors"
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-bold mb-3">
              <RefreshCw className="w-4 h-4" />
              <span>Consumer Protection Policy &bull; Last updated: October 2026</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-950 dark:text-white tracking-tight">
              Cancellation &amp; Refund Policy
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              This Cancellation and Refund Policy applies to all digital courses, mock test subscriptions, and physical study materials purchased through AspirantBook (operated by [OWNER TO CONFIRM: Legal Entity Name]).
            </p>
          </div>

          {/* Business Entity Notice */}
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs sm:text-sm text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Merchant Information &amp; Legal Address</p>
              <p>Legal Entity: [OWNER TO CONFIRM: Legal Entity Name]</p>
              <p>Registered Office: [OWNER TO CONFIRM: Registered Address]</p>
              <p>Support Contact: [OWNER TO CONFIRM: Support Email]</p>
            </div>
          </div>

          {/* Section 1: Digital Courses & Mock Tests */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-500" />
              1. Digital Courses &amp; CBT Test Series
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              AspirantBook provides immediate digital access upon successful payment confirmation.
            </p>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1.5">
              <li>
                <strong>Refund Window:</strong> Learners may request a refund within [OWNER TO CONFIRM: Refund Window, e.g., 7 days from purchase date] provided less than 15% of the video coursework has been accessed and no more than 1 mock test has been attempted.
              </li>
              <li>
                <strong>Completed Attempts:</strong> Once a student has submitted 2 or more full-length mock exams or downloaded encrypted study notes, the digital license is considered fully consumed and non-refundable.
              </li>
              <li>
                <strong>Subscription Renewals:</strong> Recurring monthly/annual subscription cancellations take effect at the end of the current billing cycle. Past billing periods are non-refundable.
              </li>
            </ul>
          </section>

          {/* Section 2: Physical Books & Study Materials */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-500" />
              2. Physical Book Orders &amp; Delivery
            </h2>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1.5">
              <li>
                <strong>Pre-Dispatch Cancellation:</strong> You can cancel a physical book order any time before it has been dispatched from our fulfillment center for a 100% full refund.
              </li>
              <li>
                <strong>Damaged or Defective Copies:</strong> If your book arrives with missing pages, printing errors, or physical damage, notify us within [OWNER TO CONFIRM: Physical Return Window, e.g., 5 days of delivery] with unboxing photographs to receive an immediate replacement or full refund.
              </li>
            </ul>
          </section>

          {/* Section 3: Processing Timelines */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-500" />
              3. Refund Processing &amp; Settlement Time
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Approved refunds are credited directly to the original payment source:
            </p>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1">
              <li><strong>UPI / Netbanking:</strong> 2 to 5 business days.</li>
              <li><strong>Credit / Debit Cards:</strong> 5 to 7 business days depending on your issuing bank.</li>
            </ul>
          </section>

          {/* Section 4: How to Request a Refund */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-purple-500" />
              4. How to Submit a Refund Request
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              To request a refund, please contact our support desk with your registered email and Order ID:
            </p>
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-1">
              <p>Email: <a href="mailto:support@aspirantbook.com" className="font-bold underline text-blue-600 dark:text-blue-400">[OWNER TO CONFIRM: Support Email]</a></p>
              <p>Phone: [OWNER TO CONFIRM: Support Phone Number]</p>
              <p>Grievance Officer: [OWNER TO CONFIRM: Grievance Officer Name and Contact Email]</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
