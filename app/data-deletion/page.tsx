import React from "react"
import Link from "next/link"
import Image from "next/image"
import BrandLogo from "@/components/brand/BrandLogo"
import { ArrowLeft, Trash2, ShieldAlert, CheckCircle2, FileText, Smartphone } from "lucide-react"
import { DataDeletionFormClient } from "./DataDeletionFormClient"

export const metadata = {
  title: "Account & Data Deletion Request | AspirantBook",
  description: "Request the permanent deletion of your AspirantBook account, personal data, and test records in compliance with Google Play and Apple App Store policies.",
}

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-8 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <BrandLogo size="sm" href="/" />
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold mb-3">
              <Trash2 className="w-4 h-4" />
              <span>User Rights &bull; Account &amp; Data Erasure</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-950 dark:text-white tracking-tight">
              Delete Your AspirantBook Account &amp; Data
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              In accordance with Google Play, Apple App Store Developer Guidelines, and global data privacy regulations, learners can permanently delete their account and associated personal data at any time.
            </p>
          </div>

          {/* Warning Banner */}
          <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs sm:text-sm text-rose-900 dark:text-rose-200 space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
              <span>Important: Deletion is Permanent and Irreversible</span>
            </div>
            <p className="leading-relaxed">
              Submitting an account deletion request will immediately queue your profile for deactivation. You will lose access to all active courses, mock test histories, personalized question bookmarks, and certificates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: What gets deleted vs retained & In-App instructions */}
            <div className="space-y-6">
              {/* In-App Deletion Steps */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
                <h2 className="text-sm font-bold text-slate-950 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-sky-500" />
                  Instant In-App Deletion
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  If you can sign in to your account, you can perform immediate self-service deletion without waiting for manual processing:
                </p>
                <ol className="list-decimal pl-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1">
                  <li>Navigate to <strong>Settings</strong> &gt; <strong>Security</strong>.</li>
                  <li>Scroll to the <strong>Danger Zone</strong>.</li>
                  <li>Enter your account password and tap <strong>Delete My Account</strong>.</li>
                  <li>All sessions will terminate instantly and your profile credentials will be erased.</li>
                </ol>
              </div>

              {/* Data Category Breakdown */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
                <h2 className="text-sm font-bold text-slate-950 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  Data Retention &amp; Erasure Policy
                </h2>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex items-start gap-2 text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Erased Immediately:</strong> Password hashes, personal phone number, push notification tokens, device identifiers, and active JWT sessions.</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <span><strong>Anonymized:</strong> Public test rankings and aggregated percentile analytics are permanently decoupled from your identity.</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <span><strong>Retained for Legal Compliance:</strong> GST tax invoices and payment transition logs are retained as required by Indian financial and tax laws.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Public Deletion Web Form */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-950 dark:text-white">
                  Submit Web Deletion Request
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Use this form if you have uninstalled the app or cannot log in.
                </p>
              </div>
              <DataDeletionFormClient />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
