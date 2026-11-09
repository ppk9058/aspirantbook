import React from "react"
import Link from "next/link"
import Image from "next/image"
import BrandLogo from "@/components/brand/BrandLogo"
import { ArrowLeft, Mail, Phone, MapPin, Clock, ShieldCheck } from "lucide-react"
import { ContactFormClient } from "./ContactFormClient"
import { getBrandConfig } from "@/lib/config/brand"

export const metadata = {
  title: "Contact Us | AspirantBook",
  description: "Get in touch with the AspirantBook support team for academic doubts, technical assistance, or order inquiries.",
}

export default function ContactPage() {
  const brand = getBrandConfig()
  const grievanceDisplay = brand.grievanceOfficer.includes("@")
    ? brand.grievanceOfficer
    : `${brand.grievanceOfficer} (${brand.grievanceEmail})`

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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 text-xs font-bold mb-3">
              <Mail className="w-4 h-4" />
              <span>We&apos;re here to help &bull; Aspirant Support</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-950 dark:text-white tracking-tight">
              Contact Us
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Have questions about your mock tests, batch enrollments, or digital course access? Reach out using the form below or contact our support team directly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Contact Details Column */}
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-4">
                <h2 className="text-sm font-bold text-slate-950 dark:text-white uppercase tracking-wider">
                  Official Communication
                </h2>

                <div className="flex items-start gap-3 text-xs sm:text-sm">
                  <Mail className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">Learner Support</p>
                    <p className="text-slate-600 dark:text-slate-400">
                      <a href={`mailto:${brand.supportEmail}`} className="hover:underline">
                        {brand.supportEmail}
                      </a>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-xs sm:text-sm">
                  <Phone className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">Helpline / WhatsApp</p>
                    <p className="text-slate-600 dark:text-slate-400">
                      <a href={`tel:${brand.supportPhone.replace(/\s+/g, "")}`} className="hover:underline">
                        {brand.supportPhone}
                      </a>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-xs sm:text-sm">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">Operating Hours</p>
                    <p className="text-slate-600 dark:text-slate-400">{brand.supportHours}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-xs sm:text-sm">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">Registered Office</p>
                    <p className="text-slate-600 dark:text-slate-400">{brand.registeredAddress}</p>
                  </div>
                </div>
              </div>

              {/* Grievance Redressal */}
              <div className="p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 text-xs sm:text-sm space-y-2">
                <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-bold">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Grievance Redressal</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  Per the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021:
                </p>
                <p className="text-slate-700 dark:text-slate-300 font-medium">
                  Officer: {grievanceDisplay}
                </p>
              </div>
            </div>

            {/* Interactive Contact Form Column */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
              <h2 className="text-base font-bold text-slate-950 dark:text-white">
                Send a Message
              </h2>
              <ContactFormClient />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
