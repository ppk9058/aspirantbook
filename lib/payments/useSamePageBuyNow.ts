"use client"

import { useState, useCallback } from "react"
import { useSession, getSession } from "next-auth/react"
import { useMobileAuth } from "@/components/auth/MobileAuthContext"
import { useRazorpayCheckout } from "./useRazorpayCheckout"
import { createRazorpayOrder } from "@/lib/actions/payment/razorpay"
import { toast } from "sonner"

export interface BuyNowItem {
  type: "course" | "subscription" | "package" | "book" | "pyq"
  id: string
  slug?: string
  title: string
  price: number | string
  isFree?: boolean
  image?: string
}

export interface BuyNowCallbacks {
  onOpening?: () => void
  onSuccess?: () => void
  onDismiss?: () => void
  onError?: (errorDescription: string) => void
}

export function useSamePageBuyNow() {
  const { data: session } = useSession()
  const { openMobileAuth } = useMobileAuth()
  const { openCheckout, isOpeningCheckout, checkoutError } = useRazorpayCheckout()
  const [isProcessing, setIsProcessing] = useState(false)
  const [successItem, setSuccessItem] = useState<BuyNowItem | null>(null)

  const executeOrder = useCallback(
    async (
      item: BuyNowItem,
      user: any,
      onComplete?: () => void,
      callbacks?: BuyNowCallbacks
    ) => {
      setIsProcessing(true)
      callbacks?.onOpening?.()

      const logoUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/aspirant-logo.jpg`
          : "/aspirant-logo.jpg"

      try {
        if (item.type === "course") {
          const numericAmount =
            typeof item.price === "number"
              ? item.price
              : parseInt(String(item.price).replace(/[^0-9]/g, "") || "499")

          const order = await createRazorpayOrder({
            amount: numericAmount,
            courseId: item.id,
            courseTitle: item.title,
            userId: user.id,
          })

          await openCheckout({
            key: order.keyId,
            amount: Number(order.amount),
            currency: order.currency,
            name: "AspirantBook",
            description: item.title,
            image: item.image || logoUrl,
            order_id: order.orderId,
            prefill: {
              name: user.name || "Student",
              email: user.email || "",
              contact: user.phoneNumber || user.phone || "",
            },
            notes: {
              courseId: item.id,
              courseTitle: item.title,
              type: "course",
            },
            themeColor: "#1448d8",
            onSuccess: async (rzpRes) => {
              const verifyRes = await fetch("/api/verify-payment/razorpay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orderId: rzpRes.razorpay_order_id,
                  paymentId: rzpRes.razorpay_payment_id,
                  signature: rzpRes.razorpay_signature,
                  courseId: item.id,
                }),
              })
              const verifyData = await verifyRes.json()
              if (verifyRes.ok && verifyData.success) {
                setSuccessItem(item)
                toast.success("Payment successful! Course unlocked.")
                callbacks?.onSuccess?.()
                onComplete?.()
              } else {
                const err = verifyData.error || "Payment verification failed"
                toast.error(err)
                callbacks?.onError?.(err)
              }
            },
            onDismiss: () => {
              toast.info("Payment cancelled. You can retry whenever you're ready.")
              callbacks?.onDismiss?.()
            },
            onError: (errMsg) => {
              toast.error(`Payment failed: ${errMsg}`)
              callbacks?.onError?.(errMsg)
            },
          })
        } else if (item.type === "subscription") {
          const planTier = "yearly"
          const plan = "YEARLY" as const

          const order = await createRazorpayOrder({
            plan,
            userId: user.id,
          })

          await openCheckout({
            key: order.keyId,
            amount: Number(order.amount),
            currency: order.currency,
            name: "AspirantBook",
            description: `PREMIUM PASS - Pro Learner (${planTier})`,
            image: item.image || logoUrl,
            order_id: order.orderId,
            prefill: {
              name: user.name || "Student",
              email: user.email || "",
              contact: user.phoneNumber || user.phone || "",
            },
            notes: {
              planId: item.id,
              planName: `PREMIUM PASS - Pro Learner (${planTier})`,
              type: "subscription",
            },
            themeColor: "#1448d8",
            onSuccess: async (rzpRes) => {
              const verifyRes = await fetch("/api/verify-payment/razorpay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orderId: rzpRes.razorpay_order_id,
                  paymentId: rzpRes.razorpay_payment_id,
                  signature: rzpRes.razorpay_signature,
                  plan,
                }),
              })
              const verifyData = await verifyRes.json()
              if (verifyRes.ok && verifyData.success) {
                setSuccessItem(item)
                toast.success("Subscription activated! Full access granted.")
                callbacks?.onSuccess?.()
                onComplete?.()
              } else {
                const err = verifyData.error || "Payment verification failed"
                toast.error(err)
                callbacks?.onError?.(err)
              }
            },
            onDismiss: () => {
              toast.info("Subscription checkout was cancelled.")
              callbacks?.onDismiss?.()
            },
            onError: (errMsg) => {
              toast.error(`Payment failed: ${errMsg}`)
              callbacks?.onError?.(errMsg)
            },
          })
        } else if (item.type === "package") {
          const numericAmount =
            typeof item.price === "number"
              ? item.price
              : parseInt(String(item.price).replace(/[^0-9]/g, "") || "499")

          const order = await createRazorpayOrder({
            amount: numericAmount,
            courseTitle: item.title,
            userId: user.id,
          })

          await openCheckout({
            key: order.keyId,
            amount: Number(order.amount),
            currency: order.currency,
            name: "AspirantBook",
            description: item.title,
            image: item.image || logoUrl,
            order_id: order.orderId,
            prefill: {
              name: user.name || "Student",
              email: user.email || "",
              contact: user.phoneNumber || user.phone || "",
            },
            notes: {
              seriesId: item.slug || item.id,
              packageTitle: item.title,
              type: "package",
            },
            themeColor: "#1448d8",
            onSuccess: async (rzpRes) => {
              const verifyRes = await fetch("/api/verify-payment/razorpay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orderId: rzpRes.razorpay_order_id,
                  paymentId: rzpRes.razorpay_payment_id,
                  signature: rzpRes.razorpay_signature,
                }),
              })
              const verifyData = await verifyRes.json()
              if (verifyRes.ok && verifyData.success) {
                await fetch("/api/exam/series/enroll", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ seriesId: item.slug || item.id, enrollType: "PURCHASED" }),
                })
                setSuccessItem(item)
                toast.success("Package unlocked! You can now attempt all tests.")
                callbacks?.onSuccess?.()
                onComplete?.()
              } else {
                const err = verifyData.error || "Payment verification failed"
                toast.error(err)
                callbacks?.onError?.(err)
              }
            },
            onDismiss: () => {
              toast.info("Package purchase cancelled.")
              callbacks?.onDismiss?.()
            },
            onError: (errMsg) => {
              toast.error(`Payment failed: ${errMsg}`)
              callbacks?.onError?.(errMsg)
            },
          })
        }
      } catch (err: any) {
        console.error("Order creation or checkout initiation failed:", err)
        const friendlyMessage =
          "We could not start the payment right now. Please try again in a few minutes or contact support."
        toast.error(friendlyMessage)
        callbacks?.onError?.(friendlyMessage)
      } finally {
        setIsProcessing(false)
      }
    },
    [openCheckout]
  )

  const handleBuyNow = useCallback(
    async (item: BuyNowItem, onComplete?: () => void, callbacks?: BuyNowCallbacks) => {
      // 1. If item is free, handle free enrollment
      if (item.isFree || item.price === 0 || item.price === "Free" || item.price === "₹0") {
        let currentUser = session?.user
        if (!currentUser) {
          const fresh = await getSession()
          currentUser = fresh?.user
        }

        if (!currentUser) {
          openMobileAuth({
            course: {
              id: item.id,
              slug: item.slug,
              title: item.title,
              price: "Free",
              isFree: true,
              image: item.image,
            },
            actionType: "enroll",
            onSuccess: async (loggedInUser: any) => {
              const freshSession = await getSession()
              const u = freshSession?.user || loggedInUser
              if (u) {
                handleBuyNow(item, onComplete, callbacks)
              }
            },
          })
          return
        }

        setIsProcessing(true)
        try {
          if (item.type === "course") {
            const res = await fetch("/api/courses/enroll", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ courseId: item.slug || item.id }),
            })
            const data = await res.json()
            if (res.ok && data.success) {
              setSuccessItem(item)
              toast.success("Successfully enrolled in course!")
              callbacks?.onSuccess?.()
              onComplete?.()
            } else {
              toast.error(data.error || "Enrollment failed")
              callbacks?.onError?.(data.error || "Enrollment failed")
            }
          } else if (item.type === "package") {
            const res = await fetch("/api/exam/series/enroll", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ seriesId: item.slug || item.id, enrollType: "FREE" }),
            })
            const data = await res.json()
            if (res.ok && data.success) {
              setSuccessItem(item)
              toast.success("Enrolled in test package!")
              callbacks?.onSuccess?.()
              onComplete?.()
            } else {
              toast.error(data.error || "Enrollment failed")
              callbacks?.onError?.(data.error || "Enrollment failed")
            }
          }
        } catch (err: any) {
          toast.error(err.message || "Enrollment failed")
          callbacks?.onError?.(err.message || "Enrollment failed")
        } finally {
          setIsProcessing(false)
        }
        return
      }

      // 2. Paid item: Check authentication (check both hook state and getSession)
      let currentUser = session?.user
      if (!currentUser) {
        const fresh = await getSession()
        currentUser = fresh?.user
      }

      if (!currentUser) {
        openMobileAuth({
          course: {
            id: item.id,
            slug: item.slug,
            title: item.title,
            price: item.price,
            isFree: false,
            image: item.image,
          },
          actionType: "buy",
          onSuccess: async (loggedInUser: any) => {
            const freshSession = await getSession()
            const userToUse = freshSession?.user || loggedInUser
            if (userToUse) {
              await executeOrder(item, userToUse, onComplete, callbacks)
            }
          },
        })
        return
      }

      // 3. Authenticated: execute checkout order immediately on the same page
      await executeOrder(item, currentUser, onComplete, callbacks)
    },
    [session, openMobileAuth, executeOrder]
  )

  return {
    handleBuyNow,
    isProcessing: isProcessing || isOpeningCheckout,
    successItem,
    setSuccessItem,
    checkoutError,
  }
}
