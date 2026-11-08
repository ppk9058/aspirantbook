import React from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, RefreshCw, AlertCircle, FileText, HelpCircle, Mail, ShieldAlert, ShieldCheck } from "lucide-react"
import { getBrandConfig } from "@/lib/config/brand"

export const metadata = {
  title: "Cancellation & Refund Policy | AspirantBook",
  description: "Read the official cancellation and refund policy for AspirantBook digital courses, live batches, test series, and ePDF books.",
}

export default function RefundPolicyPage() {
  const brand = getBrandConfig()
  const grievanceDisplay = brand.grievanceOfficer.includes("@")
    ? brand.grievanceOfficer
    : `${brand.grievanceOfficer} (Email: ${brand.grievanceEmail})`

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-8 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/aspirant-logo-square.jpg"
              alt={brand.brandName}
              width={32}
              height={32}
              className="rounded-lg object-cover"
            />
            <span className="font-extrabold text-base tracking-tight text-slate-950 dark:text-white">
              {brand.brandName}
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
              This Cancellation and Refund Policy applies to all digital courses, live batches, test series/mock tests, and ePDF books purchased through {brand.brandName} (operated by {brand.legalEntityName}). Only digital products are sold on this platform.
            </p>
          </div>

          {/* Business Entity Notice */}
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs sm:text-sm text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Merchant Information &amp; Legal Address</p>
              <p>Legal Entity: {brand.legalEntityName}</p>
              <p>Registered Office: {brand.registeredAddress}</p>
              <p>Support Contact: <a href={`mailto:${brand.supportEmail}`} className="underline font-medium">{brand.supportEmail}</a></p>
            </div>
          </div>

          {/* Section 1: Digital Products Refund Eligibility */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-500" />
              1. Digital Products Refund Eligibility
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {brand.brandName} delivers digital access immediately upon payment. Refunds for digital offerings are governed by the following category-specific terms:
            </p>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-2">
              <li>
                <strong>Pass (All-Access Pass):</strong> The Pass is ₹499 per year, valid for 365 days from purchase. The Pass is non-refundable once purchased, EXCEPT in the case of a technical failure where payment was captured but the Pass was not activated on your account. In such cases, contact our support desk (details below) for verification and refund processing within 5-7 working days.
              </li>
              <li>
                <strong>Test Series / Mock Tests:</strong> Full refund within 48 hours of purchase provided no test has been started.
              </li>
              <li>
                <strong>Courses / Recorded Lectures:</strong> Refund within 7 days of purchase provided no more than 10% of course content has been accessed.
              </li>
              <li>
                <strong>Live Batches:</strong> Full refund before the first live class; within 7 days of batch start provided no more than 2 live classes were attended.
              </li>
              <li>
                <strong>ePDF Books &amp; Study Notes:</strong> ePDF books and study notes are delivered directly inside the user&apos;s logged-in account on the website, mobile web, and app (under &quot;Book&quot; at /books/orders &mdash; &quot;My Orders &amp; Purchased eBooks&quot;) and are not sent by email; &quot;downloaded or opened&quot; refers to accessing or opening the content within the account. Non-refundable once downloaded or opened, EXCEPT in cases of duplicate payment, incorrect file delivered, or a corrupted/unopenable file that cannot be replaced.
              </li>
            </ul>
          </section>

          {/* Section 2: Guaranteed Refunds & Exclusions */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-500" />
              2. Guaranteed Refunds &amp; Exclusions
            </h2>
            <div className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                <strong>Always Refunded:</strong> You are always entitled to a 100% refund in the event of double/duplicate payment deduction, payment debited from your account but access not granted, or cancellation of a course, test series, or batch by us.
              </p>
              <p>
                <strong>Exclusions:</strong> No refunds will be granted in cases of policy abuse, fraudulent activity, unauthorized account sharing, or violation of our Terms of Service.
              </p>
            </div>
          </section>

          {/* Section 3: Processing Timelines */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-500" />
              3. Refund Processing &amp; Settlement Time
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Approved refunds are processed within 5-7 working days to the original payment method used during checkout. Note that bank processing or card issuer settlement cycles may add additional time to the credit appearing on your statement.
            </p>
          </section>

          {/* Section 4: How to Request a Refund */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-purple-500" />
              4. How to Submit a Refund Request
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              To request a refund, please contact our support desk with your registered email, Order ID, and specific reason:
            </p>
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-1">
              <p>Email: <a href={`mailto:${brand.supportEmail}`} className="font-bold underline text-blue-600 dark:text-blue-400">{brand.supportEmail}</a></p>
              <p>Phone / Helpline: <a href={`tel:${brand.supportPhone.replace(/\s+/g, "")}`} className="hover:underline">{brand.supportPhone}</a></p>
              <p>Operating Hours: {brand.supportHours}</p>
            </div>
          </section>

          {/* Section 5: Grievance Redressal */}
          <section className="space-y-3 p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40">
            <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Grievance Redressal Mechanism</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              In accordance with the Consumer Protection (E-Commerce) Rules, 2020, every grievance received will be acknowledged within 48 hours and resolved within one month from the date of receipt.
            </p>
            <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-0.5">
              <p><strong>Grievance Officer:</strong> {grievanceDisplay}</p>
              <p><strong>Direct Escalation:</strong> <a href={`mailto:${brand.grievanceEmail}`} className="underline text-indigo-600 dark:text-indigo-400 font-medium">{brand.grievanceEmail}</a></p>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
