"use client"

import Link from "next/link"
import { Check, CheckCircle2 } from "lucide-react"
import { usePassPurchaseModal } from "@/lib/payments/usePassPurchaseModal"
import { usePassStatus } from "@/lib/auth/usePassStatus"
import PassPurchaseModal from "@/components/pass/PassPurchaseModal"

/**
 * AspirantBook PASS banner — reuses the test series pass banner styling.
 * Client component wired to usePassPurchaseModal (same-window popup).
 * Pass holders see "Pass Active" leading to dashboard, never a purchase modal.
 */
export function PassBanner() {
  const passStatus = usePassStatus()
  const hasActive = Boolean(passStatus.hasActivePass)

  const { isOpen, openPassModal, closePassModal } = usePassPurchaseModal({
    hasActivePass: hasActive,
  })

  const perks = [
    "Mock Tests",
    "Live Tests",
    "Study Notes",
    "Doubt Support",
    "PYPs",
    "Re-Attempt Mode",
    "Unlimited Practice",
  ]

  return (
    <div className="bg-gradient-to-b from-[#003B73] via-[#005B96] to-[#00A896] text-white rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden border border-white/10">
      <div className="flex justify-end -mx-1 -mt-1">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-700 text-white uppercase tracking-wider shadow-xs">
          NEW
        </span>
      </div>

      <div className="space-y-1.5 mb-4">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="text-lg sm:text-xl font-black tracking-tight text-white">aspirantbook</span>
          <span className="px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-xs text-[10px] font-black tracking-widest uppercase">
            PASS
          </span>
        </div>
        <h3 className="text-sm sm:text-base font-extrabold text-white leading-snug">
          Unlock All Test Series of All Exams with Pass!
        </h3>
      </div>

      <div className="space-y-2 text-xs font-semibold text-white/95 pb-4 border-b border-white/20">
        {perks.map((perk) => (
          <div key={perk} className="flex items-center gap-2">
            <Check className="h-4 w-4 text-[#00D084] stroke-[3] flex-shrink-0" />
            <span>{perk}</span>
          </div>
        ))}
      </div>

      {hasActive ? (
        <Link
          href="/dashboard"
          className="block w-full mt-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-[0.99] text-center min-h-[44px] flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Pass Active • Go to Dashboard</span>
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => openPassModal()}
          className="block w-full mt-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-[0.99] text-center min-h-[44px] cursor-pointer"
        >
          Get Pass
        </button>
      )}

      <PassPurchaseModal isOpen={isOpen} onClose={closePassModal} />
    </div>
  )
}
