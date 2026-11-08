"use client"

import { useCallback, useState } from "react"
import SecurePdfViewer from "@/components/pdf/SecurePdfViewer"

/**
 * Document shown in the shared SecurePdfViewer modal.
 * `src` and `downloadUrl` are used exactly as given by the caller: this helper
 * never signs, proxies or rewrites a URL.
 */
export interface PdfModalDocument {
    src: string
    title: string
    subtitle?: string
    author?: string
    downloadUrl?: string
    downloadAllowed?: boolean
    badgeLabel?: string
    testId?: string
}

/**
 * Local modal state for one PDF at a time, shared by every "open in the
 * SecurePdfViewer modal" surface (PYQ listing, course/batch resources, lesson
 * slides, ebook orders, doubts, admin/teacher previews).
 */
export function usePdfModal() {
    const [pdfDoc, setPdfDoc] = useState<PdfModalDocument | null>(null)

    const openPdf = useCallback((doc: PdfModalDocument) => setPdfDoc(doc), [])
    const closePdf = useCallback(() => setPdfDoc(null), [])

    return { pdfDoc, openPdf, closePdf }
}

/**
 * Hosts the shared viewer for the document returned by usePdfModal().
 * Renders nothing while no document is open.
 */
export function PdfModal({
    doc,
    onClose,
}: {
    doc: PdfModalDocument | null
    onClose: () => void
}) {
    if (!doc) return null

    return (
        <SecurePdfViewer
            isOpen
            onClose={onClose}
            src={doc.src}
            title={doc.title}
            subtitle={doc.subtitle}
            author={doc.author}
            downloadUrl={doc.downloadUrl}
            downloadAllowed={doc.downloadAllowed}
            badgeLabel={doc.badgeLabel}
            testId={doc.testId}
        />
    )
}
