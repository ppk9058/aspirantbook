import React from "react"
import Link from "next/link"
import Image from "next/image"
import BrandLogo from "@/components/brand/BrandLogo"
import { ShieldCheck, ArrowLeft, Trash2, Mail, Lock, FileText, Server, AlertCircle } from "lucide-react"
import { getBrandConfig } from "@/lib/config/brand"

export const metadata = {
  title: "Privacy Policy | AspirantBook",
  description: "Learn how AspirantBook collects, protects, and manages your personal learning data, exam results, and account information.",
}

export default function PrivacyPolicyPage() {
  const brand = getBrandConfig()
  const grievanceDisplay = brand.grievanceOfficer.includes("@")
    ? brand.grievanceOfficer
    : `${brand.grievanceOfficer} (Email: ${brand.grievanceEmail})`

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-8 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <BrandLogo size="sm" href="/" />
          <div className="flex items-center gap-4">
            <Link
              href="/data-deletion"
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline hidden sm:inline"
            >
              Data Deletion
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-10">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold mb-3">
              <ShieldCheck className="w-4 h-4" />
              <span>Official Privacy Policy &bull; Last updated: October 2026</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-950 dark:text-white tracking-tight">
              Privacy Policy
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {brand.brandName} (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), operated by {brand.legalEntityName}, provides competitive examination preparation, Computer-Based Test (CBT) mock simulations, and learning resources via https://{brand.canonicalDomain} and our mobile applications.
            </p>
          </div>

          {/* Business Entity Notice */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs sm:text-sm text-slate-700 dark:text-slate-300 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-slate-950 dark:text-white">Data Controller &amp; Legal Entity Information</p>
              <p>Entity Name: {brand.legalEntityName}</p>
              <p>Registered Address: {brand.registeredAddress}</p>
              <p>Support Email: <a href={`mailto:${brand.supportEmail}`} className="hover:underline">{brand.supportEmail}</a></p>
              <p>Helpline: <a href={`tel:${brand.supportPhone.replace(/\s+/g, "")}`} className="hover:underline">{brand.supportPhone}</a></p>
            </div>
          </div>

          {/* Section 1: Information We Collect */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-500" />
              1. Information We Collect
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              When you use AspirantBook, we collect information necessary to deliver educational courses and mock evaluations:
            </p>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1">
              <li><strong>Account Identifiers:</strong> Name, verified email address, and optional phone number.</li>
              <li><strong>Academic &amp; Test Records:</strong> CBT test responses, scorecards, answer timings, subject percentiles, and All India Rankings.</li>
              <li><strong>Device &amp; Telemetry:</strong> Anonymized IP address (via reverse proxy), device type, and push notification tokens.</li>
            </ul>
          </section>

          {/* Section 2: How We Use Information */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-500" />
              2. How We Use Your Information
            </h2>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1">
              <li>To evaluate CBT tests and compute All India Rank (AIR) percentiles.</li>
              <li>To process batch enrollments, study material dispatches, and subscriptions.</li>
              <li>To send critical transactional notifications, OTPs, and password reset instructions.</li>
              <li>To prevent unfair test tampering, multi-login abuse, and unauthorized distribution.</li>
            </ul>
          </section>

          {/* Section 3: Third-Party Processors Audit */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-500" />
              3. Authorized Third-Party Sub-Processors
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              We do not sell personal data to third parties. We share data only with the following vetted cloud infrastructure and processing providers essential for service operations:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <p className="font-bold text-xs sm:text-sm text-slate-950 dark:text-white">PostgreSQL &amp; Supabase</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Primary encrypted database hosting user records and test results.</p>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <p className="font-bold text-xs sm:text-sm text-slate-950 dark:text-white">Razorpay &amp; Stripe</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">PCI-DSS Level 1 certified payment processing (INR &amp; International cards).</p>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <p className="font-bold text-xs sm:text-sm text-slate-950 dark:text-white">Brevo &amp; Resend</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">High-reliability transactional email delivery (verification and reset links).</p>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <p className="font-bold text-xs sm:text-sm text-slate-950 dark:text-white">Cloudflare</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Content Delivery Network (CDN), SSL encryption, and DDoS mitigation.</p>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <p className="font-bold text-xs sm:text-sm text-slate-950 dark:text-white">AWS S3 / MinIO</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Encrypted cloud object storage for study materials, PDF notes, and avatars.</p>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <p className="font-bold text-xs sm:text-sm text-slate-950 dark:text-white">Auth.js / NextAuth</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Cryptographic session generation and OAuth account linking.</p>
              </div>
            </div>
          </section>

          {/* Section 4: User Data Deletion */}
          <section className="space-y-3 p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
            <h2 className="text-lg font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              4. User Data Deletion &amp; Account Erasure
            </h2>
            <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-300 leading-relaxed">
              You have the right to request permanent deletion of your account and personal records at any time:
            </p>
            <div className="space-y-2 text-xs sm:text-sm text-amber-900 dark:text-amber-300">
              <p>
                <strong>In-App Self-Service:</strong> Sign in, navigate to Settings &gt; Security &gt; Danger Zone, and confirm your password to immediately deactivate and anonymize your account.
              </p>
              <p>
                <strong>Public Web Form:</strong> If you cannot access your account or have uninstalled the app, visit our dedicated{" "}
                <Link href="/data-deletion" className="font-bold underline text-amber-800 dark:text-amber-200">
                  Data Deletion Request Page (/data-deletion)
                </Link>{" "}
                to submit an online erasure request.
              </p>
            </div>
          </section>

          {/* Section 5: Grievance Officer & Contact */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-violet-500" />
              5. Grievance Officer &amp; Contact Information
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              If you have any questions or grievances regarding this Privacy Policy or data handling practices, please contact our designated Grievance Officer:
            </p>
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-1">
              <p><strong>Grievance Officer:</strong> {grievanceDisplay}</p>
              <p><strong>Support Email:</strong> <a href={`mailto:${brand.supportEmail}`} className="hover:underline">{brand.supportEmail}</a></p>
              <p><strong>Helpline:</strong> <a href={`tel:${brand.supportPhone.replace(/\s+/g, "")}`} className="hover:underline">{brand.supportPhone}</a></p>
              <p><strong>Postal Address:</strong> {brand.registeredAddress}</p>
            </div>
            <div className="flex gap-4 pt-2 text-xs font-semibold text-sky-600 dark:text-sky-400">
              <Link href="/terms" className="hover:underline">Terms of Service</Link>
              <span>&bull;</span>
              <Link href="/refund" className="hover:underline">Cancellation &amp; Refund Policy</Link>
              <span>&bull;</span>
              <Link href="/contact" className="hover:underline">Contact Support</Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
