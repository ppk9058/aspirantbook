"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Eye, Lock, Zap, ArrowRight, ShieldCheck, Download } from "lucide-react"
import { usePassStatus } from "@/lib/auth/usePassStatus"
import { usePassPurchaseModal } from "@/lib/payments/usePassPurchaseModal"
import PassPurchaseModal from "@/components/pass/PassPurchaseModal"
import { useMobileAuth } from "@/components/auth/MobileAuthContext"

interface PyqDetailActionButtonsProps {
  paperId: string
  paperTitle: string
  accessType: string
  isPassIncluded: boolean
  unlockPrice: number
  hasCbtMode: boolean
  cbtTestId?: string | null
}

export function PyqDetailActionButtons({
  paperId,
  paperTitle,
  accessType,
  isPassIncluded,
  unlockPrice,
  hasCbtMode,
  cbtTestId,
}: PyqDetailActionButtonsProps) {
  const { data: session } = useSession()
  const passStatus = usePassStatus()
  const { openMobileAuth } = useMobileAuth()
  const isFree = accessType === "FREE"
  const isEntitled = isFree || passStatus.hasActivePass || session?.user?.role === "ADMIN"

  const {
    isOpen: isPassModalOpen,
    openPassModal,
    closePassModal,
  } = usePassPurchaseModal({ hasActivePass: passStatus.hasActivePass })

  const handlePassClick = () => {
    if (!session?.user) {
      openMobileAuth()
      return
    }
    openPassModal()
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 pt-2">
        {isEntitled ? (
          <>
            <Link
              href={`/pyqs/pdf-view?paperId=${encodeURIComponent(paperId)}`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Eye className="w-4 h-4" />
              <span>View & Read PDF</span>
            </Link>

            {hasCbtMode && cbtTestId && (
              <Link
                href={`/test-series/${encodeURIComponent(cbtTestId)}/attempt`}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Start CBT Mode Test</span>
              </Link>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handlePassClick}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Get Pass to View Full Paper</span>
            </button>
          </>
        )}
      </div>

      {/* Mobile Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-background/95 backdrop-blur-md border-t border-border lg:hidden shadow-lg flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-foreground truncate">{paperTitle}</p>
          <p className="text-[11px] text-muted-foreground">
            {isFree ? "Free official paper" : "AspirantBook Pass required"}
          </p>
        </div>
        {isEntitled ? (
          <Link
            href={`/pyqs/pdf-view?paperId=${encodeURIComponent(paperId)}`}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-sm hover:bg-primary/90"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Open PDF</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={handlePassClick}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-amber-600 text-white font-bold text-xs shadow-sm hover:bg-amber-700"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Get Pass</span>
          </button>
        )}
      </div>

      <PassPurchaseModal
        isOpen={isPassModalOpen}
        onClose={closePassModal}
      />
    </>
  )
}
