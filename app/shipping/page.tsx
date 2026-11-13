import React from "react"
import Link from "next/link"
import BrandLogo from "@/components/brand/BrandLogo"
import { ArrowLeft, AlertCircle, Clock, Download, FileText, Mail, MapPin, Package, ShieldCheck, Zap } from "lucide-react"
import { getBrandConfig } from "@/lib/config/brand"

export const metadata = {
  title: "Shipping & Digital Delivery Policy | AspirantBook",
  description: "Learn how AspirantBook delivers digital products such as the All-Access Pass, mock test series, video courses, live batches, PYQs, and ePDF books instantly inside your account. No physical goods are shipped.",
}

export default function ShippingDeliveryPage() {
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold mb-3">
              <Package className="w-4 h-4" />
              <span>Digital Delivery Policy &bull; Last updated: November 2026</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-950 dark:text-white tracking-tight">
              Shipping &amp; Digital Delivery Policy
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              This Shipping and Digital Delivery Policy explains how {brand.brandName} (operated by {brand.legalEntityName}) delivers the products purchased on this platform. Every product we sell is a digital educational product, delivered online. No physical goods are shipped to you.
            </p>
          </div>

          {/* Business Entity Notice */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs sm:text-sm text-slate-700 dark:text-slate-300 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-slate-950 dark:text-white">Merchant Information &amp; Legal Details</p>
              <p>Legal Entity: {brand.legalEntityName}</p>
              <p>Office: {brand.registeredAddress}</p>
              <p>Support Email: <a href={`mailto:${brand.supportEmail}`} className="underline font-medium">{brand.supportEmail}</a></p>
            </div>
          </div>

          {/* Section 1: Products We Sell */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-500" />
              1. Products Sold on This Platform
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {brand.brandName} sells strictly digital educational products and services. The complete list of offerings is:
            </p>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1.5">
              <li><strong>All-Access Pass:</strong> Annual subscription giving access to all exams, test series, PYQs, current affairs, quizzes, and tutorials for 365 days.</li>
              <li><strong>CBT Mock Test Series:</strong> Computer-based simulated test series with detailed solutions and All-India rank analysis.</li>
              <li><strong>Video Courses:</strong> Recorded, self-paced video lectures delivered inside the logged-in account.</li>
              <li><strong>Live Batches:</strong> Scheduled interactive online classes with real-time guidance.</li>
              <li><strong>PYQs (Previous Year Questions):</strong> Year-wise and subject-wise question archives with solutions.</li>
              <li><strong>ePDF Books &amp; Study Notes:</strong> Digital reading material readable inside the account.</li>
            </ul>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              We do not sell, stock, or dispatch any physical books, printed material, CDs, or other tangible goods.
            </p>
          </section>

          {/* Section 2: Delivery Method & Timeline */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              2. Delivery Method &amp; Timeline
            </h2>
            <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-2">
              <li>
                <strong>Instant digital access:</strong> As soon as the payment is confirmed by the payment gateway (Razorpay or Stripe), the purchased product is activated in your logged-in {brand.brandName} account. There is no dispatch, courier, or postal step.
              </li>
              <li>
                <strong>Where to access:</strong> Courses, test series, live batches, PYQs, and the Pass appear in your dashboard immediately. Purchased ePDF books and study notes are available under the &quot;Book&quot; section at <Link href="/books/orders" className="text-sky-600 dark:text-sky-400 underline font-medium">/books/orders</Link> (&quot;My Orders &amp; Purchased eBooks&quot;) on the website, mobile web, and app.
              </li>
              <li>
                <strong>Delivery address:</strong> No postal or shipping address is required to receive any product. The email address and phone number on your account are used only for order confirmation, receipts, and support communication &mdash; not for physical delivery.
              </li>
              <li>
                <strong>Typical delivery time:</strong> Instant (normally within a few seconds of payment confirmation). In rare cases of gateway delay or a technical failure where payment is captured but access is not activated, our support team activates the purchase manually after verification.
              </li>
            </ul>
          </section>

          {/* Section 3: No Shipping Charges */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              3. No Shipping or Handling Charges
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Because every product is delivered digitally, no shipping, courier, packaging, or handling charges apply to any order. The price shown at checkout (inclusive of applicable taxes and payment gateway fees) is the total amount payable. Cash on Delivery (COD) is not offered, as no physical goods are dispatched.
            </p>
          </section>

          {/* Section 4: Failed or Delayed Delivery */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              4. Failed, Delayed, or Missing Delivery
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              If your payment was successful but the product does not appear in your account, please do not pay again. Contact our support desk with your registered email, Order ID / Razorpay payment ID, and the product name. Verified cases are resolved within 24-48 working hours by activating access, and duplicate payments are refunded in full in accordance with our{" "}
              <Link href="/refund" className="text-sky-600 dark:text-sky-400 underline font-medium">Cancellation &amp; Refund Policy</Link>.
            </p>
          </section>

          {/* Section 5: Support Contact */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-purple-500" />
              5. Delivery Support &amp; Contact Information
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              For any question about the delivery of a digital product, reach out to our support desk:
            </p>
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-1">
              <p>Email: <a href={`mailto:${brand.supportEmail}`} className="font-bold underline text-blue-600 dark:text-blue-400">{brand.supportEmail}</a></p>
              <p>Phone / Helpline: <a href={`tel:${brand.supportPhone.replace(/\s+/g, "")}`} className="hover:underline">{brand.supportPhone}</a></p>
              <p>Operating Hours: {brand.supportHours}</p>
              <p>Office: {brand.registeredAddress}</p>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed inline-flex items-start gap-2">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>Our office address above is for correspondence and grievance redressal only. No products are collected or dispatched from this address.</span>
            </p>
          </section>

          {/* Section 6: Related Policies */}
          <section className="space-y-3 p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40">
            <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-bold text-sm">
              <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Related Policies</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Please also read the Terms &amp; Conditions, Privacy Policy, and Cancellation &amp; Refund Policy that govern your purchase and use of {brand.brandName} digital products.
            </p>
          </section>

          {/* Legal Footer Links */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <Link href="/terms" className="hover:text-slate-950 dark:hover:text-white underline">Terms &amp; Conditions</Link>
            <span>&bull;</span>
            <Link href="/privacy" className="hover:text-slate-950 dark:hover:text-white underline">Privacy Policy</Link>
            <span>&bull;</span>
            <Link href="/refund" className="hover:text-slate-950 dark:hover:text-white underline">Cancellation &amp; Refund Policy</Link>
            <span>&bull;</span>
            <Link href="/contact" className="hover:text-slate-950 dark:hover:text-white underline">Contact Us</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
