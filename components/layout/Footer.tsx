import React from "react"
import Link from "next/link"
import Image from "next/image"
import { ShieldCheck, Lock, Trash2, Heart, FileText, Info, CreditCard } from "lucide-react"
import BrandLogo from "@/components/brand/BrandLogo"

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-12 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="space-y-3 md:col-span-1">
            <BrandLogo size="md" href="/" />
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Empowering competitive exam aspirants with CBT mock series, expert live classes, and digital reading resources.
            </p>
          </div>

          {/* Academic Modules */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Learning
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/courses" className="hover:text-slate-950 dark:hover:text-white transition-colors">
                  Video Courses
                </Link>
              </li>
              <li>
                <Link href="/test-series" className="hover:text-slate-950 dark:hover:text-white transition-colors">
                  Mock Test Series
                </Link>
              </li>
              <li>
                <Link href="/books" className="hover:text-slate-950 dark:hover:text-white transition-colors">
                  eBook Reader
                </Link>
              </li>
              <li>
                <Link href="/pyqs" className="hover:text-slate-950 dark:hover:text-white transition-colors">
                  Previous Year Papers
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Governance */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Legal &amp; Compliance
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/about" className="hover:text-slate-950 dark:hover:text-white transition-colors flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-600" />
                  <span>About Us</span>
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-slate-950 dark:hover:text-white transition-colors flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-teal-600" />
                  <span>Pricing</span>
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-slate-950 dark:hover:text-white transition-colors flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Privacy Policy</span>
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-slate-950 dark:hover:text-white transition-colors flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Terms &amp; Conditions</span>
                </Link>
              </li>
              <li>
                <Link href="/refund" className="hover:text-slate-950 dark:hover:text-white transition-colors flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>Refund Policy</span>
                </Link>
              </li>
              <li>
                <Link href="/data-deletion" className="hover:text-slate-950 dark:hover:text-white transition-colors flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Data Deletion Request</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Student Support */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Support
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Have questions regarding exams or your account? Reach out via our contact page.
            </p>
            <div className="pt-1 flex flex-col gap-1.5">
              <Link
                href="/contact"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
              >
                Contact Support Desk &rarr;
              </Link>
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:underline"
              >
                Manage Account &amp; Privacy in Settings &rarr;
              </Link>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>&copy; {currentYear} AspirantBook. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/about" className="hover:underline">About us</Link>
            <Link href="/pricing" className="hover:underline">Pricing</Link>
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <Link href="/terms" className="hover:underline">Terms</Link>
            <Link href="/refund" className="hover:underline">Refunds</Link>
            <Link href="/contact" className="hover:underline">Contact</Link>
            <Link href="/data-deletion" className="hover:underline">Data Deletion</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
