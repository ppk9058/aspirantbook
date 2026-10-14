"use client"

import { useState, useCallback } from "react"
import { loadRazorpayScript } from "./razorpayClient"
import { toast } from "sonner"

export interface RazorpayPrefill {
  name?: string
  email?: string
  contact?: string
}

export interface RazorpayCheckoutOptions {
  key: string
  amount: number // in paise
  currency?: string
  order_id: string
  name?: string
  description?: string
  image?: string
  prefill?: RazorpayPrefill
  notes?: Record<string, string>
  themeColor?: string
  onSuccess: (response: {
    razorpay_payment_id: string
    razorpay_order_id: string
    razorpay_signature: string
  }) => Promise<void> | void
  onDismiss?: () => void
  onError?: (errorDescription: string) => void
}

export function useRazorpayCheckout() {
  const [isOpeningCheckout, setIsOpeningCheckout] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const openCheckout = useCallback(async (options: RazorpayCheckoutOptions) => {
    setIsOpeningCheckout(true)
    setCheckoutError(null)

    try {
      // 1. Ensure Razorpay checkout script is loaded
      const isLoaded = await loadRazorpayScript()
      if (!isLoaded || typeof window === "undefined" || !(window as any).Razorpay) {
        throw new Error("Razorpay SDK could not be loaded. Please check your internet connection.")
      }

      const logoUrl = typeof window !== "undefined" ? `${window.location.origin}/aspirant-logo.jpg` : "/aspirant-logo.jpg"

      const rzpOptions = {
        key: options.key,
        amount: options.amount,
        currency: options.currency || "INR",
        name: options.name || "aspirantbook",
        description: options.description?.slice(0, 250) || "Secure Purchase",
        image: options.image || logoUrl,
        order_id: options.order_id,
        prefill: {
          name: options.prefill?.name || "",
          email: options.prefill?.email || "",
          contact: options.prefill?.contact || "",
        },
        notes: options.notes || {},
        theme: {
          color: options.themeColor || "#1448d8",
        },
        handler: async function (response: any) {
          try {
            await options.onSuccess(response)
          } catch (handlerErr: any) {
            console.error("Razorpay post-payment handler error:", handlerErr)
            const msg = handlerErr?.message || "Payment verification failed"
            setCheckoutError(msg)
            toast.error(msg)
          } finally {
            setIsOpeningCheckout(false)
          }
        },
        modal: {
          ondismiss: function () {
            setIsOpeningCheckout(false)
            if (options.onDismiss) {
              options.onDismiss()
            } else {
              toast.info("Payment was cancelled. Your state has been saved.")
            }
          },
        },
      }

      if (typeof window !== "undefined") {
        ;(window as any).__lastRazorpayOpts = rzpOptions
      }

      const rzp = new (window as any).Razorpay(rzpOptions)

      if (rzp.on) {
        rzp.on("payment.failed", function (failRes: any) {
          setIsOpeningCheckout(false)
          const desc = failRes?.error?.description || "Payment was declined by your bank or UPI app."
          setCheckoutError(desc)
          if (options.onError) {
            options.onError(desc)
          } else {
            toast.error(`Payment failed: ${desc}`)
          }
        })
      }

      rzp.open()
    } catch (err: any) {
      console.error("Razorpay launch error:", err)
      setIsOpeningCheckout(false)
      const msg = err.message || "Could not launch Razorpay window"
      setCheckoutError(msg)
      if (options.onError) {
        options.onError(msg)
      } else {
        toast.error(msg)
      }
    }
  }, [])

  return {
    openCheckout,
    isOpeningCheckout,
    checkoutError,
    setCheckoutError,
  }
}
