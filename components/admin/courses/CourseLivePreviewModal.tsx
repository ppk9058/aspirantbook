"use client"

import React, { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Monitor, Smartphone, X } from "lucide-react"
import { CourseDetailV2 } from "@/components/course/detail/CourseDetailV2"
import { PreviewErrorBoundary } from "@/components/course/detail/PreviewErrorBoundary"
import type { CourseDetailV2Props } from "@/lib/courses/view-model"

export type PreviewViewport = "desktop" | "mobile-360" | "mobile-390"

interface CourseLivePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  viewModel: CourseDetailV2Props
}

/**
 * Isolated Iframe component to render responsive components in an isolated CSS viewport.
 * By rendering inside an iframe, CSS media queries like `lg:grid-cols-12` and `hidden lg:block`
 * evaluate against the iframe's width (e.g. 360px or 390px) rather than the parent browser window.
 */
function IsolatedFrame({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const syncHeadStyles = (doc: Document) => {
      // Clear out previously cloned styles to avoid duplicates
      const existingClones = doc.head.querySelectorAll("[data-preview-cloned]")
      existingClones.forEach((el) => el.remove())

      // Copy style and link tags from main document head
      const styles = document.head.querySelectorAll('style, link[rel="stylesheet"]')
      styles.forEach((node) => {
        const clone = node.cloneNode(true) as HTMLElement
        clone.setAttribute("data-preview-cloned", "true")
        doc.head.appendChild(clone)
      })

      // Ensure root and body inherit proper font family and background
      doc.documentElement.style.height = "100%"
      doc.body.style.margin = "0"
      doc.body.style.padding = "0"
      doc.body.style.height = "100%"
      doc.body.style.backgroundColor = "#F0EAD9"
      doc.body.className = document.body.className || ""
    }

    const initDoc = () => {
      const doc = iframe.contentDocument || iframe.contentWindow?.document
      if (!doc) return

      syncHeadStyles(doc)

      let root = doc.getElementById("preview-mount-root")
      if (!root) {
        root = doc.createElement("div")
        root.id = "preview-mount-root"
        root.style.minHeight = "100%"
        doc.body.appendChild(root)
      }
      setMountNode(root)
    }

    if (iframe.contentDocument?.readyState === "complete") {
      initDoc()
    } else {
      iframe.addEventListener("load", initDoc)
    }

    // Observer to propagate any dynamic stylesheet updates from Next.js HMR / style injections
    const observer = new MutationObserver(() => {
      const doc = iframe.contentDocument || iframe.contentWindow?.document
      if (doc) {
        syncHeadStyles(doc)
      }
    })
    observer.observe(document.head, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      iframe.removeEventListener("load", initDoc)
    }
  }, [])

  return (
    <iframe
      ref={iframeRef}
      className={`w-full h-full border-0 ${className}`}
      title="Studio Live Course Preview"
    >
      {mountNode && createPortal(children, mountNode)}
    </iframe>
  )
}

/**
 * Unified Studio Live Preview Modal used across Course Studio and Course Creation Wizard.
 * Renders in true desktop (1280px) and true mobile (360px / 390px) viewports with iframe isolation.
 */
export function CourseLivePreviewModal({
  isOpen,
  onClose,
  title = "Course Preview",
  viewModel,
}: CourseLivePreviewModalProps) {
  const [viewport, setViewport] = useState<PreviewViewport>("desktop")

  if (!isOpen) return null

  return (
    <div
      data-testid="studio-live-preview-modal"
      className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-xs animate-in fade-in duration-150"
    >
      {/* Modal Topbar */}
      <div className="flex items-center justify-between border-b border-gray-800 bg-gray-950 px-4 sm:px-6 py-3 text-white shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-black tracking-wide uppercase text-orange-400 bg-orange-950/60 border border-orange-800/60 px-2.5 py-1 rounded-md">
            Studio Live Preview
          </span>
          <span className="text-xs font-bold text-gray-300 truncate max-w-xs sm:max-w-md">
            {title}
          </span>
          <span className="hidden sm:inline-block rounded bg-white/10 px-2 py-0.5 text-[11px] text-gray-400">
            Unsaved Draft
          </span>
        </div>

        {/* Viewport controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl bg-gray-900 border border-gray-800 p-0.5 text-xs font-bold">
            <button
              type="button"
              data-testid="btn-preview-desktop"
              onClick={() => setViewport("desktop")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 transition-all cursor-pointer ${
                viewport === "desktop"
                  ? "bg-orange-600 text-white shadow-xs"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Monitor className="h-3.5 w-3.5" />
              <span>Desktop (1280px)</span>
            </button>
            <button
              type="button"
              data-testid="btn-preview-mobile"
              onClick={() => setViewport("mobile-360")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 transition-all cursor-pointer ${
                viewport === "mobile-360"
                  ? "bg-orange-600 text-white shadow-xs"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Mobile (360px)</span>
            </button>
            <button
              type="button"
              data-testid="btn-preview-mobile-390"
              onClick={() => setViewport("mobile-390")}
              className={`hidden sm:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-all cursor-pointer ${
                viewport === "mobile-390"
                  ? "bg-orange-600 text-white shadow-xs"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>390px</span>
            </button>
          </div>

          <button
            type="button"
            data-testid="btn-close-live-preview"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white cursor-pointer transition-colors"
            aria-label="Close Live Preview"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Preview Viewport Canvas */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-6 bg-gray-900/60 flex justify-center items-center">
        <div
          data-testid="preview-viewport-frame"
          className={`transition-all duration-200 overflow-hidden shadow-2xl flex flex-col ${
            viewport === "mobile-360"
              ? "w-[360px] h-[780px] rounded-[36px] border-[8px] border-gray-800 bg-[#F0EAD9]"
              : viewport === "mobile-390"
              ? "w-[390px] h-[844px] rounded-[36px] border-[8px] border-gray-800 bg-[#F0EAD9]"
              : "w-full max-w-7xl h-[calc(90vh-70px)] rounded-2xl border border-gray-800 bg-[#F0EAD9]"
          }`}
        >
          <IsolatedFrame>
            <PreviewErrorBoundary>
              <CourseDetailV2 {...viewModel} />
            </PreviewErrorBoundary>
          </IsolatedFrame>
        </div>
      </div>
    </div>
  )
}
