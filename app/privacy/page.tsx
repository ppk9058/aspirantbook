import React from "react"
import Link from "next/link"
import Image from "next/image"
import { ShieldCheck, ArrowLeft, Trash2, Mail, Lock, FileText } from "lucide-react"

export const metadata = {
  title: "Privacy Policy | aspirantbook",
  description: "Learn how aspirantbook collects, protects, and manages your personal learning data, exam results, and account information.",
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-8 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/aspirant-logo-square.jpg"
              alt="aspirantbook"
              width={32}
              height={32}
              className="rounded-lg object-cover"
            />
            <span className="font-extrabold text-base tracking-tight text-slate-950 dark:text-white">
              aspirantbook
            </span>
          </Link>
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold mb-3">
              <ShieldCheck className="w-4 h-4" />
              <span>Official Policy &bull; Last updated: October 2026</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-950 dark:text-white tracking-tight">
              Privacy Policy
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              At aspirantbook, accessible from https://aspirantbook.com and our mobile applications, one of our main priorities is the privacy of our students, learners, and visitors.
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-500" />
              1. Information We Collect
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              When you register for an account, subscribe to courses, attempt mock exams, or purchase study resources, we may collect the following information:
            </p>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1">
              <li><strong>Personal Identifiers:</strong> Name, email address, and optional mobile number.</li>
              <li><strong>Academic &amp; Test Records:</strong> CBT mock test responses, section scores, answer timings, rankings, and learning progress.</li>
              <li><strong>Technical &amp; Device Data:</strong> IP address, device type, push notification tokens, and browser or WebView user-agent.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-500" />
              2. How We Use Your Information
            </h2>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1">
              <li>To provide, maintain, and personalize our learning platform and test evaluation systems.</li>
              <li>To calculate All India Rank (AIR), personalized performance analytics, and test solutions.</li>
              <li>To send essential transactional notifications, password resets, and optional push alerts.</li>
              <li>To enforce exam security and prevent fraud, multi-device credential abuse, or unauthorized copying.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              3. Payment Information
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              All payment transactions are handled through certified, PCI-DSS compliant payment gateways (Razorpay, Stripe). We never collect, view, or store your credit/debit card numbers, CVVs, or UPI PINs on our servers.
            </p>
          </section>

          {/* User Data Deletion Section */}
          <section className="space-y-3 p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
            <h2 className="text-lg font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              4. User Data Deletion &amp; Account Erasure
            </h2>
            <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-300 leading-relaxed">
              We respect your right to control your personal data. You have the right to request immediate and permanent deletion of your account and all associated personal data:
            </p>
            <div className="space-y-2 text-xs sm:text-sm text-amber-900 dark:text-amber-300">
              <p>
                <strong>In-App Self-Service Deletion:</strong> You can permanently delete your account at any time by logging in, visiting{" "}
                <Link href="/settings" className="font-bold underline text-amber-800 dark:text-amber-200">
                  Settings &gt; Security &gt; Danger Zone &gt; Delete My Account
                </Link>
                . Confirming your password will instantly terminate all active sessions, erase your credentials, and anonymize your records. In the AspirantBook mobile application (iOS & Android), tap Profile &gt; Delete Account, confirm your re-authentication (password or dedicated OTP), and tap Delete Account.
              </p>
              <p>
                <strong>Email Deletion Request:</strong> If you are unable to access your account, you can email our Data Protection team at{" "}
                <a href="mailto:privacy@aspirantbook.com" className="font-bold underline">
                  privacy@aspirantbook.com
                </a>{" "}
                with the subject line &quot;Account Deletion Request&quot;. Requests are processed within 7 business days.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              5. Children&apos;s Privacy (13+ Requirement)
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Our services are intended for learners aged 13 and above. We do not knowingly collect personal identifiable information from children under 13. If you believe a child under 13 has provided personal details without guardian consent, please contact us immediately.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-violet-500" />
              6. Contact Us
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              For any privacy-related questions or concerns, please contact our Data Governance Officer at{" "}
              <a href="mailto:privacy@aspirantbook.com" className="font-bold text-sky-600 dark:text-sky-400 underline">
                privacy@aspirantbook.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
