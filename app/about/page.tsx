import React from "react"
import Link from "next/link"
import Image from "next/image"
import BrandLogo from "@/components/brand/BrandLogo"
import { ArrowLeft, BookOpen, Building2, CheckCircle2, FileText, Mail, MapPin, Phone, Clock, ShieldCheck } from "lucide-react"
import { getBrandConfig } from "@/lib/config/brand"

export const metadata = {
  title: "About Us | AspirantBook",
  description: "Learn about AspirantBook, an online learning platform offering digital courses, test series, and study resources for competitive exam aspirants.",
}

export default function AboutPage() {
  const brand = getBrandConfig()

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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold mb-3">
              <BookOpen className="w-4 h-4" />
              <span>Platform Information &bull; About Us</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-950 dark:text-white tracking-tight">
              About {brand.brandName}
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {brand.brandName} is an online preparation platform designed for government exam aspirants in India preparing for exams such as UPSC and BPSC examinations.
            </p>
          </div>

          {/* Section: What We Offer */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              What We Offer
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Our platform provides structured digital educational resources to assist students in their exam preparation. All offerings are delivered entirely digitally through our web platform and applications:
            </p>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1.5">
              <li><strong>Video Courses:</strong> Self-paced video lectures covering exam syllabi and core topics.</li>
              <li><strong>Live Batches:</strong> Interactive scheduled sessions and real-time guidance.</li>
              <li><strong>Test Series &amp; Mock Tests:</strong> Computer-based simulated practice tests with detailed answer analysis.</li>
              <li><strong>Previous Year Questions (PYQs):</strong> Subject-wise and year-wise question archives with solutions.</li>
              <li><strong>Current Affairs &amp; Quizzes:</strong> Daily and monthly current affairs updates and practice quizzes.</li>
              <li><strong>ePDF Books &amp; Study Notes:</strong> Digital reading materials and revision notes accessible directly inside the student&apos;s account.</li>
            </ul>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Please note: {brand.brandName} offers solely digital educational services and digital content. We do not sell or ship physical products.
            </p>
          </section>

          {/* Section: Operating Entity */}
          <section className="space-y-3 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <h2 className="text-sm font-bold text-slate-950 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-500" />
              Ownership &amp; Legal Entity
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              The {brand.brandName} website and educational platform are owned and operated by:
            </p>
            <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 space-y-1 font-medium">
              <p><strong>Legal Entity:</strong> {brand.legalEntityName}</p>
              <p><strong>Office:</strong> {brand.registeredAddress}</p>
            </div>
          </section>

          {/* Section: Support & Contact */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-500" />
              Learner Support &amp; Contact Information
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              If you have any questions, feedback, or need assistance with your enrollments, our support team is available to help:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                  <Mail className="w-3.5 h-3.5 text-sky-500" />
                  <span>Support Email</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  <a href={`mailto:${brand.supportEmail}`} className="hover:underline font-medium text-sky-600 dark:text-sky-400">
                    {brand.supportEmail}
                  </a>
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                  <Phone className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Helpline Number</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  <a href={`tel:${brand.supportPhone.replace(/\s+/g, "")}`} className="hover:underline font-medium">
                    {brand.supportPhone}
                  </a>
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Operating Hours</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">{brand.supportHours}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span>Office</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">{brand.registeredAddress}</p>
              </div>
            </div>

            <p className="pt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              You can also reach out via our dedicated{" "}
              <Link href="/contact" className="font-bold text-indigo-600 dark:text-indigo-400 underline">
                Contact Us
              </Link>{" "}
              page.
            </p>
          </section>

          {/* Section: Legal Policies & Links */}
          <section className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <span className="text-slate-400">Legal Documents:</span>
            <Link href="/terms" className="hover:text-slate-950 dark:hover:text-white underline">
              Terms &amp; Conditions
            </Link>
            <span>&bull;</span>
            <Link href="/privacy" className="hover:text-slate-950 dark:hover:text-white underline">
              Privacy Policy
            </Link>
            <span>&bull;</span>
            <Link href="/refund" className="hover:text-slate-950 dark:hover:text-white underline">
              Cancellation &amp; Refund Policy
            </Link>
            <span>&bull;</span>
            <Link href="/shipping" className="hover:text-slate-950 dark:hover:text-white underline">
              Shipping &amp; Digital Delivery Policy
            </Link>
          </section>
        </div>
      </main>
    </div>
  )
}
