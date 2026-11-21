"use client"

import React from "react"
import Link from "next/link"
import { usePassPurchaseModal } from "@/lib/payments/usePassPurchaseModal"
import { usePassStatus } from "@/lib/auth/usePassStatus"
import PassPurchaseModal from "@/components/pass/PassPurchaseModal"
import { CheckCircle2, Zap } from "lucide-react"

export interface PassPurchaseButtonProps {
  children?: React.ReactNode
  label?: React.ReactNode
  activeLabel?: React.ReactNode
  activeHref?: string
  className?: string
  icon?: React.ReactNode
  testId?: string
}

/**
 * Universal client CTA button for purchasing or opening the AspirantBook Pass.
 * - Pass holders: renders a direct navigation link to dashboard / active content. Never opens modal.
 * - Guests: routes safely to /login with returnTo preserving passPopup=1 for auto-resume.
 * - Non-pass students: opens PassPurchaseModal in the same window.
 */
export function PassPurchaseButton({
  children,
  label,
  activeLabel,
  activeHref = "/dashboard",
  className = "",
  icon,
  testId,
}: PassPurchaseButtonProps) {
  const passStatus = usePassStatus()
  const hasActive = Boolean(passStatus.hasActivePass)

  const { isOpen, openPassModal, closePassModal } = usePassPurchaseModal({
    hasActivePass: hasActive,
  })

  const content = children || label || "Get AspirantBook Pass"

  if (hasActive) {
    return (
      <Link
        href={activeHref}
        data-testid={testId ? `${testId}-active` : "pass-active-cta"}
        className={className}
      >
        {icon || <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />}
        <span>{activeLabel || "Pass Active • Go to Dashboard"}</span>
      </Link>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          openPassModal()
        }}
        data-testid={testId || "pass-purchase-cta"}
        className={className}
      >
        {icon}
        {typeof content === "string" ? <span>{content}</span> : content}
      </button>

      <PassPurchaseModal isOpen={isOpen} onClose={closePassModal} />
    </>
  )
}

export default PassPurchaseButton
