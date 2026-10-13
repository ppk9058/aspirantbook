"use client"

import { useState, useCallback } from "react"
import { useSession } from "next-auth/react"
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

export function useSamePageBuyNow() {
  const { data: session } = useSession()
  const { openMobileAuth } = useMobileAuth()
  const { openCheckout, isOpeningCheckout, checkoutError } = useRazorpayCheckout()
  const [isProcessing, setIsProcessing] = useState(false)
  const [successItem, setSuccessItem] = useState<BuyNowItem | null>(null)

  const handleBuyNow = useCallback(async (item: BuyNowItem, onComplete?: () => void) => {
    // 1. If item is free, handle free enrollment
    if (item.isFree || item.price === 0 || item.price === "Free" || item.price === "₹0") {
      if (!session?.user) {
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
          onSuccess: onComplete,
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
            onComplete?.()
          } else {
            toast.error(data.error || "Enrollment failed")
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
            onComplete?.()
          } else {
            toast.error(data.error || "Enrollment failed")
          }
        }
      } catch (err: any) {
        toast.error(err.message || "Enrollment failed")
      } finally {
        setIsProcessing(false)
      }
      return
    }

    // 2. Paid item: Check authentication
    if (!session?.user) {
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
        onSuccess: () => {
          handleBuyNow(item, onComplete)
        },
      })
      return
    }

    // 3. User is authenticated -> initiate same-page Razorpay checkout
    setIsProcessing(true)
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
          userId: session.user.id,
        })

        await openCheckout({
          key: order.keyId,
          amount: Number(order.amount),
          currency: order.currency,
          name: "aspirantbook",
          description: item.title,
          order_id: order.orderId,
          prefill: {
            name: session.user.name || "Student",
            email: session.user.email || "",
            contact: (session.user as any).phoneNumber || "",
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
                userId: session.user.id,
              }),
            })
            const verifyData = await verifyRes.json()
            if (verifyRes.ok && verifyData.success) {
              setSuccessItem(item)
              toast.success("Payment successful! Course unlocked.")
              onComplete?.()
            } else {
              toast.error(verifyData.error || "Payment verification failed")
            }
          },
          onDismiss: () => {
            toast.info("Payment cancelled. You can retry whenever you're ready.")
          },
          onError: (errMsg) => {
            toast.error(`Payment failed: ${errMsg}`)
          },
        })
      } else if (item.type === "subscription") {
        const plan = (item.id.toUpperCase() === "YEARLY" ? "YEARLY" : "MONTHLY") as "MONTHLY" | "YEARLY"
        const order = await createRazorpayOrder({
          plan,
          userId: session.user.id,
        })

        await openCheckout({
          key: order.keyId,
          amount: Number(order.amount),
          currency: order.currency,
          name: "aspirantbook",
          description: `${plan} Subscription Pass`,
          order_id: order.orderId,
          prefill: {
            name: session.user.name || "Student",
            email: session.user.email || "",
            contact: (session.user as any).phoneNumber || "",
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
                userId: session.user.id,
              }),
            })
            const verifyData = await verifyRes.json()
            if (verifyRes.ok && verifyData.success) {
              setSuccessItem(item)
              toast.success("Subscription activated! Full access granted.")
              onComplete?.()
            } else {
              toast.error(verifyData.error || "Payment verification failed")
            }
          },
          onDismiss: () => {
            toast.info("Subscription checkout was cancelled.")
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
          userId: session.user.id,
        })

        await openCheckout({
          key: order.keyId,
          amount: Number(order.amount),
          currency: order.currency,
          name: "aspirantbook",
          description: item.title,
          order_id: order.orderId,
          prefill: {
            name: session.user.name || "Student",
            email: session.user.email || "",
            contact: (session.user as any).phoneNumber || "",
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
                userId: session.user.id,
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
              onComplete?.()
            } else {
              toast.error(verifyData.error || "Payment verification failed")
            }
          },
          onDismiss: () => {
            toast.info("Package purchase cancelled.")
          },
        })
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate checkout")
    } finally {
      setIsProcessing(false)
    }
  }, [session, openMobileAuth, openCheckout])

  return {
    handleBuyNow,
    isProcessing: isProcessing || isOpeningCheckout,
    successItem,
    setSuccessItem,
    checkoutError,
  }
}
