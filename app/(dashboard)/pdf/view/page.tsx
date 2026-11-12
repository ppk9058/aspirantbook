import React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, AlertCircle } from "lucide-react"
import { isAllowedReaderSrc } from "@/lib/pdf/reader-src"
import { PdfReaderFrame } from "@/components/pdf/PdfReaderFrame"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "PDF Reader | AspirantBook",
  robots: {
    index: false,
    follow: false,
  },
}

interface PageProps {
  searchParams: Promise<{
    src?: string
    dl?: string
    title?: string
    subtitle?: string
    badge?: string
  }>
}

export default async function SharedPdfViewPage({ searchParams }: PageProps) {
  const params = await searchParams
  const rawSrc = params?.src
  const rawDl = params?.dl
  const title = params?.title
  const subtitle = params?.subtitle
  const badge = params?.badge

  const isValidSrc = typeof rawSrc === "string" && isAllowedReaderSrc(rawSrc)
  const isValidDl = typeof rawDl === "string" && isAllowedReaderSrc(rawDl)

  if (!isValidSrc || !rawSrc) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-8 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1.5">
            Invalid Document Source
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            The requested document could not be loaded because the source address is missing or not allowed.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <PdfReaderFrame
      src={rawSrc}
      downloadUrl={isValidDl && rawDl ? rawDl : undefined}
      title={title || "PDF Document"}
      subtitle={subtitle}
      badgeLabel={badge || "Verified Document"}
      fallbackBackUrl="/"
    />
  )
}
